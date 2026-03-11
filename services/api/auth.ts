import apiClient from './client';
import { API_ENDPOINTS } from '../../constants';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../constants';

export const authService = {
    // Register
    register: async (data: RegisterRequest): Promise<User> => {
        const response = await apiClient.post<User>(API_ENDPOINTS.REGISTER, data);
        return response.data;
    },

    // Login
    login: async (credentials: LoginRequest): Promise<AuthResponse> => {
        const response = await apiClient.post<AuthResponse>(API_ENDPOINTS.LOGIN, credentials);

        // Store token and user data
        if (response.data.token) {
            await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.data.token);
            await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(response.data.user));
        }

        return response.data;
    },

    // Logout
    logout: async (): Promise<void> => {
        await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
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
    forgotPassword: async (email: string): Promise<{ message: string }> => {
        const response = await apiClient.post<{ message: string }>(
            API_ENDPOINTS.FORGOT_PASSWORD,
            { email }
        );
        return response.data;
    },

    // Reset Password
    resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
        const response = await apiClient.post<{ message: string }>(
            API_ENDPOINTS.RESET_PASSWORD,
            { token, newPassword }
        );
        return response.data;
    },
};
