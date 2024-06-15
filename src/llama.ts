/**
 * Llama class responsible for managing Web Workers.
 * The Llama class encapsulates the creation and management of a Web Worker
 * that processes tasks in parallel using encoded data.
 *
 * ### Purpose
 * The ParaLlama framework aims to provide efficient client-side parallel processing
 * using Web Workers. In this context, each "Llama" represents a worker that can handle
 * tasks concurrently, allowing for the distribution of computationally intensive operations.
 *
 * Using Llamas (Web Workers) for parallel work offers several advantages:
 * - **Concurrency**: Llamas enable true parallel execution of tasks, leveraging multiple
 *   threads provided by the browser's Web Worker API.
 * - **Efficiency**: By offloading heavy computations to Llamas, the main thread remains
 *   responsive, enhancing the overall performance and user experience of web applications.
 * - **Isolation**: Each Llama runs in its own thread, ensuring that errors in one task
 *   do not affect others, leading to more robust and fault-tolerant applications.
 * - **Scalability**: The framework can easily scale with the complexity and size of tasks,
 *   as Llamas can process large datasets efficiently through parallelism and encoding mechanisms.
 *
 * ### Implementation
 * The Llama class encapsulates the logic required to create and manage Web Workers. It:
 * - Defines the worker script to be executed.
 * - Creates a Blob from the script and generates a URL.
 * - Instantiates a Web Worker using the URL.
 * - Provides methods to interact with and terminate the worker.
 *
 * The worker script is designed to:
 * - Receive a task function and encoded data.
 * - Decode the data using MessagePack.
 * - Execute the task function with the decoded data.
 * - Post the result back to the main thread.
 */
export class Llama {
  /**
   * The script that the worker will execute.
   * This script decodes the data, executes the function, and posts the result back.
   */
  private static workerScript = `
    self.onmessage = function(e) {
      const { func, data } = e.data;
      const taskFn = new Function('return ' + func)();
      const decodedData = msgpack.decode(new Uint8Array(data));
      const result = taskFn(decodedData);
      self.postMessage(result);
    };
  `;

  /**
   * The Blob containing the worker script.
   * The Blob is created from the worker script and has a MIME type of 'application/javascript'.
   */
  private static workerBlob = new Blob([Llama.workerScript], {
    type: "application/javascript",
  });

  /**
   * The URL created from the Blob.
   * This URL can be used to create new Web Workers.
   */
  private static workerURL = URL.createObjectURL(Llama.workerBlob);

  /**
   * The Web Worker instance.
   */
  public worker: Worker;

  /**
   * Creates a new Llama instance and initializes the Web Worker.
   * The worker is created using the URL derived from the Blob containing the worker script.
   */
  constructor() {
    this.worker = new Worker(Llama.workerURL);
  }

  /**
   * Terminates the Web Worker.
   * This method stops the worker from running any further code.
   */
  terminate() {
    this.worker.terminate();
  }
}
