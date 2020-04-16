import {DispatchService} from "../../src/services/DispatchService";
import {ITarget} from "../../src/models";
import {AWSError, DynamoDB} from "aws-sdk";
import * as utils from "../../src/utils/Utils";

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
    const target: ITarget = {
      queue: "",
      dlQueue: "",
      endpoints: {
        INSERT: "Ipath",
        MODIFY: "Mpath",
        REMOVE: "Rpath",
      }
    };
    const body = {"test": {"S": "value"}};
    const svc = new DispatchService(new daoMock(), new sqsMock());

    describe("with invalid event type", () => {
      const event = {
        eventType: "NOT_A_THING",
        body: {NewImage: {}}
      };
      it("invokes nothing, returns nothing", () => {
        const output = svc.processEvent(event, target);
        expect(output).toBeUndefined();
        expect(putMock).not.toHaveBeenCalled();
        expect(postMock).not.toHaveBeenCalled();
        expect(deleteMock).not.toHaveBeenCalled();
      });


    });
    describe("with valid INSERT event type", () => {
      const event = {
        eventType: "INSERT",
        body: {NewImage: body}
      };
      it("invokes the POST method with the right details", () => {
        postMock.mockReturnValueOnce("posted");
        const output = svc.processEvent(event, target);
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
        body: {NewImage: body}
      };
      it("invokes the PUT method with the right details", () => {
        const output = svc.processEvent(event, target);
        expect(output).toBeUndefined();
        expect(putMock).toHaveBeenCalled();
        expect(postMock).not.toHaveBeenCalled();
        expect(deleteMock).not.toHaveBeenCalled();
        expect(putMock).toHaveBeenCalledWith(DynamoDB.Converter.unmarshall(body), target.endpoints.MODIFY)

      });
    });

    describe("with valid REMOVE event type", () => {
      const event = {
        eventType: "REMOVE",
        body
      };
      it("invokes the DELETE method with the right details", () => {
        const svc = new DispatchService(new daoMock(), new sqsMock());

        const output = svc.processEvent(event, target);
        expect(output).toBeUndefined();
        expect(putMock).not.toHaveBeenCalled();
        expect(postMock).not.toHaveBeenCalled();
        expect(deleteMock).toHaveBeenCalled();
        expect(deleteMock).toHaveBeenCalledWith(target.endpoints.REMOVE)
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
      it("returns false and sends message to DLQ", async  () => {
        const error = {statusCode: 404} as AWSError;
        const sendRecordMock = jest.spyOn(DispatchService.prototype as any, "sendRecordToDLQ").mockResolvedValue("");
        const output = await svc.isRetryableError(error, []);
        expect(output).toBeFalsy();
        expect(sendRecordMock).toHaveBeenCalled();
      });
    });

    describe("with  500-ish  error", ()  =>  {
      it("returns false and doesn't send message", async  () => {
        const error = {statusCode: 500} as AWSError;
        const sendRecordMock = jest.spyOn(DispatchService.prototype as any, "sendRecordToDLQ").mockResolvedValue("");
        const output = await svc.isRetryableError(error, []);
        expect(output).toBeTruthy();
        expect(sendRecordMock).not.toHaveBeenCalled();
      });
    });
  });
});
