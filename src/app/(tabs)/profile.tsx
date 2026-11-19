import { Text, View } from 'react-native';
import { Avatar, Badge, Button, Card, ErrorText, Screen, SectionTitle, Stat, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useGroups } from '@/lib/groups';
import { useLoad } from '@/lib/useLoad';
import * as api from '@/lib/api';
import { colors } from '@/lib/theme';

export default function Profile() {
  const { user, displayName, signOut } = useAuth();
  const { groups } = useGroups();
  const q = useLoad(async () => (user ? api.myTotals(user.id) : null), [user?.id]);
  const t = q.data;
  const judged = t ? t.COMPLETED + t.FAILED + t.MISSING : 0;
  const rate = t && judged ? Math.round((100 * t.COMPLETED) / judged) : 0;

  return (
    <Screen top refreshing={q.refreshing} onRefresh={q.onRefresh}>
      <Title>Profile</Title>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Avatar name={displayName} size={60} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800' }}>{displayName}</Text>
          <Text style={{ color: colors.muted }}>{user?.email}</Text>
        </View>
      </Card>
      <ErrorText error={q.error} onRetry={q.reload} />
      <SectionTitle>My statistics (all groups)</SectionTitle>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Stat icon="✅" label="Completed" value={t?.COMPLETED ?? 0} tint={colors.success} />
        <Stat icon="❌" label="Failed/missed" value={(t?.FAILED ?? 0) + (t?.MISSING ?? 0)} tint={colors.danger} />
        <Stat icon="📈" label="Success rate" value={`${rate}%`} />
      </View>
      <SectionTitle>{`Groups joined (${groups.length})`}</SectionTitle>
      {groups.map((g) => (
        <Card key={g.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontWeight: '600' }}>{g.name}</Text>
          <Badge label={g.role} />
        </Card>
      ))}
      <Button title="Log out" variant="danger" onPress={signOut} />
    </Screen>
  );
}
