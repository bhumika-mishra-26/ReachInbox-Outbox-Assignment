'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, setToken, removeToken } from '@/lib/api';
import type { User } from '@/types';

const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === 'true';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    const u = await authApi.me();
    setUser(u);
  }, []);

  useEffect(() => {
    // 1. Check for ?token= in the URL (Google OAuth redirect)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      if (urlToken) {
        setToken(urlToken);
        // Clean token from URL bar without reloading the page
        params.delete('token');
        const newUrl = params.toString()
          ? `${window.location.pathname}?${params.toString()}`
          : window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }

    // 2. Fetch current user (will use saved token via axios interceptor)
    authApi.me().then((u) => {
      setUser(u);
      setIsLoading(false);
    });
  }, []);

  const login = async (email: string, password: string) => {
    const u = await authApi.login(email, password);
    // Persist mock session in localStorage so page refreshes survive
    if (IS_MOCK && typeof window !== 'undefined') {
      localStorage.setItem('mock_user', JSON.stringify(u));
    }
    setUser(u);
  };

  const logout = async () => {
    await authApi.logout();
    if (IS_MOCK && typeof window !== 'undefined') {
      localStorage.removeItem('mock_user');
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
