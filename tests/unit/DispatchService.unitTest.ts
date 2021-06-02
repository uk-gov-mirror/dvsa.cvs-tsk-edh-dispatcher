import { Logger } from 'tslog';
import { SQSRecord } from 'aws-lambda';
import { types } from 'util';
import { DispatchService } from '../../src/services/DispatchService';
import { Body } from '../../src/models/interfaces';
import { Configuration } from '../../src/utils/Configuration';

const mockSQSRecord = {
  attributes: {
    ApproximateReceiveCount: '',
    SentTimestamp: '',
    SenderId: '',
    ApproximateFirstReceiveTimestamp: '',
  },
  awsRegion: '',
  eventSource: '',
  md5OfBody: '',
  messageAttributes: {},
  messageId: '',
  receiptHandle: '',
};

describe('Dispatch Service', () => {
  describe('processEvent', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
    afterAll(() => {
      secretConfig.mockRestore();
    });

    const secretConfig = jest.spyOn(Configuration.prototype, 'getSecretConfig').mockResolvedValue(Promise.resolve({
      baseUrl: '',
      apiKey: '',
      stubBaseUrl: '',
      stubApiKey: '',
      host: '',
    }));
    const sendRecordMock = jest.spyOn(DispatchService.prototype, 'sendRecord');
    const dlqMock = jest.spyOn(DispatchService.prototype, 'sendRecordToDLQ');
    const body = { test: { S: 'value' } };

    describe('with invalid event type & Bad ARN', () => {
      const SQSMock = jest.fn().mockImplementation(() => ({
        sendMessage: jest.fn(),
        getSQSClient: jest.fn().mockReturnValue({ getMessageContent: jest.fn().mockResolvedValue('{}') }),
      }));
      const svc = new DispatchService(new SQSMock(), new Logger({ name: 'DispatchServiceTest' }));
      const event = {
        eventName: 'NOT_A_THING',
        dynamodb: { NewImage: {} },
      } as unknown as Body;
      const record: SQSRecord = {
        ...mockSQSRecord,
        body: JSON.stringify(event),
        eventSourceARN: 'something-wrong',
      };
      it('throws an Error', async () => {
        expect.assertions(3);
        try {
          await svc.processSQSRecord(record);
        } catch (e) {
          if (types.isNativeError(e)) {
            expect(e.message).toEqual('Unable to determine unique target');
            expect(dlqMock).not.toHaveBeenCalled();
            expect(sendRecordMock).not.toHaveBeenCalled();
          } else {
            fail('Error thrown is not a native error');
          }
        }
      });
    });

    describe('with invalid event type', () => {
      const SQSMock = jest.fn().mockImplementation(() => ({
        sendMessage: jest.fn(),
        getSQSClient: jest.fn().mockReturnValue({ getMessageContent: jest.fn().mockResolvedValue('{}') }),
      }));
      const svc = new DispatchService(new SQSMock(), new Logger({ name: 'DispatchServiceTest' }));
      const event = {
        eventName: 'NOT_A_THING',
        dynamodb: { NewImage: {} },
      };
      const record: SQSRecord = {
        ...mockSQSRecord,
        body: JSON.stringify(event),
        eventSourceARN: 'something-test-results',
      };
      it('invokes sendRecordToDLQ', async () => {
        expect.assertions(2);
        await svc.processSQSRecord(record);
        expect(dlqMock).toHaveBeenCalled();
        expect(sendRecordMock).not.toHaveBeenCalled();
      });
    });

    describe('with valid INSERT event type', () => {
      const SQSMock = jest.fn().mockImplementation(() => ({
        sendMessage: jest.fn(),
        getSQSClient: jest.fn().mockReturnValue(
          {
            getMessageContent: jest.fn().mockResolvedValue('{"eventName":"INSERT", "dynamodb": {"NewImage": {}}}'),
          },
        ),
      }));
      const svc = new DispatchService(new SQSMock(), new Logger({ name: 'DispatchServiceTest' }));
      const event = {
        eventName: 'INSERT',
        dynamodb: {
          Keys: { testResultId: { S: '123' } },
          NewImage: body,
        },
      };
      const record: SQSRecord = {
        ...mockSQSRecord,
        body: JSON.stringify(event),
        eventSourceARN: 'something-test-results',
      };
      it('invokes the sendRecord method', async () => {
        expect.assertions(2);
        const output = await svc.processSQSRecord(record);
        expect(output).toBeUndefined();
        expect(sendRecordMock).toHaveBeenCalled();
      });
    });

    describe('with valid MODIFY event type', () => {
      const SQSMock = jest.fn().mockImplementation(() => ({
        sendMessage: jest.fn(),
        getSQSClient: jest.fn().mockReturnValue(
          {
            getMessageContent: jest.fn().mockResolvedValue('{"eventName":"MODIFY", "dynamodb": {"NewImage": {}}}'),
          },
        ),
      }));
      const svc = new DispatchService(new SQSMock(), new Logger({ name: 'DispatchServiceTest' }));
      const event = {
        eventName: 'MODIFY',
        dynamodb: {
          Keys: { testResultId: { S: '123' } },
          NewImage: body,
        },
      };
      const record: SQSRecord = {
        ...mockSQSRecord,
        body: JSON.stringify(event),
        eventSourceARN: 'something-test-results',
      };
      it('invokes the sendRecord method', async () => {
        expect.assertions(2);
        const output = await svc.processSQSRecord(record);
        expect(output).toBeUndefined();
        expect(sendRecordMock).toHaveBeenCalled();
      });
    });

    describe('with valid REMOVE event type', () => {
      const SQSMock = jest.fn().mockImplementation(() => ({
        sendMessage: jest.fn(),
        getSQSClient: jest.fn().mockReturnValue(
          {
            getMessageContent: jest.fn().mockResolvedValue('{"eventName":"REMOVE", "dynamodb": {"OldImage": {}}}'),
          },
        ),
      }));
      const svc = new DispatchService(new SQSMock(), new Logger({ name: 'DispatchServiceTest' }));
      const event = {
        eventName: 'REMOVE',
        dynamodb: {
          Keys: { testResultId: { S: '123' } },
          OldImage: {},
        },
      };
      const record: SQSRecord = {
        ...mockSQSRecord,
        body: JSON.stringify(event),
        eventSourceARN: 'something-test-results',
      };
      it('invokes the sendRecord method', async () => {
        expect.assertions(2);
        const output = await svc.processSQSRecord(record);
        expect(output).toBeUndefined();
        expect(sendRecordMock).toHaveBeenCalled();
      });
    });
  });
});
