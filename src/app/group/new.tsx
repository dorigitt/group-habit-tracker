import { useState } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Input, Screen, Title } from '@/components/ui';
import * as api from '@/lib/api';
import { useGroups } from '@/lib/groups';
import { colors } from '@/lib/theme';

const DEFAULTS = 'Buy coffee for the group\nComplete an additional study session\nOrganize the next group meeting';

export default function NewGroup() {
  const router = useRouter();
  const { refresh, setCurrent } = useGroups();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [consequences, setConsequences] = useState(DEFAULTS);
  const [threshold, setThreshold] = useState('3');
  const [skips, setSkips] = useState('2');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const th = parseInt(threshold, 10); const sk = parseInt(skips, 10);
    if (name.trim().length < 2) return setError('Give the group a name.');
    if (!(th >= 1 && th <= 10)) return setError('Strikes per consequence must be between 1 and 10.');
    if (!(sk >= 0 && sk <= 30)) return setError('Skips must be between 0 and 30.');
    setBusy(true); setError(null);
    try {
      const id = await api.createGroup({
        name, description, threshold: th, skips: sk,
        consequences: consequences.split('\n').map((s) => s.trim()).filter(Boolean),
      });
      await refresh(); setCurrent(id);
      router.replace(`/group/${id}`);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Screen>
      <Title sub="You will be the group leader.">Create a group</Title>
      <Input label="Group name" value={name} onChangeText={setName} placeholder="30-Day Study Challenge" />
      <Input label="Description (optional)" value={description} onChangeText={setDescription} multiline />
      <Input label="Strikes per consequence" value={threshold} onChangeText={setThreshold} keyboardType="number-pad" />
      <Input label="Skips per member" value={skips} onChangeText={setSkips} keyboardType="number-pad" />
      <Input label="Consequences (one per line)" value={consequences} onChangeText={setConsequences} multiline />
      <Text style={{ color: colors.muted, fontSize: 12 }}>
        Consequences must be safe and agreed by every member before they join. Share the list when you invite people.
      </Text>
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <Button title="Create group" onPress={submit} loading={busy} />
    </Screen>
  );
}
