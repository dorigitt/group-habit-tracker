import { Text, View } from 'react-native';
import { Badge, Card, Empty, ErrorText, Loading, Screen, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useGroups } from '@/lib/groups';
import { useLoad } from '@/lib/useLoad';
import * as api from '@/lib/api';
import { colors } from '@/lib/theme';

export default function History() {
  const { user } = useAuth();
  const { current } = useGroups();
  const q = useLoad(async () => (current && user ? api.myHistory(current.id, user.id) : []), [current?.id, user?.id]);
  return (
    <Screen refreshing={q.refreshing} onRefresh={q.onRefresh}>
      <Title sub={current?.name}>Habit history</Title>
      {q.loading && <Loading />}
      <ErrorText error={q.error} onRetry={q.reload} />
      {q.data?.length === 0 && <Empty text="No check-ins yet." />}
      {q.data?.map((c) => (
        <Card key={c.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '600' }}>{c.habit?.name ?? 'Habit'}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{c.check_date}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Badge label={c.status} />
            {c.proof ? <Badge label={`Proof ${c.proof.status.toLowerCase()}`} kind={c.proof.status} /> : null}
          </View>
        </Card>
      ))}
    </Screen>
  );
}
