type Listener = (isWaking: boolean) => void;

class ServerWakingStore {
  private activePendingCount = 0;
  private isWaking = false;
  private listeners: Set<Listener> = new Set();
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  startRequest(requestId: string, delayMs = 3000) {
    if (typeof window === "undefined") return;
    const timer = setTimeout(() => {
      this.activePendingCount++;
      this.timers.delete(requestId);
      this.updateState();
    }, delayMs);
    this.timers.set(requestId, timer);
  }

  endRequest(requestId: string) {
    if (typeof window === "undefined") return;
    const timer = this.timers.get(requestId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(requestId);
    } else {
      // The 3s timer already fired and incremented pending count
      if (this.activePendingCount > 0) {
        this.activePendingCount--;
        this.updateState();
      }
    }
  }

  private updateState() {
    const nextWaking = this.activePendingCount > 0;
    if (this.isWaking !== nextWaking) {
      this.isWaking = nextWaking;
      this.listeners.forEach((fn) => fn(this.isWaking));
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.isWaking);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): boolean {
    return this.isWaking;
  }
}

export const serverWakingStore = new ServerWakingStore();
