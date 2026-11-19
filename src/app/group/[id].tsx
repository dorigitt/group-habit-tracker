import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Avatar, Badge, Button, Card, Empty, ErrorText, Loading, Screen, SectionTitle, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useGroups } from '@/lib/groups';
import { useLoad } from '@/lib/useLoad';
import * as api from '@/lib/api';
import { copyText, inviteLink, shareInvite } from '@/lib/invite';
import { colors } from '@/lib/theme';

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { groups, current, setCurrent } = useGroups();
  const { user } = useAuth();
  const router = useRouter();
  const group = groups.find((g) => g.id === id);
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);

  const q = useLoad(async () => {
    const [members, habits, options] = await Promise.all([api.getMembers(id), api.getGroupHabits(id), api.getGroupConsequenceOptions(id)]);
    return { members, habits, options };
  }, [id]);

  if (!group) return <Screen><Loading /></Screen>;
  const isLeader = group.role === 'LEADER';
  const link = inviteLink(group.invite_code);

  const flash = (what: 'link' | 'code') => { setCopied(what); setTimeout(() => setCopied(null), 2000); };
  const doCopy = async (what: 'link' | 'code') => {
    try { await copyText(what === 'link' ? link : group.invite_code); flash(what); }
    catch (e: any) { Alert.alert('Could not copy', e.message); }
  };
  const doShare = async () => {
    try { if ((await shareInvite(group.name, group.invite_code)) === 'copied') flash('link'); }
    catch (e: any) { Alert.alert('Could not share', e.message); }
  };
  const runMissing = async () => {
    try {
      const n = await api.processMissing(group.id);
      Alert.alert('Deadline processing', n === 0 ? 'No missing check-ins found.' : `${n} missing check-in(s) recorded with strikes.`);
      q.reload();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };
  const resetDemo = async () => {
    try { await api.demoResetToday(group.id); Alert.alert('Done', "Today's check-ins for your account were reset."); }
    catch (e: any) { Alert.alert('Error', e.message); }
  };

  return (
    <Screen refreshing={q.refreshing} onRefresh={q.onRefresh}>
      <Title sub={group.description ?? undefined}>{group.name}</Title>

      <Card>
        <Text style={{ fontSize: 17, fontWeight: '800' }}>Invite friends</Text>
        <Text style={{ color: colors.muted, fontSize: 13 }}>Send them the link. It opens the app with the code filled in.</Text>
        <View style={{ backgroundColor: colors.primarySoft, borderRadius: 12, padding: 12, gap: 4 }}>
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>INVITATION CODE</Text>
          <Text selectable style={{ fontSize: 30, fontWeight: '800', letterSpacing: 4, color: colors.primary }}>{group.invite_code}</Text>
          <Text selectable numberOfLines={2} style={{ color: colors.muted, fontSize: 12 }}>{link}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button small title={copied === 'link' ? 'Link copied ✓' : 'Copy link'} onPress={() => doCopy('link')} />
          <Button small variant="secondary" title="Share" onPress={doShare} />
          <Button small variant="secondary" title={copied === 'code' ? 'Copied ✓' : 'Copy code'} onPress={() => doCopy('code')} />
        </View>
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          {group.strike_threshold} strikes = 1 consequence · {group.skips_per_member} skips per member
        </Text>
        {current?.id !== group.id ? <Button title="Make this my current group" variant="secondary" onPress={() => setCurrent(group.id)} /> : <Badge label="Current group" kind="COMPLETED" />}
      </Card>

      <ErrorText error={q.error} onRetry={q.reload} />
      {q.loading && <Loading />}

      {q.data && (
        <>
          <SectionTitle>Members</SectionTitle>
          {q.data.members.map((m) => (
            <Card key={m.user_id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar name={m.display_name} />
              <Text style={{ flex: 1, fontSize: 16, fontWeight: '600' }}>{m.display_name}{m.user_id === user?.id ? ' (you)' : ''}</Text>
              <Badge label={m.role} />
            </Card>
          ))}

          <SectionTitle>Habits</SectionTitle>
          {q.data.habits.length === 0 && <Empty icon="leaf-outline" text="No habits yet." />}
          {q.data.habits.map((h) => (
            <Card key={h.id}>
              <Text style={{ fontSize: 16, fontWeight: '700' }}>{h.name}</Text>
              {h.description ? <Text style={{ color: colors.muted }}>{h.description}</Text> : null}
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {h.daily_target ? `Target: ${h.daily_target} · ` : ''}{h.proof_required ? '📷 Proof required' : 'No proof needed'}
              </Text>
            </Card>
          ))}
          <Button
            title={isLeader ? 'Add a habit' : 'Add my own habit'}
            onPress={() => router.push({ pathname: '/habit/new', params: { groupId: group.id } })}
          />

          <SectionTitle>Agreed consequences</SectionTitle>
          <Card>{q.data.options.map((o) => <Text key={o}>• {o}</Text>)}</Card>

          {isLeader && (
            <>
              <SectionTitle>Leader tools</SectionTitle>
              <Button title="Review proof photos" variant="secondary" onPress={() => router.push({ pathname: '/review', params: { groupId: group.id } })} />
              <Button title="Process missed check-ins (past days)" variant="secondary" onPress={runMissing} />
            </>
          )}

          {group.is_demo && (
            <>
              <SectionTitle>Demo tools</SectionTitle>
              <Card style={{ backgroundColor: colors.warnSoft, borderColor: colors.warnSoft }}>
                <Text style={{ color: colors.warn, fontWeight: '700' }}>DEMO GROUP</Text>
                <Text style={{ color: colors.text, fontSize: 13 }}>
                  Seeded by scripts/seed-demo.mjs. "Reset today" deletes only your own check-ins for today (and any consequence that
                  depended on them) so the live scenario can be repeated.
                </Text>
                <Button title="Reset my check-ins for today" variant="secondary" onPress={resetDemo} />
              </Card>
            </>
          )}
        </>
      )}
    </Screen>
  );
}
