import {edhDispatcher} from "../../src/functions/edhDispatcher";
import {DispatchService} from "../../src/services/DispatchService";
import {Configuration} from "../../src/utils/Configuration";
import {Context} from "aws-lambda";

describe("edhDispatcher function", () => {
  // @ts-ignore
  const ctx: Context = null;
  // @ts-ignore
  Configuration.instance = new Configuration("../../src/config/config.yml");
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
  });
});
