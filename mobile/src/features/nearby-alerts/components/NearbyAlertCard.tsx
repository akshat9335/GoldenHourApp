import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { NearbyEmergencyAlert } from "../types/nearbyAlert.types";

interface NearbyAlertCardProps {
  alert: NearbyEmergencyAlert;
  onRespond: (alert: NearbyEmergencyAlert) => void;
  onDismiss: (incidentId: string) => void;
}

export const NearbyAlertCard: React.FC<NearbyAlertCardProps> = ({ alert, onRespond, onDismiss }) => {
  const getSeverityBadgeColor = () => {
    switch (alert.severity) {
      case "CRITICAL":
        return "#EF4444";
      case "HIGH":
        return "#F97316";
      case "MODERATE":
        return "#EAB308";
      default:
        return "#3B82F6";
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={[styles.badge, { backgroundColor: getSeverityBadgeColor() }]}>
          <Text style={styles.badgeText}>{alert.severity}</Text>
        </View>
        <Text style={styles.distanceText}>📍 {alert.distanceKm} km away (~{alert.etaMinutes} min)</Text>
      </View>

      <Text style={styles.description}>{alert.description}</Text>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>👥 Confirmed by {alert.confirmationCount} users</Text>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.dismissButton} onPress={() => onDismiss(alert.incidentId)}>
          <Text style={styles.dismissButtonText}>Dismiss</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.respondButton} onPress={() => onRespond(alert)}>
          <Text style={styles.respondButtonText}>I Can Assist / Respond</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  description: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
    marginBottom: 10,
  },
  metaRow: {
    marginBottom: 12,
  },
  metaText: {
    fontSize: 12,
    color: "#64748B",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  dismissButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  dismissButtonText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
  },
  respondButton: {
    flex: 2,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#DC2626",
    alignItems: "center",
  },
  respondButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
