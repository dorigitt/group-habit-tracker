import { useEffect, useState } from 'react';
import { Alert, Image, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Button, Card, Empty, ErrorText, Loading, Screen, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useLoad } from '@/lib/useLoad';
import * as api from '@/lib/api';
import { colors } from '@/lib/theme';
import type { PendingProof } from '@/lib/types';

function ProofCard({ p, onDone }: { p: PendingProof; onDone: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.signedProofUrl(p.storage_path).then(setUrl).catch((e) => setErr(e.message)); }, [p.storage_path]);

  const decide = async (approve: boolean) => {
    setBusy(true);
    try { await api.reviewProof(p.id, approve); onDone(); }
    catch (e: any) { Alert.alert('Could not review', e.message); }
    finally { setBusy(false); }
  };
  return (
    <Card>
      <Text style={{ fontWeight: '700', fontSize: 16 }}>{p.member} · {p.habit_name}</Text>
      <Text style={{ color: colors.muted, fontSize: 12 }}>{p.check_date}</Text>
      {url ? <Image source={{ uri: url }} style={{ width: '100%', height: 260, borderRadius: 12 }} resizeMode="cover" /> : err ? <Text style={{ color: colors.danger }}>{err}</Text> : <Loading />}
      <Button title="Approve" variant="success" onPress={() => decide(true)} disabled={busy} />
      <Button
        title="Reject (adds a strike)" variant="danger" disabled={busy}
        onPress={() => Alert.alert('Reject proof?', 'The check-in becomes FAILED and the member gets one strike.', [
          { text: 'Cancel', style: 'cancel' }, { text: 'Reject', style: 'destructive', onPress: () => decide(false) },
        ])}
      />
    </Card>
  );
}

export default function Review() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { user } = useAuth();
  const q = useLoad(async () => api.pendingProofs(groupId, user!.id), [groupId, user?.id]);
  return (
    <Screen refreshing={q.refreshing} onRefresh={q.onRefresh}>
      <Title sub="Photos waiting for your decision. You cannot review your own.">Pending proofs</Title>
      {q.loading && <Loading />}
      <ErrorText error={q.error} onRetry={q.reload} />
      {q.data?.length === 0 && <Empty text="Nothing to review 🎉" />}
      {q.data?.map((p) => <ProofCard key={p.id} p={p} onDone={q.reload} />)}
    </Screen>
  );
}
