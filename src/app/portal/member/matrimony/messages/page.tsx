'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/app-context';
import { getMyMatrimony, listConversations, listMessages, sendMatrimonyMessage } from '@/app/actions/matrimony';
import type { MatrimonyProfile, MatrimonyConversation, MatrimonyMessage, MatrimonyProfileCard } from '@/types/matrimony';
import {
  MessageCircle, ArrowLeft, Send, User, ChevronRight, UserCheck,
  Shield, AlertCircle, Heart,
} from 'lucide-react';
import PortalLoading from '@/components/portal/PortalLoading';

interface PopulatedConversation extends MatrimonyConversation {
  otherProfile: MatrimonyProfileCard;
}

export default function MessagesPage() {
  const { currentUserId } = useApp();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<MatrimonyProfile | null>(null);
  const [conversations, setConversations] = useState<PopulatedConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<PopulatedConversation | null>(null);
  const [messages, setMessages] = useState<MatrimonyMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Conversation cards are joined server-side from
  // matrimony_visible_profiles; matrimony_profiles exposes only your own row.
  async function loadConversations() {
    const result = await listConversations();
    if (result.ok) setConversations(result.data.conversations as unknown as PopulatedConversation[]);
    else setError(result.error);
  }

  // Load messages for a conversation
  async function loadMessages(convId: string) {
    const result = await listMessages(convId);
    if (result.ok) setMessages(result.data);
    else setError(result.error);
  }

  // Initial load
  useEffect(() => {
    async function init() {
      if (!currentUserId) { setLoading(false); return; }
      setLoading(true);
      const mine = await getMyMatrimony();
      if (mine.ok && mine.data.profile) {
        setMyProfile(mine.data.profile);
        await loadConversations();
      }
      setLoading(false);
    }
    init();
  }, [currentUserId]);

  // Poll for new messages while a thread is open.
  //
  // Supabase Realtime backed this before. Neon has no equivalent push channel,
  // and adding a websocket layer for one screen is not worth the moving parts,
  // so this polls every five seconds and stops when the tab is hidden.
  useEffect(() => {
    if (!selectedConv) return;

    const convId = selectedConv.id;
    void loadMessages(convId);

    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void loadMessages(convId);
    }, 5000);

    return () => clearInterval(timer);
  }, [selectedConv]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConv || !myProfile || sending) return;
    setSending(true);

    // The sender is stamped server-side from the session, the conversation's
    // ordering timestamp is bumped by a trigger, and the recipient is notified
    // by notify_on_matrimony_message. Nothing here needs to do any of that.
    const result = await sendMatrimonyMessage(selectedConv.id, newMessage.trim());

    if (result.ok) {
      setError(null);
      setNewMessage('');
      setMessages(prev => [...prev, result.data]);
    } else {
      // Never clear what they typed on a failure.
      setError(result.error);
    }

    setSending(false);
  };

  function getDisplayName(name: string, pref: string) {
    if (!name) return 'Member';
    if (pref === 'first_name') return name.split(' ')[0];
    if (pref === 'initials') return name.split(' ').map(w => w[0]).join('').toUpperCase();
    return name;
  }

  if (loading) {
    return (
      <PortalLoading label="Loading chat" />
    );
  }

  if (!myProfile) {
    return (
      <div className="pp2" style={{ textAlign: 'center', padding: '2.5rem 0' }}>
        <Heart size={28} aria-hidden="true" style={{ opacity: 0.35, marginBottom: 12 }} />
        <p style={{ margin: '0 0 1.1rem', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
          Create a matrimony profile to message your matches.
        </p>
        <Link href="/portal/member/matrimony/create" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          Create profile
        </Link>
      </div>
    );
  }

  const backChip = (label: string, onClick?: () => void, href?: string) => {
    const style: React.CSSProperties = {
      background: 'var(--bg-primary)', border: '1px solid rgba(27,67,50,0.08)',
      color: 'var(--text-secondary)', textDecoration: 'none',
      minHeight: 40, padding: '0 0.9rem', marginBottom: '0.9rem', cursor: 'pointer',
    };
    return href
      ? <Link href={href} className="pp-chip" style={style}><ArrowLeft size={14} aria-hidden="true" /> {label}</Link>
      : <button type="button" className="pp-chip" style={{ ...style, fontFamily: 'inherit' }} onClick={onClick}><ArrowLeft size={14} aria-hidden="true" /> {label}</button>;
  };

  // ---- Thread view --------------------------------------------------------
  if (selectedConv) {
    const other = selectedConv.otherProfile;
    const name = getDisplayName(other.full_name, other.display_pref);

    return (
      <div className="pp2">
        {backChip('All chats', () => setSelectedConv(null))}

        <div
          className="pp-group-card"
          style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 13rem)', minHeight: '22rem' }}
        >
          {/* Thread header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
            padding: '0.7rem 0.9rem', borderBottom: '1px solid rgba(27,67,50,0.08)',
          }}>
            <span className="pp-row-icon" style={{ borderRadius: '50%' }}><User size={17} aria-hidden="true" /></span>
            <span className="pp-row-body">
              <strong style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                {other.is_verified_id && (
                  <UserCheck size={13} aria-label="ID verified" style={{ color: 'var(--text-accent)', flexShrink: 0 }} />
                )}
              </strong>
              <small style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {[other.city, other.province].filter(Boolean).join(', ')}
              </small>
            </span>
            <Link
              href={`/portal/member/matrimony/profile/${other.id}`}
              className="btn btn-sm btn-outline"
              style={{ textDecoration: 'none', flexShrink: 0 }}
            >
              Profile
            </Link>
          </div>

          {/* Messages */}
          {/* minHeight 0 so the scroll area can shrink and the composer stays put */}
          <div style={{
            flex: 1, minHeight: 0, overflowY: 'auto', background: 'var(--bg-secondary)',
            padding: '1rem 0.9rem', display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <span
              className="pp-chip"
              style={{ alignSelf: 'center', background: 'rgba(0,168,107,0.10)', color: 'var(--success-600)', marginBottom: 4 }}
            >
              <Shield size={12} aria-hidden="true" /> Private chat, unlocked by mutual interest
            </span>

            {messages.map((msg) => {
              const isMine = msg.sender_profile_id === myProfile.id;
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '80%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: isMine ? '1.1rem 1.1rem 0.3rem 1.1rem' : '1.1rem 1.1rem 1.1rem 0.3rem',
                    background: isMine ? 'var(--green-950)' : 'var(--bg-primary)',
                    color: isMine ? '#fff' : 'var(--text-primary)',
                    border: isMine ? '1px solid transparent' : '1px solid rgba(27,67,50,0.08)',
                    fontSize: '0.9rem', lineHeight: 1.45, overflowWrap: 'anywhere',
                  }}>
                    {msg.body}
                    <span style={{
                      display: 'block', marginTop: 3, fontSize: '0.68rem', textAlign: 'right',
                      color: isMine ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)',
                    }}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <form
            onSubmit={handleSendMessage}
            style={{
              display: 'flex', alignItems: 'flex-end', gap: 8, flexShrink: 0,
              padding: '0.7rem 0.75rem', borderTop: '1px solid rgba(27,67,50,0.08)',
              background: 'var(--bg-primary)',
            }}
          >
            <input
              id="matrimony-composer"
              type="text"
              aria-label={`Message ${name}`}
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Write a message"
              disabled={sending}
              style={{
                flex: 1, minWidth: 0, minHeight: 46, padding: '0.7rem 1rem',
                border: '1.5px solid transparent', borderRadius: 999,
                background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                fontFamily: 'inherit',
                /* 16px, or iOS zooms the page when the composer takes focus. */
                fontSize: '16px',
              }}
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={!newMessage.trim() || sending}
              style={{
                display: 'grid', placeItems: 'center', flexShrink: 0,
                width: 46, height: 46, border: 0, borderRadius: '50%',
                background: 'var(--green-950)', color: '#fff', cursor: 'pointer',
                opacity: !newMessage.trim() || sending ? 0.5 : 1,
              }}
            >
              <Send size={18} aria-hidden="true" />
            </button>
          </form>
        </div>

        {error && (
          <div role="alert" className="community-error" style={{ marginTop: 12 }}>
            <AlertCircle size={15} aria-hidden="true" /> {error}
          </div>
        )}
      </div>
    );
  }

  // ---- Conversation list --------------------------------------------------
  return (
    <div className="pp2">
      {backChip('Matrimony', undefined, '/portal/member/matrimony')}

      <header style={{ marginBottom: '1.1rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.01em', margin: '0 0 0.25rem' }}>
          Messages
        </h1>
        <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
          A chat opens once both of you have accepted an interest.
        </p>
      </header>

      {error && (
        <div role="alert" className="community-error" style={{ marginBottom: 12 }}>
          <AlertCircle size={15} aria-hidden="true" /> {error}
        </div>
      )}

      {conversations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
          <MessageCircle size={28} aria-hidden="true" style={{ opacity: 0.35 }} />
          <p style={{ margin: '0.8rem 0 1.1rem', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
            No chats yet. Accept an interest and the conversation opens here.
          </p>
          <Link href="/portal/member/matrimony/interests" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            View interests
          </Link>
        </div>
      ) : (
        <div className="pp-group-card">
          {conversations.map((conv) => {
            const name = getDisplayName(conv.otherProfile.full_name, conv.otherProfile.display_pref);
            return (
              <button key={conv.id} type="button" className="pp-row" onClick={() => setSelectedConv(conv)}>
                <span className="pp-row-icon" style={{ borderRadius: '50%' }}><User size={17} aria-hidden="true" /></span>
                <span className="pp-row-body">
                  <strong style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                    {conv.otherProfile.is_verified_id && (
                      <UserCheck size={13} aria-label="ID verified" style={{ color: 'var(--text-accent)', flexShrink: 0 }} />
                    )}
                  </strong>
                  <small style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conv.otherProfile.occupation}
                  </small>
                </span>
                <ChevronRight size={16} aria-hidden="true" className="pp-row-go" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
