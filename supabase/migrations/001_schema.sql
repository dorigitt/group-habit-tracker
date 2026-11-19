-- Group Habit Tracker: schema, business rules, RLS.
-- Run in Supabase Dashboard -> SQL Editor (or `supabase db push`).
-- All state-changing business rules live in SECURITY DEFINER functions below;
-- the mobile client only has SELECT access to tables and calls these via rpc().

create extension if not exists pgcrypto;

-- ───────────── Tables ─────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  created_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  description text,
  invite_code text not null unique,
  created_by uuid not null references public.profiles(id),
  strike_threshold int not null default 3 check (strike_threshold between 1 and 10),
  skips_per_member int not null default 2 check (skips_per_member between 0 and 30),
  timezone text not null default 'UTC',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.memberships (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('LEADER','MEMBER')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.group_consequences (   -- consequence options agreed by the group
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  position int not null default 0,
  active boolean not null default true
);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  description text,
  daily_target text,
  proof_required boolean not null default false,
  assign_all boolean not null default false,   -- auto-assign to members who join later
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.habit_assignments (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (habit_id, user_id)
);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.habit_assignments(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  check_date date not null,
  status text not null check (status in ('COMPLETED','FAILED','SKIPPED','MISSING')),
  created_at timestamptz not null default now(),
  unique (assignment_id, check_date)            -- no conflicting check-ins per day
);
create index on public.check_ins (group_id, user_id, check_date);

create table public.proofs (
  id uuid primary key default gen_random_uuid(),
  check_in_id uuid not null unique references public.check_ins(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  created_at timestamptz not null default now()
);

create table public.evidence_reviews (
  id uuid primary key default gen_random_uuid(),
  proof_id uuid not null unique references public.proofs(id) on delete cascade, -- one review per proof
  group_id uuid not null references public.groups(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id),
  decision text not null check (decision in ('APPROVED','REJECTED')),
  note text,
  created_at timestamptz not null default now()
);

create table public.strike_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  check_in_id uuid not null references public.check_ins(id) on delete cascade,
  reason text not null check (reason in ('FAILED','MISSING','PROOF_REJECTED')),
  created_at timestamptz not null default now(),
  unique (check_in_id, reason)                  -- a failure can only ever cost one strike
);
create index on public.strike_events (group_id, user_id);

create table public.consequence_assignments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  consequence_id uuid not null references public.group_consequences(id),
  milestone int not null,                        -- 1 = first threshold reached, 2 = second...
  status text not null default 'PENDING' check (status in ('PENDING','COMPLETED')),
  assigned_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (group_id, user_id, milestone)          -- one consequence per milestone
);

-- ───────────── Helpers ─────────────
create function public.is_member(p_group uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where group_id = p_group and user_id = auth.uid());
$$;

create function public.is_leader(p_group uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where group_id = p_group and user_id = auth.uid() and role = 'LEADER');
$$;

create function public.group_today(p_group uuid) returns date
language sql stable security definer set search_path = public as $$
  select (now() at time zone timezone)::date from groups where id = p_group;
$$;

create function public.skips_remaining(p_group uuid, p_user uuid default auth.uid()) returns int
language plpgsql stable security definer set search_path = public as $$
declare v_allow int; v_used int;
begin
  if not is_member(p_group) then raise exception 'Not a member of this group'; end if;
  select skips_per_member into v_allow from groups where id = p_group;
  select count(*) into v_used from check_ins where group_id = p_group and user_id = p_user and status = 'SKIPPED';
  return greatest(v_allow - v_used, 0);
end $$;

create function public.user_streak(p_group uuid, p_user uuid) returns int
language plpgsql stable security definer set search_path = public as $$
declare v_today date; d date; n int := 0; c int; s int; b int;
begin
  v_today := group_today(p_group);
  for i in 0..365 loop
    d := v_today - i;
    select count(*) filter (where status = 'COMPLETED'),
           count(*) filter (where status = 'SKIPPED'),
           count(*) filter (where status in ('FAILED','MISSING'))
      into c, s, b
      from check_ins where group_id = p_group and user_id = p_user and check_date = d;
    exit when b > 0;                       -- any failed/missing habit breaks the streak
    if c > 0 then n := n + 1;
    elsif s > 0 then null;                 -- skip-only day: neutral
    elsif i > 0 then exit;                 -- empty past day breaks it (today may still be open)
    end if;
  end loop;
  return n;
end $$;

-- ───────────── Strike engine (internal) ─────────────
create function public.apply_strike(p_group uuid, p_user uuid, p_check_in uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_count int; v_threshold int; v_milestone int; v_cons uuid; v_n int;
begin
  insert into strike_events (group_id, user_id, check_in_id, reason)
  values (p_group, p_user, p_check_in, p_reason)
  on conflict (check_in_id, reason) do nothing
  returning id into v_id;
  if v_id is null then return; end if;     -- duplicate: no second strike

  select strike_threshold into v_threshold from groups where id = p_group;
  select count(*) into v_count from strike_events where group_id = p_group and user_id = p_user;

  if v_count % v_threshold = 0 then
    v_milestone := v_count / v_threshold;
    select count(*) into v_n from group_consequences where group_id = p_group and active;
    if v_n = 0 then return; end if;
    -- prefer a consequence this member has not been given yet
    select id into v_cons from group_consequences
      where group_id = p_group and active
        and id not in (select consequence_id from consequence_assignments where group_id = p_group and user_id = p_user)
      order by position limit 1;
    if v_cons is null then  -- all used: cycle
      select id into v_cons from group_consequences where group_id = p_group and active
        order by position offset ((v_milestone - 1) % v_n) limit 1;
    end if;
    insert into consequence_assignments (group_id, user_id, consequence_id, milestone)
    values (p_group, p_user, v_cons, v_milestone)
    on conflict (group_id, user_id, milestone) do nothing;
  end if;
end $$;

-- ───────────── Public RPC functions ─────────────
create function public.create_group(
  p_name text, p_description text, p_consequences text[],
  p_threshold int default 3, p_skips int default 2, p_timezone text default 'UTC'
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_code text; v_tz text := coalesce(p_timezone, 'UTC'); t text; i int := 0;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  begin perform now() at time zone v_tz; exception when others then v_tz := 'UTC'; end;
  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from groups where invite_code = v_code);
  end loop;
  insert into groups (name, description, invite_code, created_by, strike_threshold, skips_per_member, timezone)
  values (trim(p_name), nullif(trim(coalesce(p_description,'')), ''), v_code, auth.uid(), p_threshold, p_skips, v_tz)
  returning id into v_id;
  insert into memberships (group_id, user_id, role) values (v_id, auth.uid(), 'LEADER');
  foreach t in array coalesce(p_consequences, array[]::text[]) loop
    if length(trim(t)) >= 2 then
      insert into group_consequences (group_id, title, position) values (v_id, trim(t), i);
      i := i + 1;
    end if;
  end loop;
  if i = 0 then
    insert into group_consequences (group_id, title, position) values
      (v_id, 'Buy coffee for the group', 0), (v_id, 'Complete an additional study session', 1), (v_id, 'Organize the next group meeting', 2);
  end if;
  return v_id;
end $$;

create function public.join_group(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_group uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select id into v_group from groups where invite_code = upper(trim(p_code));
  if v_group is null then raise exception 'Invalid invitation code'; end if;
  insert into memberships (group_id, user_id, role) values (v_group, auth.uid(), 'MEMBER')
    on conflict do nothing;
  insert into habit_assignments (habit_id, group_id, user_id)
    select id, group_id, auth.uid() from habits where group_id = v_group and assign_all
    on conflict do nothing;
  return v_group;
end $$;

create function public.create_habit(
  p_group uuid, p_name text, p_description text, p_target text, p_proof boolean, p_assignees uuid[]
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_all boolean := (p_assignees is null or cardinality(p_assignees) = 0);
begin
  if not is_leader(p_group) then raise exception 'Only the group leader can create habits'; end if;
  insert into habits (group_id, name, description, daily_target, proof_required, assign_all, created_by)
  values (p_group, trim(p_name), nullif(trim(coalesce(p_description,'')), ''), nullif(trim(coalesce(p_target,'')), ''),
          coalesce(p_proof, false), v_all, auth.uid())
  returning id into v_id;
  insert into habit_assignments (habit_id, group_id, user_id)
    select v_id, p_group, m.user_id from memberships m
    where m.group_id = p_group and (v_all or m.user_id = any (p_assignees));
  return v_id;
end $$;

create function public.submit_check_in(p_assignment uuid, p_status text, p_proof_path text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare a record; v_today date; v_id uuid;
begin
  select ha.id, ha.habit_id, ha.group_id, ha.user_id, h.proof_required into a
    from habit_assignments ha join habits h on h.id = ha.habit_id where ha.id = p_assignment;
  if not found or a.user_id <> auth.uid() then raise exception 'This habit is not assigned to you'; end if;
  if p_status not in ('COMPLETED','FAILED','SKIPPED') then raise exception 'Invalid status'; end if;
  v_today := group_today(a.group_id);
  if exists (select 1 from check_ins where assignment_id = p_assignment and check_date = v_today) then
    raise exception 'You already checked in for this habit today';
  end if;
  if p_status = 'SKIPPED' and skips_remaining(a.group_id, auth.uid()) <= 0 then
    raise exception 'No skips remaining';
  end if;
  if p_status = 'COMPLETED' and a.proof_required then
    if p_proof_path is null then raise exception 'This habit requires a proof photo'; end if;
  end if;
  if p_proof_path is not null then
    if split_part(p_proof_path, '/', 1) <> a.group_id::text or split_part(p_proof_path, '/', 2) <> auth.uid()::text then
      raise exception 'Invalid proof path';
    end if;
  end if;

  insert into check_ins (assignment_id, habit_id, group_id, user_id, check_date, status)
  values (a.id, a.habit_id, a.group_id, a.user_id, v_today, p_status) returning id into v_id;

  if p_status = 'FAILED' then perform apply_strike(a.group_id, a.user_id, v_id, 'FAILED'); end if;
  if p_status = 'COMPLETED' and p_proof_path is not null then
    insert into proofs (check_in_id, group_id, user_id, storage_path) values (v_id, a.group_id, a.user_id, p_proof_path);
  end if;
  return v_id;
end $$;

create function public.review_proof(p_proof uuid, p_approve boolean, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare p record;
begin
  select * into p from proofs where id = p_proof for update;
  if not found then raise exception 'Proof not found'; end if;
  if not is_leader(p.group_id) then raise exception 'Only a group leader can review proof'; end if;
  if p.user_id = auth.uid() then raise exception 'You cannot review your own proof'; end if;
  if p.status <> 'PENDING' then raise exception 'This proof was already reviewed'; end if;

  insert into evidence_reviews (proof_id, group_id, reviewer_id, decision, note)
  values (p.id, p.group_id, auth.uid(), case when p_approve then 'APPROVED' else 'REJECTED' end, p_note);
  update proofs set status = case when p_approve then 'APPROVED' else 'REJECTED' end where id = p.id;
  if not p_approve then
    update check_ins set status = 'FAILED' where id = p.check_in_id;
    perform apply_strike(p.group_id, p.user_id, p.check_in_id, 'PROOF_REJECTED');
  end if;
end $$;

create function public.complete_consequence(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update consequence_assignments set status = 'COMPLETED', completed_at = now()
    where id = p_id and user_id = auth.uid() and status = 'PENDING';
  if not found then raise exception 'Consequence not found or already completed'; end if;
end $$;

-- Leader-triggered "deadline processing": records MISSING (+ strike) for past days without a check-in.
-- (Manual for the MVP; call it from a scheduled job to automate. See ARCHITECTURE.md.)
create function public.process_missing_checkins(p_group uuid) returns int
language plpgsql security definer set search_path = public as $$
declare r record; v_today date; v_tz text; v_cid uuid; n int := 0;
begin
  if not is_leader(p_group) then raise exception 'Only the group leader can run deadline processing'; end if;
  select timezone into v_tz from groups where id = p_group;
  v_today := group_today(p_group);
  for r in
    select ha.id as aid, ha.habit_id, ha.user_id, d::date as d
    from habit_assignments ha
    cross join lateral generate_series(greatest((ha.created_at at time zone v_tz)::date, v_today - 30), v_today - 1, interval '1 day') d
    where ha.group_id = p_group
      and not exists (select 1 from check_ins c where c.assignment_id = ha.id and c.check_date = d::date)
    order by d
  loop
    insert into check_ins (assignment_id, habit_id, group_id, user_id, check_date, status)
    values (r.aid, r.habit_id, p_group, r.user_id, r.d, 'MISSING') on conflict do nothing returning id into v_cid;
    if v_cid is not null then
      perform apply_strike(p_group, r.user_id, v_cid, 'MISSING'); n := n + 1;
    end if;
    v_cid := null;
  end loop;
  return n;
end $$;

create function public.get_leaderboard(p_group uuid)
returns table (user_id uuid, display_name text, role text, total int, completed int, failed int,
               skipped int, missing int, completion_pct int, streak int, strikes int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_member(p_group) then raise exception 'Not a member of this group'; end if;
  return query
  select m.user_id, p.display_name, m.role,
         count(c.id)::int,
         (count(c.id) filter (where c.status = 'COMPLETED'))::int,
         (count(c.id) filter (where c.status = 'FAILED'))::int,
         (count(c.id) filter (where c.status = 'SKIPPED'))::int,
         (count(c.id) filter (where c.status = 'MISSING'))::int,
         coalesce(round(100.0 * count(c.id) filter (where c.status = 'COMPLETED')
           / nullif(count(c.id) filter (where c.status <> 'SKIPPED'), 0))::int, 0),
         user_streak(p_group, m.user_id),
         (select count(*)::int from strike_events s where s.group_id = p_group and s.user_id = m.user_id)
  from memberships m
  join profiles p on p.id = m.user_id
  left join check_ins c on c.group_id = m.group_id and c.user_id = m.user_id
  where m.group_id = p_group
  group by m.user_id, p.display_name, m.role
  order by 9 desc, 10 desc, 5 desc;
end $$;

-- ───────────── Demo-only helper ─────────────
-- Lets a demo user repeat the live "third strike" scenario. Only works on groups flagged is_demo
-- (which only the service-role seed script can create).
create function public.demo_reset_today(p_group uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_threshold int; v_strikes int;
begin
  if not exists (select 1 from groups where id = p_group and is_demo) then raise exception 'Not a demo group'; end if;
  if not is_member(p_group) then raise exception 'Not a member'; end if;
  delete from check_ins where group_id = p_group and user_id = auth.uid() and check_date = group_today(p_group);
  select strike_threshold into v_threshold from groups where id = p_group;
  select count(*) into v_strikes from strike_events where group_id = p_group and user_id = auth.uid();
  delete from consequence_assignments where group_id = p_group and user_id = auth.uid() and milestone > v_strikes / v_threshold;
end $$;

-- ───────────── New-user profile trigger ─────────────
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name)
  values (new.id, left(coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1)), 60))
  on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────── Row Level Security ─────────────
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.memberships enable row level security;
alter table public.group_consequences enable row level security;
alter table public.habits enable row level security;
alter table public.habit_assignments enable row level security;
alter table public.check_ins enable row level security;
alter table public.proofs enable row level security;
alter table public.evidence_reviews enable row level security;
alter table public.strike_events enable row level security;
alter table public.consequence_assignments enable row level security;

create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid() or exists (
    select 1 from memberships a join memberships b on a.group_id = b.group_id
    where a.user_id = auth.uid() and b.user_id = profiles.id));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Read-only for members; every write goes through the SECURITY DEFINER functions above.
create policy groups_select on public.groups for select to authenticated using (is_member(id));
create policy memberships_select on public.memberships for select to authenticated using (is_member(group_id));
create policy group_consequences_select on public.group_consequences for select to authenticated using (is_member(group_id));
create policy habits_select on public.habits for select to authenticated using (is_member(group_id));
create policy habit_assignments_select on public.habit_assignments for select to authenticated using (is_member(group_id));
create policy check_ins_select on public.check_ins for select to authenticated using (is_member(group_id));
create policy proofs_select on public.proofs for select to authenticated using (is_member(group_id));
create policy evidence_reviews_select on public.evidence_reviews for select to authenticated using (is_member(group_id));
create policy strike_events_select on public.strike_events for select to authenticated using (is_member(group_id));
create policy consequence_assignments_select on public.consequence_assignments for select to authenticated using (is_member(group_id));

-- ───────────── Function privileges ─────────────
revoke all on function public.apply_strike(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.user_streak(uuid, uuid) from public, anon;
revoke all on function public.create_group(text, text, text[], int, int, text) from public, anon;
revoke all on function public.join_group(text) from public, anon;
revoke all on function public.create_habit(uuid, text, text, text, boolean, uuid[]) from public, anon;
revoke all on function public.submit_check_in(uuid, text, text) from public, anon;
revoke all on function public.review_proof(uuid, boolean, text) from public, anon;
revoke all on function public.complete_consequence(uuid) from public, anon;
revoke all on function public.process_missing_checkins(uuid) from public, anon;
revoke all on function public.get_leaderboard(uuid) from public, anon;
revoke all on function public.skips_remaining(uuid, uuid) from public, anon;
revoke all on function public.demo_reset_today(uuid) from public, anon;
revoke all on function public.is_member(uuid) from public, anon;
revoke all on function public.is_leader(uuid) from public, anon;
revoke all on function public.group_today(uuid) from public, anon;
grant execute on function public.create_group(text, text, text[], int, int, text) to authenticated;
grant execute on function public.join_group(text) to authenticated;
grant execute on function public.create_habit(uuid, text, text, text, boolean, uuid[]) to authenticated;
grant execute on function public.submit_check_in(uuid, text, text) to authenticated;
grant execute on function public.review_proof(uuid, boolean, text) to authenticated;
grant execute on function public.complete_consequence(uuid) to authenticated;
grant execute on function public.process_missing_checkins(uuid) to authenticated;
grant execute on function public.get_leaderboard(uuid) to authenticated;
grant execute on function public.skips_remaining(uuid, uuid) to authenticated;
grant execute on function public.demo_reset_today(uuid) to authenticated;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.is_leader(uuid) to authenticated;
grant execute on function public.group_today(uuid) to authenticated;
grant execute on function public.user_streak(uuid, uuid) to authenticated;

-- ───────────── Storage: private proof photos ─────────────
-- Path convention: <group_id>/<user_id>/<file>.jpg
insert into storage.buckets (id, name, public) values ('proofs', 'proofs', false) on conflict (id) do nothing;

create policy proofs_upload_own on storage.objects for insert to authenticated with check (
  bucket_id = 'proofs'
  and (storage.foldername(name))[2] = auth.uid()::text
  and public.is_member(((storage.foldername(name))[1])::uuid));
create policy proofs_read on storage.objects for select to authenticated using (
  bucket_id = 'proofs'
  and ((storage.foldername(name))[2] = auth.uid()::text
       or public.is_leader(((storage.foldername(name))[1])::uuid)));
