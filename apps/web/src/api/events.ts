/**
 * Real-time Server-Sent Events (SSE) Client
 * Connects to /api/events/stream and notifies subscribers on event reception.
 */

export type SSEEventCallback = (data: any) => void;

class EventStreamManager {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<SSEEventCallback>> = new Map();
  private isConnected: boolean = false;
  private reconnectTimer: any = null;
  private connectionChangeCallbacks: Set<(connected: boolean) => void> = new Set();

  public connect(url: string = "/api/events/stream") {
    if (this.eventSource) return;

    try {
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.notifyConnection(true);
      };

      this.eventSource.onerror = () => {
        this.isConnected = false;
        this.notifyConnection(false);
        this.cleanup();
        // Auto-reconnect after 4s
        this.reconnectTimer = setTimeout(() => this.connect(url), 4000);
      };

      // Listen for custom event types
      const registeredTypes = [
        "connected",
        "webhook_received",
        "migration_started",
        "migration_completed",
        "scan_completed",
      ];

      for (const type of registeredTypes) {
        this.eventSource.addEventListener(type, (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            this.emit(type, data);
            this.emit("*", { type, ...data });
          } catch {
            this.emit(type, e.data);
          }
        });
      }
    } catch (err) {
      this.isConnected = false;
      this.notifyConnection(false);
    }
  }

  public on(event: string, callback: SSEEventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  public off(event: string, callback: SSEEventCallback) {
    this.listeners.get(event)?.delete(callback);
  }

  public onConnectionChange(cb: (connected: boolean) => void) {
    this.connectionChangeCallbacks.add(cb);
    cb(this.isConnected);
    return () => this.connectionChangeCallbacks.delete(cb);
  }

  private notifyConnection(connected: boolean) {
    for (const cb of this.connectionChangeCallbacks) {
      cb(connected);
    }
  }

  private emit(event: string, data: any) {
    const cbs = this.listeners.get(event);
    if (cbs) {
      for (const cb of cbs) {
        try {
          cb(data);
        } catch (e) {
          console.error("Error in SSE listener:", e);
        }
      }
    }
  }

  public disconnect() {
    this.cleanup();
  }

  private cleanup() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

export const eventStream = new EventStreamManager();

