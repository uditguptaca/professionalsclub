'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/app-context';
import { createClient } from '@/utils/supabase/client';
import type { MatrimonyProfile, MatrimonyProfileCard } from '@/types/matrimony';
import {
  Bookmark, ArrowLeft, Trash2, User, Calendar, MapPin, Briefcase,
  ChevronRight, UserCheck, Smile
} from 'lucide-react';

export default function ShortlistPage() {
  const { currentUserId } = useApp();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<MatrimonyProfile | null>(null);
  const [list, setList] = useState<MatrimonyProfileCard[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function loadShortlist(profileId: string) {
    try {
      const { data } = await supabase
        .from('matrimony_shortlists')
        .select(`
          id, target_profile_id,
          profile:target_profile_id (
            id, user_id, full_name, display_pref, gender, dob, height_cm, city, province, country, religion, mother_tongue, occupation, qualification, residency_status, diet, marital_status, is_verified_id, is_verified_photo, is_verified_profession, photo_visibility, last_active_at, about_me, completeness_pct, status
          )
        `)
        .eq('owner_profile_id', profileId);

      if (data) {
        const formatted = data
          .filter((item: any) => item.profile !== null)
          .map((item: any) => item.profile as unknown as MatrimonyProfileCard);
        setList(formatted);
      }
    } catch (err) {
      console.error('Error fetching shortlist:', err);
    }
  }

  useEffect(() => {
    async function loadData() {
      if (!currentUserId) { setLoading(false); return; }
      setLoading(true);
      try {
        const { data: myProf } = await supabase
          .from('matrimony_profiles')
          .select('*')
          .eq('user_id', currentUserId)
          .single();

        if (myProf) {
          setMyProfile(myProf as MatrimonyProfile);
          await loadShortlist(myProf.id);
        }
      } catch (err) {
        console.error('Error loading shortlist page:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentUserId]);

  const handleRemove = async (targetProfileId: string) => {
    if (!myProfile) return;
    setActionLoading(targetProfileId);
    try {
      const { error } = await supabase
        .from('matrimony_shortlists')
        .delete()
        .eq('owner_profile_id', myProfile.id)
        .eq('target_profile_id', targetProfileId);

      if (error) throw error;
      await loadShortlist(myProfile.id);
    } catch (err) {
      console.error('Error removing from shortlist:', err);
    } finally {
      setActionLoading(null);
    }
  };

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
        <p style={{ color: 'var(--text-muted)' }}>Loading shortlist...</p>
      </div>
    );
  }

  if (!myProfile) {
    return (
      <div className="flex flex-col gap-6" style={{ maxWidth: 600, margin: '40px auto', textAlign: 'center' }}>
        <h2 style={{ fontWeight: 800 }}>Profile Required</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Please create a matrimony profile first to save and shortlist candidates.
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
      <div>
        <Link href="/portal/member/matrimony" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 6 }}>
          Shortlisted Profiles
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          View and manage the profiles you&apos;ve favorited for later.
        </p>
      </div>

      {/* Grid */}
      {list.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Bookmark size={48} style={{ color: 'var(--text-muted)', marginBottom: 16, opacity: 0.4 }} />
          <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Your shortlist is empty</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Browse profiles and tap the bookmark icon to save candidates here.
          </p>
          <Link href="/portal/member/matrimony/browse" className="btn btn-primary" style={{ display: 'inline-flex', alignSelf: 'center', marginTop: 20, textDecoration: 'none' }}>
            Browse Profiles
          </Link>
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24
        }}>
          {list.map((cand) => (
            <div key={cand.id} className="card card-clickable animate-fade-in-up" style={{
              display: 'flex', flexDirection: 'column', height: '100%', padding: 24,
              border: '1px solid var(--border-color)', position: 'relative'
            }}>
              {/* Delete button */}
              <button
                className="btn btn-ghost"
                onClick={() => handleRemove(cand.id)}
                disabled={actionLoading === cand.id}
                style={{
                  position: 'absolute', top: 16, right: 16, color: '#F04923',
                  padding: 8, borderRadius: 10, background: 'none'
                }}
                title="Remove from Shortlist"
              >
                <Trash2 size={16} />
              </button>

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
