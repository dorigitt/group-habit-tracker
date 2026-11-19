import '@/lib/webAlert';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useGlobalSearchParams, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/lib/auth';
import { GroupsProvider } from '@/lib/groups';
import { PhoneFrame } from '@/components/PhoneFrame';
import { colors } from '@/lib/theme';

const PENDING_CODE = 'ght.pendingInviteCode';

function Gate() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const params = useGlobalSearchParams<{ code?: string }>();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const first = segments[0] as string | undefined;
    const second = segments[1] as string | undefined;
    const isPublic = !first || first === '(auth)';
    const isJoinLink = first === 'group' && second === 'join';
    (async () => {
      // Someone opened an invite link without being signed in: remember the code, send them to sign up.
      if (!session && isJoinLink) {
        if (params.code) await AsyncStorage.setItem(PENDING_CODE, String(params.code));
        router.replace('/(auth)/register');
        return;
      }
      if (!session && !isPublic) { router.replace('/'); return; }
      if (session && isPublic) {
        const pending = await AsyncStorage.getItem(PENDING_CODE);
        if (pending) {
          await AsyncStorage.removeItem(PENDING_CODE);
          router.replace({ pathname: '/group/join', params: { code: pending } });
        } else {
          router.replace('/(tabs)');
        }
      }
    })();
  }, [session, loading, segments, params.code]);

  const pushed = { headerShown: true, headerBackTitle: 'Back', headerTintColor: colors.primary, headerStyle: { backgroundColor: colors.bg }, headerShadowVisible: false } as const;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="group/new" options={{ ...pushed, title: 'New group' }} />
      <Stack.Screen name="group/join" options={{ ...pushed, title: 'Join a group' }} />
      <Stack.Screen name="group/[id]" options={{ ...pushed, title: 'Group' }} />
      <Stack.Screen name="habit/new" options={{ ...pushed, title: 'New habit' }} />
      <Stack.Screen name="proof" options={{ ...pushed, title: 'Submit proof' }} />
      <Stack.Screen name="review" options={{ ...pushed, title: 'Review proofs' }} />
      <Stack.Screen name="accountability" options={{ ...pushed, title: 'Accountability' }} />
      <Stack.Screen name="history" options={{ ...pushed, title: 'Habit history' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <PhoneFrame>
      <SafeAreaProvider>
        <AuthProvider>
          <GroupsProvider>
            <StatusBar style="dark" />
            <Gate />
          </GroupsProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </PhoneFrame>
  );
}
