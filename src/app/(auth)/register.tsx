import { useState } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Input, Screen, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';
import { isConfigured } from '@/lib/supabase';

export default function Register() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) return setError('Please enter your name.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    setBusy(true); setError(null); setInfo(null);
    try {
      const { needsConfirmation } = await signUp(name, email, password);
      if (needsConfirmation) setInfo('Account created. Check your email to confirm, then log in.');
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Screen>
      <Title sub="Takes less than a minute.">Create your account</Title>
      {!isConfigured && <Text style={{ color: colors.danger }}>Supabase is not configured (.env missing).</Text>}
      <Input label="Name" value={name} onChangeText={setName} placeholder="Alex" />
      <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@example.com" />
      <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 6 characters" />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {info ? <Text style={{ color: colors.success }}>{info}</Text> : null}
      <Button title="Sign up" onPress={submit} loading={busy} />
      <Button title="I already have an account" variant="ghost" onPress={() => router.replace('/(auth)/login')} />
    </Screen>
  );
}
