import { create } from 'zustand';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '../types';
import { authService } from '../services/api/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';
import { removePushToken } from '../services/pushNotificationService';
import { getAccessToken, clearTokens } from '../services/storage/tokenStorage';
import { jwtDecode } from 'jwt-decode';

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    error: string | null;
    isAuthenticated: boolean;

    // Actions
    login: (credentials: LoginRequest) => Promise<void>;
    loginWithGoogle: (jwtToken: string) => Promise<void>;
    register: (data: RegisterRequest) => Promise<void>;
    logout: () => Promise<void>;
    /** Bị gọi bởi API interceptor khi nhận 401 — không gọi API logout */
    forceLogout: () => void;
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
            const authData: AuthResponse = await authService.login(credentials);

            // Xây dựng User object từ backend AuthResponse
            // { token, id, email, fullName, role }
            const user: User = {
                id: authData.id,
                email: authData.email,
                fullName: authData.fullName,
                role: authData.role as User['role'],
            };

            set({
                user,
                token: authData.token,
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

    loginWithGoogle: async (jwtToken: string) => {
        set({ isLoading: true, error: null });
        try {
            const authData: AuthResponse = await authService.googleLoginWithToken(jwtToken);
            const user: User = {
                id: authData.id,
                email: authData.email,
                fullName: authData.fullName,
                role: authData.role as User['role'],
            };
            set({
                user,
                token: authData.token,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (error: any) {
            set({
                error: error.message || 'Đăng nhập Google thất bại',
                isLoading: false,
            });
            throw error;
        }
    },

    register: async (data) => {
        set({ isLoading: true, error: null });
        try {
            await authService.register(data);
            // Backend trả về UserResponseDTO, user cần login riêng
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
            // 2. Xóa local storage + gọi API logout
            await authService.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Dù logout API fail, vẫn xóa state local để không bị "kẹt"
            set({
                user: null,
                token: null,
                isAuthenticated: false,
                isLoading: false
            });
        }
    },

    forceLogout: () => {
        // Gọi từ API interceptor khi nhận 401 — không gọi API backend
        // Xóa token đồng bộ qua clearTokens (async nhưng fire-and-forget OK ở đây)
        clearTokens().catch(() => {});
        AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA).catch(() => {});
        set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
        });
    },

    checkAuth: async () => {
        set({ isLoading: true });
        try {
            const token = await getAccessToken();
            const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);

            if (token && userData) {
                // Kiểm tra JWT expiry để tránh khôi phục token hết hạn
                let isExpired = false;
                try {
                    const decoded: any = jwtDecode(token);
                    const exp = decoded?.exp;
                    if (exp && typeof exp === 'number') {
                        // exp là Unix timestamp (giây), cộng thêm 30s buffer
                        isExpired = Date.now() / 1000 > exp - 30;
                    }
                } catch {
                    // Nếu không decode được, coi như hết hạn để an toàn
                    isExpired = true;
                }

                if (isExpired) {
                    // Token hết hạn: xóa storage và trả về unauthenticated
                    await clearTokens();
                    await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
                    set({
                        token: null,
                        user: null,
                        isAuthenticated: false,
                        isLoading: false,
                    });
                } else {
                    set({
                        token,
                        user: JSON.parse(userData),
                        isAuthenticated: true,
                        isLoading: false,
                    });
                }
            } else {
                set({
                    token: null,
                    user: null,
                    isAuthenticated: false,
                    isLoading: false,
                });
            }
        } catch (error) {
            set({
                token: null,
                user: null,
                isAuthenticated: false,
                isLoading: false,
            });
        }
    },

    clearError: () => set({ error: null }),

    setUser: (user) => set({ user }),
}));
