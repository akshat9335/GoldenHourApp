import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/constants/theme';

interface LanguageSelectorProps {
  /** Optional additional styling for the outer wrapper */
  style?: object;
}

export const LANGUAGE_STORAGE_KEY = '@app_language';

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'mr', label: 'Marathi', native: 'मराठी', flag: '🇮🇳' },
] as const;

/**
 * Sleek, compact Language Selector.
 * Displays a tidy `🌐 हिंदी ▾` chip that fits gracefully into any header,
 * and opens an accessible, beautifully-padded language selection modal.
 */
export default function LanguageSelector({ style }: LanguageSelectorProps) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'en';
  const [modalVisible, setModalVisible] = useState(false);

  const activeLangObj = LANGUAGES.find((l) => l.code === currentLang) || LANGUAGES[0];

  const selectLanguage = async (code: 'en' | 'hi' | 'mr') => {
    try {
      await i18n.changeLanguage(code);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    } catch (_err) {}
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.compactPill, style]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.globeIcon}>🌐</Text>
        <Text style={styles.compactPillText}>{activeLangObj.native}</Text>
        <Text style={styles.caretText}>▾</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Choose Language</Text>
                <Text style={styles.modalSub}>भाषा चुनें · भाषा निवडा</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.optionsList}>
              {LANGUAGES.map((lang) => {
                const isSelected = currentLang === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.langCard, isSelected && styles.langCardSelected]}
                    onPress={() => selectLanguage(lang.code as any)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.langFlag}>{lang.flag}</Text>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.langNative, isSelected && styles.langNativeSelected]}>
                        {lang.native}
                      </Text>
                      <Text style={styles.langEnglish}>{lang.label}</Text>
                    </View>
                    {isSelected ? (
                      <View style={styles.checkCircle}>
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>✓</Text>
                      </View>
                    ) : (
                      <View style={styles.radioEmpty} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  compactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 18,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  globeIcon: {
    fontSize: 13,
  },
  compactPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
  },
  caretText: {
    fontSize: 11,
    color: colors.inkFaint,
    fontWeight: '700',
    marginLeft: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
  },
  modalSub: {
    fontSize: 12,
    color: colors.inkFaint,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  closeBtnText: {
    fontSize: 14,
    color: colors.inkSoft,
    fontWeight: '700',
  },
  optionsList: {
    gap: 10,
  },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  langCardSelected: {
    borderColor: colors.red,
    backgroundColor: '#FEF2F2',
  },
  langFlag: {
    fontSize: 24,
  },
  langNative: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  langNativeSelected: {
    color: colors.red,
  },
  langEnglish: {
    fontSize: 11.5,
    color: colors.inkSoft,
    marginTop: 1,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioEmpty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
});
