// Seeds the demo scenario. Run from the project root:
//   node --env-file=.env.seed scripts/seed-demo.mjs
// Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.seed (NEVER in the app, never committed).
// Only touches the 3 demo accounts and the "30-Day Study Challenge" demo group (invite code DEMO30).
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (see .env.seed.example).');
  process.exit(1);
}
const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

export const PASSWORD = 'DemoPass123!';
const DEMO = [
  { email: 'demo.alex@example.com', name: 'Alex' },
  { email: 'demo.sam@example.com', name: 'Sam' },
  { email: 'demo.jordan@example.com', name: 'Jordan' },
];

async function findUser(email) {
  for (let page = 1; page < 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email === email);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

const ids = [];
for (const d of DEMO) {
  let user = await findUser(d.email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: d.email, password: PASSWORD, email_confirm: true, user_metadata: { display_name: d.name },
    });
    if (error) throw error;
    user = data.user;
    console.log('created', d.email);
  } else {
    console.log('exists ', d.email);
  }
  ids.push(user.id);
}

const { data: groupId, error } = await admin.rpc('seed_demo_group', {
  p_leader: ids[0], p_m2: ids[1], p_m3: ids[2],
});
if (error) throw error;
console.log('\nDemo group ready:', groupId);
console.log('Log in with any of:');
for (const d of DEMO) console.log(`  ${d.email} / ${PASSWORD}`);
