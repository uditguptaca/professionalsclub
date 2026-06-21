'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  MatrimonyProfile,
  MatrimonyPreferences,
  MatrimonyContact,
  MatrimonyMedia,
  MatrimonyInterest,
  MatrimonyShortlist,
  MatrimonyProfileCard,
  MatrimonyConversation,
  MatrimonyMessage,
  MatrimonyProfileView,
  MatrimonyReport,
  MatrimonyPhotoRequest,
  MatrimonySavedSearch,
  MatrimonyAdminStats,
  MatrimonyProfileStatus,
  InAppNotification,
} from '@/types/matrimony';
import { createClient } from '@/utils/supabase/client';
import { useApp } from '@/context/app-context';

interface MatrimonyContextType {
  // My Profile
  myProfile: MatrimonyProfile | null;
  myPreferences: MatrimonyPreferences | null;
  myContact: MatrimonyContact | null;
  myMedia: MatrimonyMedia[];
  profileLoading: boolean;
  
  // Browse
  profiles: MatrimonyProfileCard[];
  profilesLoading: boolean;
  
  // Interests
  sentInterests: MatrimonyInterest[];
  receivedInterests: MatrimonyInterest[];
  
  // Shortlist
  shortlist: MatrimonyShortlist[];
  
  // Messages
  conversations: MatrimonyConversation[];
  
  // Views
  profileViews: MatrimonyProfileView[];
  
  // Notifications
  notifications: InAppNotification[];
  unreadCount: number;
  
  // Actions
  fetchMyProfile: () => Promise<void>;
  saveProfile: (data: Partial<MatrimonyProfile>, status?: MatrimonyProfileStatus) => Promise<MatrimonyProfile | null>;
  savePreferences: (profileId: string, data: Partial<MatrimonyPreferences>) => Promise<void>;
  saveContact: (profileId: string, data: Partial<MatrimonyContact>) => Promise<void>;
  sendInterest: (targetProfileId: string) => Promise<boolean>;
  respondToInterest: (interestId: string, accept: boolean) => Promise<void>;
  addToShortlist: (targetProfileId: string) => Promise<void>;
  removeFromShortlist: (targetProfileId: string) => Promise<void>;
  blockProfile: (targetProfileId: string) => Promise<void>;
  reportProfile: (targetProfileId: string, reason: string, details?: string) => Promise<void>;
  requestPhotoAccess: (targetProfileId: string) => Promise<void>;
  fetchProfiles: (filters?: Record<string, unknown>) => Promise<void>;
  fetchInterests: () => Promise<void>;
  fetchShortlist: () => Promise<void>;
  
  // Admin
  adminStats: MatrimonyAdminStats | null;
  pendingProfiles: MatrimonyProfile[];
  fetchAdminStats: () => Promise<void>;
  fetchPendingProfiles: () => Promise<void>;
  adminUpdateStatus: (profileId: string, status: MatrimonyProfileStatus, reason?: string) => Promise<void>;
}

const MatrimonyContext = createContext<MatrimonyContextType | undefined>(undefined);

export function MatrimonyProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { currentUserId, isAuthenticated, currentRole } = useApp();
  
  // State
  const [myProfile, setMyProfile] = useState<MatrimonyProfile | null>(null);
  const [myPreferences, setMyPreferences] = useState<MatrimonyPreferences | null>(null);
  const [myContact, setMyContact] = useState<MatrimonyContact | null>(null);
  const [myMedia, setMyMedia] = useState<MatrimonyMedia[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  
  const [profiles, setProfiles] = useState<MatrimonyProfileCard[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  
  const [sentInterests, setSentInterests] = useState<MatrimonyInterest[]>([]);
  const [receivedInterests, setReceivedInterests] = useState<MatrimonyInterest[]>([]);
  const [shortlist, setShortlist] = useState<MatrimonyShortlist[]>([]);
  const [conversations, setConversations] = useState<MatrimonyConversation[]>([]);
  const [profileViews, setProfileViews] = useState<MatrimonyProfileView[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  
  const [adminStats, setAdminStats] = useState<MatrimonyAdminStats | null>(null);
  const [pendingProfiles, setPendingProfiles] = useState<MatrimonyProfile[]>([]);
  
  const unreadCount = notifications.filter(n => !n.is_read).length;
  
  // ========== FETCH MY PROFILE ==========
  const fetchMyProfile = useCallback(async () => {
    if (!currentUserId) return;
    setProfileLoading(true);
    try {
      const { data: profile } = await supabase
        .from('matrimony_profiles')
        .select('*')
        .eq('user_id', currentUserId)
        .single();
      
      if (profile) {
        setMyProfile(profile as MatrimonyProfile);
        
        // Fetch related data
        const [
          { data: prefs },
          { data: contact },
          { data: media },
        ] = await Promise.all([
          supabase.from('matrimony_preferences').select('*').eq('profile_id', profile.id).single(),
          supabase.from('matrimony_contacts').select('*').eq('profile_id', profile.id).single(),
          supabase.from('matrimony_media').select('*').eq('profile_id', profile.id),
        ]);
        
        if (prefs) setMyPreferences(prefs as MatrimonyPreferences);
        if (contact) setMyContact(contact as MatrimonyContact);
        if (media) setMyMedia(media as MatrimonyMedia[]);
      } else {
        setMyProfile(null);
      }
    } catch (err) {
      console.error('Error fetching matrimony profile:', err);
    } finally {
      setProfileLoading(false);
    }
  }, [currentUserId]);
  
  // ========== SAVE PROFILE ==========
  const saveProfile = async (data: Partial<MatrimonyProfile>, status?: MatrimonyProfileStatus): Promise<MatrimonyProfile | null> => {
    try {
      const profileData = {
        ...data,
        user_id: currentUserId,
        status: status || data.status || 'draft',
        updated_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
      };
      
      if (myProfile?.id) {
        const { data: updated, error } = await supabase
          .from('matrimony_profiles')
          .update(profileData)
          .eq('id', myProfile.id)
          .select()
          .single();
        if (error) throw error;
        setMyProfile(updated as MatrimonyProfile);
        return updated as MatrimonyProfile;
      } else {
        const { data: created, error } = await supabase
          .from('matrimony_profiles')
          .insert([profileData])
          .select()
          .single();
        if (error) throw error;
        setMyProfile(created as MatrimonyProfile);
        return created as MatrimonyProfile;
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      return null;
    }
  };
  
  // ========== SAVE PREFERENCES ==========
  const savePreferences = async (profileId: string, data: Partial<MatrimonyPreferences>) => {
    try {
      const { data: existing } = await supabase
        .from('matrimony_preferences')
        .select('id')
        .eq('profile_id', profileId)
        .single();
      
      if (existing) {
        await supabase
          .from('matrimony_preferences')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('profile_id', profileId);
      } else {
        await supabase
          .from('matrimony_preferences')
          .insert([{ ...data, profile_id: profileId }]);
      }
    } catch (err) {
      console.error('Error saving preferences:', err);
    }
  };
  
  // ========== SAVE CONTACT ==========
  const saveContact = async (profileId: string, data: Partial<MatrimonyContact>) => {
    try {
      const { data: existing } = await supabase
        .from('matrimony_contacts')
        .select('id')
        .eq('profile_id', profileId)
        .single();
      
      if (existing) {
        await supabase
          .from('matrimony_contacts')
          .update(data)
          .eq('profile_id', profileId);
      } else {
        await supabase
          .from('matrimony_contacts')
          .insert([{ ...data, profile_id: profileId }]);
      }
    } catch (err) {
      console.error('Error saving contact:', err);
    }
  };
  
  // ========== SEND INTEREST ==========
  const sendInterest = async (targetProfileId: string): Promise<boolean> => {
    if (!myProfile?.id) return false;
    try {
      const { error } = await supabase
        .from('matrimony_interests')
        .insert([{
          sender_profile_id: myProfile.id,
          receiver_profile_id: targetProfileId,
          status: 'pending',
        }]);
      if (error) {
        if (error.code === '23505') return false; // Already sent
        throw error;
      }
      await fetchInterests();
      return true;
    } catch (err) {
      console.error('Error sending interest:', err);
      return false;
    }
  };
  
  // ========== RESPOND TO INTEREST ==========
  const respondToInterest = async (interestId: string, accept: boolean) => {
    try {
      await supabase
        .from('matrimony_interests')
        .update({
          status: accept ? 'accepted' : 'declined',
          responded_at: new Date().toISOString(),
        })
        .eq('id', interestId);
      await fetchInterests();
    } catch (err) {
      console.error('Error responding to interest:', err);
    }
  };
  
  // ========== SHORTLIST ==========
  const addToShortlist = async (targetProfileId: string) => {
    if (!myProfile?.id) return;
    try {
      await supabase
        .from('matrimony_shortlists')
        .insert([{
          owner_profile_id: myProfile.id,
          target_profile_id: targetProfileId,
        }]);
      await fetchShortlist();
    } catch (err) {
      console.error('Error adding to shortlist:', err);
    }
  };
  
  const removeFromShortlist = async (targetProfileId: string) => {
    if (!myProfile?.id) return;
    try {
      await supabase
        .from('matrimony_shortlists')
        .delete()
        .eq('owner_profile_id', myProfile.id)
        .eq('target_profile_id', targetProfileId);
      await fetchShortlist();
    } catch (err) {
      console.error('Error removing from shortlist:', err);
    }
  };
  
  // ========== BLOCK ==========
  const blockProfile = async (targetProfileId: string) => {
    if (!myProfile?.id) return;
    try {
      await supabase
        .from('matrimony_blocks')
        .insert([{
          blocker_profile_id: myProfile.id,
          blocked_profile_id: targetProfileId,
        }]);
    } catch (err) {
      console.error('Error blocking profile:', err);
    }
  };
  
  // ========== REPORT ==========
  const reportProfile = async (targetProfileId: string, reason: string, details?: string) => {
    if (!myProfile?.id) return;
    try {
      await supabase
        .from('matrimony_reports')
        .insert([{
          reporter_profile_id: myProfile.id,
          reported_profile_id: targetProfileId,
          reason,
          details,
          target_type: 'profile',
          status: 'open',
        }]);
    } catch (err) {
      console.error('Error reporting profile:', err);
    }
  };
  
  // ========== PHOTO ACCESS ==========
  const requestPhotoAccess = async (targetProfileId: string) => {
    if (!myProfile?.id) return;
    try {
      await supabase
        .from('matrimony_photo_requests')
        .insert([{
          requester_profile_id: myProfile.id,
          target_profile_id: targetProfileId,
          status: 'pending',
        }]);
    } catch (err) {
      console.error('Error requesting photo access:', err);
    }
  };
  
  // ========== FETCH PROFILES ==========
  const fetchProfiles = async (filters?: Record<string, unknown>) => {
    setProfilesLoading(true);
    try {
      let query = supabase
        .from('matrimony_profiles')
        .select('id, user_id, full_name, display_pref, gender, dob, height_cm, city, province, country, religion, mother_tongue, occupation, qualification, residency_status, diet, marital_status, is_verified_id, is_verified_photo, is_verified_profession, photo_visibility, last_active_at, about_me, completeness_pct, status')
        .eq('status', 'approved')
        .eq('is_hidden', false);
      
      // Exclude own profile
      if (myProfile?.id) {
        query = query.neq('id', myProfile.id);
      }
      
      // Apply filters
      if (filters) {
        if (filters.gender) query = query.eq('gender', filters.gender);
        if (filters.religion && (filters.religion as string[]).length > 0) {
          query = query.in('religion', filters.religion as string[]);
        }
        if (filters.city) query = query.ilike('city', `%${filters.city}%`);
        if (filters.province) query = query.eq('province', filters.province);
        if (filters.country) query = query.eq('country', filters.country);
        if (filters.residency_status && (filters.residency_status as string[]).length > 0) {
          query = query.in('residency_status', filters.residency_status as string[]);
        }
        if (filters.marital_status && (filters.marital_status as string[]).length > 0) {
          query = query.in('marital_status', filters.marital_status as string[]);
        }
        if (filters.mother_tongue && (filters.mother_tongue as string[]).length > 0) {
          query = query.in('mother_tongue', filters.mother_tongue as string[]);
        }
        if (filters.verified_only) {
          query = query.eq('is_verified_id', true);
        }
      }
      
      query = query.order('created_at', { ascending: false }).limit(50);
      
      const { data, error } = await query;
      if (error) throw error;
      setProfiles((data || []) as MatrimonyProfileCard[]);
    } catch (err) {
      console.error('Error fetching profiles:', err);
    } finally {
      setProfilesLoading(false);
    }
  };
  
  // ========== FETCH INTERESTS ==========
  const fetchInterests = async () => {
    if (!myProfile?.id) return;
    try {
      const [{ data: sent }, { data: received }] = await Promise.all([
        supabase.from('matrimony_interests').select('*').eq('sender_profile_id', myProfile.id).order('created_at', { ascending: false }),
        supabase.from('matrimony_interests').select('*').eq('receiver_profile_id', myProfile.id).order('created_at', { ascending: false }),
      ]);
      setSentInterests((sent || []) as MatrimonyInterest[]);
      setReceivedInterests((received || []) as MatrimonyInterest[]);
    } catch (err) {
      console.error('Error fetching interests:', err);
    }
  };
  
  // ========== FETCH SHORTLIST ==========
  const fetchShortlist = async () => {
    if (!myProfile?.id) return;
    try {
      const { data } = await supabase
        .from('matrimony_shortlists')
        .select('*')
        .eq('owner_profile_id', myProfile.id)
        .order('created_at', { ascending: false });
      setShortlist((data || []) as MatrimonyShortlist[]);
    } catch (err) {
      console.error('Error fetching shortlist:', err);
    }
  };
  
  // ========== ADMIN: FETCH STATS ==========
  const fetchAdminStats = async () => {
    try {
      const { data: allProfiles } = await supabase.from('matrimony_profiles').select('status');
      const { data: reports } = await supabase.from('matrimony_reports').select('status').eq('status', 'open');
      const { data: verifs } = await supabase.from('matrimony_verifications').select('status').eq('status', 'pending');
      const { data: interests } = await supabase.from('matrimony_interests').select('status');
      const { data: stories } = await supabase.from('matrimony_success_stories').select('status').eq('status', 'approved');
      
      const profiles = allProfiles || [];
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      setAdminStats({
        total_profiles: profiles.length,
        pending_profiles: profiles.filter(p => p.status === 'pending').length,
        approved_profiles: profiles.filter(p => p.status === 'approved').length,
        rejected_profiles: profiles.filter(p => p.status === 'rejected').length,
        suspended_profiles: profiles.filter(p => p.status === 'suspended').length,
        new_this_week: 0,
        new_this_month: 0,
        active_profiles: profiles.filter(p => p.status === 'approved').length,
        interests_sent: (interests || []).length,
        interests_accepted: (interests || []).filter(i => i.status === 'accepted').length,
        open_reports: (reports || []).length,
        pending_verifications: (verifs || []).length,
        success_stories: (stories || []).length,
      });
    } catch (err) {
      console.error('Error fetching admin stats:', err);
    }
  };
  
  // ========== ADMIN: FETCH PENDING ==========
  const fetchPendingProfiles = async () => {
    try {
      const { data } = await supabase
        .from('matrimony_profiles')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      setPendingProfiles((data || []) as MatrimonyProfile[]);
    } catch (err) {
      console.error('Error fetching pending profiles:', err);
    }
  };
  
  // ========== ADMIN: UPDATE STATUS ==========
  const adminUpdateStatus = async (profileId: string, status: MatrimonyProfileStatus, reason?: string) => {
    try {
      const updateData: Record<string, unknown> = {
        status,
        reviewed_by: currentUserId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (reason) updateData.rejection_reason = reason;
      
      await supabase
        .from('matrimony_profiles')
        .update(updateData)
        .eq('id', profileId);
      
      // Log audit
      await supabase
        .from('matrimony_admin_audit')
        .insert([{
          admin_user_id: currentUserId,
          action: `profile_${status}`,
          target_id: profileId,
          target_type: 'profile',
          reason: reason || null,
        }]);
      
      await fetchPendingProfiles();
      await fetchAdminStats();
    } catch (err) {
      console.error('Error updating profile status:', err);
    }
  };
  
  // ========== INITIAL FETCH ==========
  useEffect(() => {
    if (isAuthenticated && currentUserId) {
      fetchMyProfile();
    }
  }, [isAuthenticated, currentUserId, fetchMyProfile]);
  
  return (
    <MatrimonyContext.Provider value={{
      myProfile, myPreferences, myContact, myMedia, profileLoading,
      profiles, profilesLoading,
      sentInterests, receivedInterests,
      shortlist,
      conversations,
      profileViews,
      notifications, unreadCount,
      fetchMyProfile,
      saveProfile, savePreferences, saveContact,
      sendInterest, respondToInterest,
      addToShortlist, removeFromShortlist,
      blockProfile, reportProfile, requestPhotoAccess,
      fetchProfiles, fetchInterests, fetchShortlist,
      adminStats, pendingProfiles,
      fetchAdminStats, fetchPendingProfiles, adminUpdateStatus,
    }}>
      {children}
    </MatrimonyContext.Provider>
  );
}

export function useMatrimony() {
  const ctx = useContext(MatrimonyContext);
  if (!ctx) throw new Error('useMatrimony must be used within MatrimonyProvider');
  return ctx;
}
