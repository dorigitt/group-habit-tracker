import { Text, View } from 'react-native';
import { Avatar, Badge, Card, Empty, ErrorText, Loading, ProgressBar, Screen, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useGroups } from '@/lib/groups';
import { useLoad } from '@/lib/useLoad';
import * as api from '@/lib/api';
import { colors } from '@/lib/theme';

export default function Leaderboard() {
  const { user } = useAuth();
  const { current } = useGroups();
  const q = useLoad(async () => (current ? api.leaderboard(current.id) : []), [current?.id]);
  const medal = ['🥇', '🥈', '🥉'];

  return (
    <Screen top refreshing={q.refreshing} onRefresh={q.onRefresh}>
      <Title sub={current ? current.name : 'Join a group to see rankings'}>Leaderboard</Title>
      <Text style={{ color: colors.muted, fontSize: 12 }}>
        Ranked by completion rate (skips excluded), then streak, then total completed. Calculated live from check-ins.
      </Text>
      {q.loading && <Loading />}
      <ErrorText error={q.error} onRetry={q.reload} />
      {q.data && q.data.length === 0 && <Empty icon="trophy-outline" text="No members yet." />}
      {q.data?.map((r, i) => {
        const me = r.user_id === user?.id;
        return (
          <Card key={r.user_id} style={me ? { borderColor: colors.primary, borderWidth: 2 } : i === 0 ? { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' } : undefined}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ width: 32, fontSize: i < 3 ? 26 : 16, fontWeight: '700', textAlign: 'center' }}>{medal[i] ?? i + 1}</Text>
              <Avatar name={r.display_name} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700' }}>{r.display_name}{me ? ' (you)' : ''}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{r.completed} completed · {r.failed + r.missing} failed/missed · {r.skipped} skipped</Text>
              </View>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.primary }}>{r.completion_pct}%</Text>
            </View>
            <ProgressBar value={r.completion_pct / 100} height={6} />
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Badge label={`🔥 ${r.streak} day streak`} kind="MEMBER" />
              <Badge label={`⚡ ${r.strikes} strike${r.strikes === 1 ? '' : 's'}`} kind={r.strikes > 0 ? 'FAILED' : 'MEMBER'} />
              {r.role === 'LEADER' ? <Badge label="LEADER" /> : null}
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
