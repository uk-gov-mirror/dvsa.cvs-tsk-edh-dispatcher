
export interface IStreamRecord {
  body: string;
  eventSourceARN: string;
}

export interface ITarget {
  queueName: string;
  endpoints: {
    INSERT: string;
    MODIFY: string;
    REMOVE: string;
  }
}

export interface ITargetConfig {
  [target: string]: ITarget
}

export interface ISecretConfig {
  baseUrl: string;
  accessToken: string;
}
