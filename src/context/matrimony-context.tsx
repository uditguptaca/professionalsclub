'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  MatrimonyProfile, MatrimonyPreferences, MatrimonyContact, MatrimonyMedia,
  MatrimonyInterest, MatrimonyShortlist, MatrimonyProfileCard,
  MatrimonyConversation, MatrimonyProfileView, MatrimonyAdminStats,
  MatrimonyProfileStatus, InAppNotification,
} from '@/types/matrimony';
import * as actions from '@/app/actions/matrimony';
import { useApp } from '@/context/app-context';

/**
 * Matrimony state for client components.
 *
 * All data comes from Server Actions. No profile id is ever sent as "who I am" —
 * the server resolves the caller's own listing from their session, so one member
 * cannot act as another by passing a different id.
 */

interface MatrimonyContextType {
  myProfile: MatrimonyProfile | null;
  myPreferences: MatrimonyPreferences | null;
  myContact: MatrimonyContact | null;
  myMedia: MatrimonyMedia[];
  profileLoading: boolean;

  profiles: MatrimonyProfileCard[];
  profilesLoading: boolean;

  sentInterests: MatrimonyInterest[];
  receivedInterests: MatrimonyInterest[];
  shortlist: MatrimonyShortlist[];
  conversations: MatrimonyConversation[];
  profileViews: MatrimonyProfileView[];

  notifications: InAppNotification[];
  unreadCount: number;

  error: string | null;

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
  fetchNotifications: () => Promise<void>;

  adminStats: MatrimonyAdminStats | null;
  pendingProfiles: MatrimonyProfile[];
  fetchAdminStats: () => Promise<void>;
  fetchPendingProfiles: () => Promise<void>;
  adminUpdateStatus: (profileId: string, status: MatrimonyProfileStatus, reason?: string) => Promise<void>;
}

const MatrimonyContext = createContext<MatrimonyContextType | undefined>(undefined);

export function MatrimonyProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, currentUserId } = useApp();

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
  const [conversations] = useState<MatrimonyConversation[]>([]);
  const [profileViews] = useState<MatrimonyProfileView[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);

  const [adminStats, setAdminStats] = useState<MatrimonyAdminStats | null>(null);
  const [pendingProfiles, setPendingProfiles] = useState<MatrimonyProfile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const unwrap = useCallback(
    <T,>(result: { ok: true; data: T } | { ok: false; error: string }): T | null => {
      if (result.ok) return result.data;
      setError(result.error);
      return null;
    },
    []
  );

  const fetchMyProfile = useCallback(async () => {
    if (!currentUserId) return;
    setProfileLoading(true);

    const data = unwrap(await actions.getMyMatrimony());
    if (data) {
      setMyProfile(data.profile);
      setMyPreferences(data.preferences);
      setMyContact(data.contact);
      setMyMedia(data.media);
    }

    setProfileLoading(false);
  }, [currentUserId, unwrap]);

  const fetchNotifications = useCallback(async () => {
    if (!currentUserId) return;
    const rows = unwrap(await actions.listNotifications());
    if (rows) setNotifications(rows);
  }, [currentUserId, unwrap]);

  const fetchProfiles = useCallback(
    async (filters?: Record<string, unknown>) => {
      setProfilesLoading(true);
      const rows = unwrap(
        await actions.browseProfiles((filters ?? {}) as Parameters<typeof actions.browseProfiles>[0])
      );
      if (rows) setProfiles(rows);
      setProfilesLoading(false);
    },
    [unwrap]
  );

  const fetchInterests = useCallback(async () => {
    const data = unwrap(await actions.listInterests());
    if (data) {
      setReceivedInterests(data.received as unknown as MatrimonyInterest[]);
      setSentInterests(data.sent as unknown as MatrimonyInterest[]);
    }
  }, [unwrap]);

  const fetchShortlist = useCallback(async () => {
    const rows = unwrap(await actions.listShortlist());
    if (rows) setShortlist(rows as unknown as MatrimonyShortlist[]);
  }, [unwrap]);

  const saveProfile = async (
    data: Partial<MatrimonyProfile>,
    status?: MatrimonyProfileStatus
  ): Promise<MatrimonyProfile | null> => {
    const saved = unwrap(await actions.saveMatrimonyProfile(data as Record<string, unknown>, status));
    if (saved) setMyProfile(saved);
    return saved;
  };

  // profileId is accepted for call-site compatibility but ignored: the server
  // writes against the caller's own listing, the only one they may edit.
  const savePreferences = async (_profileId: string, data: Partial<MatrimonyPreferences>) => {
    unwrap(await actions.saveMatrimonyPreferences(data as Record<string, unknown>));
  };

  const saveContact = async (_profileId: string, data: Partial<MatrimonyContact>) => {
    unwrap(await actions.saveMatrimonyContact(data as Record<string, unknown>));
  };

  const sendInterest = async (targetProfileId: string): Promise<boolean> => {
    const result = await actions.sendInterest(targetProfileId);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    await fetchInterests();
    return result.data;
  };

  const respondToInterest = async (interestId: string, accept: boolean) => {
    unwrap(await actions.respondToInterest(interestId, accept));
    await fetchInterests();
  };

  const addToShortlist = async (targetProfileId: string) => {
    unwrap(await actions.addToShortlist(targetProfileId));
    await fetchShortlist();
  };

  const removeFromShortlist = async (targetProfileId: string) => {
    unwrap(await actions.removeFromShortlist(targetProfileId));
    await fetchShortlist();
  };

  const blockProfile = async (targetProfileId: string) => {
    unwrap(await actions.blockProfile(targetProfileId));
  };

  const reportProfile = async (targetProfileId: string, reason: string, details?: string) => {
    unwrap(await actions.reportProfile(targetProfileId, reason, details));
  };

  const requestPhotoAccess = async (targetProfileId: string) => {
    unwrap(await actions.requestPhotoAccess(targetProfileId));
  };

  // ========== ADMIN ==========

  const fetchAdminStats = useCallback(async () => {
    const data = unwrap(await actions.adminMatrimonyOverview());
    if (data) {
      setAdminStats(data.stats);
      setPendingProfiles(data.profiles.filter((p) => p.status === 'pending'));
    }
  }, [unwrap]);

  const fetchPendingProfiles = fetchAdminStats;

  const adminUpdateStatus = async (
    profileId: string,
    status: MatrimonyProfileStatus,
    reason?: string
  ) => {
    unwrap(await actions.adminSetMatrimonyStatus(profileId, status, reason));
    await fetchAdminStats();
  };

  useEffect(() => {
    if (isAuthenticated && currentUserId) {
      void fetchMyProfile();
      void fetchNotifications();
    }
  }, [isAuthenticated, currentUserId, fetchMyProfile, fetchNotifications]);

  return (
    <MatrimonyContext.Provider
      value={{
        myProfile, myPreferences, myContact, myMedia, profileLoading,
        profiles, profilesLoading,
        sentInterests, receivedInterests,
        shortlist, conversations, profileViews,
        notifications, unreadCount, error,
        fetchMyProfile, saveProfile, savePreferences, saveContact,
        sendInterest, respondToInterest,
        addToShortlist, removeFromShortlist,
        blockProfile, reportProfile, requestPhotoAccess,
        fetchProfiles, fetchInterests, fetchShortlist, fetchNotifications,
        adminStats, pendingProfiles,
        fetchAdminStats, fetchPendingProfiles, adminUpdateStatus,
      }}
    >
      {children}
    </MatrimonyContext.Provider>
  );
}

export function useMatrimony() {
  const ctx = useContext(MatrimonyContext);
  if (!ctx) throw new Error('useMatrimony must be used within MatrimonyProvider');
  return ctx;
}
