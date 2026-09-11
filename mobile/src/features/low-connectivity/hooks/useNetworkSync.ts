import { useState, useEffect, useCallback } from "react";
import { offlineQueueService } from "../services/offlineQueue.service";
import { SyncStatus, OfflinePayloadType } from "../types/offlineQueue.types";

export function useNetworkSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(offlineQueueService.getStatus());
  const [pendingCount, setPendingCount] = useState<number>(offlineQueueService.getPendingCount());

  useEffect(() => {
    const unsubscribe = offlineQueueService.subscribe((status, count) => {
      setSyncStatus(status);
      setPendingCount(count);
    });
    return unsubscribe;
  }, []);

  const queueEmergency = useCallback(
    (type: OfflinePayloadType, endpoint: string, payload: Record<string, any>) => {
      return offlineQueueService.enqueue(type, endpoint, payload);
    },
    []
  );

  const triggerSync = useCallback(async (apiBaseUrl?: string) => {
    return offlineQueueService.flushQueue(apiBaseUrl);
  }, []);

  return {
    syncStatus,
    pendingCount,
    queueEmergency,
    triggerSync,
  };
}
