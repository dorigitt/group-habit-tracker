-- Demo scenario seeding. Callable ONLY by the service role (via scripts/seed-demo.mjs).
-- It deletes and recreates just the one demo group (is_demo = true, invite code DEMO30);
-- it never touches real groups or users.
--
-- Resulting scenario (history = the 7 days before today, today is left open for live check-ins):
--   Alex   (leader)  1 strike,  streak 3, 100% except one failure
--   Sam    (member)  2 strikes, 1 skip used  -> ONE more failure today triggers the 3rd-strike consequence
--   Jordan (member)  5 strikes, 1 skip used, 1 consequence already assigned (pending)

create function public.seed_demo_group(p_leader uuid, p_m2 uuid, p_m3 uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  g uuid;
  u uuid[] := array[p_leader, p_m2, p_m3];
  hab uuid[] := array[]::uuid[];
  aids uuid[] := array[]::uuid[];
  hid uuid;
  names text[] := array['Study for 2 hours', 'Read 20 pages', 'Exercise for 30 minutes'];
  targets text[] := array['2 hours', '20 pages', '30 minutes'];
  -- user:day-ago:habit:status   (everything not listed is COMPLETED)
  ov text[] := array['1:4:1:FAILED',
                     '2:3:1:FAILED', '2:6:2:FAILED', '2:2:3:SKIPPED',
                     '3:7:1:MISSING', '3:6:2:FAILED', '3:5:3:SKIPPED', '3:4:2:FAILED', '3:2:1:FAILED', '3:1:1:FAILED'];
  cons text[] := array['Buy coffee for the group', 'Complete an additional study session', 'Organize the next group meeting'];
  i int; d int; k int; st text; cid uuid; aid uuid;
begin
  delete from groups where is_demo and invite_code = 'DEMO30';

  insert into groups (name, description, invite_code, created_by, strike_threshold, skips_per_member, timezone, is_demo, created_at)
  values ('30-Day Study Challenge', 'Demo group: three friends keeping each other accountable.', 'DEMO30',
          p_leader, 3, 2, 'UTC', true, now() - interval '8 days')
  returning id into g;

  insert into memberships (group_id, user_id, role) values
    (g, p_leader, 'LEADER'), (g, p_m2, 'MEMBER'), (g, p_m3, 'MEMBER');

  for i in 1..3 loop
    insert into group_consequences (group_id, title, position) values (g, cons[i], i - 1);
    insert into habits (group_id, name, description, daily_target, proof_required, assign_all, created_by)
    values (g, names[i], null, targets[i], (i = 3), true, p_leader) returning id into hid;
    hab := hab || hid;
  end loop;

  -- assignment index = (user-1)*3 + habit
  for i in 1..3 loop
    for k in 1..3 loop
      insert into habit_assignments (habit_id, group_id, user_id, created_at)
      values (hab[k], g, u[i], now() - interval '7 days') returning id into aid;
      aids := aids || aid;
    end loop;
  end loop;

  -- history, oldest day first so strikes/consequences are created in chronological order
  for d in reverse 7..1 loop
    for i in 1..3 loop
      for k in 1..3 loop
        select coalesce((select split_part(x, ':', 4) from unnest(ov) x where x like i || ':' || d || ':' || k || ':%'), 'COMPLETED')
          into st;
        insert into check_ins (assignment_id, habit_id, group_id, user_id, check_date, status)
        values (aids[(i - 1) * 3 + k], hab[k], g, u[i], (now() at time zone 'UTC')::date - d, st)
        returning id into cid;
        if st in ('FAILED', 'MISSING') then
          perform apply_strike(g, u[i], cid, st);
        end if;
      end loop;
    end loop;
  end loop;

  return g;
end $$;

revoke all on function public.seed_demo_group(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.seed_demo_group(uuid, uuid, uuid) to service_role;
