import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { User } from '../types';
import { authApi } from '../services';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('froidpom_user');
    if (!raw || raw === 'undefined') return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getStoredToken(): string | null {
  try {
    return localStorage.getItem('froidpom_token') || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getStoredUser);
  const [token, setToken] = useState<string | null>(getStoredToken);

  const login = useCallback(async (username: string, password: string) => {
    const { data } = await authApi.login(username, password);
    console.log('Login response:', data); // debug
    if (!data.access_token) throw new Error('Token manquant');
    localStorage.setItem('froidpom_token', data.access_token);
    localStorage.setItem('froidpom_user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('froidpom_token');
    localStorage.removeItem('froidpom_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user && !!token,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}