import { Logger } from 'tslog';
import { SQSRecord } from 'aws-lambda';
import { Enforcer } from 'openapi-enforcer';
import { DynamoDB } from 'aws-sdk';
import { Body, Target, TargetRecord } from '../models/interfaces';
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
    const body: Body = JSON.parse(record.body) as Body;
    const removeEvent = body.eventType === 'REMOVE';
    const targetRecord: TargetRecord = {
      eventType: body.eventType,
      body: undefined,
    };
    if (!['INSERT', 'MODIFY', 'REMOVE'].includes(body.eventType)) {
      this.logger.error(ERROR.FAILED_VALIDATION_SENDING_TO_DLQ);
      await this.sendRecordToDLQ(record.body, target);
      return;
    }
    if (!removeEvent) {
      if (!body.body.NewImage) {
        this.logger.error(ERROR.NO_NEW_IMAGE);
        await this.sendRecordToDLQ(record.body, target);
        return;
      }
      targetRecord.body = DynamoDB.Converter.unmarshall(body.body.NewImage);
    }
    if (!await this.isValidMessageBody(targetRecord, target)) {
      this.logger.error(ERROR.FAILED_VALIDATION_SENDING_TO_DLQ);
      await this.sendRecordToDLQ(JSON.stringify(targetRecord), target);
      return;
    }
    this.logger.debug('eventPayload: ', body);
    await this.sendRecord(targetRecord, target);
  }

  public async isValidMessageBody(record: TargetRecord, target: Target): Promise<boolean> {
    if (process.env.VALIDATION === 'TRUE' && record.eventType !== 'REMOVE') {
      const enforcer = await Enforcer(`./src/resources/${target.swaggerSpecFile}`);
      const schema = enforcer.components.schemas[target.schemaItem];
      const deserialised = schema.deserialize(record.body);
      const output = schema.validate(deserialised.value);
      if (output) {
        console.log('Record failed validation: ', output);
        return false;
      }
    }
    return true;
  }

  public async sendRecord(message: TargetRecord, target: Target): Promise<void> {
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
