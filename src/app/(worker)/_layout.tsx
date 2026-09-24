import { Redirect, Stack } from 'expo-router';
import { useAppStore } from '@/store/useAppStore';
import '@/services/i18n'; // Ensure i18n is initialized for all worker screens

/**
 * Protected layout for the ASHA / ANM Frontline Worker module.
 * Redirects non-worker users back to role selection.
 */
export default function WorkerLayout() {
  const role = useAppStore((s) => s.role);

  if (role !== 'FRONTLINE_WORKER') {
    return <Redirect href={'/asha-login' as any} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
