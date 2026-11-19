import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, Input, Screen, Title } from '@/components/ui';
import * as api from '@/lib/api';
import { useGroups } from '@/lib/groups';
import { colors } from '@/lib/theme';

export default function JoinGroup() {
  const router = useRouter();
  const { code: codeParam } = useLocalSearchParams<{ code?: string }>();
  const { refresh, setCurrent } = useGroups();
  const [code, setCode] = useState((codeParam ?? '').toUpperCase());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const invited = Boolean(codeParam);

  useEffect(() => { if (codeParam) setCode(String(codeParam).toUpperCase()); }, [codeParam]);

  const submit = async () => {
    if (code.trim().length < 4) return setError('Enter the invitation code from your group leader.');
    setBusy(true); setError(null);
    try {
      const id = await api.joinGroup(code);
      await refresh(); setCurrent(id);
      router.replace(`/group/${id}`);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Screen>
      <Title sub={invited ? 'A friend invited you. Check the code and join.' : 'Ask your group leader for the code or link.'}>
        {invited ? "You're invited 🎉" : 'Join a group'}
      </Title>
      <Input label="Invitation code" value={code} onChangeText={(t) => setCode(t.toUpperCase())} autoCapitalize="characters" autoCorrect={false} maxLength={12} placeholder="ABC123" />
      {invited && (
        <Card style={{ backgroundColor: colors.warnSoft, borderColor: colors.warnSoft }}>
          <Text style={{ color: colors.text, fontSize: 13 }}>
            Groups use agreed, voluntary consequences. After joining you can see them on the group page.
          </Text>
        </Card>
      )}
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <Button title="Join group" onPress={submit} loading={busy} />
    </Screen>
  );
}
