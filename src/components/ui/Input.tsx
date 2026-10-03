import React, { useState } from 'react';
import { TextInput, Text, View, StyleSheet, TextInputProps, TouchableOpacity, Alert } from 'react-native';
import { colors, radii } from '@/constants/theme';

export function InputGroup({
  label,
  children,
  tooltip,
  hint,
  required,
}: {
  label?: string;
  children: React.ReactNode;
  tooltip?: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>
            {label}
            {required ? <Text style={{ color: colors.red }}> *</Text> : null}
          </Text>
          {tooltip ? (
            <TouchableOpacity
              onPress={() => Alert.alert(label || 'Information', tooltip)}
              hitSlop={10}
              style={styles.helpBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.helpText}>?</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
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
      style={[
        styles.input,
        focused && { borderColor: colors.red },
        props.multiline && { minHeight: 84, textAlignVertical: 'top' },
        props.style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: { fontSize: 11.5, fontWeight: '700', color: colors.inkSoft },
  helpBtn: {
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.inkSoft,
    lineHeight: 13,
  },
  hint: {
    fontSize: 10.5,
    color: colors.inkFaint,
    marginTop: 4,
    lineHeight: 14,
  },
  input: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 13.5,
    color: colors.ink,
    backgroundColor: '#fff',
  },
});
