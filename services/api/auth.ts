import apiClient from './client';
import { API_ENDPOINTS } from '../../constants';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../constants';
import { jwtDecode } from 'jwt-decode';

export const authService = {
    // Register - trả về UserResponseDTO (đã unwrap result)
    register: async (data: RegisterRequest): Promise<User> => {
        const response = await apiClient.post(API_ENDPOINTS.REGISTER, data);
        // Backend trả về UserResponseDTO (unwrapped by interceptor)
        return response.data;
    },

    // Login - trả về AuthResponse { token, id, email, fullName, role }
    login: async (credentials: LoginRequest): Promise<AuthResponse> => {
        const response = await apiClient.post(API_ENDPOINTS.LOGIN, credentials);

        // response.data đã được unwrap = { token, id, email, fullName, role }
        const authData: AuthResponse = response.data;


        if (authData.token) {
            // Lưu token

            await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authData.token);
            // Xây dựng User object từ auth response
            const user: User = {
                id: authData.id,
                email: authData.email,
                fullName: authData.fullName,
                role: authData.role as User['role'],
            };
            await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
        }

        return authData;
    },

    // Logout - gọi backend blacklist token rồi xóa local storage
    logout: async (): Promise<void> => {
        try {
            // Gọi backend để blacklist token hiện tại
            await apiClient.post('/auth/logout');
        } catch (error) {
            // Vẫn xóa local dù API lỗi (token có thể đã hết hạn)
            console.warn('[Auth] Logout API failed, clearing local storage anyway');
        }
        await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
    },

    // Get current user from storage
    getCurrentUser: async (): Promise<User | null> => {
        try {
            const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('[Auth] Error getting current user:', error);
            return null;
        }
    },

    // Check if user is authenticated
    isAuthenticated: async (): Promise<boolean> => {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        return !!token;
    },

    // Forgot Password
    forgotPassword: async (email: string): Promise<string> => {
        const response = await apiClient.post(API_ENDPOINTS.FORGOT_PASSWORD, { email });
        return response.data; // unwrapped string
    },

    // Reset Password
    resetPassword: async (token: string, newPassword: string): Promise<string> => {
        const response = await apiClient.post(API_ENDPOINTS.RESET_PASSWORD, { token, newPassword });
        return response.data; // unwrapped string
    },

    // Google OAuth2 — lưu token nhận từ deep link callback sau khi Google Login
    googleLoginWithToken: async (jwtToken: string): Promise<AuthResponse> => {
        try {
            // Decode JWT để lấy userId, role
            const decoded: any = jwtDecode(jwtToken);
            const userId = decoded.userId || decoded.sub || '';
            const role = decoded.role || 'USER';

            // Gọi backend để lấy thông tin user đầy đủ
            await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, jwtToken);

            // Lấy user info từ customer-service
            let fullName = decoded.fullName || decoded.name || '';
            let email = decoded.email || decoded.sub || '';

            try {
                const profileRes = await apiClient.get('/customers/profile');
                const profile = profileRes.data;
                fullName = profile.fullName || fullName;
                email = profile.email || email;
            } catch {
                console.warn('[Auth] Could not fetch profile after Google login');
            }

            const authData: AuthResponse = {
                token: jwtToken,
                id: userId,
                email,
                fullName,
                role,
            };

            const user: User = {
                id: authData.id,
                email: authData.email,
                fullName: authData.fullName,
                role: authData.role as User['role'],
            };
            await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));

            return authData;
        } catch (error) {
            console.error('[Auth] googleLoginWithToken error:', error);
            throw error;
        }
    },

    // Change Password (yêu cầu JWT)
    changePassword: async (oldPassword: string, newPassword: string): Promise<string> => {
        const response = await apiClient.post(API_ENDPOINTS.CHANGE_PASSWORD, {
            oldPassword,
            newPassword,
        });
        return response.data;
    },

    // Change Email (yêu cầu JWT + mật khẩu xác nhận)
    changeEmail: async (password: string, newEmail: string): Promise<string> => {
        const response = await apiClient.put(API_ENDPOINTS.CHANGE_EMAIL, { password, newEmail });
        return response.data;
    },

    // Refresh Token — gọi khi token sắp hết hạn
    refreshToken: async (): Promise<AuthResponse | null> => {
        try {
            const response = await apiClient.post('/auth/refresh');
            const authData: AuthResponse = response.data;
            if (authData.token) {
                await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authData.token);
            }
            return authData;
        } catch (error) {
            console.warn('[Auth] Refresh token failed');
            return null;
        }
    },
};
