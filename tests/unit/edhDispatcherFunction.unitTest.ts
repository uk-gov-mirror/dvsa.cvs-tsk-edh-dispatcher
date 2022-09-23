import { Context, SQSEvent } from 'aws-lambda';
import { edhDispatcher } from '../../src/functions/edhDispatcher';
import { DispatchService } from '../../src/services/DispatchService';

const mockContext = {} as Context;
describe('edhDispatcher function', () => {
  describe('if the event has no records', () => {
    it('should return undefined', async () => {
      expect.assertions(1);
      const result = await edhDispatcher(
        { something: 'not records' } as unknown as SQSEvent,
        mockContext,
        () => {},
      );
      expect(result).toBe(undefined);
    });
  });

  describe('with good event', () => {
    it('invokes the dispatch service with the right body and target', async () => {
      const body = { test: 'value' };
      const event = {
        Records: [
          {
            body: JSON.stringify(body),
            eventSourceARN:
              'arn:aws:sqs:eu-west-1:006106226016:cvs-edh-dispatcher-test-results-cvsb-10773-queue',
          },
        ],
      } as SQSEvent;
      const processMock = jest.fn();
      jest
        .spyOn(DispatchService.prototype, 'processSQSRecord')
        .mockImplementation(processMock);
      await edhDispatcher(event, mockContext, () => {});
      expect(processMock).toBeCalledWith(event.Records[0]);
    });
    describe('and ProcessEvent returns a rejection', () => {
      it('throws the error upwards', async () => {
        const body = { test: 'value' };
        const event = {
          Records: [
            {
              body: JSON.stringify(body),
              eventSourceARN:
                'arn:aws:sqs:eu-west-1:006106226016:cvs-edh-dispatcher-test-results-cvsb-10773-queue',
            },
          ],
        } as SQSEvent;
        const error = new Error('something bad');
        const processMock = jest
          .spyOn(DispatchService.prototype, 'processSQSRecord')
          .mockReturnValue(Promise.reject(error));
        expect.assertions(2);
        try {
          await edhDispatcher(event, mockContext, () => {});
        } catch (e) {
          expect(e).toEqual(error);
          expect(processMock).toBeCalledWith(event.Records[0]);
        }
      });
    });
    describe('and ProcessEvent returns a process resolve', () => {
      it('returns the resolution value', async () => {
        const body = { test: 'value' };
        const event = {
          Records: [
            {
              body: JSON.stringify(body),
              eventSourceARN:
                'arn:aws:sqs:eu-west-1:006106226016:cvs-edh-dispatcher-test-results-cvsb-10773-queue',
            },
          ],
        } as SQSEvent;
        const processMock = jest
          .spyOn(DispatchService.prototype, 'processSQSRecord')
          .mockReturnValue(Promise.resolve());
        expect.assertions(2);
        const output = await edhDispatcher(event, mockContext, () => {});
        expect(output).toBeUndefined();
        expect(processMock).toBeCalledWith(event.Records[0]);
      });
    });
  });
});
