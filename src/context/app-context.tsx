'use client';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { UserRole } from '@/types';

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
  const [currentRole, setCurrentRole] = useState<UserRole>('member');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    const savedRole = localStorage.getItem('pc_role') as UserRole;
    const savedAuth = localStorage.getItem('pc_auth') === 'true';
    if (savedRole && (savedRole === 'member' || savedRole === 'admin')) setCurrentRole(savedRole);
    if (savedAuth) setIsAuthenticated(true);
    setHydrated(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem('pc_role', currentRole);
    localStorage.setItem('pc_auth', isAuthenticated.toString());
  }, [currentRole, isAuthenticated, hydrated]);

  const currentUserId = currentRole === 'member' ? 'm1' : 'admin1';
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
