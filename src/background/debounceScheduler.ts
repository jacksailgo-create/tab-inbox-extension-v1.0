export interface DebounceTask {
  tabId: number;
  reason: string;
  scheduledAt: number;
  timerId: ReturnType<typeof setTimeout>;
}

export interface DebounceSchedulerOptions {
  minDelayMs?: number;
  maxDelayMs?: number;
}

export class DebounceScheduler {
  private readonly tasks = new Map<number, DebounceTask>();
  private readonly minDelayMs: number;
  private readonly maxDelayMs: number;

  constructor(
    private readonly handler: (tabId: number, reason: string) => Promise<void> | void,
    options: DebounceSchedulerOptions = {}
  ) {
    this.minDelayMs = options.minDelayMs ?? 900;
    this.maxDelayMs = options.maxDelayMs ?? 1500;
  }

  schedule(tabId: number, reason: string): void {
    this.cancel(tabId);
    const scheduledAt = Date.now();
    const delay = this.computeDelay(reason);
    const timerId = setTimeout(() => {
      this.tasks.delete(tabId);
      void this.handler(tabId, reason);
    }, delay);

    this.tasks.set(tabId, { tabId, reason, scheduledAt, timerId });
  }

  cancel(tabId: number): void {
    const task = this.tasks.get(tabId);
    if (!task) return;
    clearTimeout(task.timerId);
    this.tasks.delete(tabId);
  }

  clear(): void {
    for (const task of this.tasks.values()) {
      clearTimeout(task.timerId);
    }
    this.tasks.clear();
  }

  private computeDelay(reason: string): number {
    if (reason.includes("title")) return this.minDelayMs;
    if (reason.includes("created")) return this.maxDelayMs;
    return Math.round((this.minDelayMs + this.maxDelayMs) / 2);
  }
}
