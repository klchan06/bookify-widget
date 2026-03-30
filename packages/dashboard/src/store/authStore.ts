import { create } from 'zustand';
import type { AuthUser } from '@bookify/shared';
import { authApi } from '../api/auth';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    salonName: string;
    ownerName: string;
    email: string;
    password: string;
    phone: string;
  }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('bookify_token'),
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const response = await authApi.login({ email, password });
    localStorage.setItem('bookify_token', response.token);
    set({ token: response.token, user: response.user, isAuthenticated: true });
  },

  register: async (data) => {
    const response = await authApi.register(data);
    localStorage.setItem('bookify_token', response.token);
    set({ token: response.token, user: response.user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('bookify_token');
    set({ token: null, user: null, isAuthenticated: false });
  },

  refreshUser: async () => {
    try {
      const user = await authApi.getMe();
      set({ user, isAuthenticated: true });
    } catch {
      get().logout();
    }
  },

  initialize: async () => {
    const token = localStorage.getItem('bookify_token');
    if (token) {
      try {
        const user = await authApi.getMe();
        set({ token, user, isAuthenticated: true, isLoading: false });
      } catch {
        localStorage.removeItem('bookify_token');
        set({ token: null, user: null, isAuthenticated: false, isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },
}));
