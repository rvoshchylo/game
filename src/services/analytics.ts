export interface AnalyticsService {
  track(event: string, props?: Record<string, string | number | boolean>): void;
}

export class NoopAnalyticsService implements AnalyticsService {
  track(): void {}
}

/** Future: batched, opt-in, anonymous. Never blocks gameplay. */
export class RemoteAnalyticsService implements AnalyticsService {
  private queue: { event: string; props?: Record<string, string | number | boolean>; t: number }[] = [];
  constructor(private endpoint: string) {}
  track(event: string, props?: Record<string, string | number | boolean>): void {
    this.queue.push({ event, props, t: Date.now() });
    if (this.queue.length >= 20) this.flush();
  }
  flush(): void {
    const batch = this.queue.splice(0);
    if (batch.length) navigator.sendBeacon?.(this.endpoint, JSON.stringify(batch));
  }
}
