import { SQSEvent, SQSHandler } from 'aws-lambda';
import { SQS, S3 } from 'aws-sdk';
import { Logger } from 'tslog';
import AWSXRay from 'aws-xray-sdk';
import { DispatchService } from '../services/DispatchService';
import { SQService } from '../services/SQService';
import { Configuration } from '../utils/Configuration';
import { SqsService } from '../utils/sqs-huge-msg';

const testing = process.env.NODE_ENV === 'test';
/**
 * λ function to process an SQS stream of records into a queue.
 * @param event - DynamoDB Stream event
 */
const edhDispatcher: SQSHandler = async (event: SQSEvent): Promise<void> => {
  const logger: Logger = new Logger({
    name: 'HandlerLogger',
    type: testing ? 'pretty' : 'json',
    minLevel: testing ? 'debug' : 'warn',
  });
  logger.debug('Event: ', event);

  const records = event.Records;
  if (!records || !records.length) {
    logger.error('ERROR: No Records in event: ', event);
    return;
  }

  // Instantiate the Simple Queue Service
  const region = process.env.AWS_REGION;
  const bucket = process.env.SQS_BUCKET;
  const branch = process.env.BRANCH;
  const config = Configuration.getInstance().getConfig();

  if (!region) {
    console.error('AWS_REGION envvar not available');
    return;
  }

  if (!bucket) {
    console.error('SQS_BUCKET envvar not available');
    return;
  }

  if (!branch) {
    console.error('BRANCH envvar not available');
    return;
  }
  // Not defining BRANCH will default to local
  const env = (!branch || branch === 'local') ? 'local' : 'remote';
  const envConfig = config.s3[env];

  const s3 = AWSXRay.captureAWSClient(new S3({
    s3ForcePathStyle: true,
    signatureVersion: 'v2',
    region,
    endpoint: envConfig.params.endpoint,
  }));
  const sqs = AWSXRay.captureAWSClient(new SQS({ region }));
  const sqsHugeMessage = new SqsService({
    s3,
    sqs,
    queueName: config.sqs.remote.queueName[0],
    s3Bucket: bucket,
    itemPrefix: branch,
  });

  const dispatchService: DispatchService = new DispatchService(
    new SQService(
      sqsHugeMessage,
      logger.getChildLogger({ name: 'SQService' }),
    ),
    logger.getChildLogger({ name: 'DispatchService' }),
  );
  const sentMessagePromises: Array<Promise<void>> = [];
  logger.debug('Records: ', records);

  // Handle records here
  records.forEach((record) => {
    logger.debug('Record: ', record);
    const call = dispatchService.processSQSRecord(record);
    sentMessagePromises.push(call);
  });

  const promises = await Promise.all(sentMessagePromises);
  logger.debug('Response: ', promises);
};

export { edhDispatcher };
