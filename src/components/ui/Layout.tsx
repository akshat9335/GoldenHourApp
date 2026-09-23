import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii } from '@/constants/theme';
import { Icon } from './Icon';
import { HTitle } from './Atoms';

export function Screen({
  children,
  center,
  padBottom = 24,
  style,
  refreshControl,
}: {
  children: React.ReactNode;
  center?: boolean;
  padBottom?: number;
  style?: StyleProp<ViewStyle>;
  refreshControl?: React.ReactElement<any>;
}) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 24);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      refreshControl={refreshControl}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        {
          paddingHorizontal: 18,
          paddingTop: topInset + 8,
          paddingBottom: padBottom + insets.bottom + 72,
          flexGrow: 1,
        },
        center && { justifyContent: 'center' },
        style,
      ]}
    >
      {children}
    </ScrollView>
  );
}

export function TopBar({ title, back = true, onPressBack }: { title: string; back?: boolean; onPressBack?: () => void }) {
  const router = useRouter();
  return (
    <View style={styles.topbar}>
      {back ? (
        <Pressable style={styles.backbtn} onPress={onPressBack || (() => router.back())}>
          <Icon name="chevL" size={14} />
        </Pressable>
      ) : null}
      <HTitle size={17}>{title}</HTitle>
    </View>
  );
}

type BannerColor = 'blue' | 'red' | 'amber' | 'success';
const bannerBg: Record<BannerColor, string> = {
  blue: colors.blueBg, red: colors.bannerRedBg, amber: colors.amberBg, success: colors.successBg,
};
const bannerFg: Record<BannerColor, string> = {
  blue: '#1A4A82', red: colors.bannerRedText, amber: colors.bannerAmberText, success: colors.bannerSuccessText,
};
export function Banner({ children, color = 'blue', icon }: { children: React.ReactNode; color?: BannerColor; icon?: React.ReactNode }) {
  return (
    <View style={[styles.banner, { backgroundColor: bannerBg[color] }]}>
      {icon}
      <Text style={[styles.bannerText, { color: bannerFg[color] }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  backbtn: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  banner: { borderRadius: 14, padding: 12, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bannerText: { fontSize: 11.5, lineHeight: 17, flex: 1 },
});
