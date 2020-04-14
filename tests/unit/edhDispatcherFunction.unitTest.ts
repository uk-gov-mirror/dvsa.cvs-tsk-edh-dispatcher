import {edhDispatcher} from "../../src/functions/edhDispatcher";
import {DispatchService} from "../../src/services/DispatchService";
import {Configuration} from "../../src/utils/Configuration";
import {Context} from "aws-lambda";
import {AWSError} from "aws-sdk";

describe("edhDispatcher function", () => {
  // @ts-ignore
  const ctx: Context = null;
  // @ts-ignore
  Configuration.instance = new Configuration("../../src/config/config.yml");

  describe("if the event is undefined", () => {
    it("should return undefined", async () => {
      expect.assertions(1);
      const result = await edhDispatcher(undefined, ctx, () => { return; });
      expect(result).toBe(undefined);
    });
  });

  describe("if the event has no records", () => {
    it("should return undefined", async () => {
      expect.assertions(1);
      const result = await edhDispatcher({something: "not records"}, ctx, () => { return; });
      expect(result).toBe(undefined);
    });
  });

  describe("with good event", () => {
    it("invokes the dispatch service with the right body and target", async () => {
      const body = {test: "value"};
      const event = {
        Records: [
          {
            body: JSON.stringify(body),
            eventSourceARN: 'arn:aws:sqs:eu-west-1:006106226016:cvs-edh-dispatcher-test-results-cvsb-10773-queue'
          }
        ],
      };
      const processMock = jest.fn();
      jest.spyOn(DispatchService.prototype, "processEvent").mockImplementation(processMock);
      await edhDispatcher(event, ctx, () => {});
      expect(processMock).toBeCalledWith(body, Configuration.getInstance().getTargets()["test-results"]);
    });
    describe("and Promise.all fails with error",  () => {
      describe("error code is 400-ish", () => {
        it("checks isRetryableError and does not throw error", async () => {
          const body = {test: "value"};
          const event = {
            Records: [
              {
                body: JSON.stringify(body),
                eventSourceARN: 'arn:aws:sqs:eu-west-1:006106226016:cvs-edh-dispatcher-test-results-cvsb-10773-queue'
              }
            ],
          };
          const error = {statusCode: 404} as AWSError;
          const processMock = jest.fn().mockRejectedValue(error);
          const retryableMock = jest.fn().mockResolvedValue(false);
          jest.spyOn(DispatchService.prototype, "processEvent").mockImplementation(processMock);
          jest.spyOn(DispatchService.prototype, "isRetryableError").mockImplementation(retryableMock);
          expect.assertions(2);
          await edhDispatcher(event, ctx, () => {});
          expect(processMock).toBeCalledWith(body, Configuration.getInstance().getTargets()["test-results"]);
          expect(retryableMock).toBeCalledWith(error, event.Records);
        });
      })
      describe("error code is 500-ish", () => {
        it("checks isRetryableError and does throw error", async () => {
          const body = {test: "value"};
          const event = {
            Records: [
              {
                body: JSON.stringify(body),
                eventSourceARN: 'arn:aws:sqs:eu-west-1:006106226016:cvs-edh-dispatcher-test-results-cvsb-10773-queue'
              }
            ],
          };
          const error = {statusCode: 500} as AWSError;
          const processMock = jest.fn().mockRejectedValue(error);
          const retryableMock = jest.fn().mockResolvedValue(true);
          jest.spyOn(DispatchService.prototype, "processEvent").mockImplementation(processMock);
          jest.spyOn(DispatchService.prototype, "isRetryableError").mockImplementation(retryableMock);
          expect.assertions(3);
          try {
            await edhDispatcher(event, ctx, () => {});
          } catch (e) {
            expect(processMock).toBeCalledWith(body, Configuration.getInstance().getTargets()["test-results"]);
            expect(retryableMock).toBeCalledWith(error, event.Records);
            expect(e).toEqual(error);
          }
        });
      })
    })
  });
});
