import { useState } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Input, Screen, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';
import { isConfigured } from '@/lib/supabase';

export default function Login() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) return setError('Enter your email and password.');
    setBusy(true); setError(null);
    try { await signIn(email, password); }
    catch (e: any) { setError(e.message === 'Invalid login credentials' ? 'Wrong email or password.' : e.message); }
    finally { setBusy(false); }
  };

  return (
    <Screen>
      <Title sub="Log in to continue your streak.">Welcome back</Title>
      {!isConfigured && <Text style={{ color: colors.danger }}>Supabase is not configured (.env missing).</Text>}
      <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@example.com" />
      <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" placeholder="••••••••" />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <Button title="Log in" onPress={submit} loading={busy} />
      <Button title="Create an account instead" variant="ghost" onPress={() => router.replace('/(auth)/register')} />
    </Screen>
  );
}
