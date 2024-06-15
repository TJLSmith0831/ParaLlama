import { decode } from "@msgpack/msgpack";

export class WorkerMock {
  onmessage: ((this: Worker, ev: MessageEvent<any>) => any) | null = null;
  onerror: ((this: AbstractWorker, ev: ErrorEvent) => any) | null = null;
  private messageListeners: Function[] = [];

  constructor(public scriptURL: string) {}

  postMessage(data: any, transfer?: Transferable[]) {
    if (this.onmessage) {
      // Simulate the worker processing
      try {
        const { func, data: encodedData } = data;
        const taskFn = new Function("return " + func)();
        const decodedData = decode(new Uint8Array(encodedData));
        const result = taskFn(decodedData);
        const event = new MessageEvent("message", { data: result });
        this.onmessage(event);
      } catch (error) {
        if (this.onerror) {
          this.onerror(new ErrorEvent("error", { message: error.message }));
        }
      }
    }
  }

  terminate() {
    // Mock terminate function
  }

  addEventListener(event: string, listener: Function) {
    if (event === "message") {
      this.messageListeners.push(listener);
    }
  }

  removeEventListener(event: string, listener: Function) {
    if (event === "message") {
      this.messageListeners = this.messageListeners.filter(
        (l) => l !== listener
      );
    }
  }
}
