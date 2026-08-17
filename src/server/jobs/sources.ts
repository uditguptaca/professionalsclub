import 'server-only';

/**
 * Where open roles come from.
 *
 * Deliberately NOT LinkedIn or Indeed. LinkedIn's terms forbid scraping and
 * they block it in practice; Indeed retired its public job-search API and
 * fronts everything with bot protection. A scraper aimed at either breaks
 * within weeks and puts the club at legal risk, so neither is a source kind
 * here — a company with no better feed gets `link`, and we send the member to
 * the employer's own careers page.
 *
 * What IS here is machine-readable job data the employer or the government
 * publishes on purpose:
 *
 *   greenhouse, lever, ashby, workable, smartrecruiters, recruitee
 *       Public, unauthenticated ATS board endpoints. These exist so a company
 *       can embed its own jobs, which is exactly what we are doing.
 *   workday
 *       The JSON endpoint a Workday careers site calls to render itself. Most
 *       large Canadian banks and insurers are on Workday.
 *   jsonld
 *       schema.org JobPosting markup on a careers page — the markup Google for
 *       Jobs consumes. Caveat found by testing: large enterprise careers hubs
 *       are single-page apps and carry NO JobPosting markup on the listing page
 *       (RBC, Telus and Wealthsimple all returned zero). This works on
 *       server-rendered listings and on individual job pages, so it is a useful
 *       extra, not the catch-all it looks like.
 *   rss
 *       A careers RSS or Atom feed.
 *   jobbank
 *       Government of Canada Job Bank, Open Government Licence. Only usable
 *       with an explicit feedUrl for a GENERAL feed — see the adapter.
 *   adzuna
 *       Aggregator with a free developer tier and a Canada endpoint.
 *
 * Verified against live endpoints when written: greenhouse (six boards, 67-573
 * roles each), ashby (60), workday (CIBC, 484), lever and smartrecruiters
 * (endpoint and response shape; the tokens tried had nothing posted), and the
 * feed parser against a real 100-entry Atom feed. workable, recruitee and
 * adzuna follow their documented shapes but had no token to test with.
 *
 * Every adapter returns the same normalised shape and is allowed to fail: a
 * failure is recorded on the company row and the previously cached jobs stay
 * put, so one broken feed never empties the page.
 */

export type SourceKind =
  | 'greenhouse' | 'lever' | 'ashby' | 'workable' | 'smartrecruiters'
  | 'recruitee' | 'workday' | 'jsonld' | 'rss' | 'jobbank' | 'adzuna'
  | 'manual' | 'link';

export interface NormalisedJob {
  externalId: string;
  title: string;
  location: string | null;
  employmentType: string | null;
  department: string | null;
  applyUrl: string;
  descriptionSnippet: string | null;
  postedAt: string | null;
}

/** Kinds we can actually fetch. The other two are people-driven. */
export const FETCHABLE: SourceKind[] = [
  'greenhouse', 'lever', 'ashby', 'workable', 'smartrecruiters',
  'recruitee', 'workday', 'jsonld', 'rss', 'jobbank', 'adzuna',
];

export const SOURCE_LABELS: Record<SourceKind, string> = {
  greenhouse: 'Greenhouse', lever: 'Lever', ashby: 'Ashby',
  workable: 'Workable', smartrecruiters: 'SmartRecruiters',
  recruitee: 'Recruitee', workday: 'Workday',
  jsonld: 'Careers page (JSON-LD)', rss: 'Careers RSS feed',
  jobbank: 'Job Bank Canada', adzuna: 'Adzuna',
  manual: 'Added by an admin', link: 'Link out only',
};

/** What each kind needs in source_config, shown in the admin form. */
export const SOURCE_CONFIG_HINTS: Record<SourceKind, string> = {
  greenhouse: 'token — the board name in boards.greenhouse.io/<token>',
  lever: 'token — the company name in jobs.lever.co/<token>',
  ashby: 'token — the board name in jobs.ashbyhq.com/<token>',
  workable: 'token — the subdomain in apply.workable.com/<token>',
  smartrecruiters: 'token — the company id in jobs.smartrecruiters.com/<token>',
  recruitee: 'token — the subdomain in <token>.recruitee.com',
  workday: 'host, tenant and site — from <host>/<tenant>/<site> in the careers URL',
  jsonld: 'url — a careers page carrying JobPosting markup (rare on enterprise careers hubs)',
  rss: 'url — the RSS or Atom feed',
  jobbank: 'feedUrl — a Job Bank feed URL. Job Bank cannot filter by employer, so this is a general feed, not a company one',
  adzuna: 'employer — the employer name to filter on. Needs ADZUNA_APP_ID and ADZUNA_APP_KEY (free tier)',
  manual: 'nothing — roles are entered by hand',
  link: 'nothing — members are sent to the careers page',
};

const UA = 'ProfessionalsClubBot/1.0 (+https://professionalsclub.ca; community job referrals)';

async function get(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { 'user-agent': UA, accept: '*/*', ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(20_000),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from ${new URL(url).host}`);
  return res;
}

const str = (v: unknown): string | null => {
  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'number') return String(v);
  return null;
};

/** Tags out, entities decoded, collapsed to one line, trimmed to a snippet. */
export function snippet(html: unknown, max = 260): string | null {
  const raw = typeof html === 'string' ? html : null;
  if (!raw) return null;
  const text = raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  return text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text;
}

const iso = (v: unknown): string | null => {
  const s = typeof v === 'string' || typeof v === 'number' ? v : null;
  if (s === null) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

type Config = Record<string, unknown>;
const need = (config: Config, key: string): string => {
  const v = str(config[key]);
  if (!v) throw new Error(`source_config.${key} is required`);
  return v;
};

// ============================================================ ATS adapters

async function greenhouse(config: Config): Promise<NormalisedJob[]> {
  const token = need(config, 'token');
  const data = (await (await get(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`
  )).json()) as { jobs?: Record<string, any>[] };
  return (data.jobs ?? []).map((j) => ({
    externalId: String(j.id),
    title: str(j.title) ?? 'Untitled role',
    location: str(j.location?.name),
    employmentType: null,
    department: str(j.departments?.[0]?.name),
    applyUrl: str(j.absolute_url) ?? '',
    descriptionSnippet: snippet(j.content),
    postedAt: iso(j.first_published ?? j.updated_at),
  }));
}

async function lever(config: Config): Promise<NormalisedJob[]> {
  const token = need(config, 'token');
  const data = (await (await get(
    `https://api.lever.co/v0/postings/${encodeURIComponent(token)}?mode=json`
  )).json()) as Record<string, any>[];
  return (data ?? []).map((j) => ({
    externalId: String(j.id),
    title: str(j.text) ?? 'Untitled role',
    location: str(j.categories?.location),
    employmentType: str(j.categories?.commitment),
    department: str(j.categories?.team ?? j.categories?.department),
    applyUrl: str(j.hostedUrl ?? j.applyUrl) ?? '',
    descriptionSnippet: snippet(j.descriptionPlain ?? j.description),
    postedAt: iso(j.createdAt),
  }));
}

async function ashby(config: Config): Promise<NormalisedJob[]> {
  const token = need(config, 'token');
  const data = (await (await get(
    `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(token)}`
  )).json()) as { jobs?: Record<string, any>[] };
  return (data.jobs ?? []).map((j) => ({
    externalId: String(j.id),
    title: str(j.title) ?? 'Untitled role',
    location: str(j.location),
    employmentType: str(j.employmentType),
    department: str(j.department ?? j.team),
    applyUrl: str(j.jobUrl ?? j.applyUrl) ?? '',
    descriptionSnippet: snippet(j.descriptionHtml ?? j.descriptionPlain),
    postedAt: iso(j.publishedAt ?? j.updatedAt),
  }));
}

async function workable(config: Config): Promise<NormalisedJob[]> {
  const token = need(config, 'token');
  const data = (await (await get(
    `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(token)}?details=true`
  )).json()) as { jobs?: Record<string, any>[] };
  return (data.jobs ?? []).map((j) => ({
    externalId: String(j.shortcode ?? j.id),
    title: str(j.title) ?? 'Untitled role',
    location: [str(j.location?.city), str(j.location?.region), str(j.location?.country)]
      .filter(Boolean).join(', ') || str(j.location?.location_str),
    employmentType: str(j.employment_type ?? j.type),
    department: str(j.department),
    applyUrl: str(j.application_url ?? j.url ?? j.shortlink) ?? '',
    descriptionSnippet: snippet(j.description),
    postedAt: iso(j.published_on ?? j.created_at),
  }));
}

async function smartrecruiters(config: Config): Promise<NormalisedJob[]> {
  const token = need(config, 'token');
  const data = (await (await get(
    `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(token)}/postings?limit=100`
  )).json()) as { content?: Record<string, any>[] };
  return (data.content ?? []).map((j) => ({
    externalId: String(j.id),
    title: str(j.name) ?? 'Untitled role',
    location: [str(j.location?.city), str(j.location?.region), str(j.location?.country)]
      .filter(Boolean).join(', '),
    employmentType: str(j.typeOfEmployment?.label),
    department: str(j.department?.label ?? j.function?.label),
    applyUrl: str(j.applyUrl) ?? `https://jobs.smartrecruiters.com/${token}/${j.id}`,
    descriptionSnippet: snippet(j.jobAd?.sections?.jobDescription?.text),
    postedAt: iso(j.releasedDate ?? j.createdOn),
  }));
}

async function recruitee(config: Config): Promise<NormalisedJob[]> {
  const token = need(config, 'token');
  const data = (await (await get(
    `https://${encodeURIComponent(token)}.recruitee.com/api/offers/`
  )).json()) as { offers?: Record<string, any>[] };
  return (data.offers ?? []).map((j) => ({
    externalId: String(j.id),
    title: str(j.title) ?? 'Untitled role',
    location: [str(j.city), str(j.country)].filter(Boolean).join(', ') || str(j.location),
    employmentType: str(j.employment_type_code ?? j.options_cv),
    department: str(j.department),
    applyUrl: str(j.careers_apply_url ?? j.careers_url) ?? '',
    descriptionSnippet: snippet(j.description),
    postedAt: iso(j.published_at ?? j.created_at),
  }));
}

/**
 * Workday. The careers site is a single-page app that reads this endpoint, so
 * it is public JSON, but the path is tenant-specific: pull host/tenant/site out
 * of the careers URL (e.g. cibc.wd3.myworkdayjobs.com/campus -> host
 * cibc.wd3.myworkdayjobs.com, site campus). Paged, 20 at a time.
 */
async function workday(config: Config): Promise<NormalisedJob[]> {
  const host = need(config, 'host').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const site = need(config, 'site');
  const tenant = str(config.tenant) ?? site;
  const out: NormalisedJob[] = [];

  for (let offset = 0; offset < 200; offset += 20) {
    const res = await get(`https://${host}/wday/cxs/${tenant}/${site}/jobs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ appliedFacets: {}, limit: 20, offset, searchText: '' }),
    });
    const data = (await res.json()) as { jobPostings?: Record<string, any>[]; total?: number };
    const page = data.jobPostings ?? [];
    for (const j of page) {
      const path = str(j.externalPath) ?? '';
      out.push({
        // bulletFields[0] is the requisition number, which is the stable id;
        // the path is the fallback.
        externalId: str(j.bulletFields?.[0]) ?? (path || str(j.title) || 'unknown'),
        title: str(j.title) ?? 'Untitled role',
        location: str(j.locationsText),
        employmentType: null,
        department: null,
        applyUrl: path ? `https://${host}/en-US/${site}${path}` : `https://${host}/${site}`,
        descriptionSnippet: null,
        // Workday reports "Posted 3 Days Ago" rather than a date, so leave it
        // null instead of inventing a timestamp.
        postedAt: null,
      });
    }
    if (page.length < 20) break;
  }
  return out;
}

// ==================================================== Careers page / feeds

/**
 * schema.org JobPosting markup. Employers publish this for Google for Jobs, so
 * reading it is the intended use. Handles a single object, an array, and
 * @graph, which are the three shapes in the wild.
 */
async function jsonld(config: Config): Promise<NormalisedJob[]> {
  const url = need(config, 'url');
  const html = await (await get(url)).text();
  const blocks = [...html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )].map((m) => m[1]);

  const postings: Record<string, any>[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!node || typeof node !== 'object') return;
    const o = node as Record<string, any>;
    const type = o['@type'];
    const isPosting = type === 'JobPosting'
      || (Array.isArray(type) && type.includes('JobPosting'));
    if (isPosting) postings.push(o);
    if (o['@graph']) walk(o['@graph']);
    if (o.itemListElement) walk(o.itemListElement);
    if (o.item) walk(o.item);
  };
  for (const b of blocks) {
    try { walk(JSON.parse(b)); } catch { /* one bad block must not sink the page */ }
  }

  return postings.map((j, i) => {
    const loc = j.jobLocation;
    const addr = (Array.isArray(loc) ? loc[0] : loc)?.address;
    return {
      externalId: str(j.identifier?.value ?? j.identifier ?? j.url) ?? `jsonld-${i}`,
      title: str(j.title) ?? 'Untitled role',
      location: [str(addr?.addressLocality), str(addr?.addressRegion)]
        .filter(Boolean).join(', ') || str(j.jobLocationType),
      employmentType: Array.isArray(j.employmentType)
        ? str(j.employmentType[0]) : str(j.employmentType),
      department: null,
      applyUrl: str(j.url ?? j.sameAs) ?? url,
      descriptionSnippet: snippet(j.description),
      postedAt: iso(j.datePosted),
    };
  });
}

/**
 * RSS 2.0 or Atom. A hand-rolled reader rather than a dependency: a job feed is
 * a flat list of items and this needs four fields from each.
 */
function parseFeed(xml: string, fallbackUrl: string): NormalisedJob[] {
  const tag = (block: string, name: string): string | null => {
    const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
    if (!m) return null;
    return snippet(m[1].replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1'), 4000);
  };
  const items = [
    ...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi),
    ...xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi),
  ].map((m) => m[0]);

  return items.map((block, i) => {
    // Atom puts the link in an attribute; RSS uses element text.
    const href = block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] ?? tag(block, 'link');
    return {
      externalId: tag(block, 'guid') ?? tag(block, 'id') ?? href ?? `item-${i}`,
      title: tag(block, 'title') ?? 'Untitled role',
      location: null,
      employmentType: null,
      department: tag(block, 'category'),
      applyUrl: href ?? fallbackUrl,
      descriptionSnippet: tag(block, 'description') ?? tag(block, 'summary'),
      postedAt: iso(tag(block, 'pubDate') ?? tag(block, 'published') ?? tag(block, 'updated')),
    };
  });
}

async function rss(config: Config): Promise<NormalisedJob[]> {
  const url = need(config, 'url');
  return parseFeed(await (await get(url)).text(), url);
}

/**
 * Government of Canada Job Bank. Crown-licensed under the Open Government
 * Licence – Canada, so reuse is permitted with attribution.
 *
 * NOT a per-company source, and this is measured rather than assumed. Job Bank's
 * real feed is an Atom document at /jobsearch/feed/jobSearchRSSfeed. Unfiltered
 * it returns the latest ~100 postings nationally; with `empl=<name>` (the
 * parameter its own search UI puts in the feed link) it returns a well-formed
 * but EMPTY feed, with or without a valid JSESSIONID. `searchstring=` behaves
 * the same. So the feed cannot answer "open roles at Telus", which is the only
 * question this feature asks.
 *
 * It is left in place for a general "latest jobs in Canada" feed, which is what
 * Job Bank is actually good for, and therefore takes an explicit feedUrl only.
 * Do not add an `employer` option back without re-testing: it silently returns
 * nothing, which is worse than not offering it.
 */
async function jobbank(config: Config): Promise<NormalisedJob[]> {
  const url = need(config, 'feedUrl');
  if (!/^https:\/\/(www\.)?jobbank\.gc\.ca\//.test(url)) {
    throw new Error('feedUrl must be a jobbank.gc.ca URL');
  }
  return parseFeed(await (await get(url)).text(), url);
}

/** Adzuna's free developer tier. Needs ADZUNA_APP_ID and ADZUNA_APP_KEY. */
async function adzuna(config: Config): Promise<NormalisedJob[]> {
  const id = process.env.ADZUNA_APP_ID;
  const key = process.env.ADZUNA_APP_KEY;
  if (!id || !key) throw new Error('ADZUNA_APP_ID and ADZUNA_APP_KEY are not set');
  const employer = need(config, 'employer');
  const url = new URL('https://api.adzuna.com/v1/api/jobs/ca/search/1');
  url.searchParams.set('app_id', id);
  url.searchParams.set('app_key', key);
  url.searchParams.set('results_per_page', '50');
  url.searchParams.set('what', employer);
  url.searchParams.set('company', employer);
  url.searchParams.set('content-type', 'application/json');

  const data = (await (await get(url.toString())).json()) as { results?: Record<string, any>[] };
  return (data.results ?? [])
    // Adzuna's `company` filter is fuzzy, so keep only real name matches.
    .filter((j) => str(j.company?.display_name)?.toLowerCase().includes(employer.toLowerCase()))
    .map((j) => ({
      externalId: String(j.id),
      title: str(j.title) ?? 'Untitled role',
      location: str(j.location?.display_name),
      employmentType: str(j.contract_time),
      department: str(j.category?.label),
      applyUrl: str(j.redirect_url) ?? '',
      descriptionSnippet: snippet(j.description),
      postedAt: iso(j.created),
    }));
}

const ADAPTERS: Partial<Record<SourceKind, (c: Config) => Promise<NormalisedJob[]>>> = {
  greenhouse, lever, ashby, workable, smartrecruiters, recruitee,
  workday, jsonld, rss, jobbank, adzuna,
};

/**
 * Fetch one company's open roles. Throws with a message meant for an admin to
 * read on the company row.
 */
export async function fetchJobs(kind: SourceKind, config: Config): Promise<NormalisedJob[]> {
  const adapter = ADAPTERS[kind];
  if (!adapter) return [];
  const jobs = await adapter(config ?? {});
  // A role with no title or nowhere to apply is not usable.
  return jobs
    .filter((j) => j.title && j.applyUrl && j.externalId)
    .map((j) => ({ ...j, externalId: j.externalId.slice(0, 200) }));
}

// ============================================================ Detection

export interface DetectResult {
  kind: SourceKind;
  config: Record<string, string>;
  jobCount: number;
}

/**
 * Work out a company's feed from its careers URL by recognising the host and
 * then actually calling it. Guessing an ATS token is how you get a silent
 * sync failure, so nothing is returned unless a real request came back with
 * real roles.
 */
export async function detectSource(careersUrl: string): Promise<DetectResult | null> {
  let u: URL;
  try { u = new URL(careersUrl); } catch { return null; }
  const host = u.hostname.toLowerCase();
  const seg = u.pathname.split('/').filter(Boolean);

  const candidates: { kind: SourceKind; config: Record<string, string> }[] = [];

  if (host.endsWith('greenhouse.io') && seg[0]) candidates.push({ kind: 'greenhouse', config: { token: seg[0] } });
  if (host.endsWith('lever.co') && seg[0]) candidates.push({ kind: 'lever', config: { token: seg[0] } });
  if (host.endsWith('ashbyhq.com') && seg[0]) candidates.push({ kind: 'ashby', config: { token: seg[0] } });
  if (host.endsWith('workable.com') && seg[0]) candidates.push({ kind: 'workable', config: { token: seg[0] } });
  if (host.endsWith('smartrecruiters.com') && seg[0]) candidates.push({ kind: 'smartrecruiters', config: { token: seg[0] } });
  if (host.endsWith('recruitee.com')) candidates.push({ kind: 'recruitee', config: { token: host.split('.')[0] } });
  if (host.includes('myworkdayjobs.com') && seg.length) {
    // .../<site> or .../<tenant>/<site>
    candidates.push({ kind: 'workday', config: { host, tenant: host.split('.')[0], site: seg[seg.length - 1] } });
    if (seg.length > 1) candidates.push({ kind: 'workday', config: { host, tenant: seg[0], site: seg[1] } });
  }
  // Any careers page might carry the Google for Jobs markup, and might offer a
  // feed at the conventional path.
  candidates.push({ kind: 'jsonld', config: { url: careersUrl } });
  candidates.push({ kind: 'rss', config: { url: new URL('/feed', u.origin).toString() } });

  for (const c of candidates) {
    try {
      const jobs = await fetchJobs(c.kind, c.config);
      if (jobs.length > 0) return { ...c, jobCount: jobs.length };
    } catch { /* try the next candidate */ }
  }
  return null;
}
