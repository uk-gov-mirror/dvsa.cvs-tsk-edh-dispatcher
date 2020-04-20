import {DispatchService} from "../../src/services/DispatchService";
import {ITarget} from "../../src/models";
import {AWSError, DynamoDB} from "aws-sdk";
import {ERROR} from "../../src/models/enums";
import {Configuration} from "../../src/utils/Configuration";

describe("Dispatch Service", () => {
  describe("processPath", () => {
    const daoMock = jest.fn();
    const sqsMock = jest.fn();
    const svc = new DispatchService(new daoMock(), new sqsMock());
    describe("with path containing regex match", () => {
      const path = "/test-string/{testResultId}";
      it("replaces it with the matching key of the event", () => {
        const event = {
          "Keys":{
            "testResultId": {
              S: "101"
            }
          },
          "NewImage":{
            "Message":{
              "S":"New item!"
            },
            "Id":{
              "N":"101"
            }
          },
          "SequenceNumber":"111",
          "SizeBytes":26,
          "StreamViewType":"NEW_AND_OLD_IMAGES"
        };

        const output = svc.processPath(path, event);
        expect(output).toEqual("/test-string/101")
      });
    });
    describe("with path containing multiple regex match", () => {
      const path = "/test-string/{testResultId}/{secondKeyName}";
      it("replaces all with the matching keys of the event", () => {
        const event = {
          "Keys":{
            "testResultId": {
              S: "101"
            },
            "secondKeyName": {
              N: 42
            }
          },
          "NewImage":{
            "Message":{
              "S":"New item!"
            },
            "Id":{
              "N":"101"
            }
          },
          "SequenceNumber":"111",
          "SizeBytes":26,
          "StreamViewType":"NEW_AND_OLD_IMAGES"
        };

        const output = svc.processPath(path, event);
        expect(output).toEqual("/test-string/101/42")
      });
    });
    describe("with path containing no regex matches", () => {
      const path = "/test-string/SystemNumber";
      it("returns the original path", () => {
        const event = {
          "Keys":{
            "SystemNumber": "101"
          },
          "NewImage":{
            "Message":{
              "S":"New item!"
            },
            "Id":{
              "N":"101"
            }
          },
          "SequenceNumber":"111",
          "SizeBytes":26,
          "StreamViewType":"NEW_AND_OLD_IMAGES"
        };

        const output = svc.processPath(path, event);
        expect(output).toEqual(path)
      });
    });
  });
  describe("processEvent", () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    const putMock = jest.fn();
    const postMock = jest.fn();
    const deleteMock = jest.fn();
    const sqsMock = jest.fn();
    const daoMock = jest.fn().mockImplementation(() => {
      return {
        putMessage: putMock,
        postMessage: postMock,
        deleteMessage: deleteMock,
      }
    });
    const sendToDLQMock = jest.spyOn(DispatchService.prototype,"sendRecordToDLQ");
    const secretMock = jest.spyOn(Configuration.prototype, "getSecretConfig").mockResolvedValue(Promise.resolve({
      baseUrl: "",
      apiKey: ""
    }));
    const target: ITarget = Configuration.getInstance().getTargets()["test-results"];
    const body = {"test": {"S": "value"}};
    const svc = new DispatchService(new daoMock(), new sqsMock());

    describe("with invalid event type & Bad ARN", () => {
      const event = {
        eventType: "NOT_A_THING",
        body: {NewImage: {}}
      };
      const record = {
        body: JSON.stringify(event),
        eventSourceARN: "something-wrong"
      };
      it("invokes nothing, throws error", () => {
        expect.assertions(5);
        try {
          svc.processEvent(record);
        } catch (e) {
          expect(putMock).not.toHaveBeenCalled();
          expect(postMock).not.toHaveBeenCalled();
          expect(deleteMock).not.toHaveBeenCalled();
          expect(sendToDLQMock).not.toHaveBeenCalled();
          expect(e.message).toEqual(ERROR.NO_UNIQUE_TARGET)
        }
      });
    });

    describe("with invalid event type", () => {
      const event = {
        eventType: "NOT_A_THING",
        body: {NewImage: {}}
      };
      const record = {
        body: JSON.stringify(event),
        eventSourceARN: "something-test-results"
      };
      it("invokes sendRecordToDLQ", () => {
        expect.assertions(4);
        svc.processEvent(record);
        expect(putMock).not.toHaveBeenCalled();
        expect(postMock).not.toHaveBeenCalled();
        expect(deleteMock).not.toHaveBeenCalled();
        expect(sendToDLQMock).toHaveBeenCalled();
      });
    });

    describe("with valid INSERT event type", () => {
      const event = {
        eventType: "INSERT",
        body: {
          NewImage: body
        }
      };
      const record = {
        body: JSON.stringify(event),
        eventSourceARN: "something-test-results"
      };
      it("invokes the POST method with the right details", async () => {
        postMock.mockResolvedValue("posted");
        const output = await svc.processEvent(record);
        expect(output).toEqual("posted");
        expect(putMock).not.toHaveBeenCalled();
        expect(postMock).toHaveBeenCalled();
        expect(deleteMock).not.toHaveBeenCalled();
        expect(postMock).toHaveBeenCalledWith(DynamoDB.Converter.unmarshall(body), target.endpoints.INSERT)
      });
    });

    describe("with valid MODIFY event type", () => {
      const event = {
        eventType: "MODIFY",
        body: {
          Keys: {testResultId: {"S": "123"}},
          NewImage: body
        }
      };
      const record = {
        body: JSON.stringify(event),
        eventSourceARN: "something-test-results"
      };
      it("invokes the PUT method with the right details", async () => {
        const output = await svc.processEvent(record);
        expect(output).toBeUndefined();
        expect(putMock).toHaveBeenCalled();
        expect(postMock).not.toHaveBeenCalled();
        expect(deleteMock).not.toHaveBeenCalled();
        expect(putMock).toHaveBeenCalledWith(DynamoDB.Converter.unmarshall(body), "test-results/123")

      });
    });

    describe("with valid REMOVE event type", () => {
      const event = {
        eventType: "REMOVE",
        body: {
          Keys: {testResultId: {"S": "123"}}
        }
      };
      const record = {
        body: JSON.stringify(event),
        eventSourceARN: "something-test-results"
      };
      it("invokes the DELETE method with the right details", async () => {
        const svc = new DispatchService(new daoMock(), new sqsMock());

        const output = await svc.processEvent(record);
        expect(output).toBeUndefined();
        expect(putMock).not.toHaveBeenCalled();
        expect(postMock).not.toHaveBeenCalled();
        expect(deleteMock).toHaveBeenCalled();
        expect(deleteMock).toHaveBeenCalledWith("test-results/123")
      });
    });
  });
  describe("isRetryableError", ()  => {
    beforeEach(()  => {
      jest.clearAllMocks();
    });

    const daoMock = jest.fn();
    const sqsMock = jest.fn();
    const svc = new DispatchService(new daoMock(), new sqsMock());

    describe("with  400-ish  error", ()  =>  {
      it("returns false", async  () => {
        const error = {statusCode: 404} as AWSError;
        const output = await svc.isRetryableError(error);
        expect(output).toBeFalsy();
      });
    });

    describe("with  500-ish  error", ()  =>  {
      it("returns true", async  () => {
        const error = {statusCode: 500} as AWSError;
        const output = await svc.isRetryableError(error);
        expect(output).toBeTruthy();
      });
    });
  });
  // describe("isValidMessageBody", () => {
  //   const secretMock = jest.spyOn(Configuration.prototype, "getSecretConfig").mockResolvedValue(Promise.resolve({
  //     baseUrl: "",
  //     apiKey: ""
  //   }));
  //   it("does something", () => {
  //     expect(false).toBeTruthy();
  //   })
  // })
});
