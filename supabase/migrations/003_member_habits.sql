-- Any group member can create a habit for themselves; leaders can still assign to everyone or chosen members.
-- Run once in Supabase -> SQL Editor. Safe to re-run.
create or replace function public.create_habit(
  p_group uuid, p_name text, p_description text, p_target text, p_proof boolean, p_assignees uuid[]
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_all boolean; v_ids uuid[];
begin
  if not is_member(p_group) then raise exception 'You are not a member of this group'; end if;
  if is_leader(p_group) then
    v_all := (p_assignees is null or cardinality(p_assignees) = 0);
    v_ids := p_assignees;
  else
    v_all := false;                       -- members can only create personal habits
    v_ids := array[auth.uid()];
  end if;
  insert into habits (group_id, name, description, daily_target, proof_required, assign_all, created_by)
  values (p_group, trim(p_name), nullif(trim(coalesce(p_description,'')), ''), nullif(trim(coalesce(p_target,'')), ''),
          coalesce(p_proof, false), v_all, auth.uid())
  returning id into v_id;
  insert into habit_assignments (habit_id, group_id, user_id)
    select v_id, p_group, m.user_id from memberships m
    where m.group_id = p_group and (v_all or m.user_id = any (v_ids));
  return v_id;
end $$;
