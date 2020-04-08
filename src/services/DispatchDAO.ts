import {RequestPromiseAPI} from "request-promise";
import {Configuration} from "../utils/Configuration";

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
  public async putMessage(body: string, path: string, ) {
    if (!this.config) {
      this.config = await Configuration.getInstance().getSecretConfig();
    }
    const messageParams = this.getMessageParams("PUT", path, body);
    return this.request.put(messageParams);
  }

  /**
   * Does a POST call to remote EDH endpoints identified in the secrets config and uploads the body provided.
   * @param body - the payload to send
   * @param path - the path extension beyond the base
   */
  public async postMessage(body: string, path: string ) {
    if (!this.config) {
      this.config = await Configuration.getInstance().getSecretConfig();
    }
    const messageParams = this.getMessageParams("POST", path, body);
    return this.request.post(messageParams);
  }

  /**
   * Does a POST call to remote EDH endpoints identified in the secrets config and uploads the body provided.
   * @param body - the payload to send
   * @param path - the path extension beyond the base
   */
  public async deleteMessage(path: string ) {
    if (!this.config) {
      this.config = await Configuration.getInstance().getSecretConfig();
    }
    const messageParams = this.getMessageParams("DELETE", path);
    return this.request.delete(messageParams);
  }

  private getMessageParams = (method: string, path: string, body?: any) => {
    return {
      method,
      uri: `${this.config.baseUrl}/${path}`,
      headers: {
        Authorization: "Bearer " + this.config.accessToken
      },
      body: JSON.stringify(body)
    };
  };
}
