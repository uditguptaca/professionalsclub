'use client';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Member, UserRole } from '@/types';

interface AppContextType {
  profile: Member | null;
  currentRole: UserRole;
  isAuthenticated: boolean;
  currentUserId: string;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  toggleSidebar: () => void;
  /** Re-reads the profile after the user edits it. */
  refreshProfile: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

/**
 * Session state for client components.
 *
 * `initialProfile` is resolved on the server in the root layout, so there is no
 * authenticated/unauthenticated flicker and no client-side source of truth for
 * who you are. Nothing here decides access — the server layouts do that. This
 * only tells the UI what to draw.
 */
export function AppProvider({
  initialProfile,
  children,
}: {
  initialProfile: Member | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<Member | null>(initialProfile);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Keep in step when the server sends a newer profile (e.g. after router.refresh()).
  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  // No client-side auth subscription. The session cookie is owned by
  // /api/auth/*, and the server layouts re-read it on every navigation, so the
  // only thing this provider needs to do is mirror what the server sent.

  const refreshProfile = useCallback(async () => {
    router.refresh();
  }, [router]);

  const toggleSidebar = useCallback(() => setSidebarOpen((p) => !p), []);

  return (
    <AppContext.Provider
      value={{
        profile,
        currentRole: profile?.role ?? 'member',
        isAuthenticated: profile !== null,
        currentUserId: profile?.id ?? '',
        sidebarOpen,
        setSidebarOpen,
        toggleSidebar,
        refreshProfile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// What the server-side pass falls back to when the context is unreachable.
// That only happens under a Turbopack dev quirk: after enough hot updates the
// SSR module graph can hold a DUPLICATED copy of this module, so the provider
// writes to one instance while a page reads the other. Crashing SSR over it
// forced a full client re-render and a scary overlay error; rendering the
// signed-out shape server-side instead is harmless, because the client-side
// instance (which is never duplicated) immediately hydrates the real state.
const SSR_FALLBACK: AppContextType = {
  profile: null,
  currentRole: 'member',
  isAuthenticated: false,
  currentUserId: '',
  sidebarOpen: true,
  setSidebarOpen: () => {},
  toggleSidebar: () => {},
  refreshProfile: async () => {},
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    if (typeof window === 'undefined') return SSR_FALLBACK;
    // In the browser a missing provider is a real wiring bug - keep it loud.
    throw new Error('useApp must be used within AppProvider');
  }
  return ctx;
}
