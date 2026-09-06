import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Card, Divider, Toggle, Banner, Icon } from '@/components/ui';

export default function Privacy() {
  const [twoFa, setTwoFa] = useState(false);
  const [locHistory, setLocHistory] = useState(true);
  return (
    <Screen>
      <TopBar title="Privacy & Security" />
      <Banner color="blue" icon={<Icon name="check" size={14} color={colors.blue} />}>
        Medical data is only shared with first responders during an active SOS event.
      </Banner>
      <View style={{ height: 16 }} />
      <Card style={{ padding: 4 }}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Two-factor authentication</Text>
          <Toggle on={twoFa} onChange={setTwoFa} />
        </View>
        <Divider />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Location history</Text>
          <Toggle on={locHistory} onChange={setLocHistory} />
        </View>
        <Divider />
        <Pressable style={styles.row}>
          <Text style={styles.deleteText}>Delete Account</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  rowLabel: { fontSize: 13, fontWeight: '600', color: colors.ink },
  deleteText: { fontSize: 13, fontWeight: '600', color: colors.red },
});
