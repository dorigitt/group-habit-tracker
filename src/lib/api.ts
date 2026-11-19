import { supabase } from './supabase';
import type {
  Assignment, CheckIn, CheckStatus, ConsequenceRow, Group, Habit, LeaderRow, Member, PendingProof, StrikeRow,
} from './types';

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/** YYYY-MM-DD in the group's timezone (must match the DB's group_today()). */
export function todayIn(tz: string): string {
  try {
    return new Date().toLocaleDateString('en-CA', { timeZone: tz });
  } catch {
    return new Date().toLocaleDateString('en-CA');
  }
}
export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

// ── groups ──
export async function getMyGroups(userId: string): Promise<Group[]> {
  const rows = unwrap(
    await supabase.from('memberships').select('role, group:groups(*)').eq('user_id', userId),
  ) as any[];
  return rows
    .filter((r) => r.group)
    .map((r) => ({ ...r.group, role: r.role }) as Group)
    .sort((a, b) => a.name.localeCompare(b.name));
}
export async function createGroup(input: {
  name: string; description: string; consequences: string[]; threshold: number; skips: number;
}): Promise<string> {
  return unwrap(
    await supabase.rpc('create_group', {
      p_name: input.name, p_description: input.description, p_consequences: input.consequences,
      p_threshold: input.threshold, p_skips: input.skips, p_timezone: deviceTimezone(),
    }),
  ) as string;
}
export async function joinGroup(code: string): Promise<string> {
  return unwrap(await supabase.rpc('join_group', { p_code: code })) as string;
}
export async function getMembers(groupId: string): Promise<Member[]> {
  const rows = unwrap(
    await supabase.from('memberships').select('user_id, role, profile:profiles(display_name)').eq('group_id', groupId),
  ) as any[];
  return rows
    .map((r) => ({ user_id: r.user_id, role: r.role, display_name: r.profile?.display_name ?? 'Member' }) as Member)
    .sort((a, b) => (a.role === b.role ? a.display_name.localeCompare(b.display_name) : a.role === 'LEADER' ? -1 : 1));
}
export async function getGroupConsequenceOptions(groupId: string): Promise<string[]> {
  const rows = unwrap(
    await supabase.from('group_consequences').select('title').eq('group_id', groupId).eq('active', true).order('position'),
  ) as { title: string }[];
  return rows.map((r) => r.title);
}

// ── habits ──
export async function getGroupHabits(groupId: string): Promise<Habit[]> {
  return unwrap(await supabase.from('habits').select('*').eq('group_id', groupId).order('created_at')) as Habit[];
}
export async function createHabit(input: {
  groupId: string; name: string; description: string; target: string; proofRequired: boolean; assignees: string[];
}): Promise<string> {
  return unwrap(
    await supabase.rpc('create_habit', {
      p_group: input.groupId, p_name: input.name, p_description: input.description, p_target: input.target,
      p_proof: input.proofRequired, p_assignees: input.assignees,
    }),
  ) as string;
}
export async function myAssignments(groupId: string, userId: string): Promise<Assignment[]> {
  const rows = unwrap(
    await supabase.from('habit_assignments').select('id, habit:habits(*)').eq('group_id', groupId).eq('user_id', userId),
  ) as any[];
  return rows.filter((r) => r.habit).map((r) => ({ id: r.id, habit: r.habit as Habit }));
}

// ── check-ins ──
function mapCheckIn(r: any): CheckIn {
  const p = Array.isArray(r.proof) ? r.proof[0] : r.proof;
  return { id: r.id, assignment_id: r.assignment_id, check_date: r.check_date, status: r.status, habit: r.habit, proof: p ?? null };
}
export async function myCheckInsOn(groupId: string, userId: string, date: string): Promise<CheckIn[]> {
  const rows = unwrap(
    await supabase.from('check_ins').select('id, assignment_id, check_date, status, proof:proofs(id, status)')
      .eq('group_id', groupId).eq('user_id', userId).eq('check_date', date),
  ) as any[];
  return rows.map(mapCheckIn);
}
export async function myHistory(groupId: string, userId: string): Promise<CheckIn[]> {
  const rows = unwrap(
    await supabase.from('check_ins').select('id, assignment_id, check_date, status, habit:habits(name), proof:proofs(id, status)')
      .eq('group_id', groupId).eq('user_id', userId).order('check_date', { ascending: false }).limit(90),
  ) as any[];
  return rows.map(mapCheckIn);
}
export async function submitCheckIn(assignmentId: string, status: CheckStatus, proofPath?: string): Promise<void> {
  unwrap(await supabase.rpc('submit_check_in', { p_assignment: assignmentId, p_status: status, p_proof_path: proofPath ?? null }));
}
export async function skipsRemaining(groupId: string): Promise<number> {
  return unwrap(await supabase.rpc('skips_remaining', { p_group: groupId })) as number;
}
export async function processMissing(groupId: string): Promise<number> {
  return unwrap(await supabase.rpc('process_missing_checkins', { p_group: groupId })) as number;
}

// ── leaderboard / accountability ──
export async function leaderboard(groupId: string): Promise<LeaderRow[]> {
  return unwrap(await supabase.rpc('get_leaderboard', { p_group: groupId })) as LeaderRow[];
}
export async function strikeHistory(groupId: string, userId: string): Promise<StrikeRow[]> {
  const rows = unwrap(
    await supabase.from('strike_events')
      .select('id, reason, created_at, check_in:check_ins(check_date, habit:habits(name))')
      .eq('group_id', groupId).eq('user_id', userId).order('created_at', { ascending: false }),
  ) as any[];
  return rows.map((r) => ({
    id: r.id, reason: r.reason, created_at: r.created_at,
    check_date: r.check_in?.check_date ?? null, habit_name: r.check_in?.habit?.name ?? null,
  }));
}
export async function myConsequences(groupId: string, userId: string): Promise<ConsequenceRow[]> {
  const rows = unwrap(
    await supabase.from('consequence_assignments')
      .select('id, milestone, status, assigned_at, consequence:group_consequences(title)')
      .eq('group_id', groupId).eq('user_id', userId).order('milestone', { ascending: false }),
  ) as any[];
  return rows.map((r) => ({
    id: r.id, milestone: r.milestone, status: r.status, assigned_at: r.assigned_at, title: r.consequence?.title ?? 'Consequence',
  }));
}
export async function completeConsequence(id: string): Promise<void> {
  unwrap(await supabase.rpc('complete_consequence', { p_id: id }));
}

// ── proofs ──
export async function uploadProof(groupId: string, userId: string, assignmentId: string, uri: string): Promise<string> {
  const path = `${groupId}/${userId}/${assignmentId}-${Date.now()}.jpg`;
  const res = await fetch(uri);
  const bytes = await res.arrayBuffer();
  const { error } = await supabase.storage.from('proofs').upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(error.message);
  return path;
}
export async function signedProofUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('proofs').createSignedUrl(path, 300);
  if (error || !data) throw new Error(error?.message ?? 'Could not load image');
  return data.signedUrl;
}
export async function pendingProofs(groupId: string, myId: string): Promise<PendingProof[]> {
  const rows = unwrap(
    await supabase.from('proofs')
      .select('id, storage_path, user_id, profile:profiles(display_name), check_in:check_ins(check_date, habit:habits(name))')
      .eq('group_id', groupId).eq('status', 'PENDING').neq('user_id', myId).order('created_at'),
  ) as any[];
  return rows.map((r) => ({
    id: r.id, storage_path: r.storage_path, member: r.profile?.display_name ?? 'Member',
    habit_name: r.check_in?.habit?.name ?? 'Habit', check_date: r.check_in?.check_date ?? '',
  }));
}
export async function reviewProof(proofId: string, approve: boolean, note?: string): Promise<void> {
  unwrap(await supabase.rpc('review_proof', { p_proof: proofId, p_approve: approve, p_note: note ?? null }));
}

// ── profile ──
export async function myTotals(userId: string): Promise<Record<CheckStatus, number>> {
  const rows = unwrap(await supabase.from('check_ins').select('status').eq('user_id', userId)) as { status: CheckStatus }[];
  const t: Record<CheckStatus, number> = { COMPLETED: 0, FAILED: 0, SKIPPED: 0, MISSING: 0 };
  rows.forEach((r) => { t[r.status] += 1; });
  return t;
}

// ── demo ──
export async function demoResetToday(groupId: string): Promise<void> {
  unwrap(await supabase.rpc('demo_reset_today', { p_group: groupId }));
}
