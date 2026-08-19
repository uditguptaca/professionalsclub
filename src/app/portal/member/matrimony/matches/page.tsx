'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/app-context';
import { getMyMatrimony, browseProfiles } from '@/app/actions/matrimony';
import type { MatrimonyProfile, MatrimonyPreferences, MatrimonyProfileCard } from '@/types/matrimony';
import { computeMatchScore } from '@/lib/matrimony/matching';
import {
  Sparkles, MapPin, Briefcase, Calendar, UserCheck, ArrowLeft,
  ChevronRight, Smile, Users, User, SlidersHorizontal,
} from 'lucide-react';
import PortalLoading from '@/components/portal/PortalLoading';

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

  const visible = useMemo(
    () => (activeTab === 'recommended' ? scored.filter(c => c.score !== null && c.score >= RECOMMENDED_MIN) : scored),
    [activeTab, scored]
  );

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
    return (
      <PortalLoading label="Finding matches" />
    );
  }

  if (!myProfile) {
    return (
      <div className="flex flex-col gap-6" style={{ maxWidth: 600, margin: '40px auto', textAlign: 'center' }}>
        <h2 style={{ fontWeight: 800 }}>Profile Required</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Please create a matrimony profile first to find compatible matches.
        </p>
        <Link href="/portal/member/matrimony/create" className="btn btn-primary" style={{ alignSelf: 'center', textDecoration: 'none' }}>
          Create Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in" style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/portal/member/matrimony" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Back
        </Link>
      </div>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 6 }}>
          Your Compatible Matches
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {myPrefs
            ? 'Members you can see, scored against your partner preferences.'
            : 'Members you can see, most recently active first.'}
        </p>
      </div>

      {myPrefs ? (
        /* Tabs — a threshold on the same score, nothing else */
        <div style={{
          display: 'flex', gap: 8, borderBottom: '1px solid var(--border-color)',
          overflowX: 'auto', paddingBottom: 1
        }}>
          {([
            { key: 'recommended', label: `Recommended (${RECOMMENDED_MIN}% and up)`, icon: Sparkles },
            { key: 'all', label: 'All Profiles', icon: Users },
          ] as { key: MatchTab; label: string; icon: React.ElementType }[]).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '12px 20px', background: 'none', border: 'none',
                  borderBottom: isActive ? '3px solid var(--primary-600)' : '3px solid transparent',
                  color: isActive ? 'var(--primary-600)' : 'var(--text-muted)',
                  fontWeight: isActive ? 700 : 500, fontSize: '0.85rem',
                  cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s'
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      ) : (
        /* No preferences saved: say so rather than showing an invented score */
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 20 }}>
          <SlidersHorizontal size={20} style={{ color: 'var(--text-accent)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>No partner preferences yet</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Match scores are calculated from your preferences. Set them to rank these profiles.
            </div>
          </div>
          <Link href="/portal/member/matrimony/edit" className="btn btn-sm btn-outline" style={{ textDecoration: 'none', flexShrink: 0 }}>
            Set Preferences
          </Link>
        </div>
      )}

      {/* Matches Grid */}
      {visible.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Smile size={48} style={{ color: 'var(--text-muted)', marginBottom: 16, opacity: 0.4 }} />
          <h3 style={{ fontWeight: 700, marginBottom: 8 }}>No matches yet</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: 450, margin: '0 auto' }}>
            {activeTab === 'recommended' && scored.length > 0
              ? `Nobody currently scores ${RECOMMENDED_MIN}% or higher. Widening your partner preferences will bring more profiles in.`
              : 'There are no approved profiles for you to see right now. New listings appear here once our team reviews them.'}
          </p>
          <Link href="/portal/member/matrimony/edit" className="btn btn-outline" style={{ display: 'inline-flex', alignSelf: 'center', marginTop: 20, textDecoration: 'none' }}>
            Adjust Preferences
          </Link>
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24
        }}>
          {visible.map((cand) => (
            <div key={cand.id} className="card card-clickable" style={{
              display: 'flex', flexDirection: 'column', height: '100%', padding: 24,
              border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden'
            }}>
              {/* Match score bubble — only where a score exists */}
              {cand.score !== null && (
                <div style={{
                  position: 'absolute', top: 16, right: 16,
                  background: cand.score >= 80 ? 'rgba(0,168,107,0.1)' : cand.score >= 60 ? 'rgba(255,191,0,0.1)' : 'rgba(240,73,35,0.1)',
                  color: cand.score >= 80 ? 'var(--success-500)' : cand.score >= 60 ? '#b28500' : 'var(--error-500)',
                  padding: '4px 10px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 800
                }}>
                  {cand.score}% match
                </div>
              )}

              {/* Photo, or the fallback mark when there is none to show */}
              <div style={{
                width: 60, height: 60, borderRadius: 16, overflow: 'hidden',
                background: cand.gender?.toLowerCase() === 'female' ? 'linear-gradient(135deg, rgba(217,119,6,0.13), rgba(251,191,36,0.06))' : 'linear-gradient(135deg, rgba(232,93,4,0.13), rgba(249,115,22,0.06))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16
              }}>
                {cand.photo_visibility === 'all' && cand.primary_photo_url ? (
                  <img src={cand.primary_photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={30} style={{ color: cand.gender?.toLowerCase() === 'female' ? 'var(--accent-600)' : 'var(--primary-600)' }} />
                )}
              </div>

              {/* Profile Details */}
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  {getDisplayName(cand.full_name, cand.display_pref)}
                  {cand.is_verified_id && <UserCheck size={14} style={{ color: 'var(--text-accent)' }} />}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={14} /> {getAge(cand.dob)} yrs</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={14} /> {cand.city}, {cand.province}</span>
                  {cand.occupation && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Briefcase size={14} /> {cand.occupation}</span>
                  )}
                </div>
              </div>

              {/* CTA */}
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
                <Link href={`/portal/member/matrimony/profile/${cand.id}`} className="btn btn-sm btn-primary" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
                  View Profile <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
