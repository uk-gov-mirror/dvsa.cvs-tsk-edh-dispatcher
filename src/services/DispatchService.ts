import { Logger } from 'tslog';
import { DynamoDBRecord, SQSRecord } from 'aws-lambda';
import { Enforcer } from 'openapi-enforcer';
import { DynamoDB } from 'aws-sdk';
import { Target } from '../models/interfaces';
import { SQService } from './SQService';
import { getTargetFromSourceARN } from '../utils/Utils';
import { ERROR } from '../models/enums';

/**
 * Service class for interfacing with the Simple Queue Service
 */
class DispatchService {
  private sqs: SQService;

  private logger: Logger;

  /**
   * Constructor for the ActivityService class
   * @param sqs
   * @param logger
   */
  constructor(sqs: SQService, logger: Logger) {
    this.sqs = sqs;
    this.logger = logger;
  }

  public async processSQSRecord(record: SQSRecord): Promise<void> {
    const target: Target = getTargetFromSourceARN(record.eventSourceARN);
    const dynamoEvent: DynamoDBRecord = JSON.parse(
      await this.sqs.getSQSClient().getMessageContent(record.body),
    ) as DynamoDBRecord;

    if (!dynamoEvent.eventName) {
      this.logger.error('no event name present');
      this.logger.error(ERROR.FAILED_VALIDATION_SENDING_TO_DLQ);
      await this.sendRecordToDLQ(record.body, target);
    }

    if (!['INSERT', 'MODIFY', 'REMOVE'].includes(dynamoEvent.eventName!)) {
      this.logger.error('not a valid event name');
      this.logger.error(ERROR.FAILED_VALIDATION_SENDING_TO_DLQ);
      await this.sendRecordToDLQ(record.body, target);
      return;
    }

    let image;
    if (dynamoEvent.eventName === 'REMOVE') {
      if (!dynamoEvent.dynamodb?.OldImage) {
        this.logger.error(ERROR.NO_OLD_IMAGE);
        await this.sendRecordToDLQ(record.body, target);
        return;
      }
      image = dynamoEvent.dynamodb.OldImage;
    } else {
      if (!dynamoEvent.dynamodb?.NewImage) {
        this.logger.error(ERROR.NO_NEW_IMAGE);
        await this.sendRecordToDLQ(record.body, target);
        return;
      }
      image = dynamoEvent.dynamodb.NewImage;
    }

    if (!await this.isValidMessageBody(image, target)) {
      this.logger.error('not a valid message body');
      this.logger.error(ERROR.FAILED_VALIDATION_SENDING_TO_DLQ);
      await this.sendRecordToDLQ(record.body, target);
      return;
    }

    this.logger.debug('eventPayload: ', dynamoEvent);

    await this.sendRecord(dynamoEvent, target);
  }

  public async isValidMessageBody(record: DynamoDBRecord, target: Target): Promise<boolean> {
    if (process.env.VALIDATION === 'TRUE' && record.eventName !== 'REMOVE') {
      const enforcer = await Enforcer(`./src/resources/${target.swaggerSpecFile}`);
      const schema = enforcer.components.schemas[target.schemaItem];

      if (!record.dynamodb || !record.dynamodb.NewImage) {
        console.log('Record does not have dynamodb.NewImage');
        return false;
      }

      const value = DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);
      const deserialised = schema.deserialize(value);
      const output = schema.validate(deserialised.value);
      if (output) {
        console.log('Record failed validation: ', output);
        return false;
      }
    }
    return true;
  }

  public async sendRecord(message: DynamoDBRecord, target: Target): Promise<void> {
    try {
      await this.sqs.sendMessage(JSON.stringify(message), target.queue);
    } catch (e) {
      this.logger.error('Failed to send message to queue. ERROR: ', e, ' and MESSAGE: ', message);
      await this.sendRecordToDLQ(JSON.stringify(message), target);
    }
  }

  public async sendRecordToDLQ(message: string, target: Target): Promise<void> {
    await this.sqs.sendMessage(message, target.dlQueue);
  }
}

export { DispatchService };
