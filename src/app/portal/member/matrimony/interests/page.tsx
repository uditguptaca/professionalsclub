'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/app-context';
import { createClient } from '@/utils/supabase/client';
import type { MatrimonyProfile, MatrimonyInterest, MatrimonyProfileCard } from '@/types/matrimony';
import {
  Heart, ArrowLeft, Send, Inbox, CheckCircle2, XCircle, Clock, User,
  Calendar, MapPin, Briefcase, ChevronRight, UserCheck, Smile
} from 'lucide-react';

type InterestTab = 'received' | 'sent';

interface PopulatedInterest extends Omit<MatrimonyInterest, 'sender_profile' | 'receiver_profile'> {
  profile: MatrimonyProfileCard;
}

export default function InterestsPage() {
  const { currentUserId } = useApp();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<InterestTab>('received');
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<MatrimonyProfile | null>(null);
  const [received, setReceived] = useState<PopulatedInterest[]>([]);
  const [sent, setSent] = useState<PopulatedInterest[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function loadInterests(profileId: string) {
    try {
      // Fetch received interests
      const { data: recvData } = await supabase
        .from('matrimony_interests')
        .select(`
          id, status, created_at, sender_profile_id, receiver_profile_id,
          sender:sender_profile_id (
            id, user_id, full_name, display_pref, gender, dob, height_cm, city, province, country, religion, mother_tongue, occupation, qualification, residency_status, diet, marital_status, is_verified_id, is_verified_photo, is_verified_profession, photo_visibility, last_active_at, about_me, completeness_pct, status
          )
        `)
        .eq('receiver_profile_id', profileId)
        .order('created_at', { ascending: false });

      // Fetch sent interests
      const { data: sentData } = await supabase
        .from('matrimony_interests')
        .select(`
          id, status, created_at, sender_profile_id, receiver_profile_id,
          receiver:receiver_profile_id (
            id, user_id, full_name, display_pref, gender, dob, height_cm, city, province, country, religion, mother_tongue, occupation, qualification, residency_status, diet, marital_status, is_verified_id, is_verified_photo, is_verified_profession, photo_visibility, last_active_at, about_me, completeness_pct, status
          )
        `)
        .eq('sender_profile_id', profileId)
        .order('created_at', { ascending: false });

      if (recvData) {
        const formattedRecv = recvData
          .filter((item: any) => item.sender !== null)
          .map((item: any) => ({
            id: item.id,
            sender_profile_id: item.sender_profile_id,
            receiver_profile_id: item.receiver_profile_id,
            status: item.status,
            created_at: item.created_at,
            profile: item.sender as unknown as MatrimonyProfileCard
          }));
        setReceived(formattedRecv);
      }

      if (sentData) {
        const formattedSent = sentData
          .filter((item: any) => item.receiver !== null)
          .map((item: any) => ({
            id: item.id,
            sender_profile_id: item.sender_profile_id,
            receiver_profile_id: item.receiver_profile_id,
            status: item.status,
            created_at: item.created_at,
            profile: item.receiver as unknown as MatrimonyProfileCard
          }));
        setSent(formattedSent);
      }
    } catch (err) {
      console.error('Error fetching interests:', err);
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
          await loadInterests(myProf.id);
        }
      } catch (err) {
        console.error('Error loading page:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentUserId]);

  const handleAccept = async (interestId: string, senderUserId: string) => {
    if (!myProfile) return;
    setActionLoading(interestId);
    try {
      const { error } = await supabase
        .from('matrimony_interests')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', interestId);

      if (error) throw error;

      // Create conversation
      const { data: existingConv } = await supabase
        .from('matrimony_conversations')
        .select('id')
        .or(`profile_one_id.eq.${myProfile.id},profile_two_id.eq.${myProfile.id}`)
        .or(`profile_one_id.eq.${received.find(r => r.id === interestId)?.sender_profile_id},profile_two_id.eq.${received.find(r => r.id === interestId)?.sender_profile_id}`)
        .maybeSingle();

      if (!existingConv) {
        const senderProfId = received.find(r => r.id === interestId)?.sender_profile_id;
        await supabase
          .from('matrimony_conversations')
          .insert([{
            profile_one_id: myProfile.id,
            profile_two_id: senderProfId,
            last_message_at: new Date().toISOString()
          }]);
      }

      // Notify sender
      await supabase.from('in_app_notifications').insert([{
        user_id: senderUserId,
        title: 'Interest Accepted!',
        content: `Your matrimony interest was accepted. You can now chat and view contact details!`,
        category: 'matrimony',
        link_to: `/portal/member/matrimony/messages`
      }]);

      await loadInterests(myProfile.id);
    } catch (err) {
      console.error('Error accepting interest:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (interestId: string) => {
    if (!myProfile) return;
    if (!confirm('Are you sure you want to decline this interest?')) return;
    setActionLoading(interestId);
    try {
      const { error } = await supabase
        .from('matrimony_interests')
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .eq('id', interestId);

      if (error) throw error;
      await loadInterests(myProfile.id);
    } catch (err) {
      console.error('Error declining interest:', err);
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
        <p style={{ color: 'var(--text-muted)' }}>Loading interests...</p>
      </div>
    );
  }

  if (!myProfile) {
    return (
      <div className="flex flex-col gap-6" style={{ maxWidth: 600, margin: '40px auto', textAlign: 'center' }}>
        <h2 style={{ fontWeight: 800 }}>Profile Required</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Please create a matrimony profile first to receive and send interests.
        </p>
        <Link href="/portal/member/matrimony/create" className="btn btn-primary" style={{ alignSelf: 'center', textDecoration: 'none' }}>
          Create Profile
        </Link>
      </div>
    );
  }

  const currentList = activeTab === 'received' ? received : sent;

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
          Manage Interests
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Accept or send connection requests to start matching.
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 8, borderBottom: '1px solid var(--border-color)',
        overflowX: 'auto', paddingBottom: 1
      }}>
        {[
          { key: 'received', label: `Received (${received.filter(r => r.status === 'pending').length})`, icon: Inbox },
          { key: 'sent', label: `Sent (${sent.length})`, icon: Send },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as InterestTab)}
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

      {/* List */}
      {currentList.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Smile size={48} style={{ color: 'var(--text-muted)', marginBottom: 16, opacity: 0.4 }} />
          <h3 style={{ fontWeight: 700, marginBottom: 8 }}>No interests found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {activeTab === 'received'
              ? "You haven't received any interests yet. Make sure your profile is complete to attract views."
              : "You haven't sent any interests yet. Browse profiles to find someone compatible."}
          </p>
          {activeTab === 'sent' && (
            <Link href="/portal/member/matrimony/browse" className="btn btn-primary" style={{ display: 'inline-flex', alignSelf: 'center', marginTop: 20, textDecoration: 'none' }}>
              Browse Profiles
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {currentList.map((item) => (
            <div key={item.id} className="card animate-fade-in-up" style={{
              display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center', padding: 20
            }}>
              {/* Avatar placeholder */}
              <div style={{
                width: 56, height: 56, borderRadius: 14, flexShrink: 0,
                background: `linear-gradient(135deg, ${item.profile.gender === 'female' ? '#ec4899' : '#0067A5'}20, ${item.profile.gender === 'female' ? '#f472b6' : '#0091d5'}10)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <User size={26} style={{ color: item.profile.gender === 'female' ? '#ec4899' : '#0067A5' }} />
              </div>

              {/* Info details */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 6px 0' }}>
                  {getDisplayName(item.profile.full_name, item.profile.display_pref)}
                  {item.profile.is_verified_id && <UserCheck size={14} style={{ color: '#0067A5' }} />}
                </h3>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                  <span>{getAge(item.profile.dob)} yrs</span>
                  <span>&bull;</span>
                  <span>{item.profile.city}, {item.profile.province}</span>
                  <span>&bull;</span>
                  <span>{item.profile.occupation}</span>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                {item.status === 'pending' && activeTab === 'received' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-sm"
                      onClick={() => handleAccept(item.id, item.profile.user_id)}
                      disabled={actionLoading !== null}
                      style={{ background: '#00A86B', color: 'white', border: 'none' }}
                    >
                      {actionLoading === item.id ? 'Accepting...' : 'Accept'}
                    </button>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => handleDecline(item.id)}
                      disabled={actionLoading !== null}
                      style={{ borderColor: '#F04923', color: '#F04923' }}
                    >
                      Decline
                    </button>
                  </div>
                )}

                {item.status === 'pending' && activeTab === 'sent' && (
                  <span style={{ fontSize: '0.8rem', color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                    <Clock size={14} /> Pending Response
                  </span>
                )}

                {item.status === 'accepted' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '0.8rem', color: '#00A86B', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                      <CheckCircle2 size={14} /> Mutual Match
                    </span>
                    <Link href="/portal/member/matrimony/messages" className="btn btn-sm btn-primary" style={{ background: '#00A86B', borderColor: '#00A86B', textDecoration: 'none' }}>
                      Chat
                    </Link>
                  </div>
                )}

                {item.status === 'declined' && (
                  <span style={{ fontSize: '0.8rem', color: '#F04923', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                    <XCircle size={14} /> Declined
                  </span>
                )}

                <Link href={`/portal/member/matrimony/profile/${item.profile.id}`} className="btn btn-sm btn-ghost" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Profile <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
