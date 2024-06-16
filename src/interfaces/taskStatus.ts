/**
 * TaskStatus interface represents the status of a task.
 * It includes the task ID, current status, start and end times,
 * result of the task, and any error that occurred during execution.
 */
export interface TaskStatus {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  startTime?: number;
  endTime?: number;
  result?: any;
  error?: any;
}
