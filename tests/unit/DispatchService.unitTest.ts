import {DispatchService} from "../../src/services/DispatchService";
import {ITarget} from "../../src/models";

describe("Dispatch Service", () => {
  describe("processPath", () => {
    const reqMock = jest.fn();
    const daoMock = jest.fn();
    const svc = new DispatchService(new daoMock());
    describe("with path containing regex match", () => {
      const path = "/test-string/${SystemNumber}";
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
    const reqMock = jest.fn();
    const putMock = jest.fn();
    const postMock = jest.fn();
    const deleteMock = jest.fn();

    afterEach(() => {
      jest.clearAllMocks();
    });


    const daoMock = jest.fn().mockImplementation(() => {
      return {
        putMessage: putMock,
        postMessage: postMock,
        deleteMessage: deleteMock,
      }
    });
    const target: ITarget = {
      queueName: "",
      endpoints: {
        INSERT: "",
        MODIFY: "",
        REMOVE: "",
      }
    };
    describe("with invalid event type", () => {
      const event = {
        eventType: "NOT_A_THING",
        body: {}
      };
      const target: ITarget = {
        queueName: "",
        endpoints: {
          INSERT: "",
          MODIFY: "",
          REMOVE: "",
        }
      };
      it("invokes nothing, returns nothing", () => {
        const svc = new DispatchService(new daoMock());
        const output = svc.processEvent(event, target)
        expect(output).toBeUndefined();
        expect(putMock).not.toHaveBeenCalled();
        expect(postMock).not.toHaveBeenCalled();
        expect(deleteMock).not.toHaveBeenCalled();
      });


    });
    describe("with valid INSERT event type", () => {
      const event = {
        eventType: "INSERT",
        body: {}
      };
      it("invokes the POST method", () => {
        jest.clearAllMocks();
        const svc = new DispatchService(new daoMock());

        const output = svc.processEvent(event, target);
        expect(output).toBeUndefined();
        expect(putMock).not.toHaveBeenCalled();
        expect(postMock).toHaveBeenCalled();
        expect(deleteMock).not.toHaveBeenCalled();
      });


    });
    // describe("with valid MODIFY event type", () => {
    //   const event = {
    //     eventType: "INSERT",
    //     body: {}
    //   };
    //   it("invokes the PUT method", () => {
    //     jest.clearAllMocks();
    //     const svc = new DispatchService(new daoMock());
    //
    //     const output = svc.processEvent(event, target)
    //     expect(output).toBeUndefined();
    //     expect(putMock).toHaveBeenCalled();
    //     expect(postMock).not.toHaveBeenCalled();
    //     expect(deleteMock).not.toHaveBeenCalled();
    //   });
    //
    //
    // });
    // describe("with valid REMOVE event type", () => {
    //   const event = {
    //     eventType: "INSERT",
    //     body: {}
    //   };
    //   it("invokes the DELETE method", () => {
    //     jest.clearAllMocks();
    //     const svc = new DispatchService(new daoMock());
    //
    //     const output = svc.processEvent(event, target);
    //     expect(output).toBeUndefined();
    //     expect(putMock).not.toHaveBeenCalled();
    //     expect(postMock).not.toHaveBeenCalled();
    //     expect(deleteMock).toHaveBeenCalled();
    //   });
    //
    //
    // });
  });
});
