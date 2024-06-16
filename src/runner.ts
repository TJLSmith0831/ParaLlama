import { Observable, Subject, from, lastValueFrom } from "rxjs";
import { map, catchError, mergeMap, toArray } from "rxjs/operators";
import { Task } from "../src/task";
import { TaskStatus } from "./interfaces/taskStatus";

/**
 * Runner class for managing and executing tasks in parallel using Llamas (Web Workers).
 * The Runner class provides an interface to add tasks, run them in parallel,
 * and handle their termination. It leverages RxJS Observables for efficient
 * data stream handling and task management.
 */
export class Runner {
  private tasks: Task[] = [];
  private taskStatus = new Subject<TaskStatus>();

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
    const taskObservables = this.tasks.map(
      (task) =>
        new Observable((observer) => {
          const taskStatus: TaskStatus = {
            id: task.id,
            status: "running",
            startTime: Date.now(),
          };
          this.taskStatus.next(taskStatus);

          from(task.run())
            .pipe(
              map((result) => {
                taskStatus.status = "completed";
                taskStatus.endTime = Date.now();
                taskStatus.result = result;
                this.taskStatus.next(taskStatus);
                observer.next(result);
                observer.complete();
              }),
              catchError((error) => {
                taskStatus.status = "failed";
                taskStatus.endTime = Date.now();
                taskStatus.error = error;
                this.taskStatus.next(taskStatus);
                observer.error(error);
                return [];
              })
            )
            .subscribe();
        })
    );

    return from(taskObservables).pipe(
      mergeMap((obs) => obs.pipe(catchError((error) => []))), // Ignore errors to collect results
      toArray()
    );
  }

  /**
   * Terminates all Llamas (Web Workers) associated with the tasks.
   */
  killAllTasks() {
    this.tasks.forEach((task) => task.kill());
  }

  /**
   * Monitors task status updates and logs them.
   */
  monitorTaskStatus() {
    this.taskStatus.subscribe((status) => {
      let message = `Task ${status.id} is ${status.status}`;
      if (status.status === "running") {
        message = `Task ${status.id} is running`;
      } else if (status.status === "completed") {
        message = `Task ${status.id} has completed`;
        message += `\nTask ${status.id} completed at ${new Date(status.endTime!).toISOString()}`;
        message += `\nResult: ${status.result}`;
      } else if (status.status === "failed") {
        message = `Task ${status.id} has failed`;
        message += `\nTask ${status.id} failed at ${new Date(status.endTime!).toISOString()}`;
        message += `\nError: ${status.error}`;
      }
      console.log(message);
    });
  }
}
