import {DispatchService} from "../../src/services/DispatchService";
import {ITarget} from "../../src/models";

describe("Dispatch Service", () => {
  describe("processPath", () => {
    const daoMock = jest.fn();
    const svc = new DispatchService(new daoMock());
    describe("with path containing regex match", () => {
      const path = "/test-string/{SystemNumber}";
      it("replaces it with the matching key of the event", () => {
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
        expect(output).toEqual("/test-string/101")
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
    const daoMock = jest.fn().mockImplementation(() => {
      return {
        putMessage: putMock,
        postMessage: postMock,
        deleteMessage: deleteMock,
      }
    });
    const target: ITarget = {
      queue: "",
      endpoints: {
        INSERT: "Ipath",
        MODIFY: "Mpath",
        REMOVE: "Rpath",
      }
    };
    const body = {"test": "value"};
    const svc = new DispatchService(new daoMock());

    describe("with invalid event type", () => {
      const event = {
        eventType: "NOT_A_THING",
        body: {}
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
        body
      };
      it("invokes the POST method with the right details", () => {
        postMock.mockReturnValueOnce("posted");
        const output = svc.processEvent(event, target);
        expect(output).toEqual("posted");
        expect(putMock).not.toHaveBeenCalled();
        expect(postMock).toHaveBeenCalled();
        expect(deleteMock).not.toHaveBeenCalled();
        expect(postMock).toHaveBeenCalledWith(body, target.endpoints.INSERT)
      });
    });

    describe("with valid MODIFY event type", () => {
      const event = {
        eventType: "MODIFY",
        body
      };
      it("invokes the PUT method with the right details", () => {
        const output = svc.processEvent(event, target);
        expect(output).toBeUndefined();
        expect(putMock).toHaveBeenCalled();
        expect(postMock).not.toHaveBeenCalled();
        expect(deleteMock).not.toHaveBeenCalled();
        expect(putMock).toHaveBeenCalledWith(body, target.endpoints.MODIFY)

      });
    });

    describe("with valid REMOVE event type", () => {
      const event = {
        eventType: "REMOVE",
        body
      };
      it("invokes the DELETE method with the right details", () => {
        const svc = new DispatchService(new daoMock());

        const output = svc.processEvent(event, target);
        expect(output).toBeUndefined();
        expect(putMock).not.toHaveBeenCalled();
        expect(postMock).not.toHaveBeenCalled();
        expect(deleteMock).toHaveBeenCalled();
        expect(deleteMock).toHaveBeenCalledWith(target.endpoints.REMOVE)
      });
    });
  });
});
