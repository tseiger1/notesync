export type Logger = (message: string) => void;

export class StatusLogger {
  private history: { timestamp: number; message: string }[] = [];
  private listeners: Array<(message: string) => void> = [];

  log(message: string) {
    const item = { timestamp: Date.now(), message };
    this.history.push(item);
    if (this.history.length > 100) {
      this.history.shift();
    }
    this.listeners.forEach((listener) => listener(message));
  }

  onMessage(listener: (message: string) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== listener);
    };
  }

  getHistory(limit = 20) {
    return this.history.slice(-limit);
  }
}
