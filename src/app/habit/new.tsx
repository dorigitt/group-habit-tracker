import { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, Input, Loading, Screen, Title } from '@/components/ui';
import { useGroups } from '@/lib/groups';
import { useLoad } from '@/lib/useLoad';
import * as api from '@/lib/api';
import { colors } from '@/lib/theme';

export default function NewHabit() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { groups } = useGroups();
  const isLeader = groups.find((g) => g.id === groupId)?.role === 'LEADER';
  const members = useLoad(async () => (isLeader ? api.getMembers(groupId) : []), [groupId, isLeader]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState('');
  const [proof, setProof] = useState(false);
  const [everyone, setEveryone] = useState(isLeader);
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const submit = async () => {
    if (name.trim().length < 2) return setError('Give the habit a name.');
    if (isLeader && !everyone && picked.length === 0) return setError('Pick at least one member or assign to everyone.');
    setBusy(true); setError(null);
    try {
      await api.createHabit({
        groupId, name, description, target, proofRequired: proof,
        assignees: isLeader && !everyone ? picked : [],
      });
      router.back();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Screen>
      <Title sub={isLeader ? 'Members check in on it every day.' : 'Only you check in on this one. It counts toward your streak and strikes.'}>
        {isLeader ? 'New habit' : 'My own habit'}
      </Title>
      <Input label="Name" value={name} onChangeText={setName} placeholder="Study for 2 hours" />
      <Input label="Description (optional)" value={description} onChangeText={setDescription} multiline />
      <Input label="Daily target (optional)" value={target} onChangeText={setTarget} placeholder="2 hours" />
      <Card style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '600' }}>Require photo proof</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>A group leader reviews the photo.</Text>
          </View>
          <Switch value={proof} onValueChange={setProof} trackColor={{ true: colors.primary }} />
        </View>
        {isLeader && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '600' }}>Assign to all members</Text>
            <Switch value={everyone} onValueChange={setEveryone} trackColor={{ true: colors.primary }} />
          </View>
        )}
      </Card>
      {isLeader && !everyone && (members.loading ? <Loading /> : (
        <View style={{ gap: 8 }}>
          {members.data?.map((m) => {
            const on = picked.includes(m.user_id);
            return (
              <Pressable key={m.user_id} onPress={() => toggle(m.user_id)}
                style={{ padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primarySoft : '#fff' }}>
                <Text style={{ fontWeight: '600', color: on ? colors.primary : colors.text }}>{on ? '✓ ' : ''}{m.display_name}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <Button title="Create habit" onPress={submit} loading={busy} />
    </Screen>
  );
}
