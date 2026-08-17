/**
 * Proves the referral privacy boundary in the database, not the UI.
 *
 * Every check runs on a real connection in the same mode the app uses
 * (`set role app_authenticated` plus app.user_id, or app_anonymous), because
 * the owner role bypasses RLS and would pass every one of these vacuously.
 *
 *   node db/verify-referrals.mjs
 */
import { Pool } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';

const env = readFileSync('.env.local', 'utf8');
const url = /^DATABASE_URL=(.*)$/m.exec(env)[1].trim().replace(/^["']|["']$/g, '');
const pool = new Pool({ connectionString: url });

let pass = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) { pass++; console.log(`  ok    ${name}`); }
  else { failures.push(name); console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}

/**
 * A query runner plus `denied()`, which reports whether a statement was refused.
 * Expected failures run inside a savepoint: in Postgres one error aborts the
 * whole transaction, so without this a single refusal would poison every later
 * check in the same block and read as a cascade of failures.
 */
function runner(c) {
  const q = (sql, params = []) => c.query(sql, params).then((r) => r.rows);
  q.denied = async (sql, params = []) => {
    await c.query('savepoint probe');
    try {
      await c.query(sql, params);
      await c.query('release savepoint probe');
      return false;
    } catch {
      await c.query('rollback to savepoint probe');
      return true;
    }
  };
  return q;
}

/**
 * Run fn as a member, exactly as withUser() does.
 *
 * Read-only blocks roll back so one check cannot influence the next. The two
 * blocks that deliberately write pass commit:true — the later checks are about
 * what those writes produced, so they have to survive the block.
 */
async function asUser(userId, fn, { commit = false } = {}) {
  const c = await pool.connect();
  let ok = false;
  try {
    await c.query('begin');
    await c.query("select set_config('app.user_id', $1, true), set_config('role', 'app_authenticated', true)", [userId]);
    const result = await fn(runner(c));
    ok = true;
    return result;
  } finally {
    await c.query(commit && ok ? 'commit' : 'rollback').catch(() => {});
    c.release();
  }
}

async function asAnon(fn) {
  const c = await pool.connect();
  try {
    await c.query('begin');
    await c.query("select set_config('role', 'app_anonymous', true)");
    return await fn(runner(c));
  } finally {
    await c.query('rollback').catch(() => {});
    c.release();
  }
}

const owner = (sql, params = []) => pool.query(sql, params).then((r) => r.rows);

// ---------------------------------------------------------------- fixtures
const people = await owner(
  `select id, email from public.profiles where email = any($1)`,
  [['member@professionalsclub.ca', 'volunteer@professionalsclub.ca', 'parth@frayze.ca']]
);
const byEmail = Object.fromEntries(people.map((p) => [p.email, p.id]));
const seeker = byEmail['member@professionalsclub.ca'];
const insider = byEmail['volunteer@professionalsclub.ca'];
const other = byEmail['parth@frayze.ca'];
if (!seeker || !insider || !other) throw new Error('need the three test accounts');

const [company] = await owner(`select id, name from public.companies where slug = 'shopify'`);

// A job to point the request at, and an insider opt-in.
await owner(
  `insert into public.company_jobs (company_id, external_id, title, location, apply_url, source_kind)
   values ($1, 'verify-1', 'Senior QA Engineer', 'Toronto, ON', 'https://example.com/j/1', 'manual')
   on conflict (company_id, external_id) do update set is_open = true`,
  [company.id]
);
const [job] = await owner(
  `select id from public.company_jobs where company_id = $1 and external_id = 'verify-1'`,
  [company.id]
);
await owner(
  `insert into public.company_insiders (company_id, member_id, job_title, can_refer)
   values ($1, $2, 'Staff Engineer', true)
   on conflict (company_id, member_id) do update set can_refer = true`,
  [company.id, insider]
);
// Give the seeker a title so the generated headline is realistic.
await owner(
  `update public.profiles set job_title = 'QA Analyst', experience_range = '4-6 years' where id = $1`,
  [seeker]
);
await owner(`delete from public.referral_requests where seeker_id = $1`, [seeker]);

console.log('\n1. company_insiders is not a public register');
await asUser(other, async (q) => {
  const rows = await q('select * from public.company_insiders');
  check('another member sees zero insider rows', rows.length === 0, `${rows.length} rows leaked`);
});
await asAnon(async (q) => {
  check('anonymous cannot read company_insiders at all',
    await q.denied('select * from public.company_insiders'));
  const counts = await q(`select name, helper_count from public.company_helper_counts where slug = 'shopify'`);
  check('anonymous CAN read the aggregate count', Number(counts[0]?.helper_count) === 1,
    JSON.stringify(counts[0]));
});
await asUser(insider, async (q) => {
  const rows = await q('select * from public.company_insiders');
  // Assert ownership, not a row count: this account may legitimately have opted
  // in at several employers, and a count would make the test brittle for a
  // reason that has nothing to do with the privacy rule being checked.
  check('the insider sees their own rows and only their own',
    rows.length > 0 && rows.every((r) => r.member_id === insider), `${rows.length} rows`);
  check('including the one under test',
    rows.some((r) => r.company_id === company.id));
});

console.log('\n2. creating a request fans out and stays anonymous');
const created = await asUser(seeker, async (q) => {
  const rows = await q('select * from public.create_referral_request($1, $2, $3, $4)',
    [company.id, [job.id], 'Landed in February, ISTQB certified.', null]);
  return rows[0];
}, { commit: true });
check('one insider was notified', Number(created.notified) === 1, JSON.stringify(created));

const [req] = await owner(`select * from public.referral_requests where id = $1`, [created.request_id]);
check('headline is built from the profile, not supplied',
  req.headline === 'A QA Analyst (4-6 years)', req.headline);
check('headline carries no name',
  !/member|Neha|Parth/i.test(req.headline) || req.headline === 'A QA Analyst (4-6 years)');

console.log('\n3. before accepting, the insider sees no identity');
await asUser(insider, async (q) => {
  const rows = await q('select * from public.referral_inbox');
  check('the request is in the inbox', rows.length === 1, `${rows.length} rows`);
  const r = rows[0];
  check('seeker_name is NULL', r.seeker_name === null, String(r.seeker_name));
  check('seeker_email is NULL', r.seeker_email === null, String(r.seeker_email));
  check('seeker_phone is NULL', r.seeker_phone === null, String(r.seeker_phone));
  check('resume_url is NULL', r.resume_url === null, String(r.resume_url));
  check('the headline and note ARE visible', r.headline === 'A QA Analyst (4-6 years)' && !!r.note);
  check('the selected roles ARE visible', Array.isArray(r.jobs) && r.jobs.length === 1);
});

console.log('\n4. the seeker cannot learn who was asked');
await asUser(seeker, async (q) => {
  const recips = await q('select * from public.referral_recipients');
  check('referral_recipients is empty for the seeker', recips.length === 0, `${recips.length} rows leaked`);
  const helpers = await q('select * from public.referral_helpers');
  check('referral_helpers is empty before any accept', helpers.length === 0, `${helpers.length} rows`);
  const own = await q('select notified_count from public.referral_requests');
  check('the seeker sees only the count', Number(own[0].notified_count) === 1);
});

console.log('\n5. an uninvolved member sees nothing');
await asUser(other, async (q) => {
  check('empty inbox', (await q('select * from public.referral_inbox')).length === 0);
  check('no requests', (await q('select * from public.referral_requests')).length === 0);
  check('cannot respond to a request they were not sent',
    await q.denied('select public.respond_to_referral($1, true)', [created.request_id]));
});

console.log('\n6. accepting reveals both ways, and only then');
await asUser(insider, async (q) => {
  await q('select public.respond_to_referral($1, true)', [created.request_id]);
  const [r] = await q('select * from public.referral_inbox');
  check('seeker_name now present', !!r.seeker_name, String(r.seeker_name));
  check('seeker_email now present', !!r.seeker_email);
  check('my_status is accepted', r.my_status === 'accepted');
}, { commit: true });
await asUser(seeker, async (q) => {
  const helpers = await q('select * from public.referral_helpers');
  check('the seeker now sees one helper', helpers.length === 1, `${helpers.length}`);
  check('with a name and a title', !!helpers[0].helper_name && !!helpers[0].helper_title,
    JSON.stringify(helpers[0]));
  const [r] = await q('select status from public.referral_requests');
  check('the request is marked matched', r.status === 'matched', r.status);
});

console.log('\n7. mail was queued, addresses resolved later');
const outbox = await owner(
  `select template, status, recipient_id, to_address from public.email_outbox
    where payload->>'requestId' = $1 order by created_at`, [created.request_id]);
check('two queued messages (ask + accept)', outbox.length === 2, JSON.stringify(outbox));
check('queued rows carry no address', outbox.every((r) => r.to_address === null));
check('both still pending', outbox.every((r) => r.status === 'pending'));
await asUser(seeker, async (q) => {
  check('a member cannot read the outbox', (await q('select * from public.email_outbox')).length === 0);
});

console.log('\n8. no double fan-out');
await asUser(seeker, async (q) => {
  // The first request is 'matched', not 'open', so a second IS allowed; what
  // must fail is a second while one is still open (checked below).
  check('a matched request does not block a follow-up',
    !(await q.denied('select * from public.create_referral_request($1, $2, null, null)', [company.id, [job.id]])));
});
await owner(`update public.referral_requests set status = 'open' where id = $1`, [created.request_id]);
await asUser(seeker, async (q) => {
  check('a second request while one is open is refused',
    await q.denied('select * from public.create_referral_request($1, $2, null, null)', [company.id, [job.id]]));
});

// ------------------------------------------------------------------ cleanup
await owner(`delete from public.referral_requests where seeker_id = $1`, [seeker]);
await owner(`delete from public.company_jobs where external_id = 'verify-1'`);
await owner(`delete from public.company_insiders where company_id = $1 and member_id = $2`, [company.id, insider]);
await owner(`delete from public.email_outbox where payload->>'requestId' = $1`, [created.request_id]);

console.log(`\n${pass} passed, ${failures.length} failed`);
if (failures.length) { console.log('failed: ' + failures.join('; ')); process.exitCode = 1; }
await pool.end();
