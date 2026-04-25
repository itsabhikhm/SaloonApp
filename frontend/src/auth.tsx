import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

export type User = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role: 'user' | 'admin';
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  register: (name: string, phone: string, password: string, email?: string) => Promise<User>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        try {
          const { data } = await api.get('/auth/me');
          setUser(data);
        } catch {
          await AsyncStorage.removeItem('token');
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = async (identifier: string, password: string) => {
    const { data } = await api.post('/auth/login', { identifier, password });
    await AsyncStorage.setItem('token', data.token);
    setUser(data.user);
    return data.user as User;
  };

  const register = async (name: string, phone: string, password: string, email?: string) => {
    const { data } = await api.post('/auth/register', { name, phone, password, email: email || undefined });
    await AsyncStorage.setItem('token', data.token);
    setUser(data.user);
    return data.user as User;
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside provider');
  return v;
};
