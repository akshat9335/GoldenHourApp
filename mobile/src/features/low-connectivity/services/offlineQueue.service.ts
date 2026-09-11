import { QueuedEmergencyItem, SyncStatus, OfflinePayloadType } from "../types/offlineQueue.types";

/**
 * Service managing offline persistence and synchronization queue (Feature 22).
 * Operates gracefully even with intermittent 2G/EDGE or zero connectivity.
 */
export class OfflineQueueService {
  private queue: QueuedEmergencyItem[] = [];
  private syncStatus: SyncStatus = "SYNCED";
  private listeners: Array<(status: SyncStatus, pendingCount: number) => void> = [];

  public getStatus(): SyncStatus {
    return this.syncStatus;
  }

  public getPendingCount(): number {
    return this.queue.length;
  }

  public subscribe(listener: (status: SyncStatus, pendingCount: number) => void): () => void {
    this.listeners.push(listener);
    listener(this.syncStatus, this.queue.length);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => l(this.syncStatus, this.queue.length));
  }

  /**
   * Enqueues an emergency item when network is weak or absent.
   */
  public enqueue(
    payloadType: OfflinePayloadType,
    endpoint: string,
    payload: Record<string, any>,
    method: "POST" | "PUT" | "PATCH" = "POST"
  ): QueuedEmergencyItem {
    const item: QueuedEmergencyItem = {
      id: `queue-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      payloadType,
      endpoint,
      method,
      payload,
      createdAt: new Date().toISOString(),
      retryAttempts: 0,
    };

    this.queue.push(item);
    this.syncStatus = "WAITING_FOR_CONNECTION";
    this.notify();
    return item;
  }

  /**
   * Attempts to flush and synchronize all queued items to the server.
   */
  public async flushQueue(apiBaseUrl = "http://localhost:5000"): Promise<{ successCount: number; failedCount: number }> {
    if (this.queue.length === 0) {
      this.syncStatus = "SYNCED";
      this.notify();
      return { successCount: 0, failedCount: 0 };
    }

    this.syncStatus = "SYNCING";
    this.notify();

    let successCount = 0;
    let failedCount = 0;
    const remainingQueue: QueuedEmergencyItem[] = [];

    for (const item of this.queue) {
      try {
        const response = await fetch(`${apiBaseUrl}${item.endpoint}`, {
          method: item.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.payload),
        });

        if (response.ok) {
          successCount += 1;
        } else {
          item.retryAttempts += 1;
          item.lastAttemptAt = new Date().toISOString();
          item.lastError = `HTTP ${response.status}`;
          remainingQueue.push(item);
          failedCount += 1;
        }
      } catch (err: any) {
        item.retryAttempts += 1;
        item.lastAttemptAt = new Date().toISOString();
        item.lastError = err?.message || "Network Error";
        remainingQueue.push(item);
        failedCount += 1;
      }
    }

    this.queue = remainingQueue;

    if (this.queue.length === 0) {
      this.syncStatus = "SYNCED";
    } else if (failedCount > 0 && successCount === 0) {
      this.syncStatus = "WAITING_FOR_CONNECTION";
    } else {
      this.syncStatus = "FAILED";
    }

    this.notify();
    return { successCount, failedCount };
  }
}

export const offlineQueueService = new OfflineQueueService();
