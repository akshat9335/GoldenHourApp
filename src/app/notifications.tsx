import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Icon, IconName } from '@/components/ui';

const ITEMS: Array<{ title: string; desc: string; time: string; icon: IconName; bg: string; href?: string }> = [
  { title: 'Accident reported nearby', desc: 'Location: 2.3 km away — tap to view incident.', time: 'Just now', icon: 'users', bg: colors.orangeBg, href: '/nearby-incident' },
  { title: 'Ambulance Assigned', desc: 'Unit KA-05-AB is on the way.', time: '2 min ago', icon: 'ambulance', bg: colors.redGlow },
  { title: 'Hospital Accepted', desc: "St. Martha's Hospital confirmed your case.", time: '5 min ago', icon: 'hospital', bg: colors.successBg },
  { title: 'AI Assessment Ready', desc: 'Severity: HIGH. Tap to view actions.', time: '9 min ago', icon: 'ai', bg: colors.blueBg },
  { title: 'System Update', desc: 'Golden Hour app updated to v2.4.', time: '1 day ago', icon: 'bell', bg: colors.grey },
];

export default function Notifications() {
  return (
    <Screen>
      <TopBar title="Notifications" back={false} />
      {ITEMS.map((n) => {
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
        return n.href ? (
          <Pressable key={n.title} onPress={() => router.push(n.href as any)}>
            {content}
          </Pressable>
        ) : (
          <View key={n.title}>{content}</View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, flexDirection: 'row', gap: 12, marginBottom: 10 },
  iconWrap: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '700', fontSize: 12.5, color: colors.ink },
  desc: { fontSize: 11.5, color: colors.inkSoft, marginTop: 2 },
  time: { fontSize: 10, color: colors.inkFaint, marginTop: 4 },
});
