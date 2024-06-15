import { Observable, from, lastValueFrom } from "rxjs";
import { map, catchError, mergeMap, toArray } from "rxjs/operators";
import { Task } from "../src/task";
import { Llama } from "../src/llama";

/**
 * Runner class for managing and executing tasks in parallel using Llamas (Web Workers).
 * The Runner class provides an interface to add tasks, run them in parallel,
 * and handle their termination. It leverages RxJS Observables for efficient
 * data stream handling and task management.
 */
export class Runner {
  private tasks: Task[] = [];

  /**
   * Adds a task to the runner.
   * @param task - The task to be added.
   */
  addTask(task: Task) {
    this.tasks.push(task);
  }

  /**
   * Executes all added tasks in parallel using Llamas (Web Workers).
   * @returns An Observable that emits the results of the tasks.
   */
  runAllTasks(): Observable<any[]> {
    const taskObservables = this.tasks.map((task) =>
      from(task.run()).pipe(
        map((result) => ({ id: task.id, result })),
        catchError((error) => {
          throw new Error(
            `Failed to execute task ${task.id}: ${error.message}`
          );
        })
      )
    );

    return from(taskObservables).pipe(
      mergeMap((obs) => obs),
      toArray(),
      map((results) => results.map((result) => result.result)),
      catchError((error) => {
        throw new Error(`Failed to execute tasks: ${error.message}`);
      })
    );
  }

  /**
   * Terminates all Llamas (Web Workers) associated with the tasks.
   */
  killAllTasks() {
    this.tasks.forEach((task) => task.kill());
  }
}
