import { create } from 'zustand';
import { User, LoginRequest, RegisterRequest } from '../types';
import { authService } from '../services/api/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';
import { removePushToken } from '../services/pushNotificationService';

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    error: string | null;
    isAuthenticated: boolean;

    // Actions
    login: (credentials: LoginRequest) => Promise<void>;
    register: (data: RegisterRequest) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
    clearError: () => void;
    setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    token: null,
    isLoading: true,
    error: null,
    isAuthenticated: false,

    login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
            const response = await authService.login(credentials);
            set({
                user: response.user,
                token: response.token,
                isAuthenticated: true,
                isLoading: false
            });
        } catch (error: any) {
            set({
                error: error.message || 'Đăng nhập thất bại',
                isLoading: false
            });
            throw error;
        }
    },

    register: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const user = await authService.register(data);
            // Automatically login after successful registration? Or prompt to login?
            // Assuming registration returns user data but token needs login or is usually provided
            // If backend returns token on register, update accordingly.
            // Usually backend returns user only, so user needs to login.

            set({ isLoading: false });
            return;
        } catch (error: any) {
            set({
                error: error.message || 'Đăng ký thất bại',
                isLoading: false
            });
            throw error;
        }
    },

    logout: async () => {
        set({ isLoading: true });
        try {
            // 1. Xóa push token khỏi server trước khi logout
            await removePushToken();
            // 2. Logout khỏi backend
            await authService.logout();
            set({
                user: null,
                token: null,
                isAuthenticated: false,
                isLoading: false
            });
        } catch (error) {
            set({ isLoading: false });
            console.error('Logout error:', error);
        }
    },

    checkAuth: async () => {
        set({ isLoading: true });
        try {
            const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
            const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);

            if (token && userData) {
                set({
                    token,
                    user: JSON.parse(userData),
                    isAuthenticated: true,
                    isLoading: false
                });
            } else {
                set({
                    token: null,
                    user: null,
                    isAuthenticated: false,
                    isLoading: false
                });
            }
        } catch (error) {
            set({
                token: null,
                user: null,
                isAuthenticated: false,
                isLoading: false
            });
        }
    },

    clearError: () => set({ error: null }),

    setUser: (user) => set({ user }),
}));
