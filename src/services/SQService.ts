import SQS, {
  GetQueueUrlResult,
  MessageBodyAttributeMap,
  SendMessageRequest,
  SendMessageResult,
} from 'aws-sdk/clients/sqs';
import { PromiseResult } from 'aws-sdk/lib/request';
import { AWSError } from 'aws-sdk';
import { Logger } from 'tslog';
import { captureAWSClient } from 'aws-xray-sdk';
import { Configuration } from '../utils/Configuration';
import { ERROR } from '../models/enums';
import { Config } from '../models/interfaces';

/**
 * Service class for interfacing with the Simple Queue Service
 */
class SQService {
  private readonly sqsClient: SQS;

  private readonly config: Config;

  private logger: Logger;

  /**
   * Constructor for the ActivityService class
   * @param sqsClient - The Simple Queue Service client
   * @param logger
   */
  constructor(sqsClient: SQS, logger: Logger) {
    this.logger = logger;
    this.config = Configuration.getInstance().getConfig();
    this.sqsClient = captureAWSClient(sqsClient);

    if (!this.config.sqs) {
      throw new Error(ERROR.NO_SQS_CONFIG);
    }

    // Not defining BRANCH will default to local
    // Disabling as we are only injecting local or remote
    // eslint-disable-next-line security/detect-object-injection
    this.sqsClient.config.update(Configuration.getInstance().getSQSParams());
  }

  public getConfig(): Config {
    return this.config;
  }

  public getSQSClient(): SQS {
    return this.sqsClient;
  }

  /**
   * Send a message to the specified queue (the AWS SQS queue URL is resolved based on the queueName for each message )
   * @param messageBody - A string message body
   * @param messageAttributes - A MessageAttributeMap
   * @param queueName - The queue name
   */
  public async sendMessage(messageBody: string, queueName: string, messageAttributes?: MessageBodyAttributeMap): Promise<PromiseResult<SendMessageResult, AWSError>> {
    this.logger.debug(`Sending message to ${queueName}: `, messageBody);

    // Get the queue URL for the provided queue name
    const queueUrlResult: GetQueueUrlResult = await this.sqsClient.getQueueUrl({ QueueName: queueName })
      .promise();

    if (!queueUrlResult.QueueUrl) {
      throw new Error(ERROR.FAILED_Q_URL);
    }

    const params: SendMessageRequest = {
      QueueUrl: queueUrlResult.QueueUrl,
      MessageBody: messageBody,
      MessageAttributes: messageAttributes,
    };

    // Send a message to the queue
    return this.sqsClient.sendMessage(params).promise();
  }
}

export { SQService };
