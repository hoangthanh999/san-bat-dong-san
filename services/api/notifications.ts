import apiClient from './client';
import { API_ENDPOINTS } from '../../constants';
import { Notification, PaginatedResponse, PushTokenRequest } from '../../types';
import { Platform } from 'react-native';

export const notificationService = {
    getNotifications: async (page = 0, size = 20): Promise<PaginatedResponse<Notification>> => {
        const response = await apiClient.get<PaginatedResponse<Notification>>(API_ENDPOINTS.NOTIFICATIONS, {
            params: { page, size },
        });
        return response.data;
    },

    markAsRead: async (id: number): Promise<void> => {
        await apiClient.put(API_ENDPOINTS.NOTIFICATION_READ(id));
    },

    markAllAsRead: async (): Promise<void> => {
        await apiClient.put(API_ENDPOINTS.NOTIFICATION_READ_ALL);
    },

    getUnreadCount: async (): Promise<number> => {
        const response = await apiClient.get<{ count: number }>(API_ENDPOINTS.NOTIFICATION_UNREAD_COUNT);
        return response.data.count;
    },

    // Push Token management
    savePushToken: async (token: string): Promise<void> => {
        const payload: PushTokenRequest = {
            token,
            platform: Platform.OS as 'ios' | 'android',
        };
        await apiClient.post(API_ENDPOINTS.PUSH_TOKEN, payload);
    },

    deletePushToken: async (token: string): Promise<void> => {
        await apiClient.delete(API_ENDPOINTS.PUSH_TOKEN, {
            data: { token },
        });
    },
};
