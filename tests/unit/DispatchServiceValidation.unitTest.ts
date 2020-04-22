import {ITarget} from "../../src/models";
import {Configuration} from "../../src/utils/Configuration";
import {DispatchService} from "../../src/services/DispatchService";
import testResult from "../resources/demoTestResult.json";

describe("isValidMessageBody", () => {
  beforeAll(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });
  const target: ITarget = {
    queue: "",
    dlQueue: "",
    swaggerSpecFile: "API_Vehicle_Testresults_28.1.yaml",
    schemaItem: "completeTestResults",
    endpoints: {
      INSERT: "",
      MODIFY: "",
      REMOVE: "",
    }
  };
  describe("When validation = true", () => {
    let secretMock: any;
    afterEach(() => {
      jest.clearAllMocks();
    });
    afterAll(() => {
      secretMock.mockRestore();
    });
    beforeAll(() => {
      secretMock = jest.spyOn(Configuration.prototype, "getSecretConfig").mockResolvedValue(Promise.resolve({
        baseUrl: "",
        apiKey: "",
        validation: "true"
      }));
    });

    it("returns false when evaluating a completely invalid record against a valid spec", async () => {
      const svc = new DispatchService(new (jest.fn()), new (jest.fn()));
      const output = await svc.isValidMessageBody({something: "invalid"}, target);
      expect(secretMock).toHaveBeenCalled();
      expect(output).toEqual(false);
    });
    it("returns true when evaluating a 'good' record against a valid spec", async () => {
      const svc = new DispatchService(new (jest.fn()), new (jest.fn()));
      const output = await svc.isValidMessageBody(testResult, target);
      expect(output).toEqual(true);
    });
  });
  describe("when validation = false", () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it("always returns true", async () => {
      const secretMock = jest.spyOn(Configuration.prototype, "getSecretConfig").mockResolvedValue(Promise.resolve({
        baseUrl: "",
        apiKey: "",
        validation: false
      }));
      const svc = new DispatchService(new (jest.fn()), new (jest.fn()));
      const output = await svc.isValidMessageBody({something: "invalid"}, target);
      expect(output).toEqual(true);
      secretMock.mockRestore();
    });
  });
  describe("when validation is not set in secrets", () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
    it("always returns true", async () => {
      const secretMock = jest.spyOn(Configuration.prototype, "getSecretConfig").mockResolvedValue(Promise.resolve({
        baseUrl: "",
        apiKey: ""
      }));
      const svc = new DispatchService(new (jest.fn()), new (jest.fn()));
      const output = await svc.isValidMessageBody({something: "invalid"}, target);
      expect(output).toEqual(true);
      secretMock.mockRestore();
    });
  })

})
