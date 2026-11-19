import { Alert, Text, View } from 'react-native';
import { Badge, Button, Card, Empty, ErrorText, Loading, ProgressBar, Screen, SectionTitle, Stat, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useGroups } from '@/lib/groups';
import { useLoad } from '@/lib/useLoad';
import * as api from '@/lib/api';
import { colors } from '@/lib/theme';

const REASONS = { FAILED: 'Failed check-in', MISSING: 'Missed deadline', PROOF_REJECTED: 'Proof rejected' } as const;

export default function Accountability() {
  const { user } = useAuth();
  const { current } = useGroups();
  const q = useLoad(async () => {
    if (!current || !user) return null;
    const [strikes, cons, skips] = await Promise.all([
      api.strikeHistory(current.id, user.id), api.myConsequences(current.id, user.id), api.skipsRemaining(current.id),
    ]);
    return { strikes, cons, skips };
  }, [current?.id, user?.id]);

  const complete = async (id: string) => {
    try { await api.completeConsequence(id); q.reload(); } catch (e: any) { Alert.alert('Error', e.message); }
  };

  if (!current) return <Screen><Empty text="Join a group first." /></Screen>;
  const th = current.strike_threshold;
  const n = q.data?.strikes.length ?? 0;
  const toNext = th - (n % th);

  return (
    <Screen refreshing={q.refreshing} onRefresh={q.onRefresh}>
      <Title sub={current.name}>Accountability</Title>
      {q.loading && <Loading />}
      <ErrorText error={q.error} onRetry={q.reload} />
      {q.data && (
        <>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Stat label="Total strikes" value={n} tint={n ? colors.danger : undefined} />
            <Stat label="Skips left" value={q.data.skips} />
            <Stat label="Consequences" value={q.data.cons.length} />
          </View>
          <Card>
            <Text style={{ fontWeight: '700' }}>Rule: every {th} strikes = 1 consequence</Text>
            <ProgressBar value={(n % th) / th} />
            <Text style={{ color: colors.muted }}>{toNext} more strike{toNext === 1 ? '' : 's'} until your next consequence.</Text>
          </Card>

          <SectionTitle>My consequences</SectionTitle>
          {q.data.cons.length === 0 && <Empty text="None assigned. Keep it up!" />}
          {q.data.cons.map((c) => (
            <Card key={c.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Text style={{ flex: 1, fontSize: 16, fontWeight: '700' }}>{c.title}</Text>
                <Badge label={c.status} kind={c.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING'} />
              </View>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Reached at strike {c.milestone * th} · assigned {new Date(c.assigned_at).toLocaleDateString()}</Text>
              {c.status === 'PENDING' && <Button title="Mark as completed" variant="success" onPress={() => complete(c.id)} />}
            </Card>
          ))}

          <SectionTitle>Strike history</SectionTitle>
          {q.data.strikes.length === 0 && <Empty text="No strikes. 🎉" />}
          {q.data.strikes.map((s) => (
            <Card key={s.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600' }}>{s.habit_name ?? 'Habit'}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{s.check_date ?? ''}</Text>
              </View>
              <Badge label={REASONS[s.reason]} kind="FAILED" />
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
