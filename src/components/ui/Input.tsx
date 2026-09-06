import React, { useState } from 'react';
import { TextInput, Text, View, StyleSheet, TextInputProps } from 'react-native';
import { colors, radii } from '@/constants/theme';

export function InputGroup({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {children}
    </View>
  );
}

export function Input(props: TextInputProps & { multiline?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={colors.inkFaint}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...props}
      style={[styles.input, focused && { borderColor: colors.red }, props.multiline && { minHeight: 84, textAlignVertical: 'top' }, props.style]}
    />
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11.5, fontWeight: '700', color: colors.inkSoft, marginBottom: 6 },
  input: {
    width: '100%', borderWidth: 1.5, borderColor: colors.line, borderRadius: radii.md,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 13.5, color: colors.ink, backgroundColor: '#fff',
  },
});
