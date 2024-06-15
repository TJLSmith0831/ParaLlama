import { describe, it, expect, beforeEach, vi } from "vitest";
import { Runner } from "../src/runner";
import { Task } from "../src/task";
import { encode } from "@msgpack/msgpack";
import { WorkerMock } from "./__mocks__/workerMock"; // Assuming we have the WorkerMock defined as before
import { lastValueFrom } from "rxjs";

beforeEach(() => {
  // @ts-ignore
  global.Worker = WorkerMock; // Use the Worker mock
});

describe("Runner", () => {
  let runner: Runner;

  beforeEach(() => {
    runner = new Runner();
  });

  it("should add tasks to the runner", () => {
    const task = new Task("task1", { key: "value" }, (data: any) => data.key);
    runner.addTask(task);
    expect(runner["tasks"]).toContain(task);
  });

  it("should execute all tasks in parallel and return results", async () => {
    const task1 = new Task("task1", { key: "value1" }, (data: any) => data.key);
    const task2 = new Task("task2", { key: "value2" }, (data: any) => data.key);

    runner.addTask(task1);
    runner.addTask(task2);

    const results = await lastValueFrom(runner.runAllTasks());
    expect(results).toEqual(["value1", "value2"]);
  });

  it("should terminate all Llamas (Web Workers)", () => {
    const task1 = new Task("task1", { key: "value1" }, (data: any) => data.key);
    const task2 = new Task("task2", { key: "value2" }, (data: any) => data.key);

    runner.addTask(task1);
    runner.addTask(task2);

    const spy1 = vi.spyOn(task1["llama"], "terminate");
    const spy2 = vi.spyOn(task2["llama"], "terminate");

    runner.killAllTasks();

    expect(spy1).toHaveBeenCalled();
    expect(spy2).toHaveBeenCalled();
  });
});
