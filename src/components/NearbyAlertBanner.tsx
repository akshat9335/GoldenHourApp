import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors } from '@/constants/theme';
import { api } from '@/services/api';
import { useAppStore } from '@/store/useAppStore';

interface NearbyIncidentItem {
  incidentId: string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  confirmationCount: number;
  approximateLocation?: { lat: number; lng: number };
  distanceKm?: number;
  status: string;
}

export default function NearbyAlertBanner() {
  const { t } = useTranslation();
  const lastKnownLocation = useAppStore((s) => s.lastKnownLocation);

  const [activeIncident, setActiveIncident] = useState<NearbyIncidentItem | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchNearby = async () => {
      if (!lastKnownLocation) return;
      try {
        const incidents: any = await api.location.getNearbyIncidents(
          lastKnownLocation.latitude,
          lastKnownLocation.longitude,
          10
        );

        if (mounted && Array.isArray(incidents) && incidents.length > 0) {
          // Select closest active incident
          const closest = incidents[0];
          setActiveIncident(closest);
        } else if (mounted) {
          setActiveIncident(null);
        }
      } catch {
        // Quiet fallback
      }
    };

    fetchNearby();
    const interval = setInterval(fetchNearby, 15000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [lastKnownLocation]);

  if (!activeIncident || dismissed) {
    return null;
  }

  const distance = activeIncident.distanceKm ? activeIncident.distanceKm.toFixed(1) : '1.2';
  const eta = activeIncident.distanceKm ? Math.max(1, Math.round(activeIncident.distanceKm * 2.5)) : 3;

  return (
    <View style={styles.banner}>
      <View style={styles.topRow}>
        <View style={styles.badgeWrap}>
          <Text style={styles.badgeText}>🚨 {t('nearby.alertTitle', 'NEARBY EMERGENCY ALERT')}</Text>
        </View>
        <TouchableOpacity onPress={() => setDismissed(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.dismissText}>✕</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.distanceText}>
        {t('nearby.distanceAway', '{{distance}} km away (~{{eta}} mins)', { distance, eta })}
      </Text>

      {activeIncident.confirmationCount > 0 && (
        <Text style={styles.confirmedText}>
          👥 {t('nearby.confirmedBy', 'Confirmed by {{count}} citizens', { count: activeIncident.confirmationCount })}
        </Text>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.assistBtn}
          onPress={() => router.push(`/nearby-incident?emergencyId=${activeIncident.incidentId}` as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.assistBtnText}>
            🤝 {t('nearby.iCanAssist', 'I Can Assist / Respond')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FDBA74',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeWrap: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dismissText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.inkFaint,
  },
  distanceText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 4,
  },
  confirmedText: {
    fontSize: 11.5,
    color: colors.inkSoft,
    marginTop: 2,
    fontWeight: '600',
  },
  actionRow: {
    marginTop: 10,
  },
  assistBtn: {
    backgroundColor: '#EA580C',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
});
