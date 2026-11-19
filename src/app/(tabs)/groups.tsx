import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card, Empty, Loading, Screen, Title } from '@/components/ui';
import { useGroups } from '@/lib/groups';
import { colors } from '@/lib/theme';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

export default function Groups() {
  const { groups, current, loading, refresh } = useGroups();
  const router = useRouter();
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  return (
    <Screen top refreshing={loading} onRefresh={refresh}>
      <Title sub="Accountability works better together.">Groups</Title>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Create group" onPress={() => router.push('/group/new')} />
        <Button title="Join with code" variant="secondary" onPress={() => router.push('/group/join')} />
      </View>
      {loading && groups.length === 0 && <Loading />}
      {!loading && groups.length === 0 && <Empty text="You are not in any group yet." />}
      {groups.map((g) => (
        <Pressable key={g.id} onPress={() => router.push(`/group/${g.id}`)}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ flex: 1, fontSize: 17, fontWeight: '700' }}>{g.name}</Text>
              <Badge label={g.role} />
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </View>
            {g.description ? <Text style={{ color: colors.muted }}>{g.description}</Text> : null}
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {g.id === current?.id ? '✓ Current group · ' : ''}Strikes per consequence: {g.strike_threshold} · Skips: {g.skips_per_member}
            </Text>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
