'use client';
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

  // Initial Hydration & Auth Setup
  useEffect(() => {
    async function initAuth() {
      // 1. First, check if we have a real Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setIsAuthenticated(true);
        setCurrentUserId(session.user.id);
        const role = (session.user.user_metadata?.role as UserRole) || 'member';
        setCurrentRole(role);
      } else {
        // 2. Fallback to localStorage for mock/dev role ONLY if not already authenticated via demo
        const savedAuth = localStorage.getItem('pc_auth') === 'true';
        if (savedAuth) {
          setIsAuthenticated(true);
          const savedRole = localStorage.getItem('pc_role') as UserRole;
          if (savedRole && (savedRole === 'member' || savedRole === 'admin')) {
            setCurrentRole(savedRole);
          }
        }
      }
      setHydrated(true);
    }

    initAuth();

    // Listen for auth changes (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setIsAuthenticated(true);
        setCurrentUserId(session.user.id);
        const role = (session.user.user_metadata?.role as UserRole) || 'member';
        setCurrentRole(role);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setCurrentUserId('');
        setCurrentRole('member');
      }
    });

    return () => subscription.unsubscribe();
  }, []); // Run ONLY once on mount

  // Sync state to localStorage (Separate from Auth check)
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem('pc_role', currentRole);
    localStorage.setItem('pc_auth', isAuthenticated.toString());
    
    // Update mock ID based on role if no real user
    if (!currentUserId && isAuthenticated) {
      setCurrentUserId(currentRole === 'admin' ? 'admin1' : 'm1');
    }
  }, [currentRole, isAuthenticated, hydrated, currentUserId]);

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
