'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/app-context';
import { createClient } from '@/utils/supabase/client';
import type { MatrimonyProfile, MatrimonyConversation, MatrimonyMessage, MatrimonyProfileCard } from '@/types/matrimony';
import {
  MessageCircle, ArrowLeft, Send, User, ChevronRight, UserCheck, ShieldCheck,
  Clock, Shield, AlertCircle
} from 'lucide-react';

interface PopulatedConversation extends MatrimonyConversation {
  otherProfile: MatrimonyProfileCard;
}

export default function MessagesPage() {
  const { currentUserId } = useApp();
  const supabase = createClient();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<MatrimonyProfile | null>(null);
  const [conversations, setConversations] = useState<PopulatedConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<PopulatedConversation | null>(null);
  const [messages, setMessages] = useState<MatrimonyMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Load conversations
  async function loadConversations(profileId: string) {
    try {
      const { data, error } = await supabase
        .from('matrimony_conversations')
        .select(`
          id, profile_a_id, profile_b_id, last_message_at, created_at,
          profile_a:profile_a_id (
            id, user_id, full_name, display_pref, gender, dob, height_cm, city, province, country, religion, mother_tongue, occupation, qualification, residency_status, diet, marital_status, is_verified_id, is_verified_photo, is_verified_profession, photo_visibility, last_active_at, about_me, completeness_pct, status
          ),
          profile_b:profile_b_id (
            id, user_id, full_name, display_pref, gender, dob, height_cm, city, province, country, religion, mother_tongue, occupation, qualification, residency_status, diet, marital_status, is_verified_id, is_verified_photo, is_verified_profession, photo_visibility, last_active_at, about_me, completeness_pct, status
          )
        `)
        .or(`profile_a_id.eq.${profileId},profile_b_id.eq.${profileId}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formatted: PopulatedConversation[] = data.map((item: any) => {
          const otherProfile = item.profile_a_id === profileId 
            ? item.profile_b as unknown as MatrimonyProfileCard
            : item.profile_a as unknown as MatrimonyProfileCard;
          return {
            id: item.id,
            profile_a_id: item.profile_a_id,
            profile_b_id: item.profile_b_id,
            last_message_at: item.last_message_at,
            created_at: item.created_at,
            otherProfile
          };
        }).filter(item => item.otherProfile !== null);
        setConversations(formatted);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
    }
  }

  // Load messages for a conversation
  async function loadMessages(convId: string) {
    try {
      const { data, error } = await supabase
        .from('matrimony_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) setMessages(data as MatrimonyMessage[]);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  }

  // Initial load
  useEffect(() => {
    async function init() {
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
          await loadConversations(myProf.id);
        }
      } catch (err) {
        console.error('Error initializing chat:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [currentUserId]);

  // Handle selected conversation change & Realtime subscription
  useEffect(() => {
    if (!selectedConv) return;
    loadMessages(selectedConv.id);

    // Subscribe to new messages
    const channel = supabase
      .channel(`matrimony_messages:conv_id=eq.${selectedConv.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'matrimony_messages',
          filter: `conversation_id=eq.${selectedConv.id}`
        },
        (payload) => {
          const newMsg = payload.new as MatrimonyMessage;
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConv, supabase]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConv || !myProfile || sending) return;
    setSending(true);

    try {
      const { data, error } = await supabase
        .from('matrimony_messages')
        .insert([{
          conversation_id: selectedConv.id,
          sender_profile_id: myProfile.id,
          body: newMessage.trim(),
        }])
        .select()
        .single();

      if (error) throw error;

      // Update last message timestamp on conversation
      await supabase
        .from('matrimony_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedConv.id);

      setNewMessage('');
      setMessages(prev => [...prev, data as MatrimonyMessage]);

      // Notify the receiver
      await supabase.from('in_app_notifications').insert([{
        user_id: selectedConv.otherProfile.user_id,
        title: 'New Matrimony Message',
        content: `You received a message from ${myProfile.display_pref === 'full_name' ? myProfile.full_name : myProfile.full_name.split(' ')[0]}.`,
        category: 'matrimony',
        link_to: `/portal/member/matrimony/messages`
      }]);

    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

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
        <p style={{ color: 'var(--text-muted)' }}>Loading chat...</p>
      </div>
    );
  }

  if (!myProfile) {
    return (
      <div className="flex flex-col gap-6" style={{ maxWidth: 600, margin: '40px auto', textAlign: 'center' }}>
        <h2 style={{ fontWeight: 800 }}>Profile Required</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Please create a matrimony profile first to message connections.
        </p>
        <Link href="/portal/member/matrimony/create" className="btn btn-primary" style={{ alignSelf: 'center', textDecoration: 'none' }}>
          Create Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in" style={{ maxWidth: 1100, margin: '0 auto', height: 'calc(100vh - 180px)', minHeight: 500 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/portal/member/matrimony" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>

      {/* Main chat layout wrapper */}
      <div className="card" style={{
        display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 0, padding: 0, overflow: 'hidden', height: '100%',
        background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 20,
      }}>
        {/* Left Sidebar: Conversations List */}
        <div style={{ borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageCircle size={18} style={{ color: '#0067A5' }} /> Messages
            </h2>
          </div>

          {conversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, flex: 1, justifyContent: 'center' }}>
              <MessageCircle size={32} style={{ opacity: 0.3 }} />
              <p style={{ fontSize: '0.85rem', margin: 0 }}>No conversations yet.</p>
              <p style={{ fontSize: '0.75rem', margin: 0, color: 'var(--text-secondary)' }}>Accept mutual interests to start chatting.</p>
            </div>
          ) : (
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {conversations.map((conv) => {
                const isSelected = selectedConv?.id === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConv(conv)}
                    style={{
                      padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12,
                      background: isSelected ? 'rgba(0,103,165,0.06)' : 'transparent',
                      borderBottom: '1px solid var(--border-color)', cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: `linear-gradient(135deg, ${conv.otherProfile.gender === 'female' ? '#ec4899' : '#0067A5'}20, ${conv.otherProfile.gender === 'female' ? '#f472b6' : '#0091d5'}10)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <User size={20} style={{ color: conv.otherProfile.gender === 'female' ? '#ec4899' : '#0067A5' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {getDisplayName(conv.otherProfile.full_name, conv.otherProfile.display_pref)}
                        </span>
                        {conv.otherProfile.is_verified_id && <UserCheck size={12} style={{ color: '#0067A5' }} />}
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {conv.otherProfile.occupation}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Pane: Thread View */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {selectedConv ? (
            <>
              {/* Header */}
              <div style={{
                padding: '16px 24px', borderBottom: '1px solid var(--border-color)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: `linear-gradient(135deg, ${selectedConv.otherProfile.gender === 'female' ? '#ec4899' : '#0067A5'}20, ${selectedConv.otherProfile.gender === 'female' ? '#f472b6' : '#0091d5'}10)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <User size={18} style={{ color: selectedConv.otherProfile.gender === 'female' ? '#ec4899' : '#0067A5' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {getDisplayName(selectedConv.otherProfile.full_name, selectedConv.otherProfile.display_pref)}
                      {selectedConv.otherProfile.is_verified_id && <UserCheck size={14} style={{ color: '#0067A5' }} />}
                    </h3>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{selectedConv.otherProfile.city}, {selectedConv.otherProfile.province}</span>
                  </div>
                </div>
                <Link href={`/portal/member/matrimony/profile/${selectedConv.otherProfile.id}`} className="btn btn-sm btn-outline">
                  View Profile
                </Link>
              </div>

              {/* Message History */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16, background: 'rgba(0,103,165,0.01)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 8, background: 'rgba(0,168,107,0.08)',
                    color: '#00A86B', fontSize: '0.72rem', fontWeight: 600
                  }}>
                    <Shield size={12} /> Encrypted, secure chat unlocked via mutual interest
                  </div>
                </div>

                {messages.map((msg) => {
                  const isMine = msg.sender_profile_id === myProfile.id;
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        justifyContent: isMine ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '70%',
                          padding: '12px 16px',
                          borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background: isMine ? '#0067A5' : 'white',
                          color: isMine ? 'white' : 'var(--text-primary)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                          border: isMine ? 'none' : '1px solid var(--border-color)',
                          fontSize: '0.85rem',
                          lineHeight: 1.5,
                        }}
                      >
                        <div>{msg.body}</div>
                        <div style={{
                          fontSize: '10px',
                          color: isMine ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)',
                          textAlign: 'right',
                          marginTop: 4
                        }}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Box */}
              <form onSubmit={handleSendMessage} style={{
                padding: 16, borderTop: '1px solid var(--border-color)',
                display: 'flex', gap: 12, background: 'var(--bg-primary)'
              }}>
                <input
                  type="text"
                  className="input"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  style={{ borderRadius: 12, flex: 1 }}
                  disabled={sending}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ borderRadius: 12, width: 44, height: 44, padding: 0, justifyContent: 'center' }}
                  disabled={!newMessage.trim() || sending}
                >
                  <Send size={18} />
                </button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: 'var(--text-muted)' }}>
              <MessageCircle size={48} style={{ opacity: 0.2 }} />
              <p style={{ fontSize: '0.9rem', margin: 0 }}>Select a chat conversation from the list to start messaging.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
