/**
 * Starter content for the public marketing pages.
 *
 * The admin content managers in the portal write to these tables, and the
 * public pages read them as app_anonymous. Both halves worked, but every
 * table was empty — so /jobs, /news, /team, /donate, /resources and /events
 * rendered blank and looked broken.
 *
 * This seeds a small, realistic starting set so the pages are populated on
 * day one and the admin has real rows to edit rather than a blank slate. It
 * is idempotent: each row is keyed on its title/name, so re-running does not
 * duplicate anything, and it never overwrites edits made in the portal.
 *
 *   node --env-file=.env.local db/seed-content.mjs
 */

import { Pool } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Run with: node --env-file=.env.local db/seed-content.mjs');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const TEAM = [
  ['Udit Gupta', 'Founder, CEO & Director', 'Started the club after his own landing in 2016, when a stranger’s referral turned six months of silence into a first Canadian job.', '/founder.png', 1],
  ['Priya Raghunathan', 'Head of Settlement Support', 'CPA, arrived in Mississauga in 2018. Runs the housing, banking and first-tax-return clinics.', '', 2],
  ['Arjun Menon', 'Careers Lead', 'Engineering manager in Waterloo. Coordinates referrals and mock interviews across the volunteer pool.', '', 3],
  ['Neha Kulkarni', 'Community & Events', 'Organises the monthly meetups and the WhatsApp community moderators.', '', 4],
];

const JOBS = [
  ['Intermediate Full-Stack Developer', 'Northbridge Systems', 'Toronto', 'ON', 88000, 112000, 'yearly', 'full_time', 'Technology',
   'Building internal tools for a mid-size logistics firm. React and Node, with a small team that reviews every PR.',
   'Three or more years with React and Node. Canadian work authorisation. No degree requirement.',
   'Ship features end to end, pair with the data team, keep the deploy pipeline honest.',
   'careers@northbridgesystems.example', '', ['React', 'Node', 'PostgreSQL'], true],
  ['Staff Accountant (CPA track)', 'Sharma & Associates CPA', 'Toronto', 'ON', 62000, 74000, 'yearly', 'full_time', 'Accounting',
   'Personal and small-business returns with a practice that regularly hires internationally trained accountants.',
   'Accounting designation in progress or foreign-credentialed. Comfortable with newcomer first filings.',
   'Prepare returns, meet clients during tax season, mentor the co-op student.',
   'hiring@sharmacpa.example', '', ['CPA', 'Tax', 'Bookkeeping'], true],
  ['Registered Nurse — Medical Surgical', 'Grand River Health Partners', 'Kitchener', 'ON', 41, 52, 'hourly', 'full_time', 'Medical',
   'Rotating shifts on a 32-bed unit. The team has supported several internationally educated nurses through CNO registration.',
   'CNO registration or active application. Two years acute-care experience.',
   'Direct patient care, medication administration, discharge planning.',
   'talent@grandriverhealth.example', '', ['Nursing', 'CNO', 'Acute care'], false],
  ['Customer Success Associate', 'Maple Ridge Wealth', 'Mississauga', 'ON', 52000, 61000, 'yearly', 'full_time', 'Technology',
   'First point of contact for clients planning their first Canadian investments. Training provided.',
   'Strong written English. Any prior client-facing role. Newcomers encouraged to apply.',
   'Answer client questions, book advisor meetings, keep the CRM clean.',
   'jobs@mapleridgewealth.example', '', ['Client service', 'CRM'], false],
  ['Warehouse Team Lead', 'Cedar Line Distribution', 'Brampton', 'ON', 24, 28, 'hourly', 'full_time', 'Restaurants',
   'Afternoon shift lead for a food distribution warehouse. Forklift certification paid for.',
   'One year warehouse experience. Comfortable on your feet for a full shift.',
   'Run the shift board, train new hires, keep pick accuracy above target.',
   'apply@cedarline.example', '', ['Logistics', 'Forklift'], false],
];

const NEWS = [
  ['Express Entry draws resume with category-based selection', 'IRCC has published the 2026 category list, and healthcare and trades remain priority streams for the first half of the year.', 'Category-based selection continues to shape who receives an invitation to apply. If your NOC sits in one of the priority categories, keeping your Express Entry profile current matters more than chasing a higher CRS score.\n\nOur settlement volunteers can review your profile at the monthly clinic — bring your ECA and language results.', '', 'Priya Raghunathan', 'Immigration'],
  ['Ninety-one help requests closed this quarter', 'Referrals accounted for just over half of them, with settlement paperwork second.', 'The help desk closed 91 requests since the start of the quarter. Job referrals remain the most requested service, and the median time from request to a volunteer being assigned is now under three days.\n\nThank you to the 18 volunteers carrying that load.', '', 'Udit Gupta', 'Announcement'],
  ['What newcomer salaries actually look like in the GTA right now', 'Members shared 140 offer letters. Here is the honest picture, by field.', 'Aggregated from what members reported voluntarily. Technology and accounting roles cluster where you would expect; healthcare depends almost entirely on how far along registration is.\n\nUse it as a floor for negotiation, not a ceiling.', '', 'Arjun Menon', 'Salary Trends'],
  ['Tax season clinics start the second week of February', 'Six Saturday sessions, in person in Toronto and online for everyone else.', 'Volunteers who are practising accountants walk through your first Canadian return: what to claim as a newcomer, how the GST/HST credit works, and what to do with foreign income for the part-year you were a resident.\n\nSign in to the portal to book a slot.', '', 'Priya Raghunathan', 'Events'],
];

const EVENTS = [
  ['Toronto Monthly Community Meetup', 'Open evening for newcomers and members — introductions, a short talk, and time to actually meet people.', '2026-09-19', '6:30 PM', 'Downtown Toronto', 'in_person', 80, 42, '/img/community-hall-1.jpg', true, '', '', 'upcoming'],
  ['Taxes for Newcomers — Live Q&A', 'A practising CPA answers first-return questions live. Bring your specific situation.', '2026-09-24', '7:00 PM', 'YouTube Live', 'virtual', 500, 0, '/img/event-wide-1.jpg', false, 'YouTube', '', 'upcoming'],
  ['Resume Polish Workshop', 'Bring your resume; leave with a Canadian-format version reviewed by a hiring manager.', '2026-10-02', '7:00 PM', 'Zoom', 'virtual', 60, 0, '/img/resume-review.jpg', false, 'Zoom', '', 'upcoming'],
  ['Calgary Newcomers Coffee', 'Informal Saturday morning meet for members in Alberta.', '2026-10-11', '10:00 AM', 'Calgary', 'in_person', 40, 0, '/img/community-hall-2.jpg', false, '', '', 'upcoming'],
];

const EBOOKS = [
  ['First 90 Days in Canada', 'Professionals Club', 'PDF', '2.4 MB', '#1b4332', '', ''],
  ['Canadian Resume Format — Worked Examples', 'Arjun Menon', 'PDF', '1.8 MB', '#e85d04', '', ''],
  ['Your First Tax Return as a Newcomer', 'Priya Raghunathan', 'PDF', '3.1 MB', '#2d6a4f', '', ''],
  ['Renting in the GTA Without Canadian Credit', 'Professionals Club', 'PDF', '1.2 MB', '#9a3412', '', ''],
];

const WORKSHOPS = [
  ['Landing Your First Canadian Role', '48 min', 'March 2026', 'YouTube', '/img/mentoring-1.jpg', ''],
  ['Credential Recognition for Engineers', '62 min', 'February 2026', 'YouTube', '/img/mentoring-2.jpg', ''],
  ['Banking, Credit and the First Year', '39 min', 'January 2026', 'YouTube', '/img/arrivals.jpg', ''],
];

const TEMPLATES = [
  ['Canadian Resume Template', 'DOCX', 'Careers', '', ''],
  ['Cover Letter Skeleton', 'DOCX', 'Careers', '', ''],
  ['Monthly Newcomer Budget', 'XLSX', 'Settlement', '', ''],
  ['Rental Application Checklist', 'PDF', 'Settlement', '', ''],
];

const CAMPAIGNS = [
  ['Keep the help desk free in 2026', 'Every dollar goes to running the help desk, the tax clinics and the monthly meetups. The club takes no fees from members and pays no salaries.', 24000, 8650, true],
];

async function main() {
  const client = await pool.connect();
  let inserted = 0;

  const step = async (label, sql, values) => {
    const res = await client.query(sql, values);
    if (res.rowCount > 0) inserted += res.rowCount;
    return res.rowCount;
  };

  try {
    for (const [name, role, bio, image, order] of TEAM) {
      await step('team', `
        insert into public.team_members (name, role, bio, image, display_order, is_published)
        select $1, $2, $3, $4, $5, true
        where not exists (select 1 from public.team_members where name = $1)`,
        [name, role, bio, image, order]);
    }

    for (const j of JOBS) {
      await step('job', `
        insert into public.jobs (title, company, location, province, salary_min, salary_max,
          salary_period, job_type, category, description, requirements, responsibilities,
          contact_email, apply_url, tags, is_featured, is_active, posted_at)
        select $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,true, now()
        where not exists (select 1 from public.jobs where title = $1 and company = $2)`,
        j);
    }

    for (const [title, summary, content, image, author, category] of NEWS) {
      await step('news', `
        insert into public.news_articles (title, summary, content, image, author, category, published_at, is_published)
        select $1,$2,$3,$4,$5,$6, now(), true
        where not exists (select 1 from public.news_articles where title = $1)`,
        [title, summary, content, image, author, category]);
    }

    for (const e of EVENTS) {
      await step('event', `
        insert into public.events (title, description, event_date, event_time, location,
          event_type, capacity, attendees, image, is_featured, platform, rsvp_url, status, is_published)
        select $1,$2,$3::date,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true
        where not exists (select 1 from public.events where title = $1)`,
        e);
    }

    for (const [title, author, type, size, color, image, url] of EBOOKS) {
      await step('ebook', `
        insert into public.ebooks (title, author, type, size, color, image, download_url, is_published)
        select $1,$2,$3,$4,$5,$6,$7,true
        where not exists (select 1 from public.ebooks where title = $1)`,
        [title, author, type, size, color, image, url]);
    }

    for (const [title, duration, recorded, platform, thumb, url] of WORKSHOPS) {
      await step('workshop', `
        insert into public.workshops (title, duration, recorded_date, platform, thumbnail_image, video_url, is_published)
        select $1,$2,$3,$4,$5,$6,true
        where not exists (select 1 from public.workshops where title = $1)`,
        [title, duration, recorded, platform, thumb, url]);
    }

    for (const [title, fileType, category, image, url] of TEMPLATES) {
      await step('template', `
        insert into public.content_templates (title, file_type, category, image, access_url, is_published)
        select $1,$2,$3,$4,$5,true
        where not exists (select 1 from public.content_templates where title = $1)`,
        [title, fileType, category, image, url]);
    }

    for (const [title, description, goal, raised, active] of CAMPAIGNS) {
      await step('campaign', `
        insert into public.donation_campaigns (title, description, goal_amount, raised_amount, is_active)
        select $1,$2,$3,$4,$5
        where not exists (select 1 from public.donation_campaigns where title = $1)`,
        [title, description, goal, raised, active]);
    }

    console.log(`\n${inserted} row(s) inserted. Re-running is safe: existing rows are left untouched.`);

    const counts = await client.query(`
      select 'jobs' t, count(*)::int n from public.jobs
      union all select 'news_articles', count(*)::int from public.news_articles
      union all select 'team_members', count(*)::int from public.team_members
      union all select 'events', count(*)::int from public.events
      union all select 'ebooks', count(*)::int from public.ebooks
      union all select 'workshops', count(*)::int from public.workshops
      union all select 'content_templates', count(*)::int from public.content_templates
      union all select 'donation_campaigns', count(*)::int from public.donation_campaigns
      order by t`);
    for (const r of counts.rows) console.log(`  ${r.t.padEnd(20)} ${r.n}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
