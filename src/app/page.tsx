import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight, Heart, Users, Briefcase, Calendar, Shield, HandHeart, MapPin, FileText, BookOpen, GraduationCap, ChevronRight, Star, ShieldCheck, Tag, Building2, Home as HomeIcon, Landmark, Hospital, Bus, ClipboardList, DollarSign, Globe, Wallet, Search, MessageCircle } from 'lucide-react';
import Navbar from '@/components/shared/Navbar';
import Footer from '@/components/shared/Footer';
import HeroStopMotion from '@/components/home/HeroStopMotion';
import { Reveal, WordReveal, Stagger, StaggerItem, CountUp, Marquee, Parallax } from '@/components/motion/primitives';
import { getVerifiedBusinesses } from '@/app/actions/public';
import { SITE_STATS } from '@/lib/site-stats';

/**
 * Homepage.
 *
 * Structure: a full-bleed hero (stop-motion cutout of the community), an
 * accent marquee, then a stack of rounded panels floating on a warm grey
 * canvas — white for content, deep forest for emphasis. All entrances use
 * the four moves in components/motion/primitives; nothing fades in generically.
 */

export default async function Home() {
  // Featured directory listings; RLS already limits this to verified rows.
  const businesses = (await getVerifiedBusinesses().catch(() => [])).slice(0, 3);

  return (
    <>
      <Navbar />

      <main id="main">
        {/* ─── HERO ─── */}
        <section className="hero-stage">
          <div className="container hero-stage-copy">
            <Reveal delay={0} y={18}>
              <span className="eyebrow">Nonprofit &middot; Community-run &middot; Free</span>
            </Reveal>

            <WordReveal
              as="h1"
              className="hero-stage-title"
              text="Build your future in Canada."
              emphasis="in Canada."
              delay={0.1}
            />

            <Reveal delay={0.45} y={24}>
              <p className="standfirst">
                For newcomers and professionals finding their footing here. Job
                referrals, mentorship, settlement help and a community that
                answers when you ask.
              </p>
            </Reveal>

            <Reveal delay={0.6} y={20}>
              <div className="hero-stage-actions">
                <Link href="/portal/auth" className="btn btn-primary btn-lg">
                  Request help <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <Link href="/volunteers" className="btn btn-outline btn-lg">
                  Become a volunteer
                </Link>
              </div>
            </Reveal>
          </div>

          <div className="hero-people-wrap">
            <HeroStopMotion alt="Members of the club talking and laughing together" />

            {/* Glass badges scattered over the crowd; each drifts with the
                cursor at its own depth. */}
            <Reveal delay={0.9} className="hero-chip-pos hero-chip-a" y={26}>
              <Parallax depth={26}>
                <span className="hero-chip glass">
                  <span className="hero-chip-icon"><ShieldCheck size={16} /></span>
                  <span>Verified volunteers<small>Background-checked helpers</small></span>
                </span>
              </Parallax>
            </Reveal>
            <Reveal delay={1.05} className="hero-chip-pos hero-chip-b" y={26}>
              <Parallax depth={-18}>
                <span className="hero-chip glass">
                  <span className="hero-chip-icon"><MessageCircle size={16} /></span>
                  <span>{SITE_STATS.whatsappParticipants} in WhatsApp groups<small>Six communities, one club</small></span>
                </span>
              </Parallax>
            </Reveal>
            <Reveal delay={1.2} className="hero-chip-pos hero-chip-c" y={26}>
              <Parallax depth={38}>
                <span className="hero-chip glass">
                  <span className="hero-chip-icon"><Briefcase size={16} /></span>
                  <span>Weekly job referrals<small>Members put your name forward</small></span>
                </span>
              </Parallax>
            </Reveal>
          </div>
        </section>

        {/* ─── ACCENT MARQUEE ─── */}
        <Marquee
          items={[
            'Job referrals',
            'Settlement help',
            'Mentorship',
            'Tax season support',
            'Monthly meetups',
            'Trusted businesses',
            'Matrimony',
            'WhatsApp communities',
            'Resume reviews',
          ]}
        />

        <div className="home-flow">
          {/* ─── ABOUT + STATS ─── */}
          <section className="flow">
            <div className="container">
              <div className="panel-split" style={{ alignItems: 'start', marginBottom: 'clamp(2.5rem, 5vw, 4rem)' }}>
                <div>
                  <Reveal y={16}><span className="eyebrow">About the club</span></Reveal>
                  <WordReveal
                    as="h2"
                    text="Built by people who arrived exactly where you are."
                    className="section-head-editorial-title"
                    delay={0.1}
                  />
                </div>
                <Reveal delay={0.35}>
                  <p className="standfirst" style={{ marginTop: '0.5rem' }}>
                    Every service here is run by volunteers who came to Canada as
                    newcomers themselves. No fees, no upsells — a community that
                    answers when you ask.
                  </p>
                </Reveal>
              </div>

              <Stagger className="stat-cards">
                {[
                  { figure: SITE_STATS.members, label: 'Community members', sub: 'Across ten provinces' },
                  { figure: SITE_STATS.volunteers, label: 'Active volunteers', sub: 'Background-checked' },
                  { figure: '89', label: 'Cases resolved', sub: 'Help requests closed' },
                  { figure: 'Free', label: 'Cost to join', sub: 'Forever, for everyone' },
                ].map((s) => (
                  <StaggerItem key={s.label} className="stat-card">
                    <div className="stat-figure"><CountUp value={s.figure} /></div>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-sub">{s.sub}</div>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </section>

          {/* ─── SERVICES BENTO ─── */}
          <section className="flow">
            <div className="container">
              <div className="section-head-editorial">
                <Reveal y={16}><span className="eyebrow">What we do</span></Reveal>
                <WordReveal as="h2" text="Seven things you can ask us for today." delay={0.08} />
                <Reveal delay={0.3}>
                  <p className="standfirst">
                    Every one of them is run by volunteers who arrived the same way you did.
                  </p>
                </Reveal>
              </div>

              <Stagger className="bento">
                <StaggerItem className="bento-3 bento-tall" style={{ display: 'contents' }}>
                  <Link href="/portal/signup" className="bento-tile bento-photo bento-3 bento-tall">
                    <Image src="/img/mentoring-1.jpg" alt="" width={900} height={1200} sizes="(max-width: 1024px) 100vw, 50vw" />
                    <span className="bento-arrow"><ArrowUpRight size={16} /></span>
                    <span className="bento-kicker">01 — Careers</span>
                    <h3>Job referrals and placement</h3>
                    <p>Someone inside the company puts your name forward.</p>
                  </Link>
                </StaggerItem>

                <StaggerItem style={{ display: 'contents' }}>
                  <Link href="/jobs" className="bento-tile bento-3">
                    <span className="bento-arrow"><ArrowUpRight size={16} /></span>
                    <span className="bento-kicker">02 — Jobs board</span>
                    <h3>Search the latest jobs</h3>
                    <p>Openings shared by members, updated weekly.</p>
                  </Link>
                </StaggerItem>

                <StaggerItem style={{ display: 'contents' }}>
                  <Link href="/portal/signup" className="bento-tile bento-forest bento-3">
                    <span className="bento-arrow"><ArrowUpRight size={16} /></span>
                    <span className="bento-kicker">03 — Mentorship</span>
                    <h3>Mentorship and resume review</h3>
                    <p>Long-term pairing, not a one-off call.</p>
                  </Link>
                </StaggerItem>

                <StaggerItem style={{ display: 'contents' }}>
                  <Link href="/settlement" className="bento-tile bento-2">
                    <span className="bento-arrow"><ArrowUpRight size={16} /></span>
                    <span className="bento-kicker">04 — Settlement</span>
                    <h3>Settlement and tax support</h3>
                    <p>Housing, banking, SIN, health card, first return.</p>
                  </Link>
                </StaggerItem>

                <StaggerItem style={{ display: 'contents' }}>
                  <Link href="/events" className="bento-tile bento-2">
                    <span className="bento-arrow"><ArrowUpRight size={16} /></span>
                    <span className="bento-kicker">05 — Community</span>
                    <h3>Meetups and events</h3>
                    <p>Monthly, in person, across ten provinces.</p>
                  </Link>
                </StaggerItem>

                <StaggerItem style={{ display: 'contents' }}>
                  <Link href="/businesses" className="bento-tile bento-2">
                    <span className="bento-arrow"><ArrowUpRight size={16} /></span>
                    <span className="bento-kicker">06 — Directory</span>
                    <h3>Trusted local businesses</h3>
                    <p>Vetted by members who used them first.</p>
                  </Link>
                </StaggerItem>

                <StaggerItem style={{ display: 'contents' }}>
                  <Link href="/matrimony" className="bento-tile bento-photo bento-6" style={{ minHeight: '14rem' }}>
                    <Image src="/img/community-hall-2.jpg" alt="" width={1600} height={900} sizes="100vw" />
                    <span className="bento-arrow"><ArrowUpRight size={16} /></span>
                    <span className="bento-kicker">07 — Matrimony</span>
                    <h3>Verified matrimony portal</h3>
                    <p>Identity-checked profiles, no public listings.</p>
                  </Link>
                </StaggerItem>
              </Stagger>
            </div>
          </section>

          {/* ─── CAREER SUPPORT ─── */}
          <section className="flow">
            <div className="container">
              <div className="panel-split">
                <Reveal>
                  <div className="panel-photo">
                    <Image src="/career-mentorship.png" alt="Career mentorship session" fill sizes="(max-width: 900px) 100vw, 50vw" style={{ objectFit: 'cover' }} />
                    <span className="panel-photo-tag glass">Career support &amp; job referrals</span>
                  </div>
                </Reveal>
                <div>
                  <Reveal y={16}><span className="eyebrow">Career support</span></Reveal>
                  <WordReveal as="h2" text="Real professionals in your corner." delay={0.08} className="panel-heading" />
                  <Reveal delay={0.25}>
                    <p className="standfirst" style={{ margin: '1rem 0 1.75rem' }}>
                      Match with people who&apos;ve been where you are — for referrals,
                      resume reviews, mock interviews, and mentorship.
                    </p>
                  </Reveal>
                  <Stagger className="chip-grid" style={{ marginBottom: '2rem' }}>
                    {[
                      { label: 'Job referrals', icon: <Briefcase size={17} /> },
                      { label: 'Resume reviews', icon: <FileText size={17} /> },
                      { label: 'Mock interviews', icon: <Users size={17} /> },
                      { label: 'LinkedIn optimization', icon: <Globe size={17} /> },
                      { label: 'Career mentorship', icon: <GraduationCap size={17} /> },
                      { label: 'Job search strategy', icon: <BookOpen size={17} /> },
                    ].map((item) => (
                      <StaggerItem key={item.label} style={{ display: 'contents' }}>
                        <Link href="/portal/auth">{item.icon} {item.label}</Link>
                      </StaggerItem>
                    ))}
                  </Stagger>
                  <Reveal delay={0.1}>
                    <Link href="/portal/auth" className="btn btn-primary">
                      Request career help <ArrowRight size={17} />
                    </Link>
                  </Reveal>
                </div>
              </div>

              {/* Popular categories, folded into the careers panel */}
              <div style={{ marginTop: 'clamp(3rem, 5vw, 4.5rem)' }}>
                <Reveal y={16}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: 'clamp(1.3rem, 2vw, 1.7rem)', margin: 0 }}>Explore popular categories</h3>
                    <Link href="/jobs" style={{ color: 'var(--green-700)', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      View all categories <ChevronRight size={15} />
                    </Link>
                  </div>
                </Reveal>
                <Stagger className="chip-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(15rem, 1fr))' }}>
                  {[
                    { cat: 'Technology', icon: <Briefcase size={17} /> },
                    { cat: 'Accounting & Finance', icon: <Wallet size={17} /> },
                    { cat: 'Healthcare', icon: <Hospital size={17} /> },
                    { cat: 'Government', icon: <Shield size={17} /> },
                    { cat: 'Marketing', icon: <Star size={17} /> },
                    { cat: 'Education', icon: <GraduationCap size={17} /> },
                    { cat: 'Retail & Food', icon: <Tag size={17} /> },
                    { cat: 'Engineering', icon: <Search size={17} /> },
                  ].map((item) => (
                    <StaggerItem key={item.cat} style={{ display: 'contents' }}>
                      <Link href="/jobs">
                        {item.icon} {item.cat}
                      </Link>
                    </StaggerItem>
                  ))}
                </Stagger>
              </div>
            </div>
          </section>

          {/* ─── SETTLEMENT ─── */}
          <section className="flow">
            <div className="container">
              <div className="panel-split">
                <div>
                  <Reveal y={16}><span className="eyebrow">Settlement support</span></Reveal>
                  <WordReveal as="h2" text="Settle smoothly, from day one." delay={0.08} className="panel-heading" />
                  <Reveal delay={0.25}>
                    <p className="standfirst" style={{ margin: '1rem 0 1.75rem' }}>
                      Volunteers help you handle housing, banking, health cards,
                      taxes, and the rest of arriving in Canada.
                    </p>
                  </Reveal>
                  <Stagger className="chip-grid" style={{ marginBottom: '2rem' }}>
                    {[
                      { label: 'Housing & rentals', icon: <HomeIcon size={17} /> },
                      { label: 'Banking & credit', icon: <Landmark size={17} /> },
                      { label: 'Health cards', icon: <Hospital size={17} /> },
                      { label: 'Tax filing (GST/HST)', icon: <DollarSign size={17} /> },
                      { label: 'Transit & driving', icon: <Bus size={17} /> },
                      { label: 'SIN & legal docs', icon: <ClipboardList size={17} /> },
                    ].map((item) => (
                      <StaggerItem key={item.label} style={{ display: 'contents' }}>
                        <Link href="/settlement">{item.icon} {item.label}</Link>
                      </StaggerItem>
                    ))}
                  </Stagger>
                  <Reveal delay={0.1}>
                    <Link href="/settlement" className="btn btn-primary">
                      Explore settlement guides <ArrowRight size={17} />
                    </Link>
                  </Reveal>
                </div>
                <Reveal delay={0.15}>
                  <div className="panel-photo">
                    <Image src="/settlement-guide.png" alt="Newcomer settlement" fill sizes="(max-width: 900px) 100vw, 50vw" style={{ objectFit: 'cover' }} />
                    <span className="panel-photo-tag glass">Newcomer settlement support</span>
                  </div>
                </Reveal>
              </div>
            </div>
          </section>

          {/* ─── EVENTS ─── */}
          <section className="flow">
            <div className="container">
              <div className="panel-split">
                <Reveal>
                  <div className="panel-photo">
                    <Image src="/events-meetup.png" alt="Community meetup event" fill sizes="(max-width: 900px) 100vw, 50vw" style={{ objectFit: 'cover' }} />
                    <span className="panel-photo-tag glass">Monthly events</span>
                  </div>
                </Reveal>
                <div>
                  <Reveal y={16}><span className="eyebrow">Events &amp; community</span></Reveal>
                  <WordReveal as="h2" text="Meetups, workshops and webinars." delay={0.08} className="panel-heading" />
                  <Reveal delay={0.25}>
                    <p className="standfirst" style={{ margin: '1rem 0 1.75rem' }}>
                      Meet people in person and online — monthly meetups,
                      workshops, and live webinars.
                    </p>
                  </Reveal>

                  <Stagger className="event-rows" style={{ marginBottom: '2rem' }}>
                    {[
                      { d: 'Tue', m: 'Every', title: 'Taxes for Newcomers Livestream', loc: 'YouTube Live', type: 'Online' },
                      { d: 'Thu', m: 'Every', title: 'Resume Polish Workshop', loc: 'Zoom', type: 'Online' },
                    ].map((evt) => (
                      <StaggerItem key={evt.title} style={{ display: 'contents' }}>
                        <Link href="/events" className="event-row">
                          <span className="event-date"><span><small>{evt.m}</small><br />{evt.d}</span></span>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: 'block', fontWeight: 700, fontSize: '0.92rem' }}>{evt.title}</span>
                            <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{evt.loc}</span>
                          </span>
                          <span className={evt.type === 'Online' ? 'pill pill-cream' : 'pill pill-lime'}>{evt.type}</span>
                        </Link>
                      </StaggerItem>
                    ))}
                  </Stagger>

                  <Reveal delay={0.1}>
                    <Link href="/events" className="btn btn-primary">
                      View all events <ArrowRight size={17} />
                    </Link>
                  </Reveal>
                </div>
              </div>
            </div>
          </section>

          {/* ─── VOLUNTEER + FOUNDER ─── */}
          <section className="flow-forest">
            <div className="container">
              <div className="panel-split">
                <div>
                  <Reveal y={16}><span className="eyebrow">Give back</span></Reveal>
                  <WordReveal as="h2" text="Become a volunteer or mentor." delay={0.08} className="panel-heading" />
                  <Reveal delay={0.25}>
                    <p className="standfirst" style={{ margin: '1rem 0 1.75rem' }}>
                      Share what you know. Help someone build their future here.
                      Set your own case limit.
                    </p>
                  </Reveal>
                  <Stagger className="chip-grid" style={{ marginBottom: '2rem' }}>
                    {[
                      { label: 'Choose expertise', icon: <Users size={17} /> },
                      { label: 'Set case limit', icon: <Calendar size={17} /> },
                      { label: 'Strict privacy', icon: <Shield size={17} /> },
                      { label: 'Background check', icon: <ShieldCheck size={17} /> },
                      { label: 'Support newcomers', icon: <HandHeart size={17} /> },
                      { label: 'Track impact', icon: <FileText size={17} /> },
                    ].map((item) => (
                      <StaggerItem key={item.label} style={{ display: 'contents' }}>
                        <Link href="/portal/auth">{item.icon} {item.label}</Link>
                      </StaggerItem>
                    ))}
                  </Stagger>
                  <Reveal delay={0.1}>
                    <Link href="/portal/auth" className="btn btn-primary btn-lg">
                      Apply to volunteer <ArrowRight size={18} />
                    </Link>
                  </Reveal>
                </div>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  <Reveal delay={0.15}>
                    <div className="panel-photo" style={{ aspectRatio: '16 / 10' }}>
                      <Image src="/volunteer-help.png" alt="Volunteers helping newcomers" fill sizes="(max-width: 900px) 100vw, 50vw" style={{ objectFit: 'cover' }} />
                      <span className="panel-photo-tag glass">18 active volunteers &middot; 89 cases resolved</span>
                    </div>
                  </Reveal>
                  <Reveal delay={0.3}>
                    <figure className="glass-dark" style={{ margin: 0, padding: 'clamp(1.5rem, 2.5vw, 2rem)', display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                      <span style={{ position: 'relative', width: '4.5rem', height: '4.5rem', borderRadius: '30%', overflow: 'hidden', flexShrink: 0 }}>
                        <Image src="/founder.png" alt="Udit Gupta" fill sizes="72px" style={{ objectFit: 'cover' }} />
                      </span>
                      <div>
                        <blockquote style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'clamp(1.05rem, 1.6vw, 1.3rem)', fontStyle: 'italic', color: '#fff', fontVariationSettings: '"SOFT" 80, "WONK" 1' }}>
                          &ldquo;Connecting communities, creating opportunities.&rdquo;
                        </blockquote>
                        <figcaption style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--green-300)' }}>
                          <strong style={{ color: '#fff' }}>Udit Gupta</strong> — Founder, CEO &amp; Director
                        </figcaption>
                      </div>
                    </figure>
                  </Reveal>
                </div>
              </div>
            </div>
          </section>

          {/* ─── WHATSAPP COMMUNITIES ─── */}
          <section className="flow-forest">
            <div style={{ position: 'absolute', inset: 0 }}>
              <Image src="/whatsapp-community-bg.png" alt="" fill sizes="100vw" style={{ objectFit: 'cover', opacity: 0.12 }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,35,24,0.94) 0%, rgba(22,52,42,0.85) 55%, rgba(232,93,4,0.16) 100%)' }} />
            </div>

            <div className="container" style={{ position: 'relative' }}>
              <div className="panel-split" style={{ gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)' }}>
                <Stagger style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                  {[
                    { name: 'Finance Professionals', members: '1,600+', icon: <Wallet size={18} />, desc: 'Finance networking.', link: 'https://chat.whatsapp.com/LZQxOHMI7tx3vrrXCGXit4' },
                    { name: 'CA Community in Canada', members: '1,200+', icon: <Globe size={18} />, desc: 'CA professionals network.', link: 'https://chat.whatsapp.com/K9k0IBLoEOW3L16gx23b0n' },
                    { name: 'Industry Experts & Jobs', members: '1,100+', icon: <Briefcase size={18} />, desc: 'Industry networking.', link: 'https://chat.whatsapp.com/KrfRAPFxuAjCLrZ97mlGBp' },
                    { name: 'Study Buddy Community', members: '1,000+', icon: <BookOpen size={18} />, desc: 'Peer exam support.', link: 'https://chat.whatsapp.com/FgNygqhDLDqEWsQC1xZmHZ' },
                    { name: 'Regional & Family Community', members: '900+', icon: <MapPin size={18} />, desc: 'Stay connected.', link: 'https://chat.whatsapp.com/KIjJ7ybzkhtHSVF6BGlXYK' },
                    { name: 'Sports, Yoga & Meditation', members: '600+', icon: <Star size={18} />, desc: 'Wellness community.', link: 'https://chat.whatsapp.com/JhApEAWvGQoAimRT1nBHBl' },
                  ].map((group) => (
                    <StaggerItem key={group.name} style={{ display: 'contents' }}>
                      <a href={group.link} target="_blank" rel="noopener noreferrer" className="glass-dark" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1.1rem', textDecoration: 'none' }}>
                        <span style={{ display: 'grid', placeItems: 'center', width: '2.75rem', height: '2.75rem', borderRadius: 'var(--radius-lg)', background: 'rgba(188, 223, 106, 0.14)', color: 'var(--lime-300)', flexShrink: 0 }}>
                          {group.icon}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>{group.name}</span>
                          <span style={{ display: 'block', color: 'var(--green-100)', fontSize: '0.8rem' }}>{group.desc}</span>
                        </span>
                        <span className="pill pill-lime" style={{ flexShrink: 0 }}><Users size={12} /> {group.members}</span>
                      </a>
                    </StaggerItem>
                  ))}
                </Stagger>

                <div>
                  <Reveal y={16}>
                    <span className="pill pill-lime" style={{ marginBottom: '1.25rem' }}>
                      <Star size={13} /> {SITE_STATS.whatsappParticipants} participants
                    </span>
                  </Reveal>
                  <WordReveal as="h2" text="Canada's largest professional community." delay={0.1} className="panel-heading" />
                  <Reveal delay={0.3}>
                    <p className="standfirst" style={{ margin: '1.25rem 0 2rem' }}>
                      Join a growing network of professionals and newcomers
                      helping each other settle and succeed.
                    </p>
                  </Reveal>
                  <Reveal delay={0.45}>
                    <Link href="/portal/auth" className="btn btn-primary btn-lg">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      Join our growing community
                    </Link>
                  </Reveal>
                </div>
              </div>
            </div>
          </section>

          {/* ─── FEATURED BUSINESSES ─── */}
          {businesses.length > 0 && (
          <section className="flow">
            <div className="container">
              <div className="section-head-editorial">
                <Reveal y={16}><span className="eyebrow">Directory</span></Reveal>
                <WordReveal as="h2" text="Businesses our community trusts." delay={0.08} />
                <Reveal delay={0.3}>
                  <p className="standfirst">Verified by members who used them first.</p>
                </Reveal>
              </div>

              <Stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))', gap: 'clamp(0.75rem, 1.5vw, 1.25rem)' }}>
                {businesses.map((biz) => (
                  <StaggerItem key={biz.slug} style={{ display: 'contents' }}>
                    <Link href={`/businesses/${biz.slug}`} className="bento-tile" style={{ padding: 0, minHeight: 0 }}>
                      <span style={{ position: 'relative', display: 'block', height: '10rem', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
                        {biz.coverImage && <img src={biz.coverImage} alt={biz.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                        <span style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6 }}>
                          {biz.verificationStatus === 'verified' && <span className="biz-badge biz-badge-verified"><ShieldCheck size={10} /> Verified</span>}
                          {biz.offerBadge && <span className="biz-badge biz-badge-deal"><Tag size={10} /> {biz.offerBadge}</span>}
                        </span>
                      </span>
                      <span style={{ display: 'block', padding: '1.15rem 1.35rem 1.35rem' }}>
                        <span className="bento-kicker">{biz.category}</span>
                        <h3 style={{ margin: '0.3rem 0 0.4rem' }}>{biz.name}</h3>
                        <p>{biz.descriptionShort}</p>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.9rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                          <MapPin size={12} /> {biz.city} &middot; {biz.yearsInBusiness} yrs
                        </span>
                      </span>
                    </Link>
                  </StaggerItem>
                ))}
              </Stagger>

              <Reveal delay={0.15}>
                <div style={{ textAlign: 'center', marginTop: '2.25rem' }}>
                  <Link href="/businesses" className="btn btn-primary btn-lg">
                    Explore all businesses <ArrowRight size={18} />
                  </Link>
                </div>
              </Reveal>
            </div>
          </section>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
