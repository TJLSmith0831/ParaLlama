import { describe, it, expect, vi, beforeEach } from "vitest";
import { Llama } from "../src/llama"; // Adjust the import based on your project structure
import { encode } from "@msgpack/msgpack";
import { WorkerMock } from "./__mocks__/workerMock"; // Import the mock

beforeEach(() => {
  // @ts-ignore
  global.Worker = WorkerMock; // Use the Worker mock
});

describe("Llama", () => {
  it("should create a worker script", () => {
    expect(Llama["workerScript"]).toContain("self.onmessage");
    expect(Llama["workerScript"]).toContain("msgpack.decode");
  });

  it("should create a Blob from the worker script", () => {
    expect(Llama["workerBlob"]).toBeInstanceOf(Blob);
    expect(Llama["workerBlob"].type).toBe("application/javascript");
  });

  it("should create a URL from the Blob", () => {
    expect(typeof Llama["workerURL"]).toBe("string");
    expect(Llama["workerURL"]).toContain("blob:");
  });

  it("should create a Worker", () => {
    const llama = new Llama();
    expect(llama.worker).toBeInstanceOf(WorkerMock);
  });

  it("should execute a task using the worker", async () => {
    const llama = new Llama();
    const func = (data: any) => data.key;
    const data = { key: "value" };
    const encodedData = new Uint8Array(encode(data));

    const promise = new Promise((resolve, reject) => {
      llama.worker.onmessage = function (e) {
        resolve(e.data);
      };

      llama.worker.onerror = function (error) {
        reject(error);
      };

      llama.worker.postMessage(
        {
          func: func.toString(),
          data: encodedData.buffer,
        },
        [encodedData.buffer]
      );
    });

    const result = await promise;
    console.log(result);
    expect(result).toBe("value");
  });

  it("should terminate the worker", () => {
    const llama = new Llama();
    const spy = vi.spyOn(llama.worker, "terminate");

    llama.terminate();

    expect(spy).toHaveBeenCalled();
  });
});
