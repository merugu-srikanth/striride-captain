import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthUser {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  setToken: (token: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,

  setToken: async (token, user) => {
    await SecureStore.setItemAsync('captain_token', token);
    await SecureStore.setItemAsync('captain_user', JSON.stringify(user));
    set({ token, user });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('captain_token');
    await SecureStore.deleteItemAsync('captain_user');
    set({ token: null, user: null });
  },

  checkAuthStatus: async () => {
    try {
      const [token, userStr] = await Promise.all([
        SecureStore.getItemAsync('captain_token'),
        SecureStore.getItemAsync('captain_user'),
      ]);
      const user = userStr ? JSON.parse(userStr) : null;
      set({ token, user, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
