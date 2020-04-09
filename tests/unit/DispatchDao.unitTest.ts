import {DispatchDAO} from "../../src/services/DispatchDAO";
import {Configuration} from "../../src/utils/Configuration";

describe("DispatchDAO", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  jest.spyOn(Configuration.prototype, "getSecretConfig").mockResolvedValue({
    baseUrl: "http://myEndpoint.com",
    accessToken: "abc123"
  });
  const putMock = jest.fn();
  const postMock = jest.fn();
  const deleteMock = jest.fn();
  const promiseMock = jest.fn().mockImplementation(() => {
    return {
      put: putMock,
      post: postMock,
      delete: deleteMock
    }
  });
  const svc = new DispatchDAO(new promiseMock());
  describe("putMessage", () => {
    it("invokes promise.put with correct message", async () => {
      const output = await svc.putMessage({}, "something");
      expect(putMock).toHaveBeenCalled();
      expect(postMock).not.toHaveBeenCalled();
      expect(deleteMock).not.toHaveBeenCalled();
      expect(putMock.mock.calls[0][0].method).toEqual("PUT");
      expect(putMock.mock.calls[0][0].uri).toEqual("http://myEndpoint.com/something");
      expect(putMock.mock.calls[0][0].body).toEqual("{}");
      expect(putMock.mock.calls[0][0].headers.Authorization).toEqual("Bearer abc123");
    })
  });
  describe("postMessage", () => {
    it("invokes promise.post with correct message", async () => {
      const output = await svc.postMessage({}, "something");
      expect(postMock).toHaveBeenCalled();
      expect(putMock).not.toHaveBeenCalled();
      expect(deleteMock).not.toHaveBeenCalled();
      expect(postMock.mock.calls[0][0].method).toEqual("POST");
      expect(postMock.mock.calls[0][0].uri).toEqual("http://myEndpoint.com/something");
      expect(postMock.mock.calls[0][0].body).toEqual("{}");
      expect(postMock.mock.calls[0][0].headers.Authorization).toEqual("Bearer abc123");
    })
  });
  describe("deleteMessage", () => {
    it("invokes promise.delete with correct message", async () => {
      const output = await svc.deleteMessage("something");
      expect(deleteMock).toHaveBeenCalled();
      expect(putMock).not.toHaveBeenCalled();
      expect(postMock).not.toHaveBeenCalled();
      expect(deleteMock.mock.calls[0][0].method).toEqual("DELETE");
      expect(deleteMock.mock.calls[0][0].uri).toEqual("http://myEndpoint.com/something");
      expect(deleteMock.mock.calls[0][0].body).toBeUndefined();
      expect(deleteMock.mock.calls[0][0].headers.Authorization).toEqual("Bearer abc123");
    })
  });
});
