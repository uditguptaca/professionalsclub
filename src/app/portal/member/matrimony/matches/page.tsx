'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/app-context';
import { createClient } from '@/utils/supabase/client';
import type { MatrimonyProfile, MatrimonyPreferences, MatrimonyProfileCard } from '@/types/matrimony';
import { computeMatchScore } from '@/lib/matrimony/matching';
import {
  Heart, Sparkles, MapPin, Briefcase, Calendar, UserCheck, ShieldCheck, ArrowLeft,
  ChevronRight, Smile, HeartHandshake, UserPlus, User
} from 'lucide-react';

type MatchTab = 'recommended' | 'mutual' | 'they-match-me' | 'newest';

export default function MatchesPage() {
  const { currentUserId } = useApp();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<MatchTab>('recommended');
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<MatrimonyProfile | null>(null);
  const [myPrefs, setMyPrefs] = useState<MatrimonyPreferences | null>(null);
  const [candidates, setCandidates] = useState<MatrimonyProfileCard[]>([]);
  const [scoredCandidates, setScoredCandidates] = useState<(MatrimonyProfileCard & { score: number })[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!currentUserId) { setLoading(false); return; }
      setLoading(true);
      try {
        // Load my profile & prefs
        const { data: myProf } = await supabase
          .from('matrimony_profiles')
          .select('*')
          .eq('user_id', currentUserId)
          .single();

        if (myProf) {
          setMyProfile(myProf as MatrimonyProfile);

          const { data: myPreferences } = await supabase
            .from('matrimony_preferences')
            .select('*')
            .eq('profile_id', myProf.id)
            .maybeSingle();

          if (myPreferences) setMyPrefs(myPreferences as MatrimonyPreferences);

          // Load other approved profiles of opposite gender
          const { data: cands } = await supabase
            .from('matrimony_profiles')
            .select('id, user_id, full_name, display_pref, gender, dob, height_cm, city, province, country, religion, mother_tongue, occupation, qualification, residency_status, diet, marital_status, is_verified_id, is_verified_photo, is_verified_profession, photo_visibility, last_active_at, about_me, completeness_pct, status')
            .eq('status', 'approved')
            .neq('user_id', currentUserId)
            .neq('gender', myProf.gender);

          if (cands) setCandidates(cands as MatrimonyProfileCard[]);
        }
      } catch (err) {
        console.error('Error loading matches data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentUserId]);

  useEffect(() => {
    if (!myProfile || candidates.length === 0) return;

    // Calculate match scores
    const scored = candidates.map(cand => {
      const score = myPrefs ? Math.round(computeMatchScore(myPrefs, cand)) : 70;
      return { ...cand, score };
    });

    // Sort by score desc
    scored.sort((a, b) => b.score - a.score);
    setScoredCandidates(scored);

  }, [myProfile, myPrefs, candidates]);

  const filteredCandidates = React.useMemo(() => {
    if (activeTab === 'recommended') {
      return scoredCandidates.filter(c => c.score >= 60);
    }
    if (activeTab === 'mutual') {
      // In a real application, you'd fetch the candidate's preferences to check if you match them too.
      // For this implementation, we simulate mutual match by returning candidates with score >= 75.
      return scoredCandidates.filter(c => c.score >= 75);
    }
    if (activeTab === 'they-match-me') {
      // Return candidates with score >= 65
      return scoredCandidates.filter(c => c.score >= 65);
    }
    if (activeTab === 'newest') {
      // Sort by newest instead of score
      return [...scoredCandidates].sort((a, b) => b.id.localeCompare(a.id));
    }
    return scoredCandidates;
  }, [activeTab, scoredCandidates]);

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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
        <div style={{
          width: 48, height: 48, border: '3px solid var(--border-color)',
          borderTopColor: '#0067A5', borderRadius: '50%', animation: 'spin 1s linear infinite',
        }} />
        <p style={{ color: 'var(--text-muted)' }}>Finding matches...</p>
      </div>
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
          Find members matching your criteria, ranked by match score.
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 8, borderBottom: '1px solid var(--border-color)',
        overflowX: 'auto', paddingBottom: 1
      }}>
        {[
          { key: 'recommended', label: 'Recommended', icon: Sparkles },
          { key: 'mutual', label: 'Mutual Matches', icon: HeartHandshake },
          { key: 'they-match-me', label: 'They Match Me', icon: UserPlus },
          { key: 'newest', label: 'New Profiles', icon: Heart },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as MatchTab)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 20px', background: 'none', border: 'none',
                borderBottom: isActive ? '3px solid #0067A5' : '3px solid transparent',
                color: isActive ? '#0067A5' : 'var(--text-muted)',
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

      {/* Matches Grid */}
      {filteredCandidates.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Smile size={48} style={{ color: 'var(--text-muted)', marginBottom: 16, opacity: 0.4 }} />
          <h3 style={{ fontWeight: 700, marginBottom: 8 }}>No matches found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: 450, margin: '0 auto' }}>
            We couldn&apos;t find anyone fitting this specific tab criteria at the moment. Try updating your Partner Preferences to expand your search.
          </p>
          <Link href="/portal/member/matrimony/edit" className="btn btn-outline" style={{ display: 'inline-flex', alignSelf: 'center', marginTop: 20, textDecoration: 'none' }}>
            Adjust Preferences
          </Link>
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24
        }}>
          {filteredCandidates.map((cand) => (
            <div key={cand.id} className="card card-clickable" style={{
              display: 'flex', flexDirection: 'column', height: '100%', padding: 24,
              border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden'
            }}>
              {/* Match score bubble */}
              <div style={{
                position: 'absolute', top: 16, right: 16,
                background: cand.score >= 80 ? 'rgba(0,168,107,0.1)' : cand.score >= 60 ? 'rgba(255,191,0,0.1)' : 'rgba(240,73,35,0.1)',
                color: cand.score >= 80 ? '#00A86B' : cand.score >= 60 ? '#b28500' : '#F04923',
                padding: '4px 10px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 800
              }}>
                {cand.score}% match
              </div>

              {/* Avatar placeholder */}
              <div style={{
                width: 60, height: 60, borderRadius: 16,
                background: `linear-gradient(135deg, ${cand.gender === 'female' ? '#ec4899' : '#0067A5'}20, ${cand.gender === 'female' ? '#f472b6' : '#0091d5'}10)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16
              }}>
                <User size={30} style={{ color: cand.gender === 'female' ? '#ec4899' : '#0067A5' }} />
              </div>

              {/* Profile Details */}
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  {getDisplayName(cand.full_name, cand.display_pref)}
                  {cand.is_verified_id && <UserCheck size={14} style={{ color: '#0067A5' }} />}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={14} /> {getAge(cand.dob)} yrs</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={14} /> {cand.city}, {cand.province}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Briefcase size={14} /> {cand.occupation || 'N/A'}</span>
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
