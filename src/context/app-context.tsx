'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';
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
  const [currentRole, setCurrentRole] = useState<UserRole>('seeker');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const currentUserId = currentRole === 'seeker' ? 'js1' : currentRole === 'employee' ? 'emp1' : 'admin1';

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
