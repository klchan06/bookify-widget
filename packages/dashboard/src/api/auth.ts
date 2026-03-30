import type { AuthResponse, LoginRequest, RegisterRequest, AuthUser } from '@bookify/shared';
import apiClient from './client';

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const res = await apiClient.post('/auth/login', data);
    return res.data.data;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const res = await apiClient.post('/auth/register', data);
    return res.data.data;
  },

  getMe: async (): Promise<AuthUser> => {
    const res = await apiClient.get('/auth/me');
    return res.data.data;
  },
};
