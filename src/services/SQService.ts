import {
  MessageBodyAttributeMap,
  SendMessageResult,
} from 'aws-sdk/clients/sqs';
import { PromiseResult } from 'aws-sdk/lib/request';
import { AWSError, config as AWSConfig } from 'aws-sdk';
import { Logger } from 'tslog';
import { Configuration } from '../utils/Configuration';
import { ERROR } from '../models/enums';
import { Config } from '../models/interfaces';
import { SqsService } from '../utils/sqs-huge-msg';

/**
 * Service class for interfacing with the Simple Queue Service
 */
class SQService {
  private readonly sqsClient: SqsService;

  private readonly config: Config;

  private logger: Logger;

  /**
   * Constructor for the ActivityService class
   * @param sqsClient - The Simple Queue Service client
   * @param logger
   */
  constructor(sqsClient: SqsService, logger: Logger) {
    this.logger = logger;
    this.config = Configuration.getInstance().getConfig();
    this.sqsClient = sqsClient;

    if (!this.config.sqs) {
      throw new Error(ERROR.NO_SQS_CONFIG);
    }

    // Not defining BRANCH will default to local
    // Disabling as we are only injecting local or remote
    // eslint-disable-next-line security/detect-object-injection
    AWSConfig.sqs = Configuration.getInstance().getSQSParams();
  }

  public getConfig(): Config {
    return this.config;
  }

  public getSQSClient(): SqsService {
    return this.sqsClient;
  }

  /**
   * Send a message to the specified queue (the AWS SQS queue URL is resolved based on the queueName for each message )
   * @param messageBody - A string message body
   * @param messageAttributes - A MessageAttributeMap
   * @param queueName - The queue name
   */
  public async sendMessage(messageBody: string, queueName: string, messageAttributes?: MessageBodyAttributeMap): Promise<void|PromiseResult<SendMessageResult, AWSError>> {
    this.logger.debug(`Sending message to ${queueName}: `, messageBody);

    // Send a message to the queue
    return this.sqsClient.sendMessage(queueName, messageBody, messageAttributes);
  }
}

export { SQService };
