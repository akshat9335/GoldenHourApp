import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

interface LanguageSelectorProps {
  /** Optional additional styling for the outer wrapper */
  style?: object;
}

/**
 * A reusable EN | हिंदी pill toggle.
 * Drop this anywhere in the header to allow runtime language switching.
 */
export default function LanguageSelector({ style }: LanguageSelectorProps) {
  const { i18n } = useTranslation();
  const current = i18n.language;

  const switchTo = (lang: 'en' | 'hi') => {
    if (lang !== current) i18n.changeLanguage(lang);
  };

  return (
    <View style={[styles.wrapper, style]}>
      <TouchableOpacity
        style={[styles.pill, current === 'en' && styles.pillActive]}
        onPress={() => switchTo('en')}
        activeOpacity={0.8}
      >
        <Text style={[styles.pillText, current === 'en' && styles.pillTextActive]}>
          🇬🇧 EN
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.pill, current === 'hi' && styles.pillActive]}
        onPress={() => switchTo('hi')}
        activeOpacity={0.8}
      >
        <Text style={[styles.pillText, current === 'hi' && styles.pillTextActive]}>
          🇮🇳 हिंदी
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 20,
    padding: 3,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 17,
  },
  pillActive: {
    backgroundColor: '#DC2626',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
});
