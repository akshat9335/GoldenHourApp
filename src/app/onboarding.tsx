import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Button, Icon, IconName } from '@/components/ui';

const SLIDES: Array<{ title: string; desc: string; icon: IconName }> = [
  { title: 'One button. Immediate help.', desc: 'Hold the SOS button and Golden Hour alerts an AI assistant, ambulance, and hospital — instantly.', icon: 'ambulance' },
  { title: 'AI that understands emergencies', desc: "Describe what's happening. Our AI assesses severity and recommends the right response before help arrives.", icon: 'ai' },
  { title: 'Live coordination, start to finish', desc: 'Track your ambulance, see hospital readiness, and keep your emergency contacts informed in real time.', icon: 'map' },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const s = SLIDES[step];

  const next = () => {
    if (step === SLIDES.length - 1) router.replace('/role-selection');
    else setStep(step + 1);
  };

  return (
    <View style={styles.container}>
      <View />
      <View style={{ alignItems: 'center' }}>
        <View style={styles.iconWrap}>
          <Icon name={s.icon} size={40} color={colors.red} />
        </View>
        <Text style={styles.title}>{s.title}</Text>
        <Text style={styles.desc}>{s.desc}</Text>
      </View>
      <View>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>
        <Button title={step === SLIDES.length - 1 ? 'Get Started' : 'Next'} onPress={next} />
        {step < SLIDES.length - 1 && <Button title="Skip" variant="ghost" onPress={() => router.replace('/role-selection')} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24, paddingTop: 60, paddingBottom: 40, justifyContent: 'space-between' },
  iconWrap: { width: 96, height: 96, borderRadius: 28, backgroundColor: colors.redGlow, alignItems: 'center', justifyContent: 'center', marginBottom: 26 },
  title: { fontWeight: '700', fontSize: 20, textAlign: 'center', marginBottom: 10, color: colors.ink },
  desc: { color: colors.inkSoft, fontSize: 13, lineHeight: 21, textAlign: 'center', paddingHorizontal: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 20 },
  dot: { width: 6, height: 6, borderRadius: 4, backgroundColor: colors.line },
  dotActive: { width: 18, backgroundColor: colors.red },
});
