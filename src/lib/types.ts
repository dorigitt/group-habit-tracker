export type Role = 'LEADER' | 'MEMBER';
export type CheckStatus = 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'MISSING';
export type ProofStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Group {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  strike_threshold: number;
  skips_per_member: number;
  timezone: string;
  is_demo: boolean;
  role: Role;
}
export interface Habit {
  id: string;
  group_id: string;
  name: string;
  description: string | null;
  daily_target: string | null;
  proof_required: boolean;
}
export interface Assignment {
  id: string;
  habit: Habit;
}
export interface CheckIn {
  id: string;
  assignment_id: string;
  check_date: string;
  status: CheckStatus;
  habit?: { name: string } | null;
  proof?: { id: string; status: ProofStatus } | null;
}
export interface LeaderRow {
  user_id: string;
  display_name: string;
  role: Role;
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  missing: number;
  completion_pct: number;
  streak: number;
  strikes: number;
}
export interface Member {
  user_id: string;
  role: Role;
  display_name: string;
}
export interface StrikeRow {
  id: string;
  reason: 'FAILED' | 'MISSING' | 'PROOF_REJECTED';
  created_at: string;
  check_date: string | null;
  habit_name: string | null;
}
export interface ConsequenceRow {
  id: string;
  milestone: number;
  status: 'PENDING' | 'COMPLETED';
  title: string;
  assigned_at: string;
}
export interface PendingProof {
  id: string;
  storage_path: string;
  member: string;
  habit_name: string;
  check_date: string;
}
