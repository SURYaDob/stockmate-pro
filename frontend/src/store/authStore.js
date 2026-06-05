import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../utils/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      loading: false,
      category: null,

      setCategory: (category) => set({ category }),

      login: async (email, password) => {
        set({ loading: true });
        try {
          const res = await api.post('/auth/login', { email, password });
          const { user, accessToken, refreshToken } = res.data.data;
          set({
            user,
            token: accessToken,
            refreshToken,
            isAuthenticated: true,
            loading: false,
          });
          return { success: true };
        } catch (err) {
          set({ loading: false });
          return {
            success: false,
            message: err.response?.data?.message || 'Login failed',
          };
        }
      },

      register: async (data) => {
        set({ loading: true });
        try {
          const res = await api.post('/auth/register', data);
          const { user, accessToken, refreshToken } = res.data.data;
          set({
            user,
            token: accessToken,
            refreshToken,
            isAuthenticated: true,
            loading: false,
          });
          return { success: true };
        } catch (err) {
          set({ loading: false });
          return {
            success: false,
            message: err.response?.data?.message || 'Registration failed',
          };
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch (e) {
          // ignore
        }
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        });
        localStorage.removeItem('auth-storage');
      },

      refreshAuth: async () => {
        const { refreshToken: rt } = get();
        if (!rt) return false;
        try {
          const res = await api.post('/auth/refresh-token', { refreshToken: rt });
          set({ token: res.data.data.accessToken, refreshToken: res.data.data.refreshToken });
          return true;
        } catch (e) {
          get().logout();
          return false;
        }
      },

      fetchUser: async () => {
        try {
          const res = await api.get('/auth/me');
          set({ user: res.data.data });
        } catch (e) {
          // ignore
        }
      },

      updateProfile: async (data) => {
        const res = await api.put('/auth/profile', data);
        set((state) => ({ user: { ...state.user, ...res.data.data } }));
        return res.data;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        category: state.category,
      }),
    }
  )
);

export { useAuthStore };
