import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
import {
  Screen, HTitle, LabelEyebrow, Card, Button, Pill, Chip, Toggle, Input,
  Stepper, SosHold, Banner, Icon,
} from '@/components/ui';

const SWATCHES: Array<[string, string]> = [
  ['Emergency Red', colors.red],
  ['Dark Red', colors.redDark],
  ['Off White', colors.bg],
  ['Ink', colors.ink],
  ['Success', colors.success],
  ['Accent Blue', colors.blue],
];

export default function DesignSystem() {
  return (
    <Screen>
      <HTitle size={18}>Golden Hour — Design Reference</HTitle>
      <View style={{ height: 16 }} />

      <LabelEyebrow>COLOR TOKENS</LabelEyebrow>
      <View style={styles.swatchGrid}>
        {SWATCHES.map(([label, hex]) => (
          <View key={label} style={{ width: '31%' }}>
            <View style={[styles.swatch, { backgroundColor: hex }, hex === colors.bg && styles.swatchBorder]} />
            <Text style={styles.swatchLabel}>{label}</Text>
            <Text style={styles.swatchSub}>{hex}</Text>
          </View>
        ))}
      </View>

      <LabelEyebrow>BUTTONS — STATES</LabelEyebrow>
      <View style={{ gap: 8, marginBottom: 18 }}>
        <Button title="Default" />
        <Button title="Disabled" disabled />
        <Button title="Loading" loading />
        <Button title="Secondary" variant="secondary" />
        <Button title="Blue Action" variant="blue" />
      </View>

      <LabelEyebrow>SOS BUTTON</LabelEyebrow>
      <View style={{ alignItems: 'center', marginBottom: 18 }}>
        <SosHold onConfirm={() => {}} />
      </View>

      <LabelEyebrow>BADGES & STATUS</LabelEyebrow>
      <View style={styles.row}>
        <Pill color="success">LOW</Pill>
        <Pill color="amber">MEDIUM</Pill>
        <Pill color="orange">HIGH</Pill>
        <Pill color="red">CRITICAL</Pill>
        <Pill color="blue">INFO</Pill>
        <Pill color="grey">NEUTRAL</Pill>
      </View>

      <LabelEyebrow>CHIPS</LabelEyebrow>
      <View style={[styles.row, { marginBottom: 18 }]}>
        <Chip label="Default" />
        <Chip label="Selected" selected />
      </View>

      <LabelEyebrow>CARDS & INPUTS</LabelEyebrow>
      <Card style={{ padding: 14, marginBottom: 10 }}>
        <Text style={{ color: colors.ink }}>Standard card — 18px radius, soft elevation</Text>
      </Card>
      <Input placeholder="Input field" style={{ marginBottom: 18 }} />

      <LabelEyebrow>TIMELINE COMPONENT</LabelEyebrow>
      <Card style={{ padding: 14, marginBottom: 18 }}>
        <Stepper steps={['Completed step', 'Active step', 'Upcoming step']} currentIndex={1} />
      </Card>

      <LabelEyebrow>TOGGLES</LabelEyebrow>
      <View style={[styles.row, { marginBottom: 18 }]}>
        <Toggle on onChange={() => {}} />
        <Toggle on={false} onChange={() => {}} />
      </View>

      <LabelEyebrow>SPACING SCALE</LabelEyebrow>
      <View style={[styles.row, { alignItems: 'flex-end', marginBottom: 6 }]}>
        {[4, 8, 12, 16, 20, 24, 32].map((s) => (
          <View key={s} style={{ width: s, height: s, backgroundColor: colors.red, borderRadius: 3 }} />
        ))}
      </View>
      <Text style={styles.swatchSub}>4 · 8 · 12 · 16 · 20 · 24 · 32px</Text>
      <View style={{ height: 18 }} />

      <Banner color="blue" icon={<Icon name="check" size={14} color={colors.blue} />}>
        Every screen in this app reuses these exact tokens — Card, Button, Pill, Chip, Toggle, Stepper — so
        patient, hospital and ambulance surfaces stay visually identical.
      </Banner>
    </Screen>
  );
}

const styles = StyleSheet.create({
  swatchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  swatch: { width: '100%', height: 64, borderRadius: 12, marginBottom: 6 },
  swatchBorder: { borderWidth: 1, borderColor: '#ddd' },
  swatchLabel: { fontSize: 10.5, fontWeight: '700', color: colors.ink },
  swatchSub: { fontSize: 9.5, color: colors.inkFaint },
  row: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 18 },
});
