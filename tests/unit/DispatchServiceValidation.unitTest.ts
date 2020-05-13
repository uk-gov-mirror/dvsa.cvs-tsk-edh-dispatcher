import {ITarget} from "../../src/models";
import {Configuration} from "../../src/utils/Configuration";
import {DispatchService} from "../../src/services/DispatchService";
import testResult from "../resources/demoTestResult.json";

describe("isValidMessageBody", () => {
  let origProcEnv: any;
  beforeAll(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.restoreAllMocks();
    origProcEnv = process.env
  });
  const target: ITarget = {
    queue: "",
    dlQueue: "",
    swaggerSpecFile: "API_Vehicle_Test_Results_CVS->EDH_v1.yaml",
    schemaItem: "completeTestResults",
    endpoints: {
      INSERT: "",
      MODIFY: "",
      REMOVE: "",
    }
  };
  describe("When validation = true", () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
    beforeAll(() => {
      process.env.VALIDATION = "TRUE";
    })
    afterAll(() => {
      process.env = origProcEnv;
    })

    it("returns false when evaluating a completely invalid record against a valid spec", async () => {
      const svc = new DispatchService(new (jest.fn()), new (jest.fn()));
      const output = await svc.isValidMessageBody({something: "invalid"}, target);
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
    beforeAll(() => {
      process.env.VALIDATION = "false";
    })
    afterAll(() => {
      process.env = origProcEnv;
    })

    it("always returns true", async () => {
      const svc = new DispatchService(new (jest.fn()), new (jest.fn()));
      const output = await svc.isValidMessageBody({something: "invalid"}, target);
      expect(output).toEqual(true);
    });
  });
  describe("when validation is not set in secrets", () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
    it("always returns true", async () => {
      const svc = new DispatchService(new (jest.fn()), new (jest.fn()));
      const output = await svc.isValidMessageBody({something: "invalid"}, target);
      expect(output).toEqual(true);
    });
  });
});
