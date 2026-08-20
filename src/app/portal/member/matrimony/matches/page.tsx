'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/app-context';
import { getMyMatrimony, browseProfiles } from '@/app/actions/matrimony';
import type { MatrimonyProfile, MatrimonyPreferences, MatrimonyProfileCard } from '@/types/matrimony';
import { computeMatchScore } from '@/lib/matrimony/matching';
import {
  MapPin, Briefcase, BadgeCheck, ArrowLeft, ChevronRight, Smile,
  User, SlidersHorizontal, Camera,
} from 'lucide-react';
import PortalLoading from '@/components/portal/PortalLoading';
import MatrimonyTabs from '@/components/portal/MatrimonyTabs';

/**
 * Matches: the visible profiles this member can see, ranked by how well they
 * fit the member's own stated preferences.
 *
 * Only what the data supports is offered. Scoring is one-directional
 * (my preferences against their listing), so there is no mutual-match tab: that
 * needs the candidate's own preferences scored against my listing, which the
 * browse view does not carry.
 */

type MatchTab = 'recommended' | 'all';

/** A candidate is only "recommended" above this fit. */
const RECOMMENDED_MIN = 60;

type ScoredCandidate = MatrimonyProfileCard & { score: number | null };

const pageTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)', fontSize: 'clamp(1.35rem, 4vw, 1.55rem)',
  fontWeight: 800, letterSpacing: '-0.01em', margin: 0,
};

const backLinkStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
  minHeight: 44, fontSize: '0.84rem', fontWeight: 700,
  color: 'var(--text-accent)', textDecoration: 'none',
};

/** Small green / amber / red, per the design law's text tokens. */
const scoreTone = (score: number): string =>
  score >= 80 ? 'var(--success-600)' : score >= 60 ? 'var(--accent-700)' : 'var(--error-600)';

export default function MatchesPage() {
  const { currentUserId } = useApp();

  const [activeTab, setActiveTab] = useState<MatchTab>('recommended');
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<MatrimonyProfile | null>(null);
  const [myPrefs, setMyPrefs] = useState<MatrimonyPreferences | null>(null);
  const [candidates, setCandidates] = useState<MatrimonyProfileCard[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!currentUserId) { setLoading(false); return; }
      setLoading(true);
      const mine = await getMyMatrimony();
      const myProf = mine.ok ? mine.data.profile : null;

      if (myProf) {
        setMyProfile(myProf);
        if (mine.ok && mine.data.preferences) setMyPrefs(mine.data.preferences);

        // Candidates come from the curated view, which excludes moderation
        // columns and anyone either side has blocked.
        const cands = await browseProfiles({ exclude_gender: myProf.gender });
        if (cands.ok) setCandidates(cands.data);
      }

      setLoading(false);
    }
    loadData();
  }, [currentUserId]);

  // Without preferences there is nothing to score against, so candidates keep
  // the order the view returned (most recently active first) and carry no score.
  const scored = useMemo<ScoredCandidate[]>(() => {
    if (!myPrefs) return candidates.map(c => ({ ...c, score: null }));
    return candidates
      .map(c => ({ ...c, score: Math.round(computeMatchScore(myPrefs, c)) }))
      .sort((a, b) => b.score - a.score);
  }, [candidates, myPrefs]);

  const recommended = useMemo(
    () => scored.filter(c => c.score !== null && c.score >= RECOMMENDED_MIN),
    [scored]
  );

  const visible = activeTab === 'recommended' ? recommended : scored;

  function getAge(dob: string): number {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  }

  function getDisplayName(name: string, pref: string) {
    if (!name) return 'Member';
    if (pref === 'first_name') return name.split(' ')[0];
    if (pref === 'initials') return name.split(' ').map(w => w[0]).join('').toUpperCase();
    return name;
  }

  if (loading) {
    return <PortalLoading label="Finding matches" />;
  }

  if (!myProfile) {
    return (
      <div className="pp2" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}><MatrimonyTabs active="likes" /></div>
        <Smile size={28} aria-hidden="true" style={{ opacity: 0.35, marginBottom: 12 }} />
        <h1 style={{ ...pageTitleStyle, marginBottom: 8 }}>Create a profile first</h1>
        <p style={{ margin: '0 0 20px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Matches are scored against your own listing and preferences.
        </p>
        <Link href="/portal/member/matrimony/create" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          Create profile
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
      {/* The wrapper cancels the nav's own bottom margin — this column has a gap. */}
      <div style={{ marginBottom: '-1.1rem' }}><MatrimonyTabs active="likes" /></div>
      <Link href="/portal/member/matrimony/interests" style={backLinkStyle}>
        <ArrowLeft size={15} aria-hidden="true" /> Back to Likes
      </Link>

      <div>
        <h1 style={pageTitleStyle}>Your matches</h1>
        <p className="pp-group-sub" style={{ margin: '0.35rem 0 0' }}>
          {myPrefs
            ? `Members you can see, scored against your partner preferences. Recommended means ${RECOMMENDED_MIN}% and up.`
            : 'Members you can see, most recently active first.'}
        </p>
      </div>

      {myPrefs ? (
        /* Tabs — a threshold on the same score, nothing else */
        <div
          style={{
            display: 'flex', gap: 4, padding: 4,
            background: 'var(--bg-primary)', borderRadius: 999,
            border: '1px solid rgba(27,67,50,0.08)',
            width: 'fit-content', maxWidth: '100%', overflowX: 'auto',
          }}
        >
          {([
            { key: 'recommended', label: `Recommended (${recommended.length})` },
            { key: 'all', label: `Everyone (${scored.length})` },
          ] as { key: MatchTab; label: string }[]).map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key} type="button"
                aria-pressed={active}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  minHeight: 44, padding: '0 16px', border: 0, whiteSpace: 'nowrap',
                  borderRadius: 999, font: 'inherit', fontSize: '0.85rem', cursor: 'pointer',
                  background: active ? 'var(--green-950)' : 'none',
                  color: active ? '#fff' : 'var(--text-secondary)',
                  fontWeight: active ? 700 : 600,
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      ) : (
        /* No preferences saved: say so rather than showing an invented score */
        <div className="pp-group-card">
          <Link href="/portal/member/matrimony/edit" className="pp-row pp-row-add">
            <span className="pp-row-icon"><SlidersHorizontal size={17} /></span>
            <span className="pp-row-body">
              <small>No partner preferences yet</small>
              <strong>Set them to rank these profiles</strong>
            </span>
            <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
          </Link>
        </div>
      )}

      {visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <Smile size={28} aria-hidden="true" style={{ opacity: 0.35, marginBottom: 12 }} />
          <p style={{ margin: '0 auto 18px', maxWidth: '26rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {activeTab === 'recommended' && scored.length > 0
              ? `Nobody scores ${RECOMMENDED_MIN}% or higher yet. Widening your preferences brings more profiles in.`
              : 'There are no approved profiles for you to see right now. New listings appear once our team reviews them.'}
          </p>
          <Link href="/portal/member/matrimony/edit" className="btn btn-outline" style={{ textDecoration: 'none' }}>
            Adjust preferences
          </Link>
        </div>
      ) : (
        <div className="hf-events">
          {visible.map((cand) => {
            const photo = cand.primary_photo_url;
            const open = cand.photo_visibility === 'all' && photo;
            const blurred = cand.photo_visibility === 'blurred' && photo;
            return (
              <Link key={cand.id} href={`/portal/member/matrimony/profile/${cand.id}`} className="hf-event card">
                <span className="hf-event-media">
                  {open || blurred ? (
                    <img
                      src={photo} alt="" aria-hidden="true"
                      style={blurred ? { filter: 'blur(20px)', transform: 'scale(1.12)' } : undefined}
                    />
                  ) : (
                    <span className="hf-event-fallback" aria-hidden="true"><User size={30} /></span>
                  )}

                  <span className="hf-chip">{getAge(cand.dob)} · {cand.city}</span>

                  {cand.score !== null && (
                    <span
                      style={{
                        position: 'absolute', top: '0.7rem', left: '0.7rem',
                        padding: '0.25rem 0.6rem', borderRadius: 999,
                        background: 'rgba(255,255,255,0.94)', color: scoreTone(cand.score),
                        fontSize: '0.7rem', fontWeight: 800,
                      }}
                    >
                      {cand.score}% match
                    </span>
                  )}

                  {(cand.is_verified_id || cand.is_verified_photo) && (
                    <span style={{ position: 'absolute', top: '0.7rem', right: '0.7rem', display: 'flex', gap: 5 }}>
                      {cand.is_verified_id && (
                        <span
                          role="img" aria-label="ID verified"
                          style={{
                            display: 'grid', placeItems: 'center', width: 26, height: 26,
                            borderRadius: '50%', background: 'rgba(255,255,255,0.94)', color: 'var(--green-800)',
                          }}
                        >
                          <BadgeCheck size={14} />
                        </span>
                      )}
                      {cand.is_verified_photo && (
                        <span
                          role="img" aria-label="Photo verified"
                          style={{
                            display: 'grid', placeItems: 'center', width: 26, height: 26,
                            borderRadius: '50%', background: 'rgba(255,255,255,0.94)', color: 'var(--green-800)',
                          }}
                        >
                          <Camera size={13} />
                        </span>
                      )}
                    </span>
                  )}
                </span>

                <span className="hf-event-body">
                  <strong>{getDisplayName(cand.full_name, cand.display_pref)}</strong>
                  <small>
                    <MapPin size={12} aria-hidden="true" />
                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {[cand.city, cand.province].filter(Boolean).join(', ')}
                    </span>
                  </small>
                  {cand.occupation && (
                    <small>
                      <Briefcase size={12} aria-hidden="true" />
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cand.occupation}
                      </span>
                    </small>
                  )}
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: '0.15rem' }}>
                    {[cand.religion, cand.mother_tongue].filter(Boolean).map(f => (
                      <span
                        key={f} className="pp-chip"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                      >
                        {f}
                      </span>
                    ))}
                  </span>
                  <span className="hf-join">View profile</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
