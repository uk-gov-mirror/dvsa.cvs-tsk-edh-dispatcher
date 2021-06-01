import SecretsManager, { GetSecretValueRequest, GetSecretValueResponse } from 'aws-sdk/clients/secretsmanager';
import { captureAWSClient } from 'aws-xray-sdk';
import { load } from 'js-yaml';
import { readFileSync } from 'fs';
import { env } from 'process';
import path from 'path';
import { ERROR } from '../models/enums';
import { Config, SecretConfig, TargetConfig } from '../models/interfaces';

/**
 * Helper class for retrieving project configuration
 */
class Configuration {
  private static instance: Configuration;

  private readonly config: Config;

  private readonly env: 'local' | 'remote';

  private secretConfig: SecretConfig | undefined;

  private secretsClient: SecretsManager;

  private constructor(configPath: string) {
    this.secretsClient = captureAWSClient(new SecretsManager({ region: 'eu-west-1' }));

    if (!env.BRANCH) throw new Error(ERROR.NO_BRANCH_ENV);
    this.env = env.BRANCH === 'local' ? 'local' : 'remote';

    this.config = load(readFileSync(configPath, 'utf-8')) as Config;

    // copy-pasted method from edh-marshaller - no time for anything else. Sorry future devs

    // Replace environment variable references
    let stringifiedConfig: string = JSON.stringify(this.config);
    const envRegex = /\${(\w+\b):?(\w+\b)?}/g;
    const matches: RegExpMatchArray | null = stringifiedConfig.match(envRegex);

    if (matches) {
      matches.forEach((match: string) => {
        envRegex.lastIndex = 0;
        const captureGroups: RegExpExecArray = envRegex.exec(match) as RegExpExecArray;

        // Insert the environment variable if available. If not, insert placeholder. If no placeholder, leave it as is.
        stringifiedConfig = stringifiedConfig.replace(match, (process.env[captureGroups[1]] || captureGroups[2] || captureGroups[1]));
      });
    }

    this.config = JSON.parse(stringifiedConfig);

    // if (!env.BRANCH) throw new Error(ERROR.NO_BRANCH_ENV);
    // this.env = env.BRANCH === 'local' ? 'local' : 'remote';
    // const data = {
    //   BRANCH: this.env === 'local' ? this.env : env.BRANCH,
    // };
    // console.log("configuration loaded. BRANCH = ", env.BRANCH);
    //
    // const template = readFileSync(configPath, 'utf-8');
    // console.log('YML template before replacements', template);
    //
    // const ymlRendered = render(template, data);
    // console.log('YML template after replacements', ymlRendered);
    //
    // this.config = load(
    //   ymlRendered,
    // ) as Config;
    //
    // console.log("config after js-yaml", this.config);
  }

  /**
   * Retrieves the singleton instance of Configuration
   * @returns Configuration
   */
  public static getInstance(): Configuration {
    if (!this.instance) {
      this.instance = new Configuration(path.resolve(__dirname, '../config/config.yml'));
    }

    return Configuration.instance;
  }

  /**
   * Retrieves the entire config as an object
   * @returns any
   */
  public getConfig(): Config {
    return this.config;
  }

  /**
   * Retrieves the Targets config
   * @returns ITargetConfig[]
   */
  public getTargets(): TargetConfig {
    return this.config.targets;
  }

  /**
   * Retrieves the Secrets config
   * @returns ISecretConfig
   */
  public async getSecretConfig(): Promise<SecretConfig> {
    if (!this.secretConfig) {
      this.secretConfig = await this.setSecrets();
    }
    return this.secretConfig;
  }

  public getSQSParams(): { [p: string]: string } {
    return this.config.sqs[this.env].params;
  }

  public getEnv(): 'local' | 'remote' {
    return this.env;
  }

  /**
   * Reads the secret yaml file from SecretManager or local file.
   */
  private async setSecrets(): Promise<SecretConfig> {
    if (process.env.SECRET_NAME) {
      const req: GetSecretValueRequest = {
        SecretId: process.env.SECRET_NAME,
      };
      const resp: GetSecretValueResponse = await this.secretsClient.getSecretValue(req).promise();
      try {
        return await JSON.parse(resp.SecretString as string) as SecretConfig;
      } catch (e) {
        throw new Error(ERROR.SECRET_STRING_EMPTY);
      }
    } else {
      console.warn(ERROR.SECRET_ENV_VAR_NOT_SET);
      throw new Error(ERROR.SECRET_ENV_VAR_NOT_SET);
    }
  }
}

export { Configuration };
