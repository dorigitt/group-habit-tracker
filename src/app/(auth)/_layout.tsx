import { Stack } from 'expo-router';
import { colors } from '@/lib/theme';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerTitle: '', headerBackTitle: 'Back', headerTintColor: colors.primary, headerShadowVisible: false, headerStyle: { backgroundColor: colors.bg }, contentStyle: { backgroundColor: colors.bg } }} />
  );
}
