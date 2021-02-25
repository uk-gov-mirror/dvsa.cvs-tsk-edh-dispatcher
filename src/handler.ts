import { config as AWSConfig } from 'aws-sdk';
import { edhDispatcher } from './functions/edhDispatcher';
import { Configuration } from './utils/Configuration';

if (Configuration.getInstance().getEnv() === 'local') {
  AWSConfig.credentials = {
    accessKeyId: 'offline',
    secretAccessKey: 'offline',
  };
}

export { edhDispatcher as handler };
