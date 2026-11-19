import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { colors } from '@/lib/theme';
import { isConfigured } from '@/lib/supabase';

export default function Welcome() {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'space-between', overflow: 'hidden' }}>
      {/* soft decorative circles */}
      <View style={{ position: 'absolute', top: -80, right: -70, width: 240, height: 240, borderRadius: 120, backgroundColor: colors.primarySoft }} />
      <View style={{ position: 'absolute', top: 120, left: -90, width: 160, height: 160, borderRadius: 80, backgroundColor: '#E6F6EC' }} />

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 18 }}>
        <View style={{
          width: 100, height: 100, borderRadius: 30, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
          shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 6,
        }}>
          <Ionicons name="people" size={54} color="#fff" />
        </View>
        <Text style={{ fontSize: 34, fontWeight: '800', color: colors.text, letterSpacing: -0.8, textAlign: 'center' }}>Group Habit Tracker</Text>
        <Text style={{ fontSize: 17, color: colors.muted, textAlign: 'center', lineHeight: 25, paddingHorizontal: 8 }}>
          Habits stick when people count on you. Build them with friends, check in every day, and agree on fair, friendly
          consequences when someone slips.
        </Text>
        <View style={{ gap: 12, marginTop: 10, alignSelf: 'stretch', paddingHorizontal: 16 }}>
          {[
            ['checkmark-circle', 'Daily check-ins with optional photo proof'],
            ['flash', 'Strikes and agreed consequences'],
            ['trophy', 'Leaderboards from real results'],
          ].map(([icon, text]) => (
            <View key={text} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={icon as any} size={20} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 15, color: colors.text, flex: 1 }}>{text}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={{ gap: 10 }}>
        {!isConfigured && (
          <Text style={{ color: colors.danger, textAlign: 'center' }}>
            Supabase is not configured. Copy .env.example to .env and add your keys (see README).
          </Text>
        )}
        <Button title="Get started" onPress={() => router.push('/(auth)/register')} />
        <Button title="Log in" variant="secondary" onPress={() => router.push('/(auth)/login')} />
      </View>
    </SafeAreaView>
  );
}
