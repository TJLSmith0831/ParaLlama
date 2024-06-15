export class Llama {
  private static workerScript = `
      self.onmessage = function(e) {
        const { func, data } = e.data;
        const taskFn = new Function('return ' + func)();
        const decodedData = msgpack.decode(new Uint8Array(data));
        const result = taskFn(decodedData);
        self.postMessage(result);
      };
    `;

  private static workerBlob = new Blob([Llama.workerScript], {
    type: 'application/javascript',
  });
  private static workerURL = URL.createObjectURL(Llama.workerBlob);

  public worker: Worker;

  constructor() {
    this.worker = new Worker(Llama.workerURL);
  }

  /**
   * Terminates the worker.
   */
  terminate() {
    this.worker.terminate();
  }
}
