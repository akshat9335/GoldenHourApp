import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { Screen, TopBar, Button, InputGroup, Chip } from '@/components/ui';

export default function AiAsking() {
  const [constant, setConstant] = useState(true);
  const [nausea, setNausea] = useState(true);
  return (
    <Screen>
      <TopBar title="A couple more questions" />
      <Text style={styles.sub}>This helps narrow the assessment. Skip anything you're unsure of.</Text>
      <InputGroup label="Is the pain constant or does it come and go?">
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip label="Constant" selected={constant} onPress={() => setConstant(true)} />
          <Chip label="Comes and goes" selected={!constant} onPress={() => setConstant(false)} />
        </View>
      </InputGroup>
      <InputGroup label="Any nausea or dizziness?">
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip label="Yes" selected={nausea} onPress={() => setNausea(true)} />
          <Chip label="No" selected={!nausea} onPress={() => setNausea(false)} />
        </View>
      </InputGroup>
      <Button title="Get Assessment" onPress={() => router.push('/(patient)/emergency/ai-analyzing')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sub: { color: colors.inkSoft, fontSize: 12, marginBottom: 16 },
});
