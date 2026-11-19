import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Button, Card, Badge, Empty, ErrorText, Loading, ProgressBar, Screen, SectionTitle, Stat, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useGroups } from '@/lib/groups';
import { useLoad } from '@/lib/useLoad';
import * as api from '@/lib/api';
import { colors, softShadow } from '@/lib/theme';
import type { Assignment, CheckStatus } from '@/lib/types';

const STATUS_ICON: Record<CheckStatus, { name: React.ComponentProps<typeof Ionicons>['name']; color: string }> = {
  COMPLETED: { name: 'checkmark-circle', color: colors.success },
  FAILED: { name: 'close-circle', color: colors.danger },
  MISSING: { name: 'close-circle', color: colors.danger },
  SKIPPED: { name: 'remove-circle', color: colors.warn },
};

export default function Home() {
  const { user, displayName } = useAuth();
  const { current, loading: groupsLoading } = useGroups();
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const firstName = displayName.split(' ')[0] || 'there';

  const q = useLoad(async () => {
    if (!current || !user) return null;
    const today = api.todayIn(current.timezone);
    const [assignments, checks, board, skips] = await Promise.all([
      api.myAssignments(current.id, user.id),
      api.myCheckInsOn(current.id, user.id, today),
      api.leaderboard(current.id),
      api.skipsRemaining(current.id),
    ]);
    const rank = board.findIndex((r) => r.user_id === user.id) + 1;
    return { assignments, checks, me: board.find((r) => r.user_id === user.id), rank, size: board.length, skips };
  }, [current?.id, user?.id]);

  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  const act = async (a: Assignment, status: 'COMPLETED' | 'FAILED' | 'SKIPPED') => {
    if (!current || !user) return;
    if (status === 'COMPLETED' && a.habit.proof_required) {
      return router.push({ pathname: '/proof', params: { assignmentId: a.id, groupId: current.id, habit: a.habit.name } });
    }
    setBusyId(a.id);
    try {
      const before = (await api.myConsequences(current.id, user.id)).length;
      await api.submitCheckIn(a.id, status);
      const after = (await api.myConsequences(current.id, user.id)).length;
      if (after > before) {
        Alert.alert('Strike limit reached', 'A consequence has been assigned to you. Open Accountability to see it.', [
          { text: 'Later' }, { text: 'View', onPress: () => router.push('/accountability') },
        ]);
      }
      await q.reload();
    } catch (e: any) { Alert.alert('Could not save', e.message); }
    finally { setBusyId(null); }
  };

  const confirm = (a: Assignment, status: 'FAILED' | 'SKIPPED') => {
    const msg = status === 'FAILED'
      ? 'Marking this as failed adds a strike.'
      : `This uses one of your skips (${q.data?.skips ?? 0} left). No strike.`;
    Alert.alert(status === 'FAILED' ? 'Mark as failed?' : 'Use a skip?', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', style: status === 'FAILED' ? 'destructive' : 'default', onPress: () => act(a, status) },
    ]);
  };

  if (groupsLoading) return <Screen top><Loading /></Screen>;

  if (!current) {
    return (
      <Screen top>
        <Title sub={dateLabel}>{`Hi ${firstName} 👋`}</Title>
        <Card>
          <Text style={{ fontSize: 18, fontWeight: '800' }}>Start with a group</Text>
          <Text style={{ color: colors.muted }}>Create a group for you and your friends, or join one with an invitation code or link.</Text>
          <Button title="Create a group" onPress={() => router.push('/group/new')} />
          <Button title="Join with a code" variant="secondary" onPress={() => router.push('/group/join')} />
        </Card>
      </Screen>
    );
  }

  const d = q.data;
  const total = d?.assignments.length ?? 0;
  const doneCount = d ? d.checks.filter((c) => c.status === 'COMPLETED').length : 0;
  const pending = d ? total - d.checks.length : 0;
  const caption = total === 0 ? 'No habits yet' : pending > 0 ? `${pending} left to check in today` : doneCount === total ? 'All done. Great work! 🎉' : 'All checked in for today';

  return (
    <Screen top refreshing={q.refreshing} onRefresh={q.onRefresh}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 1, color: colors.muted }}>{dateLabel.toUpperCase()}</Text>
          <Text style={{ fontSize: 30, fontWeight: '800', color: colors.text, letterSpacing: -0.6 }}>{`Hi ${firstName} 👋`}</Text>
        </View>
        <Pressable onPress={() => router.push('/(tabs)/profile')}><Avatar name={displayName} size={46} /></Pressable>
      </View>

      <Pressable
        onPress={() => router.push(`/group/${current.id}`)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: colors.primarySoft, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999 }}
      >
        <Ionicons name="people" size={16} color={colors.primary} />
        <Text style={{ color: colors.primary, fontWeight: '700' }}>{current.name}</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.primary} />
      </Pressable>

      {q.loading && <Loading />}
      <ErrorText error={q.error} onRetry={q.reload} />

      {d && (
        <>
          <View style={{ backgroundColor: colors.primary, borderRadius: 22, padding: 20, gap: 12, ...softShadow, shadowColor: colors.primary, shadowOpacity: 0.3 }}>
            <Text style={{ color: '#C7CBFF', fontWeight: '700', fontSize: 12, letterSpacing: 1 }}>TODAY'S PROGRESS</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={{ color: '#fff', fontSize: 46, fontWeight: '800' }}>{doneCount}</Text>
              <Text style={{ color: '#C7CBFF', fontSize: 20, fontWeight: '700' }}>/ {total} completed</Text>
            </View>
            <ProgressBar value={total ? doneCount / total : 0} color="#fff" track="rgba(255,255,255,0.25)" height={8} />
            <Text style={{ color: '#E0E2FF', fontWeight: '600' }}>{caption}</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Stat icon="🔥" label="Day streak" value={d.me?.streak ?? 0} />
            <Stat icon="⚡" label={`Strikes of ${current.strike_threshold}`} value={d.me?.strikes ?? 0} tint={(d.me?.strikes ?? 0) > 0 ? colors.danger : undefined} />
            <Stat icon="⏭️" label="Skips left" value={d.skips} />
          </View>

          <Pressable onPress={() => router.push('/(tabs)/leaderboard')}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.warnSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="trophy" size={20} color={colors.warn} />
              </View>
              <Text style={{ flex: 1, fontSize: 15 }}>
                You are <Text style={{ fontWeight: '800' }}>#{d.rank || '-'}</Text> of {d.size} on the leaderboard
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Card>
          </Pressable>

          <SectionTitle
            right={<Pressable onPress={() => router.push({ pathname: '/habit/new', params: { groupId: current.id } })}><Text style={{ color: colors.primary, fontWeight: '700' }}>+ New habit</Text></Pressable>}
          >
            Today's habits
          </SectionTitle>
          {d.assignments.length === 0 && <Empty icon="leaf-outline" text="No habits yet. Add your own with “+ New habit”." />}
          {d.assignments.map((a) => {
            const c = d.checks.find((x) => x.assignment_id === a.id);
            const st = c ? STATUS_ICON[c.status] : null;
            return (
              <Card key={a.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Ionicons name={st ? st.name : 'ellipse-outline'} size={28} color={st ? st.color : '#C9CDD8'} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700' }}>{a.habit.name}</Text>
                    {a.habit.daily_target ? <Text style={{ color: colors.muted }}>Target: {a.habit.daily_target}</Text> : null}
                    {a.habit.proof_required ? <Text style={{ color: colors.primary, fontSize: 12, marginTop: 2 }}>📷 Photo proof required</Text> : null}
                  </View>
                  {c ? (
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Badge label={c.status} />
                      {c.proof ? <Badge label={`Proof ${c.proof.status.toLowerCase()}`} kind={c.proof.status} /> : null}
                    </View>
                  ) : null}
                </View>
                {!c && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button small variant="success" title="Done" loading={busyId === a.id} onPress={() => act(a, 'COMPLETED')} />
                    <Button small variant="danger" title="Failed" disabled={busyId === a.id} onPress={() => confirm(a, 'FAILED')} />
                    <Button small variant="secondary" title="Skip" disabled={busyId === a.id || d.skips <= 0} onPress={() => confirm(a, 'SKIPPED')} />
                  </View>
                )}
              </Card>
            );
          })}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <Button title="Accountability" variant="secondary" onPress={() => router.push('/accountability')} />
            <Button title="History" variant="secondary" onPress={() => router.push('/history')} />
          </View>
        </>
      )}
    </Screen>
  );
}
