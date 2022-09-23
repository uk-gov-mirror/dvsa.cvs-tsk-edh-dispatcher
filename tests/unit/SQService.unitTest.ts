import { Logger } from 'tslog';
import { types } from 'util';
import { SQService } from '../../src/services/SQService';
import { Configuration } from '../../src/utils/Configuration';
import { ERROR } from '../../src/models/enums';
import Mock = jest.Mock;

describe('SQService', () => {
  describe('Constructor', () => {
    const SQSClientMock: Mock = jest.fn().mockImplementation(() => ({
      customizeRequests: jest.fn(),
      config: {
        update: jest.fn(),
      },
    }));
    it('grabs config and populates the SQS client with provided', () => {
      expect.assertions(2);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const liveMock = new SQSClientMock();
      const svc = new SQService(
        liveMock,
        new Logger({ name: 'SQServiceTestInit' }),
      );
      expect(svc.getSQSClient()).toEqual(liveMock);
      expect(svc.getConfig()).not.toBeUndefined();
    });
    describe('with No config available', () => {
      it('throws an error', () => {
        const ConfigMock = jest
          .spyOn(Configuration, 'getInstance')
          .mockReturnValue({
            getConfig: () => ({}),
            getTargets: () => ({}),
          } as Configuration);
        try {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const sqs = new SQService(
            new SQSClientMock(),
            new Logger({ name: 'SQServiceTestInitError' }),
          );
        } catch (e) {
          if (types.isNativeError(e)) {
            expect(e.message).toEqual(ERROR.NO_SQS_CONFIG);
          } else {
            fail('Thrown error is not a native error');
          }
        }
      });
    });
  });

  describe('sendMessage', () => {
    describe('with good inputs', () => {
      const sendMock = jest
        .fn()
        .mockReturnValue({ promise: jest.fn().mockResolvedValue('It worked') });
      const SQSClientMock = jest.fn().mockImplementation(() => ({
        sendMessage: sendMock,
        getQueueUrl: () => ({
          promise: jest.fn().mockResolvedValue({ QueueUrl: 'testURL' }),
        }),
        customizeRequests: jest.fn(),
        config: {
          update: jest.fn(),
        },
      }));
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const liveMock = new SQSClientMock();
      const svc = new SQService(
        liveMock,
        new Logger({ name: 'SQSServiceSendMessageTest' }),
      );
      const expectedSendArgs = { MessageBody: 'my thing', QueueUrl: 'testURL' };
      it("doesn't throw an error", async () => {
        expect.assertions(3);
        const output = await svc.sendMessage('my thing', 'aQueue');
        expect(output).toEqual('It worked');
        expect(sendMock).toHaveBeenCalledWith(expectedSendArgs);
        expect(sendMock).toHaveBeenCalledTimes(1);
      });
      describe('and specify attributes', () => {
        it('adds the attributes to the call params', async () => {
          sendMock.mockReset();
          sendMock.mockReturnValue({
            promise: jest.fn().mockResolvedValue('It worked'),
          });
          expect.assertions(3);
          const attrMap = { a: { DataType: 'b' } };
          const output = await svc.sendMessage('my thing', 'aQueue', attrMap);
          expect(output).toEqual('It worked');
          expect(sendMock).toHaveBeenCalledWith({
            ...expectedSendArgs,
            MessageAttributes: attrMap,
          });
          expect(sendMock).toHaveBeenCalledTimes(1);
        });
      });
    });
  });
});
