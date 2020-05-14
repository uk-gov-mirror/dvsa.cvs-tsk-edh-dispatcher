import {RequestPromiseAPI} from "request-promise";
import {Configuration} from "../utils/Configuration";
import {debugOnlyLog} from "../utils/Utils";

export class DispatchDAO {
  private config: any;
  private request: RequestPromiseAPI;

  // expects request-promise, but due to the nature of the library, it seems nigh impossible to mock through
  // conventional means, so need to use DI.
  constructor(request: RequestPromiseAPI) {
    this.request = request;
  }

  /**
   * Does a PUT call to remote EDH endpoints identified in the secrets config and uploads the body provided.
   * @param body - the payload to send
   * @param path - the path extension beyond the base
   */
  public async putMessage(body: any, path: string ) {
    const messageParams = await this.getMessageParams("PUT", path, body);
    debugOnlyLog("message parameters: ", messageParams);
    return this.request.put(messageParams);
  }

  /**
   * Does a POST call to remote EDH endpoints identified in the secrets config and uploads the body provided.
   * @param body - the payload to send
   * @param path - the path extension beyond the base
   */
  public async postMessage(body: any, path: string ) {
    const messageParams = await this.getMessageParams("POST", path, body);
    debugOnlyLog("message parameters: ", messageParams);
    return this.request.post(messageParams);
  }

  /**
   * Does a POST call to remote EDH endpoints identified in the secrets config and uploads the body provided.
   * @param body - the payload to send
   * @param path - the path extension beyond the base
   */
  public async deleteMessage(path: string ) {
    const messageParams = await this.getMessageParams("DELETE", path);
    debugOnlyLog("message parameters: ", messageParams);
    return this.request.delete(messageParams);
  }

  private getMessageParams = async (method: string, path: string, body?: any) => {
    if (!this.config) {
      this.config = await Configuration.getInstance().getSecretConfig();
    }
    return {
      method,
      uri: `${process.env.EDH === "STUB" ? this.config.stubBaseUrl : this.config.baseUrl}/${path}`,
      headers: {
        "x-api-key": process.env.EDH === "STUB" ? this.config.stubApiKey : this.config.apiKey,
        AWSTraceHeader: process.env._X_AMZN_TRACE_ID,
        "X-Amzn-Trace-Id": process.env._X_AMZN_TRACE_ID
      },
      resolveWithFullResponse: true,
      body: JSON.stringify(body)
    };
  };
}
