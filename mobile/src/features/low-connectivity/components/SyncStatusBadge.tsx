import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { SyncStatus } from "../types/offlineQueue.types";

interface SyncStatusBadgeProps {
  status: SyncStatus;
  pendingCount: number;
  onRetry?: () => void;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({ status, pendingCount, onRetry }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case "SYNCED":
        return {
          bgColor: "#ECFDF5",
          borderColor: "#10B981",
          textColor: "#065F46",
          label: "Synced with Cloud",
          dotColor: "#10B981",
        };
      case "WAITING_FOR_CONNECTION":
        return {
          bgColor: "#FEFCE8",
          borderColor: "#F59E0B",
          textColor: "#92400E",
          label: `Waiting for Connection (${pendingCount} queued)`,
          dotColor: "#F59E0B",
        };
      case "SYNCING":
        return {
          bgColor: "#EFF6FF",
          borderColor: "#3B82F6",
          textColor: "#1E40AF",
          label: `Syncing ${pendingCount} emergency records...`,
          dotColor: "#3B82F6",
        };
      case "FAILED":
        return {
          bgColor: "#FEF2F2",
          borderColor: "#EF4444",
          textColor: "#991B1B",
          label: `Sync Failed (${pendingCount} pending) • Tap to Retry`,
          dotColor: "#EF4444",
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <TouchableOpacity
      activeOpacity={status === "FAILED" || status === "WAITING_FOR_CONNECTION" ? 0.7 : 1}
      onPress={onRetry}
      style={[
        styles.container,
        {
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
        },
      ]}
    >
      {status === "SYNCING" ? (
        <ActivityIndicator size="small" color={config.textColor} style={styles.indicator} />
      ) : (
        <View style={[styles.dot, { backgroundColor: config.dotColor }]} />
      )}
      <Text style={[styles.label, { color: config.textColor }]}>{config.label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: "flex-start",
    marginVertical: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  indicator: {
    marginRight: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
});
