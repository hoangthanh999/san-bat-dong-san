import apiClient from './client';
import { API_ENDPOINTS } from '../../constants';
import { Notification, PaginatedResponse, PushTokenRequest } from '../../types';
import { Platform } from 'react-native';

export const notificationService = {
    // Lấy tất cả thông báo (phân trang)
    // Backend default: size=10. Frontend gửi size=10 để đồng bộ.
    getNotifications: async (page = 0, size = 10): Promise<PaginatedResponse<Notification>> => {
        const response = await apiClient.get<PaginatedResponse<Notification>>(
            API_ENDPOINTS.NOTIFICATIONS,
            { params: { page, size } }
        );
        return response.data; // đã unwrap result
    },

    // Lấy thông báo chưa đọc
    getUnreadNotifications: async (page = 0, size = 10): Promise<PaginatedResponse<Notification>> => {
        const response = await apiClient.get<PaginatedResponse<Notification>>(
            API_ENDPOINTS.NOTIFICATIONS_UNREAD,
            { params: { page, size } }
        );
        return response.data;
    },

    // Đánh dấu 1 thông báo đã đọc
    markAsRead: async (id: number): Promise<void> => {
        await apiClient.put(API_ENDPOINTS.NOTIFICATION_READ(id));
    },

    // Đánh dấu tất cả đã đọc
    markAllAsRead: async (): Promise<void> => {
        await apiClient.put(API_ENDPOINTS.NOTIFICATION_READ_ALL);
    },

    // Lấy số thông báo chưa đọc
    // Backend trả về ApiResponse<Long> → unwrap = number
    getUnreadCount: async (): Promise<number> => {
        const response = await apiClient.get<number>(API_ENDPOINTS.NOTIFICATION_UNREAD_COUNT);
        return response.data; // đã unwrap result → trả về Long/number trực tiếp
    },

    // === Push Token management (chưa có backend endpoint) ===

    savePushToken: async (token: string): Promise<void> => {
        // TODO: Backend chưa có push token endpoint
        console.warn('[notificationService] savePushToken: API chưa có trong backend');
    },

    deletePushToken: async (token: string): Promise<void> => {
        // TODO: Backend chưa có push token endpoint
        console.warn('[notificationService] deletePushToken: API chưa có trong backend');
    },
};
