import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { UserRole } from '@/types';
import { createClient } from '@/utils/supabase/client';

interface AppContextType {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (v: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  toggleSidebar: () => void;
  currentUserId: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [currentRole, setCurrentRole] = useState<UserRole>('member');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Hydrate from localStorage & Supabase Auth
  useEffect(() => {
    async function initAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        setCurrentUserId(session.user.id);
        // Map role from metadata or profile if needed
        const role = (session.user.user_metadata?.role as UserRole) || 'member';
        setCurrentRole(role);
      } else {
        // Fallback to localStorage for mock/dev role if no session
        const savedRole = localStorage.getItem('pc_role') as UserRole;
        if (savedRole && (savedRole === 'member' || savedRole === 'admin')) setCurrentRole(savedRole);
        const savedAuth = localStorage.getItem('pc_auth') === 'true';
        if (savedAuth) setIsAuthenticated(true);
        setCurrentUserId(currentRole === 'member' ? 'm1' : 'admin1');
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setIsAuthenticated(true);
        setCurrentUserId(session.user.id);
      } else {
        setIsAuthenticated(false);
        setCurrentUserId('');
      }
    });

    setHydrated(true);
    return () => subscription.unsubscribe();
  }, [currentRole]);

  // Persist to localStorage
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem('pc_role', currentRole);
    localStorage.setItem('pc_auth', isAuthenticated.toString());
  }, [currentRole, isAuthenticated, hydrated]);

  const toggleSidebar = useCallback(() => setSidebarOpen(p => !p), []);

  return (
    <AppContext.Provider value={{ currentRole, setCurrentRole, isAuthenticated, setIsAuthenticated, sidebarOpen, setSidebarOpen, toggleSidebar, currentUserId }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
