/**
 * Demo data, so the app can be shown to someone rather than described.
 *
 *   node db/seed-demo.mjs           populate (idempotent — safe to re-run)
 *   node db/seed-demo.mjs --clean   remove every row this script created
 *
 * Everything it inserts is keyed on a stable natural key, so a second run
 * updates rather than duplicates, and --clean removes exactly this data and
 * nothing else. Real rows created through the app are never touched.
 *
 * The demo members are given @demo.professionalsclub.ca addresses. They exist in
 * neon_auth."user" so profiles can reference them, but they have no `account`
 * row, which means no password and no way to sign in as them. That is
 * deliberate: they are authors and profiles, not logins. Sign in with the real
 * admin / member / volunteer accounts to click through the app.
 *
 * Runs as the owning role. That is fine here and only here: seeding is an
 * operator task with no caller identity, exactly like a migration.
 */
import { Pool } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';

const env = readFileSync('.env.local', 'utf8');
const url = /^DATABASE_URL=(.*)$/m.exec(env)[1].trim().replace(/^["']|["']$/g, '');
const pool = new Pool({ connectionString: url });

/**
 * One connection for the whole run, so app.user_id can be published on it.
 *
 * The owning role bypasses RLS, but it does NOT bypass the guard triggers, and
 * several of them ask public.is_admin() or compare against
 * app.current_user_id(): messages refuse a sender who is not the caller, and
 * matrimony_profiles refuses any status beyond draft/pending unless an admin is
 * making the change. With no user published, those checks see nobody and reject
 * perfectly reasonable seed rows.
 *
 * So the seed announces itself as the admin. Note what this does NOT do: it
 * never sets role to app_authenticated, so this stays an owner connection and
 * the GUC affects only the triggers, not RLS.
 */
let client;
const q = async (sql, params = []) => (await client.query(sql, params)).rows;

async function connectAsAdmin() {
  client = await pool.connect();
  const rows = (await client.query(
    `select id from public.profiles where role = 'admin' order by created_at limit 1`
  )).rows;
  if (!rows.length) throw new Error('No admin profile found; run db/migrate.mjs first.');
  await client.query(`select set_config('app.user_id', $1, false)`, [rows[0].id]);
  return rows[0].id;
}

const DEMO_DOMAIN = '@demo.professionalsclub.ca';
const clean = process.argv.includes('--clean');

/** Dates that read as a real timeline instead of everything landing at once. */
const daysAgo = (n, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, (n * 7) % 60, 0, 0);
  return d.toISOString();
};
const daysAhead = (n, hour = 18) => daysAgo(-n, hour);

// ===========================================================================
// Members
// ===========================================================================

/**
 * Sixteen people. Names, cities and trades chosen to look like the club's
 * actual membership — newcomers and established professionals across Canada,
 * not a list of placeholders. Phone numbers use the 555 range nowhere; they are
 * plausible real-format numbers in the right area codes.
 */
const MEMBERS = [
  { first: 'Priya',    last: 'Raghavan',   city: 'Toronto',    prov: 'Ontario',          title: 'QA Analyst',                 company: 'Independent',        industry: 'Technology',        exp: '4-6 years',   status: 'Newcomer (0-2 years)',   joining: 'help',      ver: 'verified',   phone: '+1 (416) 847-2913', ug: 'Bachelor of Engineering' },
  { first: 'Arjun',    last: 'Menon',      city: 'Toronto',    prov: 'Ontario',          title: 'Senior Manager, Technology', company: 'CIBC',               industry: 'Banking',           exp: '10+ years',   status: 'Established',            joining: 'volunteer', ver: 'verified',   phone: '+1 (647) 318-4402', ug: 'Master of Computer Applications' },
  { first: 'Simran',   last: 'Kaur',       city: 'Brampton',   prov: 'Ontario',          title: 'Registered Nurse',           company: 'William Osler Health', industry: 'Healthcare',      exp: '7-9 years',   status: 'Permanent Resident',      joining: 'both',      ver: 'verified',   phone: '+1 (905) 452-7788', ug: 'BSc Nursing' },
  { first: 'Rohan',    last: 'Deshpande',  city: 'Mississauga',prov: 'Ontario',          title: 'Supply Chain Analyst',       company: 'Maple Leaf Foods',   industry: 'Manufacturing',     exp: '4-6 years',   status: 'Permanent Resident',      joining: 'help',      ver: 'pending',    phone: '+1 (905) 273-1164', ug: 'MBA, Operations' },
  { first: 'Ananya',   last: 'Iyer',       city: 'Vancouver',  prov: 'British Columbia', title: 'UX Designer',                company: 'Independent',        industry: 'Technology',        exp: '2-3 years',   status: 'Newcomer (0-2 years)',   joining: 'help',      ver: 'unverified', phone: '+1 (604) 771-9026', ug: 'B.Des, Communication Design' },
  { first: 'Karthik',  last: 'Subramanian',city: 'Waterloo',   prov: 'Ontario',          title: 'Staff Software Engineer',    company: 'Shopify',            industry: 'Technology',        exp: '10+ years',   status: 'Citizen',                joining: 'volunteer', ver: 'verified',   phone: '+1 (519) 883-4471', ug: 'B.Tech, Computer Science' },
  { first: 'Meera',    last: 'Nair',       city: 'Calgary',    prov: 'Alberta',          title: 'Chartered Accountant',       company: 'Deloitte Canada',    industry: 'Consulting',        exp: '7-9 years',   status: 'Citizen',                joining: 'volunteer', ver: 'verified',   phone: '+1 (403) 615-2280', ug: 'CA, ICAI' },
  { first: 'Vikram',   last: 'Bhatia',     city: 'Toronto',    prov: 'Ontario',          title: 'Mortgage Advisor',           company: 'TD Bank',            industry: 'Banking',           exp: '7-9 years',   status: 'Citizen',                joining: 'volunteer', ver: 'verified',   phone: '+1 (416) 209-5537', ug: 'B.Com' },
  { first: 'Divya',    last: 'Krishnan',   city: 'Ottawa',     prov: 'Ontario',          title: 'Policy Analyst',             company: 'Independent',        industry: 'Government',        exp: '4-6 years',   status: 'Permanent Resident',      joining: 'help',      ver: 'pending',    phone: '+1 (613) 447-8815', ug: 'MA, Public Policy' },
  { first: 'Aditya',   last: 'Joshi',      city: 'Edmonton',   prov: 'Alberta',          title: 'Civil Engineer (EIT)',       company: 'Stantec',            industry: 'Engineering',       exp: '2-3 years',   status: 'Newcomer (0-2 years)',   joining: 'help',      ver: 'unverified', phone: '+1 (780) 512-3390', ug: 'B.E. Civil' },
  { first: 'Neha',     last: 'Chatterjee', city: 'Toronto',    prov: 'Ontario',          title: 'Data Scientist',             company: 'Telus',              industry: 'Telecommunications',exp: '4-6 years',   status: 'Permanent Resident',      joining: 'both',      ver: 'verified',   phone: '+1 (437) 260-1148', ug: 'MSc Statistics' },
  { first: 'Sandeep',  last: 'Gill',       city: 'Surrey',     prov: 'British Columbia', title: 'Logistics Coordinator',      company: 'Independent',        industry: 'Transportation',    exp: '4-6 years',   status: 'Newcomer (0-2 years)',   joining: 'help',      ver: 'unverified', phone: '+1 (778) 391-6602', ug: 'B.Com' },
  { first: 'Lakshmi',  last: 'Venkatesan', city: 'Montreal',   prov: 'Quebec',           title: 'Pharmacist',                 company: 'Jean Coutu',         industry: 'Healthcare',        exp: '7-9 years',   status: 'Permanent Resident',      joining: 'volunteer', ver: 'verified',   phone: '+1 (514) 728-9043', ug: 'B.Pharm' },
  { first: 'Faisal',   last: 'Ahmed',      city: 'Toronto',    prov: 'Ontario',          title: 'Product Manager',            company: 'RBC',                industry: 'Banking',           exp: '7-9 years',   status: 'Citizen',                joining: 'volunteer', ver: 'verified',   phone: '+1 (416) 663-7719', ug: 'MBA' },
  { first: 'Kavya',    last: 'Reddy',      city: 'Halifax',    prov: 'Nova Scotia',      title: 'Marketing Specialist',       company: 'Independent',        industry: 'Marketing',         exp: '2-3 years',   status: 'Newcomer (0-2 years)',   joining: 'help',      ver: 'unverified', phone: '+1 (902) 405-2274', ug: 'BBA' },
  { first: 'Harpreet', last: 'Sandhu',     city: 'Winnipeg',   prov: 'Manitoba',         title: 'Truck Fleet Supervisor',     company: 'Bison Transport',    industry: 'Transportation',    exp: '10+ years',  status: 'Citizen',                joining: 'volunteer', ver: 'verified',   phone: '+1 (204) 771-3358', ug: 'Diploma, Logistics' },
];

const email = (m) => `${m.first}.${m.last}`.toLowerCase() + DEMO_DOMAIN;

async function seedMembers() {
  const ids = {};
  for (const [i, m] of MEMBERS.entries()) {
    const e = email(m);
    const name = `${m.first} ${m.last}`;

    // The auth user first: profiles.id references it.
    const existing = await q('select id from neon_auth."user" where email = $1', [e]);
    const userId = existing.length
      ? existing[0].id
      : (await q(
          `insert into neon_auth."user" (name, email, "emailVerified", "createdAt", "updatedAt")
           values ($1, $2, true, $3, $3) returning id`,
          [name, e, daysAgo(120 - i * 5)]
        ))[0].id;

    await q(
      `insert into public.profiles (
         id, first_name, last_name, email, phone, city, province, country,
         current_status, joining_for, employment_status, job_title, company,
         industry, experience_range, education_level, professional_summary,
         verification_status, account_status, role, purposes, contribute_areas,
         created_at, updated_at
       ) values (
         $1,$2,$3,$4,$5,$6,$7,'Canada',$8,$9,'Employed',$10,$11,$12,$13,$14,$15,
         $16,'active','member',$17,$18,$19,$19
       )
       on conflict (id) do update set
         first_name = excluded.first_name, last_name = excluded.last_name,
         phone = excluded.phone, city = excluded.city, province = excluded.province,
         current_status = excluded.current_status, joining_for = excluded.joining_for,
         job_title = excluded.job_title, company = excluded.company,
         industry = excluded.industry, experience_range = excluded.experience_range,
         verification_status = excluded.verification_status`,
      [
        userId, m.first, m.last, e, m.phone, m.city, m.prov, m.status, m.joining,
        m.title, m.company, m.industry, m.exp, m.ug,
        `${m.title} with ${m.exp} of experience, currently in ${m.city}.`,
        m.ver,
        m.joining === 'volunteer' ? ['Give back to the community'] : ['Find a job', 'Settle in Canada'],
        m.joining === 'volunteer' || m.joining === 'both' ? ['Career mentoring', 'Resume review'] : [],
        daysAgo(120 - i * 5),
      ]
    );
    ids[e] = userId;
  }
  return ids;
}

// ===========================================================================
// Community
// ===========================================================================

const GROUPS = [
  { slug: 'toronto-newcomers',   name: 'Toronto Newcomers',        description: 'Landing in the GTA — housing, transit, first winter, where to buy what.' },
  { slug: 'tech-careers',        name: 'Tech Careers',             description: 'Interview prep, referrals, levels and offers across Canadian tech.' },
  { slug: 'healthcare-pathways', name: 'Healthcare Pathways',      description: 'Credential recognition, NCLEX, bridging programs and provincial licensing.' },
  { slug: 'trades-and-logistics',name: 'Trades & Logistics',       description: 'AZ licensing, red seal, fleet work and warehouse roles.' },
  { slug: 'vancouver-and-bc',    name: 'Vancouver & BC',           description: 'Rentals, ferries, and finding work on the west coast.' },
  { slug: 'small-business',      name: 'Starting a Business',      description: 'Incorporation, GST/HST, and getting your first customers here.' },
];

const POSTS = [
  { author: 0, group: 'toronto-newcomers', days: 1,  body: 'Landed three weeks ago. SIN done in 20 minutes at the Service Canada on Yonge, bank account the same afternoon at a branch that had a Hindi-speaking advisor. If you are arriving soon: bring your landing paper, passport and a Canadian address, that is genuinely all they asked for.' },
  { author: 4, group: 'toronto-newcomers', days: 2,  body: 'Question about the first winter — is a parka rated to -30 overkill for Toronto? Getting a lot of conflicting advice.', media: [{ url: '/img/arrivals.jpg', type: 'image' }] },
  { author: 5, group: 'tech-careers',      days: 2,  body: 'Reviewed about 40 resumes from this group over the last month. The single biggest fix: put the tech stack on the same line as the role, not in a skills blob at the bottom. Recruiters here scan for the stack next to the company.' },
  { author: 0, group: 'tech-careers',      days: 3,  body: 'Got a QA analyst screen at a bank next week, first Canadian interview. Anyone done one recently — how behavioural is it really?' },
  { author: 10, group: 'tech-careers',     days: 4,  body: 'Sharing what worked: I applied to 60 roles with no response, then started asking members here who worked at the company before applying. Three referrals, two interviews, one offer. The referral is the whole game.' },
  { author: 2, group: 'healthcare-pathways', days: 3, body: 'For nurses arriving from India: start the NNAS application before you land. Mine took five months and I could have had it running while I was still working back home. Happy to walk anyone through the document list.' },
  { author: 12, group: 'healthcare-pathways', days: 6, body: 'Pharmacy bridging in Quebec needs French at a working level — the OQLF exam caught me out. If you are heading to Montreal, start French classes now, not after you land.' },
  { author: 15, group: 'trades-and-logistics', days: 2, body: 'AZ licence in Manitoba: MELT is 121.5 hours and most schools quote $8,000 to $10,000. Ask whether the price includes the road test and the truck rental for it, because two of the three I called did not.' },
  { author: 11, group: 'trades-and-logistics', days: 5, body: 'Warehouse coordinator roles in Surrey are mostly filled through agencies rather than postings. Walked into four, had two interviews the same week.' },
  { author: 8, group: 'vancouver-and-bc',  days: 4,  body: 'Rental market reality check for Vancouver: budget for first and last month, and expect to show three months of pay stubs you will not have yet. A guarantor letter from an employer helped me more than the credit score did.' },
  { author: 6, group: 'small-business',    days: 5,  body: 'Federal vs provincial incorporation, short version: federal if you will work across provinces and care about the name, provincial if you are staying in one place and want it cheaper. Neither one changes your taxes.' },
  { author: 7, group: 'small-business',    days: 8,  body: 'You do not need to register for GST/HST until you pass $30,000 in revenue over four quarters. Plenty of new consultants register on day one and create paperwork they did not need yet.' },
  { author: null, group: null,             days: 1,  body: 'Reminder: the monthly meetup is this Saturday at the Scarborough community hall, 2pm. Bring a resume if you want it looked at — four volunteers are coming specifically for that.', media: [{ url: '/img/event-wide-1.jpg', type: 'image' }, { url: '/img/community-hall-1.jpg', type: 'image' }] },
  { author: 3, group: null,                days: 3,  body: 'Thank you to whoever suggested applying directly on company career pages instead of the aggregators. Two callbacks in a week after four months of nothing.' },
  { author: 13, group: null,               days: 6,  body: 'We had 62 people at the last resume clinic and got through 48 resumes. Photos from the day — thanks to everyone who volunteered their Saturday.', media: [{ url: '/img/resume-review.jpg', type: 'image' }, { url: '/img/mentoring-1.jpg', type: 'image' }, { url: '/img/mentoring-2.jpg', type: 'image' }] },
  { author: 14, group: null,                days: 9, body: 'Is there anyone in marketing in Halifax on here? Feels like the whole industry is in Toronto and I would rather not move again.' },
  { author: 9, group: null,                days: 11, body: 'Engineers-in-training: the P.Eng experience requirement counts work done overseas, but you need your supervisor to sign for it. Get those signatures before you leave.' },
  { author: 1, group: 'tech-careers',       days: 7, body: 'I work at a bank and I am happy to look at applications for roles on our careers page. Use the referral feature rather than messaging me — it keeps it tidy and I see them all in one place.' },
];

async function seedCommunity(ids) {
  const memberId = (i) => ids[email(MEMBERS[i])];
  const [admin] = await q(`select id from public.profiles where role = 'admin' order by created_at limit 1`);

  const groupIds = {};
  for (const g of GROUPS) {
    const row = (await q(
      `insert into public.community_groups (slug, name, description, created_by)
       values ($1,$2,$3,$4)
       on conflict (slug) do update set name = excluded.name, description = excluded.description
       returning id`,
      [g.slug, g.name, g.description, admin?.id ?? null]
    ))[0];
    groupIds[g.slug] = row.id;
  }

  // Members join the groups that match where they are and what they do.
  const joins = [
    [0, 'toronto-newcomers'], [0, 'tech-careers'], [1, 'tech-careers'], [2, 'healthcare-pathways'],
    [3, 'toronto-newcomers'], [4, 'toronto-newcomers'], [4, 'vancouver-and-bc'], [5, 'tech-careers'],
    [6, 'small-business'], [7, 'small-business'], [8, 'vancouver-and-bc'], [9, 'trades-and-logistics'],
    [10, 'tech-careers'], [11, 'trades-and-logistics'], [11, 'vancouver-and-bc'],
    [12, 'healthcare-pathways'], [13, 'tech-careers'], [14, 'toronto-newcomers'], [15, 'trades-and-logistics'],
  ];
  for (const [m, g] of joins) {
    await q(
      `insert into public.community_group_members (group_id, member_id)
       values ($1,$2) on conflict do nothing`,
      [groupIds[g], memberId(m)]
    );
  }

  // Posts are keyed on (author, created_at) so a re-run updates the body
  // instead of posting again.
  const postIds = [];
  for (const p of POSTS) {
    const author = p.author === null ? admin?.id : memberId(p.author);
    if (!author) continue;
    const created = daysAgo(p.days, 9 + (p.days % 8));
    const found = await q(
      `select id from public.community_posts where author_id = $1 and created_at = $2`,
      [author, created]
    );
    const id = found.length
      ? found[0].id
      : (await q(
          `insert into public.community_posts (author_id, group_id, body, media, created_at)
           values ($1,$2,$3,$4::jsonb,$5) returning id`,
          [author, p.group ? groupIds[p.group] : null, p.body, JSON.stringify(p.media ?? []), created]
        ))[0].id;
    postIds.push(id);
  }

  // Comments and likes, so the feed does not look like a wall of zeroes.
  const COMMENTS = [
    [0, 3, 'A parka rated to -20 is plenty for Toronto. Layers matter more than the rating — and get proper boots before you get a proper coat.'],
    [1, 5, 'This matched my experience exactly. Recruiters spend seconds per resume.'],
    [2, 1, 'Mostly behavioural, with two or three scenario questions about defect triage. They care that you can explain a decision.'],
    [3, 10, 'Same story here. Six referrals, three interviews.'],
    [5, 2, 'Sent you the document list — start with the transcripts, they take longest.'],
    [7, 15, 'Confirmed, mine was $9,400 all in including the road test.'],
    [12, 0, 'Bringing a friend who landed last week, is that alright?'],
    [12, 4, 'Adding it to my calendar, thank you.'],
    [14, 13, 'The turnout was brilliant. Same again next month?'],
  ];
  for (const [postIdx, authorIdx, body] of COMMENTS) {
    const post = postIds[postIdx];
    const author = memberId(authorIdx);
    if (!post || !author) continue;
    const found = await q(
      `select id from public.community_comments where post_id = $1 and author_id = $2 and body = $3`,
      [post, author, body]
    );
    if (!found.length) {
      await q(
        `insert into public.community_comments (post_id, author_id, body, created_at)
         values ($1,$2,$3,$4)`,
        [post, author, body, daysAgo(Math.max(0, POSTS[postIdx].days - 1), 14)]
      );
    }
  }

  // Deterministic, uneven like spread — a couple of posts clearly resonated.
  const LIKES = [[0,[1,2,3,5,10,13]],[2,[0,3,4,9,10,13,14]],[4,[0,1,2,5,8,11,13,14,15]],
                 [5,[0,3,9,12]],[7,[9,11]],[9,[0,4,11]],[12,[0,1,2,3,4,5,6,7]],[14,[0,2,4,6,9,10]]];
  for (const [postIdx, likers] of LIKES) {
    const post = postIds[postIdx];
    if (!post) continue;
    for (const l of likers) {
      await q(
        `insert into public.community_likes (post_id, member_id) values ($1,$2) on conflict do nothing`,
        [post, memberId(l)]
      );
    }
  }

  return { groupIds, postIds };
}

// ===========================================================================
// Referrals: insiders, roles at more employers, requests in every state
// ===========================================================================

/** Roles typed by hand for employers whose feed we do not have. Realistic titles. */
const MANUAL_JOBS = {
  shopify: [
    ['Senior Backend Developer, Payments', 'Ottawa, ON (Remote)', 'Engineering'],
    ['Technical Support Advisor (Bilingual)', 'Remote, Canada', 'Support'],
    ['Product Designer, Merchant Growth', 'Toronto, ON', 'Design'],
  ],
  rbc: [
    ['Financial Advisor Trainee', 'Mississauga, ON', 'Personal Banking'],
    ['Data Analyst, Risk', 'Toronto, ON', 'Risk'],
    ['Bilingual Customer Service Representative', 'Montreal, QC', 'Contact Centre'],
    ['Cloud Platform Engineer', 'Toronto, ON', 'Technology'],
  ],
  'td-bank': [
    ['Customer Experience Associate', 'Brampton, ON', 'Retail'],
    ['Mortgage Specialist', 'Surrey, BC', 'Real Estate Secured Lending'],
    ['QA Engineer, Digital Channels', 'Toronto, ON', 'Technology'],
  ],
  telus: [
    ['Data Scientist, Network Analytics', 'Vancouver, BC', 'Data'],
    ['Field Technician', 'Calgary, AB', 'Operations'],
    ['Bilingual Client Care Representative', 'Remote, Canada', 'Customer Care'],
  ],
  'deloitte-canada': [
    ['Consultant, Technology Strategy', 'Toronto, ON', 'Consulting'],
    ['Audit Associate (CPA track)', 'Calgary, AB', 'Audit'],
  ],
  'william-osler': [],
};

/** Which demo members work where, and whether they will help. */
const INSIDERS = [
  { m: 1,  slug: 'cibc',            title: 'Senior Manager, Technology',  refer: true },
  { m: 13, slug: 'rbc',             title: 'Product Manager, Digital',    refer: true },
  { m: 7,  slug: 'td-bank',         title: 'Mortgage Advisor',            refer: true },
  { m: 5,  slug: 'shopify',         title: 'Staff Software Engineer',     refer: true },
  { m: 10, slug: 'telus',           title: 'Data Scientist',              refer: true },
  { m: 6,  slug: 'deloitte-canada', title: 'Manager, Audit',              refer: true },
  { m: 15, slug: 'telus',           title: 'Fleet Supervisor',            refer: false },
  { m: 12, slug: 'shopify',         title: 'Pharmacist (former)',         refer: false },
  { m: 2,  slug: 'rbc',             title: 'Registered Nurse (former)',   refer: true },
  { m: 14, slug: 'deloitte-canada', title: 'Marketing Specialist',        refer: true },
];

/**
 * Requests in every state the UI can render: waiting with nobody inside,
 * waiting on replies, one accepted, and one withdrawn.
 */
const REQUESTS = [
  { seeker: 0,  slug: 'cibc',            jobs: 2, note: 'Six years in retail banking operations, CSC certified. Targeting analytics or QA on the digital side.', accept: 1,    days: 2 },
  { seeker: 4,  slug: 'shopify',         jobs: 1, note: 'Product designer, 3 years, portfolio is mostly fintech dashboards. Would value a look before I apply.', accept: null, days: 1 },
  { seeker: 9,  slug: 'deloitte-canada', jobs: 2, note: 'Civil EIT working towards P.Eng, interested in the infrastructure advisory side.',                     accept: 6,    days: 5 },
  { seeker: 14, slug: 'telus',           jobs: 1, note: 'Marketing specialist in Halifax, open to remote. Two years on B2B campaigns.',                          accept: null, days: 3 },
  { seeker: 11, slug: 'td-bank',         jobs: 1, note: 'Logistics background moving into branch operations. Happy to start at the counter.',                     accept: null, days: 7, withdraw: true },
];

async function seedReferrals(ids) {
  const memberId = (i) => ids[email(MEMBERS[i])];
  const companies = Object.fromEntries(
    (await q('select id, slug from public.companies')).map((c) => [c.slug, c.id])
  );

  // Manual roles for employers with no machine-readable feed. Companies already
  // on a live feed (CIBC is on Workday) are left alone.
  for (const [slug, roles] of Object.entries(MANUAL_JOBS)) {
    const companyId = companies[slug];
    if (!companyId || roles.length === 0) continue;
    const [c] = await q('select source_kind from public.companies where id = $1', [companyId]);
    if (c.source_kind !== 'link' && c.source_kind !== 'manual') continue;
    await q(`update public.companies set source_kind = 'manual' where id = $1`, [companyId]);

    for (const [i, [title, location, dept]] of roles.entries()) {
      await q(
        `insert into public.company_jobs (
           company_id, external_id, title, location, department, apply_url,
           source_kind, posted_at, is_open
         ) values ($1,$2,$3,$4,$5,$6,'manual',$7,true)
         on conflict (company_id, external_id) do update set
           title = excluded.title, location = excluded.location,
           department = excluded.department, is_open = true`,
        [
          companyId, `demo-${slug}-${i}`, title, location, dept,
          `https://example.com/careers/${slug}/${i}`, daysAgo(3 + i * 4),
        ]
      );
    }
  }

  for (const ins of INSIDERS) {
    const companyId = companies[ins.slug];
    if (!companyId) continue;
    await q(
      `insert into public.company_insiders (company_id, member_id, job_title, can_refer, notify_email)
       values ($1,$2,$3,$4,true)
       on conflict (company_id, member_id) do update set
         job_title = excluded.job_title, can_refer = excluded.can_refer`,
      [companyId, memberId(ins.m), ins.title, ins.refer]
    );
  }

  // Requests are built directly rather than through create_referral_request:
  // that function reads app.current_user_id(), which a seed script has no way to
  // be. The rows it would have written are written here instead, including the
  // recipient fan-out and the anonymous headline built the same way.
  for (const r of REQUESTS) {
    const companyId = companies[r.slug];
    const seeker = memberId(r.seeker);
    if (!companyId || !seeker) continue;

    const m = MEMBERS[r.seeker];
    const headline = `A ${m.title} (${m.exp})`;
    const created = daysAgo(r.days, 11);

    const existing = await q(
      'select id from public.referral_requests where seeker_id = $1 and company_id = $2',
      [seeker, companyId]
    );
    if (existing.length) continue;

    const jobs = await q(
      `select id from public.company_jobs where company_id = $1 and is_open
       order by posted_at desc nulls last limit $2`,
      [companyId, r.jobs]
    );
    if (!jobs.length) continue;

    const status = r.withdraw ? 'withdrawn' : r.accept !== null ? 'matched' : 'open';
    const requestId = (await q(
      `insert into public.referral_requests
         (seeker_id, company_id, headline, note, status, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$6) returning id`,
      [seeker, companyId, headline, r.note, status, created]
    ))[0].id;

    for (const j of jobs) {
      await q(
        `insert into public.referral_request_jobs (request_id, job_id) values ($1,$2)
         on conflict do nothing`,
        [requestId, j.id]
      );
    }

    // Everyone at that company who will help, minus the seeker.
    const insiders = await q(
      `select member_id from public.company_insiders
        where company_id = $1 and can_refer and member_id <> $2`,
      [companyId, seeker]
    );
    for (const ins of insiders) {
      const accepted = r.accept !== null && ins.member_id === memberId(r.accept);
      // A withdrawn request keeps only rows that were already answered.
      if (r.withdraw && !accepted) continue;
      await q(
        `insert into public.referral_recipients (request_id, insider_id, status, responded_at, created_at)
         values ($1,$2,$3,$4,$5) on conflict do nothing`,
        [requestId, ins.member_id, accepted ? 'accepted' : 'pending',
         accepted ? daysAgo(Math.max(0, r.days - 1), 15) : null, created]
      );
    }
    await q('update public.referral_requests set notified_count = $2 where id = $1',
      [requestId, insiders.length]);

    // A notification for the accepted case, so the bell is not empty.
    if (r.accept !== null) {
      const helper = MEMBERS[r.accept];
      const [company] = await q('select name from public.companies where id = $1', [companyId]);
      await q(
        `insert into public.in_app_notifications (user_id, type, title, body, link, created_at)
         values ($1,'referral_accepted',$2,$3,'/portal/member/referrals',$4)`,
        [seeker, `${helper.first} ${helper.last} can help at ${company.name}`,
         'They work there and agreed to help with your request.',
         daysAgo(Math.max(0, r.days - 1), 15)]
      );
    }
  }
}

// ===========================================================================
// Help desk
// ===========================================================================

const HELP = [
  { m: 0,  cat: 'Career & Jobs',      title: 'Resume not getting past screening for QA roles',              urgency: 'medium',   status: 'assigned',      vol: 5,  days: 6 },
  { m: 4,  cat: 'Career & Jobs',      title: 'Portfolio review before applying to design roles',            urgency: 'low',      status: 'in_progress',   vol: 5,  days: 9 },
  { m: 9,  cat: 'Credentials',        title: 'P.Eng application — overseas experience sign-off',            urgency: 'high',     status: 'under_review',  vol: null, days: 3 },
  { m: 2,  cat: 'Credentials',        title: 'NNAS report stuck at document verification',                  urgency: 'high',     status: 'resolved',      vol: 12, days: 21 },
  { m: 11, cat: 'Settlement',         title: 'Finding a rental in Surrey without Canadian credit history',  urgency: 'critical', status: 'assigned',      vol: 8,  days: 4 },
  { m: 14, cat: 'Career & Jobs',      title: 'Marketing roles outside Toronto — is remote realistic?',      urgency: 'medium',   status: 'submitted',     vol: null, days: 1 },
  { m: 3,  cat: 'Taxes & Finance',    title: 'First Canadian tax return with income from two countries',    urgency: 'medium',   status: 'response_sent', vol: 6,  days: 14 },
  { m: 8,  cat: 'Immigration',        title: 'PR card renewal while outside Canada',                        urgency: 'high',     status: 'need_more_info',vol: null, days: 5 },
  { m: 15, cat: 'Career & Jobs',      title: 'Moving from driving into fleet management',                   urgency: 'low',      status: 'closed',        vol: 7,  days: 34 },
  { m: 12, cat: 'Credentials',        title: 'Pharmacy licensing in Quebec and the French requirement',     urgency: 'medium',   status: 'in_progress',   vol: 6,  days: 11 },
];

const TIMELINE = {
  submitted: ['Request received'],
  under_review: ['Request received', 'Being reviewed by the admin team'],
  need_more_info: ['Request received', 'Being reviewed by the admin team', 'More information requested from the member'],
  assigned: ['Request received', 'Reviewed and approved', 'Assigned to a volunteer'],
  in_progress: ['Request received', 'Reviewed and approved', 'Assigned to a volunteer', 'Volunteer working with the member'],
  response_sent: ['Request received', 'Reviewed and approved', 'Assigned to a volunteer', 'Response sent to the member'],
  resolved: ['Request received', 'Reviewed and approved', 'Assigned to a volunteer', 'Response sent to the member', 'Marked resolved'],
  closed: ['Request received', 'Reviewed and approved', 'Assigned to a volunteer', 'Response sent to the member', 'Marked resolved', 'Closed'],
};

async function seedHelpDesk(ids) {
  const memberId = (i) => ids[email(MEMBERS[i])];
  const [admin] = await q(`select id from public.profiles where role = 'admin' order by created_at limit 1`);

  for (const [i, h] of HELP.entries()) {
    const member = memberId(h.m);
    const m = MEMBERS[h.m];
    const created = daysAgo(h.days, 10);

    const found = await q('select id from public.help_requests where member_id = $1 and title = $2',
      [member, h.title]);
    const id = found.length ? found[0].id : (await q(
      `insert into public.help_requests (
         reference, member_id, member_name, category, title, description, urgency,
         preferred_timeline, consent_given, status, assigned_admin_id,
         assigned_volunteer_id, assigned_volunteer_name, created_at, updated_at, closed_at
       ) values ($1,$2,$3,$4,$5,$6,$7,'Within a few weeks',true,$8,$9,$10,$11,$12,$12,$13)
       returning id`,
      [
        `PC-${String(4200 + i * 17)}`, member, `${m.first} ${m.last}`, h.cat, h.title,
        `${m.title} in ${m.city}. ${h.title}. Looking for guidance from someone who has been through it.`,
        h.urgency, h.status, admin?.id ?? null,
        h.vol !== null ? memberId(h.vol) : null,
        h.vol !== null ? `${MEMBERS[h.vol].first} ${MEMBERS[h.vol].last}` : null,
        created,
        h.status === 'closed' || h.status === 'resolved' ? daysAgo(Math.max(0, h.days - 5), 16) : null,
      ]
    ))[0].id;

    // Timeline entries, one per step, spread across the request's life.
    const steps = TIMELINE[h.status] ?? TIMELINE.submitted;
    for (const [s, description] of steps.entries()) {
      const at = daysAgo(Math.max(0, h.days - s * 2), 11 + s);
      const exists = await q(
        'select 1 from public.request_timeline where request_id = $1 and description = $2',
        [id, description]
      );
      if (!exists.length) {
        await q(
          `insert into public.request_timeline (request_id, status, description, created_at)
           values ($1,$2,$3,$4)`,
          [id, h.status, description, at]
        );
      }
    }

    // One internal note on the requests an admin has actually touched.
    if (h.vol !== null) {
      const body = `Matched with ${MEMBERS[h.vol].first} — same field, same city where possible. Member briefed on the no-direct-contact rule.`;
      const exists = await q('select 1 from public.request_notes where request_id = $1 and body = $2', [id, body]);
      if (!exists.length) {
        await q(
          `insert into public.request_notes (request_id, author_id, author_name, body, created_at)
           values ($1,$2,'Portal Admin',$3,$4)`,
          [id, admin?.id ?? null, body, daysAgo(Math.max(0, h.days - 1), 13)]
        );
      }
    }
  }

  // Volunteer applications across the whole status vocabulary.
  const VOLS = [
    { m: 5,  status: 'approved',             cases: 4 },
    { m: 6,  status: 'approved',             cases: 3 },
    { m: 7,  status: 'approved',             cases: 2 },
    { m: 12, status: 'approved',             cases: 2 },
    { m: 15, status: 'pending_verification', cases: 2 },
    { m: 10, status: 'new_application',      cases: 3 },
    { m: 13, status: 'on_hold',              cases: 1 },
  ];
  for (const v of VOLS) {
    const m = MEMBERS[v.m];
    const member = memberId(v.m);
    const exists = await q('select id from public.volunteer_applications where member_id = $1', [member]);
    if (exists.length) continue;
    await q(
      `insert into public.volunteer_applications (
         member_id, member_name, email, phone, city, province, current_profession,
         organization, years_experience, expertise_areas, languages, availability,
         max_cases_per_month, mentorship_interest, referral_support_interest,
         resume_review_interest, settlement_support_interest, tax_guidance_interest,
         immigration_guidance_interest, motivation, experience_summary,
         agreed_to_rules, agreed_no_direct_contact, agreed_admin_mediated,
         consent_to_screening, status, reviewed_at, created_at, updated_at
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'Evenings and weekends',$12,
                 true,$13,true,$14,$15,false,$16,$17,true,true,true,true,$18,$19,$20,$20)`,
      [
        member, `${m.first} ${m.last}`, email(m), m.phone, m.city, m.prov, m.title,
        m.company, Number((m.exp.match(/\d+/) ?? [5])[0]),
        v.m === 6 ? ['Taxes', 'Accounting', 'CPA pathway'] : v.m === 5 ? ['Software engineering', 'Interview prep', 'Referrals'] : ['Career mentoring', 'Resume review'],
        ['English', 'Hindi'],
        v.cases,
        ['approved'].includes(v.status),
        v.m === 11 || v.m === 8,
        v.m === 6,
        `I arrived with the same questions and someone answered them for me. Returning the favour is the least I can do.`,
        `${m.exp} as a ${m.title} at ${m.company}, based in ${m.city}.`,
        v.status,
        v.status === 'approved' ? daysAgo(30) : null,
        daysAgo(45),
      ]
    );
  }

  // Admin-to-member messages, attached to the request they are about. The table
  // is case-scoped with sender/recipient roles rather than a subject line.
  const MESSAGES = [
    { m: 0,  title: 'Resume not getting past screening for QA roles', body: 'A volunteer with a QA background has picked up your request and will be in touch through us this week.' },
    { m: 9,  title: 'P.Eng application — overseas experience sign-off', body: 'Could you tell us which province you are applying in? The experience sign-off rules differ between PEO and APEGA.' },
    { m: 2,  title: 'NNAS report stuck at document verification', body: 'Glad that one is sorted. If the provincial college asks for anything else, reopen the request rather than starting a new one.' },
  ];
  for (const msg of MESSAGES) {
    const member = memberId(msg.m);
    if (!member || !admin) continue;
    const [req] = await q('select id, title from public.help_requests where member_id = $1 and title = $2',
      [member, msg.title]);
    const exists = await q('select id from public.messages where recipient_user_id = $1 and body = $2',
      [member, msg.body]);
    if (exists.length) continue;
    await q(
      `insert into public.messages (
         case_id, case_title, sender_role, sender_user_id, sender_name,
         recipient_user_id, recipient_role, visibility_scope, body, created_at
       ) values ($1,$2,'admin',$3,'Portal Admin',$4,'member','member_only',$5,$6)`,
      [req?.id ?? null, msg.title, admin.id, member, msg.body, daysAgo(4)]
    );
  }
}

// ===========================================================================
// Business directory
// ===========================================================================

const BUSINESSES = [
  { name: 'Sharma Immigration Consulting', cat: 'Immigration',      city: 'Toronto',     prov: 'Ontario',          person: 'Ritu Sharma',      phone: '+1 (416) 512-8890', ver: 'verified',       featured: true,  deal: '15% off the first consultation for members', years: 11, desc: 'RCIC-licensed consultants handling PR, work permits and spousal sponsorship.', services: ['PR applications', 'Work permits', 'Spousal sponsorship', 'LMIA'] },
  { name: 'Maple & Masala Catering',        cat: 'Food & Catering',  city: 'Mississauga', prov: 'Ontario',          person: 'Anil Kapadia',     phone: '+1 (905) 334-2216', ver: 'verified',       featured: true,  deal: 'Free tasting for events over 50 guests', years: 7,  desc: 'North and South Indian catering for weddings, corporate events and community meetups.', services: ['Wedding catering', 'Corporate lunches', 'Event catering'] },
  { name: 'Northline Tax & Bookkeeping',    cat: 'Accounting',       city: 'Calgary',     prov: 'Alberta',          person: 'Meera Nair',       phone: '+1 (403) 615-2280', ver: 'verified',       featured: false, deal: 'Flat $89 first-year newcomer return', years: 9,  desc: 'CPA-led personal and small-business returns, with newcomer first-return specialists.', services: ['Personal tax', 'Small business tax', 'GST/HST filing', 'Bookkeeping'] },
  { name: 'Gill Brothers Moving',           cat: 'Moving & Storage', city: 'Surrey',      prov: 'British Columbia', person: 'Sandeep Gill',     phone: '+1 (778) 391-6602', ver: 'verified',       featured: false, deal: '10% off local moves', years: 6, desc: 'Local and long-distance moves with packing and short-term storage.', services: ['Local moving', 'Long distance', 'Packing', 'Storage'] },
  { name: 'Bay Street Mortgage Group',      cat: 'Financial Services', city: 'Toronto',   prov: 'Ontario',          person: 'Vikram Bhatia',    phone: '+1 (416) 209-5537', ver: 'verified',       featured: false, deal: 'No-fee newcomer mortgage review', years: 12, desc: 'Mortgage brokers who work with newcomer programs and thin credit files.', services: ['First-time buyer', 'Newcomer programs', 'Refinancing'] },
  { name: 'Aurora Dental Care',             cat: 'Healthcare',       city: 'Brampton',    prov: 'Ontario',          person: 'Dr. Nisha Patel',  phone: '+1 (905) 793-4417', ver: 'verified',       featured: false, deal: 'Free first cleaning with new-patient exam', years: 8, desc: 'Family dentistry with evening and weekend appointments.', services: ['Cleanings', 'Fillings', 'Emergency care', 'Invisalign'] },
  { name: 'Pixel & Print Studio',           cat: 'Marketing',        city: 'Halifax',     prov: 'Nova Scotia',      person: 'Kavya Reddy',      phone: '+1 (902) 405-2274', ver: 'pending_review', featured: false, deal: null, years: 2, desc: 'Brand identity, print and social content for small businesses.', services: ['Branding', 'Social media', 'Print design'] },
  { name: 'Prairie Driving Academy',        cat: 'Education',        city: 'Winnipeg',    prov: 'Manitoba',         person: 'Harpreet Sandhu',  phone: '+1 (204) 771-3358', ver: 'verified',       featured: false, deal: '$200 off MELT AZ training for members', years: 5, desc: 'MELT-certified Class 1 and Class 5 training with in-house road tests.', services: ['Class 1 AZ', 'Class 5', 'MELT', 'Air brake'] },
  { name: 'Lakeview Realty Partners',       cat: 'Real Estate',      city: 'Mississauga', prov: 'Ontario',          person: 'Rohan Deshpande',  phone: '+1 (905) 273-1164', ver: 'pending_review', featured: false, deal: null, years: 4, desc: 'Residential sales and leasing across Peel and Halton.', services: ['Buying', 'Selling', 'Leasing'] },
  { name: 'Cedar IT Services',              cat: 'Technology',       city: 'Ottawa',      prov: 'Ontario',          person: 'Divya Krishnan',   phone: '+1 (613) 447-8815', ver: 'verified',       featured: false, deal: 'Free one-hour setup consult', years: 3, desc: 'Managed IT and cybersecurity for offices under 50 people.', services: ['Managed IT', 'Cybersecurity', 'Cloud migration'] },
];

async function seedBusinesses(ids) {
  const [admin] = await q(`select id from public.profiles where role = 'admin' order by created_at limit 1`);
  const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  for (const [i, b] of BUSINESSES.entries()) {
    await q(
      `insert into public.businesses (
         name, slug, logo, category, description_short, description_full, services,
         contact_person, phone, email, website, city, province, service_area,
         years_in_business, business_hours, member_rate_text, member_benefits,
         offer_badge, verification_status, is_featured, has_member_rate,
         approved_by_admin, created_at, updated_at
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
                 'Mon-Fri 9am-6pm, Sat 10am-4pm',$16,$17,$18,$19,$20,$21,$22,$23,$23)
       on conflict (slug) do update set
         description_short = excluded.description_short,
         verification_status = excluded.verification_status,
         member_rate_text = excluded.member_rate_text,
         is_featured = excluded.is_featured,
         has_member_rate = excluded.has_member_rate`,
      [
        b.name, slug(b.name), b.name.charAt(0), b.cat, b.desc,
        `${b.desc} Serving the community in ${b.city} for ${b.years} years.`,
        b.services, b.person, b.phone,
        `hello@${slug(b.name).replace(/-/g, '')}.ca`,
        `https://www.${slug(b.name).replace(/-/g, '')}.ca`,
        b.city, b.prov, `${b.city} and surrounding area`, b.years,
        b.deal, b.deal ? [b.deal] : [], b.deal ? 'Member offer' : null,
        b.ver, b.featured, Boolean(b.deal),
        b.ver === 'verified' ? admin?.id ?? null : null,
        daysAgo(80 - i * 6),
      ]
    );
  }

  // A couple of contact requests so the admin queue has something in it.
  const [biz] = await q(`select id, name from public.businesses where slug = 'sharma-immigration-consulting'`);
  const asker = ids[email(MEMBERS[8])];
  if (biz && asker) {
    const exists = await q('select 1 from public.business_contact_requests where business_id = $1 and member_id = $2', [biz.id, asker]);
    if (!exists.length) {
      await q(
        `insert into public.business_contact_requests
           (business_id, business_name, member_id, member_name, help_type,
            preferred_contact, notes, status, created_at, updated_at)
         values ($1,$2,$3,$4,'introduction','portal',$5,'pending',$6,$6)`,
        [biz.id, biz.name, asker, 'Aditya Joshi',
         'Looking for help with a PR card renewal from outside Canada. Do you handle those?',
         daysAgo(3)]
      );
    }
  }
}

// ===========================================================================
// Matrimony
// ===========================================================================

const MATRIMONY = [
  { m: 0,  gender: 'Female', dob: '1994-03-11', height: 163, religion: 'Hindu',  community: 'Tamil',     tongue: 'Tamil',     status: 'approved', diet: 'Vegetarian',      hobbies: ['Reading', 'Cooking', 'Skating'], about: 'QA analyst in Toronto, landed last year. I read too much, cook badly and I am learning to skate.' },
  { m: 4,  gender: 'Female', dob: '1997-07-22', height: 158, religion: 'Hindu',  community: 'Malayali',  tongue: 'Malayalam', status: 'approved', diet: 'Eggetarian',      hobbies: ['Hiking', 'Ceramics', 'Photography'], about: 'Designer in Vancouver. Hikes on weekends, ceramics on weeknights.' },
  { m: 14, gender: 'Female', dob: '1998-01-09', height: 160, religion: 'Hindu',  community: 'Telugu',    tongue: 'Telugu',    status: 'approved', diet: 'Non-vegetarian',  hobbies: ['Sea swimming', 'Running', 'Podcasts'], about: 'Marketing in Halifax. Sea swimming convert, still cannot handle the cold.' },
  { m: 2,  gender: 'Female', dob: '1992-11-30', height: 165, religion: 'Sikh',   community: 'Jat Sikh',  tongue: 'Punjabi',   status: 'approved', diet: 'Vegetarian',      hobbies: ['Board games', 'Cooking', 'Gurdwara volunteering'], about: 'Nurse in Brampton. Big family, big kitchen, very competitive at board games.' },
  { m: 5,  gender: 'Male',   dob: '1990-05-18', height: 178, religion: 'Hindu',  community: 'Tamil',     tongue: 'Tamil',     status: 'approved', diet: 'Non-vegetarian',  hobbies: ['Cycling', 'Cricket', 'Filter coffee'], about: 'Engineer in Waterloo. Cycling, filter coffee, and long arguments about cricket.' },
  { m: 9,  gender: 'Male',   dob: '1996-09-02', height: 174, religion: 'Hindu',  community: 'Marathi',   tongue: 'Marathi',   status: 'approved', diet: 'Vegetarian',      hobbies: ['Trekking', 'Tabla', 'Cricket'], about: 'Civil engineer in Edmonton, working towards P.Eng. Trekking and tabla.' },
  { m: 3,  gender: 'Male',   dob: '1993-02-14', height: 172, religion: 'Hindu',  community: 'Marathi',   tongue: 'Marathi',   status: 'approved', diet: 'Eggetarian',      hobbies: ['Travel planning', 'Badminton', 'Cooking'], about: 'Supply chain in Mississauga. I plan holidays in spreadsheets and I am not sorry.' },
  { m: 11, gender: 'Male',   dob: '1995-06-25', height: 176, religion: 'Sikh',   community: 'Ramgarhia', tongue: 'Punjabi',   status: 'approved', diet: 'Non-vegetarian',  hobbies: ['Football', 'Community service', 'Driving trips'], about: 'Logistics in Surrey. Weekend football, and the family langar rota.' },
  { m: 10, gender: 'Female', dob: '1995-12-05', height: 161, religion: 'Hindu',  community: 'Bengali',   tongue: 'Bengali',   status: 'pending',  diet: 'Non-vegetarian',  hobbies: ['Bookshops', 'Cooking', 'Karaoke'], about: 'Data scientist in Toronto. Bookshops, biryani, and bad karaoke.' },
];

async function seedMatrimony(ids) {
  const memberId = (i) => ids[email(MEMBERS[i])];

  for (const p of MATRIMONY) {
    const m = MEMBERS[p.m];
    const userId = memberId(p.m);
    if (!userId) continue;

    const exists = await q('select id from public.matrimony_profiles where user_id = $1', [userId]);
    if (exists.length) continue;

    await q(
      `insert into public.matrimony_profiles (
         user_id, status, created_by, full_name, display_pref, gender, dob, height_cm,
         marital_status, have_children, religion, community, mother_tongue, languages,
         country, province, city, residency_status, open_to_relocate, qualification,
         occupation, employer, industry, employment_type, income_range, family_type,
         family_values, diet, smoking, drinking, hobbies, about_me, completeness_pct,
         is_verified_id, photo_visibility, last_active_at, created_at, updated_at
       ) values (
         $1,$2,'Self',$3,'Full Name',$4,$5,$6,'Never Married','No',$7,$8,$9,$10,
         'Canada',$11,$12,$13,true,$14,$15,$16,$17,'Full Time',$18,'Nuclear',
         'Moderate',$19,'Never','Occasionally',$20,$21,$22,$23,'all',$24,$25,$25
       )`,
      [
        userId, p.status, `${m.first} ${m.last}`, p.gender, p.dob, p.height,
        p.religion, p.community, p.tongue, ['English', p.tongue],
        m.prov, m.city,
        m.status.includes('Citizen') ? 'Citizen' : m.status.includes('Permanent') ? 'Permanent Resident' : 'Work Permit',
        m.ug, m.title, m.company, m.industry,
        p.status === 'approved' ? '$80,000 - $100,000' : '$60,000 - $80,000',
        p.diet,
        p.hobbies,
        p.about,
        p.status === 'approved' ? 85 : 55,
        p.status === 'approved' && m.ver === 'verified',
        daysAgo(Math.floor(Math.random() * 0) + 1),
        daysAgo(60),
      ]
    );
  }

  // A few interests and shortlists so the matches/interests screens have data.
  const profiles = Object.fromEntries(
    (await q(`select p.id, pr.email from public.matrimony_profiles p
              join public.profiles pr on pr.id = p.user_id
              where pr.email like $1`, ['%' + DEMO_DOMAIN]))
      .map((r) => [r.email, r.id])
  );
  const pid = (i) => profiles[email(MEMBERS[i])];

  const INTERESTS = [[4, 0, 'pending'], [5, 0, 'accepted'], [9, 4, 'pending'], [3, 14, 'declined'], [11, 2, 'pending']];
  for (const [from, to, status] of INTERESTS) {
    if (!pid(from) || !pid(to)) continue;
    await q(
      `insert into public.matrimony_interests (sender_profile_id, receiver_profile_id, status, created_at)
       values ($1,$2,$3,$4) on conflict do nothing`,
      [pid(from), pid(to), status, daysAgo(8)]
    );
  }

  const SHORTLISTS = [[0, 5], [0, 9], [4, 5], [2, 11], [14, 3]];
  for (const [owner, target] of SHORTLISTS) {
    if (!pid(owner) || !pid(target)) continue;
    await q(
      `insert into public.matrimony_shortlists (owner_profile_id, target_profile_id, created_at)
       values ($1,$2,$3) on conflict do nothing`,
      [pid(owner), pid(target), daysAgo(6)]
    );
  }
}

// ===========================================================================
// Public content top-up
// ===========================================================================

const VIDEOS = [
  { title: 'Your first 30 days in Canada: the paperwork, in order',      cat: 'Settlement', dur: '18:42', views: '12K', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', order: 1 },
  { title: 'Canadian resume format, line by line',                      cat: 'Careers',    dur: '24:15', views: '31K', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', order: 2 },
  { title: 'How referrals actually work here (and how to ask)',          cat: 'Careers',    dur: '15:07', views: '8.4K', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', order: 3 },
  { title: 'Credential recognition for nurses: NNAS start to finish',    cat: 'Credentials',dur: '32:50', views: '19K', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', order: 4 },
  { title: 'Filing your first Canadian tax return',                      cat: 'Finance',    dur: '21:33', views: '14K', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', order: 5 },
  { title: 'Renting with no credit history: what landlords accept',      cat: 'Settlement', dur: '12:58', views: '9.7K', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', order: 6 },
];

const INQUIRIES = [
  { name: 'Ritesh Malhotra',  email: 'ritesh.malhotra@example.com',  subject: 'Volunteering as a CPA',           message: 'I am a CPA in Toronto with 14 years of experience and would like to help with tax questions. How do I start?' },
  { name: 'Fatima Sheikh',    email: 'fatima.sheikh@example.com',    subject: 'Listing our clinic',               message: 'We run a physiotherapy clinic in Scarborough and would like to be in the business directory.' },
  { name: 'Gurpreet Dhillon', email: 'g.dhillon@example.com',        subject: 'Meetup in Winnipeg?',              message: 'Are there any events planned for Winnipeg? Most of what I see is Toronto and Vancouver.' },
  { name: 'Ling Zhao',        email: 'ling.zhao@example.com',        subject: 'Is the club only for Indians?',     message: 'I am from China and found your resources very useful. Am I able to join?' },
  { name: 'Samuel Okonkwo',   email: 's.okonkwo@example.com',        subject: 'Engineering credentials',           message: 'Looking for someone who has been through APEGA with a Nigerian degree. Can you connect me?' },
];

async function seedPublicContent() {
  for (const v of VIDEOS) {
    // No unique constraint on this table, so the title is the idempotency key.
    const exists = await q('select 1 from public.youtube_videos where title = $1', [v.title]);
    if (exists.length) continue;
    await q(
      `insert into public.youtube_videos
         (title, category, duration, views, video_url, display_order, recorded_date, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [v.title, v.cat, v.dur, v.views, v.url, v.order,
       daysAgo(30 + v.order * 12).slice(0, 10), daysAgo(30 + v.order * 12)]
    );
  }

  for (const [i, inq] of INQUIRIES.entries()) {
    const exists = await q('select 1 from public.public_inquiries where email = $1 and subject = $2',
      [inq.email, inq.subject]);
    if (exists.length) continue;
    await q(
      `insert into public.public_inquiries (kind, name, email, subject, message, status, created_at)
       values ('contact',$1,$2,$3,$4,$5,$6)`,
      [inq.name, inq.email, inq.subject, inq.message,
       i === 0 ? 'closed' : i === 1 ? 'in_progress' : 'new', daysAgo(2 + i * 3)]
    );
  }

  const CAMPAIGNS = [
    { title: 'Winter coat drive 2026',        goal: 15000, raised: 11480, desc: 'Coats and boots for families arriving between November and March.' },
    { title: 'Resume clinic running costs',   goal: 6000,  raised: 4325,  desc: 'Hall rental, printing and refreshments for the monthly clinic.' },
  ];
  for (const c of CAMPAIGNS) {
    const exists = await q('select 1 from public.donation_campaigns where title = $1', [c.title]);
    if (!exists.length) {
      await q(
        `insert into public.donation_campaigns (title, description, goal_amount, raised_amount, is_active, created_at)
         values ($1,$2,$3,$4,true,$5)`,
        [c.title, c.desc, c.goal, c.raised, daysAgo(40)]
      );
    }
  }
}

// ===========================================================================
// The real sign-in accounts
//
// Demo members cannot log in (they have no password), so without this the member
// side of the app looks empty to whoever is being shown it. member@ becomes a
// job seeker with requests in flight; volunteer@ becomes an insider with asks
// waiting in their inbox and a case assigned.
// ===========================================================================

async function seedRealAccounts(ids) {
  const memberId = (i) => ids[email(MEMBERS[i])];
  const [seeker] = await q("select id, first_name, last_name from public.profiles where email = 'member@professionalsclub.ca'");
  const [helper] = await q("select id, first_name, last_name from public.profiles where email = 'volunteer@professionalsclub.ca'");
  const [admin] = await q("select id from public.profiles where role = 'admin' order by created_at limit 1");
  if (!seeker || !helper) {
    console.log('  (real member/volunteer accounts not found - skipped)');
    return;
  }

  const companies = Object.fromEntries(
    (await q('select id, slug, name from public.companies')).map((c) => [c.slug, c])
  );

  // volunteer@ works at CIBC and Shopify, and will help at both.
  for (const [slug, title] of [['cibc', 'Senior Manager, Technology'], ['shopify', 'Engineering Manager']]) {
    if (!companies[slug]) continue;
    await q(
      `insert into public.company_insiders (company_id, member_id, job_title, can_refer, notify_email)
       values ($1,$2,$3,true,true)
       on conflict (company_id, member_id) do update set
         job_title = excluded.job_title, can_refer = true`,
      [companies[slug].id, helper.id, title]
    );
  }

  // Asks waiting in volunteer@'s inbox, from demo members, still anonymous.
  const INBOUND = [
    [0,  'cibc',    'Six years in retail banking operations, CSC certified. Targeting the analytics side.'],
    [4,  'shopify', 'Product designer, three years, portfolio is mostly fintech dashboards.'],
    [10, 'cibc',    'Data scientist moving from telecom into financial services. Happy to explain the overlap.'],
  ];
  for (const [seekerIdx, slug, note] of INBOUND) {
    const company = companies[slug];
    const from = memberId(seekerIdx);
    if (!company || !from) continue;
    const m = MEMBERS[seekerIdx];

    const existing = await q(
      'select id from public.referral_requests where seeker_id = $1 and company_id = $2',
      [from, company.id]
    );
    const created = daysAgo(1 + (seekerIdx % 4), 11);
    const requestId = existing.length ? existing[0].id : (await q(
      `insert into public.referral_requests
         (seeker_id, company_id, headline, note, status, created_at, updated_at)
       values ($1,$2,$3,$4,'open',$5,$5) returning id`,
      [from, company.id, 'A ' + m.title + ' (' + m.exp + ')', note, created]
    ))[0].id;

    const jobs = await q(
      `select id from public.company_jobs where company_id = $1 and is_open
       order by posted_at desc nulls last limit 2`, [company.id]
    );
    for (const j of jobs) {
      await q(
        `insert into public.referral_request_jobs (request_id, job_id) values ($1,$2)
         on conflict do nothing`, [requestId, j.id]);
    }
    await q(
      `insert into public.referral_recipients (request_id, insider_id, status, created_at)
       values ($1,$2,'pending',$3) on conflict do nothing`,
      [requestId, helper.id, created]
    );
    await q(
      `insert into public.in_app_notifications (user_id, type, title, body, link, created_at)
       values ($1,'referral_request',$2,$3,'/portal/member/referrals',$4)`,
      [helper.id, 'Someone needs a referral at ' + company.name,
       'A ' + m.title + ' asked about ' + jobs.length + (jobs.length === 1 ? ' role.' : ' roles.'),
       created]
    );
    const recipients = await q(
      'select count(*)::int n from public.referral_recipients where request_id = $1', [requestId]);
    await q('update public.referral_requests set notified_count = $2 where id = $1',
      [requestId, recipients[0].n]);
  }

  // member@ has asks of her own: one already matched, one still waiting.
  const OUTBOUND = [
    ['telus',           'Six years in QA, moving towards data quality work. Open to Toronto or remote.', true],
    ['deloitte-canada', 'Interested in the technology consulting stream. Two references from Canadian managers.', false],
  ];
  for (const [slug, note, matched] of OUTBOUND) {
    const company = companies[slug];
    if (!company) continue;
    const existing = await q(
      'select id from public.referral_requests where seeker_id = $1 and company_id = $2',
      [seeker.id, company.id]
    );
    if (existing.length) continue;

    const created = daysAgo(matched ? 4 : 2, 10);
    const requestId = (await q(
      `insert into public.referral_requests
         (seeker_id, company_id, headline, note, status, created_at, updated_at)
       values ($1,$2,'A QA Analyst (4-6 years)',$3,$4,$5,$5) returning id`,
      [seeker.id, company.id, note, matched ? 'matched' : 'open', created]
    ))[0].id;

    const jobs = await q(
      `select id from public.company_jobs where company_id = $1 and is_open
       order by posted_at desc nulls last limit 2`, [company.id]
    );
    for (const j of jobs) {
      await q(
        `insert into public.referral_request_jobs (request_id, job_id) values ($1,$2)
         on conflict do nothing`, [requestId, j.id]);
    }

    const insiders = await q(
      `select member_id from public.company_insiders
        where company_id = $1 and can_refer and member_id <> $2`,
      [company.id, seeker.id]
    );
    for (const [k, ins] of insiders.entries()) {
      const accepted = matched && k === 0;
      await q(
        `insert into public.referral_recipients
           (request_id, insider_id, status, responded_at, created_at)
         values ($1,$2,$3,$4,$5) on conflict do nothing`,
        [requestId, ins.member_id, accepted ? 'accepted' : 'pending',
         accepted ? daysAgo(3, 15) : null, created]
      );
    }
    await q('update public.referral_requests set notified_count = $2 where id = $1',
      [requestId, insiders.length]);
  }

  // A help request each, so My Requests is not empty either.
  const OWN_REQUESTS = [
    [seeker, 'Career & Jobs',   'Interview practice for a data quality role',   'assigned', 5],
    [helper, 'Taxes & Finance', 'Claiming moving expenses on a first return',   'resolved', 6],
  ];
  for (const [k, [who, cat, title, status, vol]] of OWN_REQUESTS.entries()) {
    const exists = await q(
      'select id from public.help_requests where member_id = $1 and title = $2', [who.id, title]);
    if (exists.length) continue;
    const id = (await q(
      `insert into public.help_requests (
         reference, member_id, member_name, category, title, description, urgency,
         consent_given, status, assigned_admin_id, assigned_volunteer_id,
         assigned_volunteer_name, created_at, updated_at, closed_at
       ) values ($1,$2,$3,$4,$5,$6,'medium',true,$7,$8,$9,$10,$11,$11,$12)
       returning id`,
      [
        // reference is UNIQUE; the index guarantees distinctness where two
        // titles happen to be the same length.
        'PC-47' + String(10 + k), who.id,
        (who.first_name + ' ' + who.last_name).trim(),
        cat, title, title + '. Looking for someone who has done this recently.',
        status, admin ? admin.id : null, memberId(vol),
        MEMBERS[vol].first + ' ' + MEMBERS[vol].last,
        daysAgo(8), status === 'resolved' ? daysAgo(2, 16) : null,
      ]
    ))[0].id;
    const steps = TIMELINE[status] || [];
    for (const [k, description] of steps.entries()) {
      await q(
        `insert into public.request_timeline (request_id, status, description, created_at)
         values ($1,$2,$3,$4)`,
        [id, status, description, daysAgo(Math.max(0, 8 - k * 2), 11 + k)]
      );
    }
  }

  // A matrimony listing each, because matrimony_visible_profiles requires
  // my_matrimony_profile_id() IS NOT NULL: you cannot browse other members
  // until you have a listing of your own. That is deliberate product design, so
  // without this the browse screen correctly shows nothing and looks broken to
  // anyone being given a demo.
  const OWN_MATRIMONY = [
    [seeker, 'Female', '1994-06-19', 162, 'Hindu', 'Tamil', 'Tamil', 'Vegetarian',
     ['Reading', 'Baking', 'Long walks'],
     'QA analyst in Toronto. I bake more than I can eat and I am slowly learning to skate.'],
    [helper, 'Male', '1989-10-04', 179, 'Hindu', 'Malayali', 'Malayalam', 'Non-vegetarian',
     ['Cycling', 'Cricket', 'Cooking'],
     'Engineering manager in Toronto. Weekend cyclist, weekday cook, permanently behind on my reading.'],
  ];
  for (const [who, gender, dob, height, religion, community, tongue, diet, hobbies, about] of OWN_MATRIMONY) {
    const exists = await q('select id from public.matrimony_profiles where user_id = $1', [who.id]);
    if (exists.length) continue;
    await q(
      `insert into public.matrimony_profiles (
         user_id, status, created_by, full_name, display_pref, gender, dob, height_cm,
         marital_status, have_children, religion, community, mother_tongue, languages,
         country, province, city, residency_status, open_to_relocate, qualification,
         occupation, employer, industry, employment_type, income_range, family_type,
         family_values, diet, smoking, drinking, hobbies, about_me, completeness_pct,
         is_verified_id, photo_visibility, last_active_at, created_at, updated_at
       ) values (
         $1,'approved','Self',$2,'Full Name',$3,$4,$5,'Never Married','No',$6,$7,$8,$9,
         'Canada','Ontario','Toronto','Permanent Resident',true,$10,$11,$12,$13,
         'Full Time','$80,000 - $100,000','Nuclear','Moderate',$14,'Never','Occasionally',
         $15,$16,88,true,'all',$17,$18,$18
       )`,
      [
        who.id, (who.first_name + ' ' + who.last_name).trim(), gender, dob, height,
        religion, community, tongue, ['English', tongue],
        gender === 'Female' ? 'Bachelor of Engineering' : 'B.Tech, Computer Science',
        gender === 'Female' ? 'QA Analyst' : 'Engineering Manager',
        gender === 'Female' ? 'Independent' : 'CIBC',
        gender === 'Female' ? 'Technology' : 'Banking',
        diet, hobbies, about, daysAgo(1), daysAgo(50),
      ]
    );
  }

  // Partner preferences, a shortlist and an interest each way, so Matches and
  // Shortlist have something in them rather than the (correct, but dull) empty
  // states a brand new listing would show.
  const mine = Object.fromEntries(
    (await q(
      `select p.id, pr.email from public.matrimony_profiles p
         join public.profiles pr on pr.id = p.user_id
        where pr.email in ('member@professionalsclub.ca','volunteer@professionalsclub.ca')`
    )).map((r) => [r.email, r.id])
  );
  const seekerProfile = mine['member@professionalsclub.ca'];
  const helperProfile = mine['volunteer@professionalsclub.ca'];

  if (seekerProfile) {
    const has = await q('select id from public.matrimony_preferences where profile_id = $1', [seekerProfile]);
    if (!has.length) {
      await q(
        `insert into public.matrimony_preferences (
           profile_id, age_min, age_max, height_min_cm, height_max_cm,
           marital_status, religion, mother_tongue, country, province,
           education, diet, smoking, drinking, other_notes, created_at
         ) values ($1,30,40,170,190,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          seekerProfile, ['Never Married'], ['Hindu'], ['Tamil', 'Malayalam', 'Telugu'],
          ['Canada'], ['Ontario', 'British Columbia'],
          ['Bachelors', 'Masters'], ['Vegetarian', 'Eggetarian'],
          ['Never'], ['Never', 'Occasionally'],
          'Someone settled here who still calls home every Sunday.', daysAgo(20),
        ]
      );
    }
  }

  // A shortlist and interests between the demo profiles and the real accounts.
  const demoProfiles = Object.fromEntries(
    (await q(
      `select p.id, pr.email from public.matrimony_profiles p
         join public.profiles pr on pr.id = p.user_id
        where pr.email like $1`, ['%' + DEMO_DOMAIN]
    )).map((r) => [r.email, r.id])
  );
  const demoProfile = (i) => demoProfiles[email(MEMBERS[i])];

  if (seekerProfile) {
    for (const idx of [5, 9, 3]) {
      if (!demoProfile(idx)) continue;
      await q(
        `insert into public.matrimony_shortlists (owner_profile_id, target_profile_id, created_at)
         values ($1,$2,$3) on conflict do nothing`,
        [seekerProfile, demoProfile(idx), daysAgo(5)]
      );
    }
    // One interest she sent, one she received, one already accepted.
    if (demoProfile(5)) {
      await q(
        `insert into public.matrimony_interests
           (sender_profile_id, receiver_profile_id, status, created_at)
         values ($1,$2,'pending',$3) on conflict do nothing`,
        [seekerProfile, demoProfile(5), daysAgo(4)]
      );
    }
    if (demoProfile(3)) {
      await q(
        `insert into public.matrimony_interests
           (sender_profile_id, receiver_profile_id, status, created_at)
         values ($1,$2,'pending',$3) on conflict do nothing`,
        [demoProfile(3), seekerProfile, daysAgo(2)]
      );
    }
    if (helperProfile) {
      await q(
        `insert into public.matrimony_interests
           (sender_profile_id, receiver_profile_id, status, created_at)
         values ($1,$2,'accepted',$3) on conflict do nothing`,
        [helperProfile, seekerProfile, daysAgo(9)]
      );
    }
  }

  if (helperProfile) {
    for (const idx of [0, 4, 14] ) {
      if (!demoProfile(idx)) continue;
      await q(
        `insert into public.matrimony_shortlists (owner_profile_id, target_profile_id, created_at)
         values ($1,$2,$3) on conflict do nothing`,
        [helperProfile, demoProfile(idx), daysAgo(7)]
      );
    }
  }

  // Both of them posting, so the feed includes accounts you can sign in as.
  const groups = Object.fromEntries(
    (await q('select id, slug from public.community_groups')).map((g) => [g.slug, g.id]));
  const OWN_POSTS = [
    [seeker, 'Asked for a referral through the portal for the first time this week. Two people at the company got the request and one came back the same day. I would not have found either of them on my own.'],
    [helper, 'On the other side of that: I get the request with the role and a one-line summary, no name. If I can help I say so, and then we both see each other. Much easier than messages from strangers.'],
  ];
  for (const [who, body] of OWN_POSTS) {
    const exists = await q(
      'select id from public.community_posts where author_id = $1 and body = $2', [who.id, body]);
    if (exists.length) continue;
    await q(
      `insert into public.community_posts (author_id, group_id, body, created_at)
       values ($1,$2,$3,$4)`,
      [who.id, groups['tech-careers'] || null, body, daysAgo(2, 13)]
    );
    if (groups['tech-careers']) {
      await q(
        `insert into public.community_group_members (group_id, member_id) values ($1,$2)
         on conflict do nothing`, [groups['tech-careers'], who.id]);
    }
  }
}

// ===========================================================================
// Clean
// ===========================================================================

async function cleanAll() {
  // Profiles cascade to almost everything: posts, comments, likes, insiders,
  // referral requests, help requests, volunteer applications, matrimony rows,
  // notifications. So the member delete does most of the work.
  const users = await q('select id from neon_auth."user" where email like $1', ['%' + DEMO_DOMAIN]);
  console.log(`  demo members: ${users.length}`);

  await q(`delete from public.company_jobs where external_id like 'demo-%'`);
  await q(`delete from public.businesses where slug = any($1)`,
    [BUSINESSES.map((b) => b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))]);
  await q(`delete from public.community_groups where slug = any($1)`, [GROUPS.map((g) => g.slug)]);
  await q(`delete from public.public_inquiries where email = any($1)`, [INQUIRIES.map((i) => i.email)]);
  await q(`delete from public.youtube_videos where title = any($1)`, [VIDEOS.map((v) => v.title)]);
  await q(`delete from public.donation_campaigns where title = any($1)`,
    [['Winter coat drive 2026', 'Resume clinic running costs']]);
  // Posts by the admin (the club announcements) have no demo member to cascade.
  await q(`delete from public.community_posts where body = any($1)`,
    [POSTS.filter((p) => p.author === null).map((p) => p.body)]);

  // Rows attached to the two REAL accounts are not covered by the demo-member
  // cascade, so remove them explicitly.
  const real = await q(
    `select id from public.profiles where email in
       ('member@professionalsclub.ca','volunteer@professionalsclub.ca')`);
  for (const r of real.map((x) => x.id)) {
    await q('delete from public.referral_requests where seeker_id = $1', [r]);
    await q('delete from public.company_insiders where member_id = $1', [r]);
    await q('delete from public.matrimony_profiles where user_id = $1', [r]);
    await q("delete from public.help_requests where reference like 'PC-47%' and member_id = $1", [r]);
    await q("delete from public.in_app_notifications where user_id = $1 and type like 'referral%'", [r]);
    await q("delete from public.community_posts where author_id = $1 and (body like '%referral through the portal%' or body like '%On the other side of that%')", [r]);
  }

  await q('delete from public.profiles where email like $1', ['%' + DEMO_DOMAIN]);
  await q('delete from neon_auth."user" where email like $1', ['%' + DEMO_DOMAIN]);

  // Companies stay: they are real employers, seeded by the migration, and an
  // admin may have configured feeds against them. Reset the ones this script
  // switched to 'manual' back to link-only.
  await q(`update public.companies set source_kind = 'link'
            where source_kind = 'manual'
              and not exists (select 1 from public.company_jobs j where j.company_id = companies.id)`);
  console.log('  demo data removed (companies and their real feeds kept)');
}

// ===========================================================================

async function main() {
  await connectAsAdmin();

  if (clean) {
    console.log('Removing demo data…');
    await cleanAll();
  } else {
    console.log('Seeding demo data…');
    const ids = await seedMembers();
    console.log(`  members            ${Object.keys(ids).length}`);
    const { groupIds, postIds } = await seedCommunity(ids);
    console.log(`  community          ${Object.keys(groupIds).length} groups, ${postIds.length} posts`);
    await seedReferrals(ids);
    console.log('  referrals          insiders, roles and requests');
    await seedHelpDesk(ids);
    console.log('  help desk          requests, volunteers, messages');
    await seedBusinesses(ids);
    console.log('  businesses         directory listings');
    await seedMatrimony(ids);
    console.log('  matrimony          profiles, interests, shortlists');
    await seedPublicContent();
    console.log('  public content     videos, inquiries, campaigns');
    await seedRealAccounts(ids);
    console.log('  sign-in accounts   member@ and volunteer@ given data to show');
  }

  const summary = await q(`
    select 'profiles' t, count(*)::int n from public.profiles
    union all select 'community_posts', count(*)::int from public.community_posts
    union all select 'community_groups', count(*)::int from public.community_groups
    union all select 'company_insiders', count(*)::int from public.company_insiders
    union all select 'company_jobs', count(*)::int from public.company_jobs
    union all select 'referral_requests', count(*)::int from public.referral_requests
    union all select 'help_requests', count(*)::int from public.help_requests
    union all select 'volunteer_applications', count(*)::int from public.volunteer_applications
    union all select 'businesses', count(*)::int from public.businesses
    union all select 'matrimony_profiles', count(*)::int from public.matrimony_profiles
    union all select 'public_inquiries', count(*)::int from public.public_inquiries
    union all select 'youtube_videos', count(*)::int from public.youtube_videos
    order by 1
  `);
  console.log('\nrow counts now:');
  for (const r of summary) console.log(`  ${r.t.padEnd(24)} ${r.n}`);
  client.release();
  await pool.end();
}

main().catch(async (e) => {
  console.error('\nFAILED:', e.message);
  await pool.end();
  process.exitCode = 1;
});
