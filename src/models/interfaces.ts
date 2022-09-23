import { StreamRecord } from 'aws-lambda';

interface SQSConfig {
  params: {
    [param: string]: string;
  };
  queueName: string[];
}

export interface Config {
  sqs: {
    local: SQSConfig;
    remote: SQSConfig;
  };
  targets: TargetConfig;
}

export interface Body {
  eventType: 'INSERT' | 'MODIFY' | 'REMOVE';
  body: StreamRecord;
}

export interface TargetRecord {
  eventType: string;
  body:
  | {
    [key: string]: unknown;
  }
  | undefined;
}

export interface Target {
  queue: string;
  dlQueue: string;
  swaggerSpecFile: string;
  schemaItem: string;
}

export interface TargetConfig {
  [target: string]: Target;
}

export interface SecretConfig {
  baseUrl: string;
  apiKey: string;
  stubBaseUrl: string;
  stubApiKey: string;
  debugMode?: string | boolean;
  validation?: string | boolean;
}
