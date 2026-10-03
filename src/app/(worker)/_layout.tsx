import { Redirect, Stack } from 'expo-router';
import { useAppStore } from '@/store/useAppStore';
import '@/services/i18n'; // Ensure i18n is initialized for all worker screens

/**
 * Protected layout for the ASHA / ANM Frontline Worker module.
 * Redirects non-worker users back to role selection.
 */
export default function WorkerLayout() {
  const role = useAppStore((s) => s.role);
  const roles = useAppStore((s) => s.roles);
  const userProfile = useAppStore((s) => s.userProfile);

  const activeRoles = [
    role,
    ...(roles || []),
    ...(userProfile?.roles || []),
    userProfile?.role,
  ].filter(Boolean).map((r: any) => String(r).toUpperCase());

  const isWorker =
    activeRoles.includes('FRONTLINE_WORKER') ||
    activeRoles.includes('ASHA') ||
    activeRoles.includes('WORKER');

  if (!isWorker) {
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
