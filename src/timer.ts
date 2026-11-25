import type { Task } from "./types";

export interface TimerDisplay {
  seconds: number;
  progress: number;
}

export class TaskTimer {
  private running = false;
  private endAt = 0;
  private remaining = 0;
  private startedAt = 0;
  private elapsed = 0;
  private intervalId: number | undefined;

  constructor(
    private readonly onUpdate: () => void,
    private readonly onComplete: () => void,
  ) {}

  get isRunning(): boolean {
    return this.running;
  }

  reset(task: Task | undefined): void {
    this.stopInterval();
    this.remaining = task?.kind === "minutes" ? task.amount * 60 : 0;
    this.elapsed = 0;
    this.onUpdate();
  }

  toggle(task: Task | undefined): void {
    if (!task) return;

    if (this.running) {
      this.running = false;
      this.stopInterval();
      if (task.kind === "minutes") {
        this.remaining = (this.endAt - Date.now()) / 1000;
      } else {
        this.elapsed = (Date.now() - this.startedAt) / 1000;
      }
      this.onUpdate();
      return;
    }

    this.running = true;
    if (task.kind === "minutes") {
      this.endAt = Date.now() + this.remaining * 1000;
    } else {
      this.startedAt = Date.now() - this.elapsed * 1000;
    }
    this.intervalId = window.setInterval(() => this.tick(task), 500);
    this.onUpdate();
  }

  display(task: Task | undefined): TimerDisplay {
    if (!task) return { seconds: 0, progress: 1 };
    if (task.kind === "minutes") {
      return {
        seconds: this.remaining,
        progress: 1 - this.remaining / (task.amount * 60),
      };
    }
    return {
      seconds: this.elapsed,
      progress: Math.min(1, this.elapsed / (task.amount * 60)),
    };
  }

  private tick(task: Task): void {
    if (task.kind === "minutes") {
      this.remaining = (this.endAt - Date.now()) / 1000;
      if (this.remaining <= 0) {
        this.stopInterval();
        this.onComplete();
        return;
      }
    } else {
      this.elapsed = (Date.now() - this.startedAt) / 1000;
    }
    this.onUpdate();
  }

  private stopInterval(): void {
    if (this.intervalId !== undefined) {
      window.clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.running = false;
  }
}
