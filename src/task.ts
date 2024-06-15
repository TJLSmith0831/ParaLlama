import { encode, decode } from '@msgpack/msgpack';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { Llama } from './llama';

/**
 * Task class representing a unit of work to be executed.
 * The Task class manages data and a function, encoding and decoding them
 * for efficient transfer and execution in a parallel processing environment.
 */
export class Task {
  public taskData: Uint8Array;
  public taskFn: string;
  private llama: Llama | null = null;

  /**
   * Creates a new Task.
   *
   * @param id - The unique identifier for the task.
   * @param data - The data to be processed by the task.
   * @param func - The function to be executed by the task.
   * @throws Will throw an error if id, data, or func is not provided or invalid.
   */
  constructor(
    public id: string,
    public data: any,
    public func: Function
  ) {
    if (!id) {
      throw new Error('Task ID is required');
    }
    if (!data) {
      throw new Error('Task data is required');
    }
    if (typeof func !== 'function') {
      throw new Error('Task function must be a valid function');
    }

    this.taskData = new Uint8Array(encode(data));
    this.taskFn = func.toString();
  }

  /**
   * Determines if the dataset is considered large.
   *
   * @param data - The data to be checked.
   * @returns True if the dataset is large, otherwise false.
   */
  isLargeDataset(data: any): boolean {
    return JSON.stringify(data).length > 100000; // Example: size greater than 100KB
  }

  /**
   * Encode data using an observable stream.
   *
   * @param data - The data to be encoded.
   * @returns An Observable that emits the encoded data as a Uint8Array.
   */
  encodeDataObservable(data: any): Observable<Uint8Array> {
    return from([data]).pipe(map((item) => new Uint8Array(encode(item))));
  }

  /**
   * Update the task's data and re-encode it.
   * For large datasets, uses an observable stream.
   *
   * @param newData - The new data to be encoded.
   * @throws Will throw an error if newData is not provided or cannot be encoded.
   */
  updateData(newData: any) {
    if (!newData) {
      throw new Error('newData is required');
    }
    if (this.isLargeDataset(newData)) {
      this.encodeDataObservable(newData).subscribe({
        next: (encoded) => (this.taskData = encoded),
        error: (error) => {
          throw new Error(`Failed to encode data: ${error.message}`);
        },
      });
    } else {
      try {
        this.taskData = new Uint8Array(encode(newData));
      } catch (error) {
        throw new Error(`Failed to encode data: ${error.message}`);
      }
    }
  }

  /**
   * Update the task's function and re-encode it.
   *
   * @param newTaskFn - The new function to be serialized.
   * @throws Will throw an error if newTaskFn is not provided or is not a valid function.
   */
  updateTaskFn(newTaskFn: Function) {
    if (!newTaskFn) {
      throw new Error('newTaskFn is required');
    }
    if (typeof newTaskFn !== 'function') {
      throw new Error('newTaskFn function must be a valid function');
    }
    this.taskFn = newTaskFn.toString();
  }

  /**
   * Return the encoded data.
   *
   * @returns The encoded data as a Uint8Array.
   */
  getEncodedData(): Uint8Array {
    return this.taskData;
  }

  /**
   * Return the serialized function.
   *
   * @returns The serialized function as a string.
   */
  getEncodedFunction(): string {
    return this.taskFn;
  }

  /**
   * Return the decoded data.
   *
   * @returns The decoded data.
   */
  getDecodedData(): any {
    return decode(this.taskData);
  }

  /**
   * Return the deserialized function.
   *
   * @returns The deserialized function.
   */
  getDecodedFunction(): Function {
    return new Function(`return ${this.taskFn}`)();
  }

  /**
   * Validate the task's data and function.
   *
   * @returns True if the task is valid, otherwise false.
   */
  validate(): boolean {
    try {
      decode(this.taskData);
    } catch {
      return false;
    }

    try {
      const func = new Function(`return ${this.taskFn}`)();
      if (typeof func !== 'function') {
        return false;
      }
    } catch {
      return false;
    }

    return true;
  }

  /**
   * Return a string representation of the task.
   *
   * @returns A string representation of the task.
   */
  toString(): string {
    return `Task ID: ${this.id}, Data: ${JSON.stringify(this.getDecodedData())}, Function: ${this.taskFn}`;
  }

  /**
   * Create a deep copy of the task.
   *
   * @returns A deep copy of the task.
   */
  clone(): Task {
    const clonedData = JSON.parse(JSON.stringify(this.getDecodedData()));
    const clonedFunc = new Function(`return ${this.taskFn}`)();
    return new Task(this.id, clonedData, clonedFunc);
  }

  /**
   * Serialize the entire task into a string.
   *
   * @returns The serialized task as a string.
   */
  serialize(): string {
    return JSON.stringify({
      id: this.id,
      data: Array.from(this.taskData),
      func: this.taskFn,
    });
  }

  /**
   * Deserialize a string back into a task object.
   *
   * @param serializedTask - The serialized task string.
   * @returns The deserialized task object.
   */
  static deserialize(serializedTask: string): Task {
    const parsed = JSON.parse(serializedTask);
    const data = new Uint8Array(parsed.data);
    const func = new Function(`return ${parsed.func}`)();
    return new Task(parsed.id, decode(data), func);
  }

  /**
   * Assigns a Llama (Web Worker) to the task and starts it.
   *
   * @returns A promise that resolves with the result of the task.
   */
  run(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.llama = new Llama();

      this.llama.worker.onmessage = (e) => {
        resolve(e.data);
      };

      this.llama.worker.onerror = (error) => {
        reject(
          new Error(`Failed to execute task ${this.id}: ${error.message}`)
        );
      };

      this.llama.worker.postMessage(
        {
          func: this.getEncodedFunction(),
          data: this.getEncodedData().buffer, // Send as transferable object
        },
        [this.getEncodedData().buffer]
      ); // Transfer the ArrayBuffer
    });
  }

  /**
   * Terminates the Llama (Web Worker) associated with the task.
   */
  kill() {
    if (this.llama) {
      this.llama.terminate();
      this.llama = null;
    } else {
      throw new Error(`No worker (Llama) assigned to task ${this.id}`);
    }
  }
}
