/**
 * offlineSync.ts — Feature 9: Low-Connectivity & Offline Sync
 *
 * Queues failed API requests into AsyncStorage when there is no connectivity.
 * Automatically flushes and retries the queue the moment the network is restored.
 *
 * Usage:
 *   import { enqueueOfflineAction } from '@/services/offlineSync';
 *   await enqueueOfflineAction('/api/worker/visits', 'POST', visitPayload);
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const QUEUE_KEY = '@golden_hour_offline_queue';

export interface OfflineQueueItem {
  id: string;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'PUT';
  data: Record<string, any>;
  timestamp: string;
  retryCount: number;
}

/** Add a request to the persistent offline queue. */
export async function enqueueOfflineAction(
  endpoint: string,
  method: 'POST' | 'PATCH' | 'PUT',
  data: Record<string, any>,
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const queue: OfflineQueueItem[] = raw ? JSON.parse(raw) : [];
    const item: OfflineQueueItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      endpoint,
      method,
      data,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };
    queue.push(item);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.log(`[offlineSync] Queued ${method} ${endpoint} (total: ${queue.length})`);
  } catch (err) {
    console.warn('[offlineSync] Failed to enqueue item:', err);
  }
}

/** Flush all queued items to the backend. Returns counts of success/failure. */
export async function processOfflineQueue(
  apiBaseUrl = 'http://localhost:5000',
): Promise<{ success: number; failed: number }> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return { success: 0, failed: 0 };

    const queue: OfflineQueueItem[] = JSON.parse(raw);
    if (!queue.length) return { success: 0, failed: 0 };

    // Check connectivity before flushing
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      console.log('[offlineSync] Still offline — skipping flush.');
      return { success: 0, failed: 0 };
    }

    let success = 0;
    let failed = 0;
    const remaining: OfflineQueueItem[] = [];

    for (const item of queue) {
      try {
        const res = await fetch(`${apiBaseUrl}${item.endpoint}`, {
          method: item.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data),
        });

        if (res.ok) {
          success += 1;
          console.log(`[offlineSync] ✓ Synced ${item.method} ${item.endpoint}`);
        } else {
          item.retryCount += 1;
          remaining.push(item);
          failed += 1;
          console.warn(`[offlineSync] ✗ HTTP ${res.status} for ${item.endpoint}`);
        }
      } catch (err: any) {
        item.retryCount += 1;
        remaining.push(item);
        failed += 1;
        console.warn(`[offlineSync] ✗ Network error for ${item.endpoint}:`, err?.message);
      }
    }

    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    console.log(`[offlineSync] Flush complete — success: ${success}, failed: ${failed}`);
    return { success, failed };
  } catch (err) {
    console.warn('[offlineSync] processOfflineQueue error:', err);
    return { success: 0, failed: 0 };
  }
}

/** Returns the number of items currently in the offline queue. */
export async function getPendingCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return 0;
    return (JSON.parse(raw) as OfflineQueueItem[]).length;
  } catch {
    return 0;
  }
}

/** Clear the entire offline queue (use with caution). */
export async function clearOfflineQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

// ─── Auto-sync listener ─────────────────────────────────────────────────────
// Whenever the device regains connectivity, flush the queue automatically.
NetInfo.addEventListener((state) => {
  if (state.isConnected && state.isInternetReachable !== false) {
    console.log('[offlineSync] Network restored — attempting auto-sync…');
    processOfflineQueue();
  }
});
