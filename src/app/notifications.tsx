import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Icon, IconName } from '@/components/ui';
import { api } from '@/services/api';

interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  icon: IconName;
  bg: string;
  href?: string;
  read?: boolean;
}

export default function Notifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res: any = await api.notifications.getAll();
      const raw = Array.isArray(res) ? res : (res?.data || []);
      if (Array.isArray(raw)) {
        const mapped: NotificationItem[] = raw.map((d: any, index: number) => ({
          id: d.id || `notif-${index}-${Date.now()}`,
          title: d.title || 'Notification',
          desc: d.body || d.message || '',
          time: d.createdAt
            ? new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Recently',
          icon: (d.type === 'EMERGENCY' ? 'ambulance' : d.type === 'HOSPITAL' ? 'hospital' : 'bell') as IconName,
          bg: d.type === 'EMERGENCY' ? colors.redGlow : colors.blueBg,
          href: d.data?.emergencyId ? `/nearby-incident?emergencyId=${d.data.emergencyId}` : undefined,
          read: Boolean(d.read),
        }));
        setItems(mapped);
      } else {
        setItems([]);
      }
    } catch (_err) {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleClearAll = async () => {
    if (items.length === 0) return;
    try {
      setClearing(true);
      await api.notifications.clearAll();
      setItems([]);
    } catch (err) {
      console.warn('[Notifications] Clear failed:', err);
    } finally {
      setClearing(false);
    }
  };

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.red]}
          tintColor={colors.red}
        />
      }
    >
      <View style={styles.topRow}>
        <TopBar title="Notifications" back={true} onPressBack={() => router.back()} />
        {items.length > 0 && (
          <TouchableOpacity
            onPress={handleClearAll}
            disabled={clearing}
            style={styles.clearBtn}
            activeOpacity={0.7}
          >
            {clearing ? (
              <ActivityIndicator size="small" color={colors.red} />
            ) : (
              <Text style={styles.clearText}>Clear All</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={colors.red} />
          <Text style={styles.loadingText}>Fetching live alerts...</Text>
        </View>
      )}

      {!loading && items.length === 0 && (
        <Card style={styles.emptyCard}>
          <Icon name="bell" size={36} color={colors.inkSoft} />
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptySub}>
            You have no active alerts. Emergency updates, triage statuses, and medical reports will appear here in real time.
          </Text>
        </Card>
      )}

      {!loading && items.map((n, i) => {
        const content = (
          <Card style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: n.bg }]}>
              <Icon name={n.icon} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{n.title}</Text>
              <Text style={styles.desc}>{n.desc}</Text>
              <Text style={styles.time}>{n.time}</Text>
            </View>
            {n.href ? <Icon name="chevR" color={colors.inkFaint} /> : null}
          </Card>
        );
        const itemKey = n.id || `notif-item-${i}`;
        return n.href ? (
          <Pressable key={itemKey} onPress={() => router.push(n.href as any)}>
            {content}
          </Pressable>
        ) : (
          <View key={itemKey}>{content}</View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  clearText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.red,
  },
  card: { padding: 14, flexDirection: 'row', gap: 12, marginBottom: 10 },
  iconWrap: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '700', fontSize: 12.5, color: colors.ink },
  desc: { fontSize: 11.5, color: colors.inkSoft, marginTop: 2 },
  time: { fontSize: 10, color: colors.inkFaint, marginTop: 4 },
  loadingBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 20, justifyContent: 'center' },
  loadingText: { fontSize: 12, color: colors.inkFaint },
  emptyCard: { padding: 32, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, marginTop: 12 },
  emptySub: { fontSize: 12, color: colors.inkFaint, textAlign: 'center', marginTop: 6, lineHeight: 18 },
});
