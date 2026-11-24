'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const migrations=['sql/rc16-home-recitation.sql','sql/rc16-ai-recitation.sql','sql/rc16-learning-ledger.sql'];
for(const file of migrations){
  const sql=read(file);
  assert(!/\bdrop\s+table\b/i.test(sql),file+' must not drop existing tables');
  assert(!/\btruncate(?:\s+table)?\b/i.test(sql),file+' must not truncate data');
  assert(!/\bdelete\s+from\b/i.test(sql),file+' must not delete existing rows');
}
const home=read(migrations[0]),ai=read(migrations[1]),ledger=read(migrations[2]);
const staging=read('tests/rc16-staging-acceptance.mjs');
assert(staging.includes('svtcntalwfmexthcnvqe.supabase.co')&&staging.includes('Refusing to create append-only RC16 test data'),'staging acceptance must hard-block writes to the configured/live Supabase project');

assert.equal((home.match(/owner_user_id uuid not null references auth\.users\(id\) on delete restrict/g)||[]).length,2);
assert(ai.includes('owner_user_id uuid not null references auth.users(id) on delete restrict'));
assert(ledger.includes('owner_user_id uuid not null references auth.users(id) on delete restrict'));
assert(home.includes("  false,\n  20971520"),'home audio bucket must be private and bounded');
assert(!home.includes('create policy'),'home audio must not expose direct storage/table policies');
assert(ledger.includes('before update or delete on public.student_achievement_events'));
assert(ledger.includes('before update or delete on public.student_learning_competitions'));
console.log('PASS RC16 migration safety: additive-only SQL, no destructive DDL/DML, retention-safe owner references, private audio storage, and protected history');
