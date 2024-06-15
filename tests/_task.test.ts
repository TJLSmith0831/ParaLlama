import { describe, it, expect, beforeEach } from "vitest";
import { Task } from "../src/task";
import { decode } from "@msgpack/msgpack";
import { lastValueFrom, of } from "rxjs";
import { map } from "rxjs/operators";
import { WorkerMock } from "./__mocks__/workerMock";

describe("Task", () => {
  beforeEach(() => {
    // @ts-ignore
    global.Worker = WorkerMock; // Use the Worker mock
  });

  describe("Simple", () => {
    it("should create a task with given id, data, and function, and encode the data", () => {
      const originalData = { key: "value" };
      const func = (data: any) => data.key;
      const task = new Task("task1", originalData, func);

      // Check the task id
      expect(task.id).toBe("task1");

      // Decode the encoded data and check if it matches the original data
      const decodedData = decode(task.taskData);
      expect(decodedData).toEqual(originalData);

      // Check if the serialized function matches the original function string
      expect(task.taskFn).toBe(func.toString());
    });

    it("should handle different data types", () => {
      const stringData = "string data";
      const numberData = 12345;
      const arrayData = [1, 2, 3, 4, 5];
      const objectData = { key: "value" };
      const func = (data: any) => data;

      expect(() => new Task("task2", stringData, func)).not.toThrow();
      expect(() => new Task("task3", numberData, func)).not.toThrow();
      expect(() => new Task("task4", arrayData, func)).not.toThrow();
      expect(() => new Task("task5", objectData, func)).not.toThrow();
    });

    it("should throw an error if task id is missing", () => {
      const data = { key: "value" };
      const func = (data: any) => data.key;
      expect(() => new Task("", data, func)).toThrow("Task ID is required");
    });

    it("should throw an error if task data is missing", () => {
      const func = (data: any) => data.key;
      expect(() => new Task("task1", null, func)).toThrow(
        "Task data is required"
      );
    });

    it("should throw an error if task function is not a valid function", () => {
      const data = { key: "value" };
      // @ts-ignore
      expect(() => new Task("task1", data, null)).toThrow(
        "Task function must be a valid function"
      );
    });

    it("should update the task data and re-encode it", () => {
      const originalData = { key: "value" };
      const newData = { key: "new value" };
      const func = (data: any) => data.key;
      const task = new Task("task1", originalData, func);

      task.updateData(newData);

      const decodedData = decode(task.taskData);
      expect(decodedData).toEqual(newData);
    });

    it("should update the task function", () => {
      const data = { key: "value" };
      const func = (data: any) => data.key;
      const newFunc = (data: any) => data.key.toUpperCase();
      const task = new Task("task1", data, func);

      task.updateTaskFn(newFunc);
      expect(task.taskFn).toBe(newFunc.toString());
    });

    it("should return the encoded data", () => {
      const data = { key: "value" };
      const func = (data: any) => data.key;
      const task = new Task("task1", data, func);

      const encodedData = task.getEncodedData();
      expect(encodedData).toBeInstanceOf(Uint8Array);
      expect(decode(encodedData)).toEqual(data);
    });

    it("should return the serialized function", () => {
      const data = { key: "value" };
      const func = (data: any) => data.key;
      const task = new Task("task1", data, func);

      const encodedFunction = task.getEncodedFunction();
      expect(encodedFunction).toBe(func.toString());
    });

    it("should return the decoded data", () => {
      const data = { key: "value" };
      const func = (data: any) => data.key;
      const task = new Task("task1", data, func);

      const decodedData = task.getDecodedData();
      expect(decodedData).toEqual(data);
    });

    it("should return the deserialized function", () => {
      const data = { key: "value" };
      const func = (data: any) => data.key;
      const task = new Task("task1", data, func);

      const deserializedFunction = task.getDecodedFunction();
      expect(deserializedFunction.toString()).toBe(func.toString());
    });

    it("should validate the task", () => {
      const data = { key: "value" };
      const func = (data: any) => data.key;
      const task = new Task("task1", data, func);

      const isValid = task.validate();
      expect(isValid).toBe(true);
    });

    it("should return a string representation of the task", () => {
      const data = { key: "value" };
      const func = (data: any) => data.key;
      const task = new Task("task1", data, func);

      const taskString = task.toString();
      expect(taskString).toBe(
        `Task ID: task1, Data: {"key":"value"}, Function: ${func.toString()}`
      );
    });

    it("should create a deep copy of the task", () => {
      const data = { key: "value" };
      const func = (data: any) => data.key;
      const task = new Task("task1", data, func);

      const clonedTask = task.clone();
      expect(clonedTask).not.toBe(task);
      expect(clonedTask.id).toBe(task.id);
      expect(clonedTask.getDecodedData()).toEqual(task.getDecodedData());
      expect(clonedTask.getDecodedFunction().toString()).toBe(
        task.getDecodedFunction().toString()
      );
    });

    it("should serialize the entire task into a string", () => {
      const data = { key: "value" };
      const func = (data: any) => data.key;
      const task = new Task("task1", data, func);

      const serializedTask = task.serialize();
      const expectedSerialization = JSON.stringify({
        id: "task1",
        data: Array.from(task.getEncodedData()),
        func: task.getEncodedFunction(),
      });
      expect(serializedTask).toBe(expectedSerialization);
    });

    it("should deserialize a string back into a task object", () => {
      const data = { key: "value" };
      const func = (data: any) => data.key;
      const task = new Task("task1", data, func);

      const serializedTask = task.serialize();
      const deserializedTask = Task.deserialize(serializedTask);

      expect(deserializedTask).not.toBe(task);
      expect(deserializedTask.id).toBe(task.id);
      expect(deserializedTask.getDecodedData()).toEqual(task.getDecodedData());
      expect(deserializedTask.getDecodedFunction().toString()).toBe(
        task.getDecodedFunction().toString()
      );
    });
  });

  describe("Observable", () => {
    it("should encode large data using an observable", async () => {
      const largeData = Array.from({ length: 100000 }, (_, i) => i); // Large array
      const func = (data: any) => data[0];
      const task = new Task("task1", largeData, func);

      const encodedData = await lastValueFrom(
        task.encodeDataObservable(largeData)
      );
      const decodedData = decode(encodedData);
      expect(decodedData).toEqual(largeData);
    });

    it("should update large data using an observable", async () => {
      const largeData = Array.from({ length: 100000 }, (_, i) => i); // Large array
      const newLargeData = Array.from({ length: 100000 }, (_, i) => i + 1); // Updated large array
      const func = (data: any) => data[0];
      const task = new Task("task1", largeData, func);

      task.updateData(newLargeData);

      const encodedData = await lastValueFrom(
        task.encodeDataObservable(newLargeData)
      );
      const decodedData = decode(encodedData);
      expect(decodedData).toEqual(newLargeData);
    });

    it("should validate large data using an observable", async () => {
      const largeData = Array.from({ length: 100000 }, (_, i) => i); // Large array
      const func = (data: any) => data[0];
      const task = new Task("task1", largeData, func);

      const isValid = await lastValueFrom(
        task.encodeDataObservable(largeData).pipe(
          map((encoded) => {
            const decodedData = decode(encoded) as number[];
            return decodedData.length === largeData.length;
          })
        )
      );

      expect(isValid).toBe(true);
    });
  });
});
