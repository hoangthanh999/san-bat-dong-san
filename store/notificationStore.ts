import { create } from 'zustand';
import { Notification, PaginatedResponse } from '../types';
import { notificationService } from '../services/api/notifications';
import {
    initializePushNotifications,
    removePushToken,
    setBadgeCount,
} from '../services/pushNotificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;
    hasMore: boolean;
    page: number;

    // Push notification state
    pushToken: string | null;
    isNotificationsEnabled: boolean;

    fetchNotifications: (reset?: boolean) => Promise<void>;
    markAsRead: (id: number) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    fetchUnreadCount: () => Promise<void>;
    addLocalNotification: (notif: Notification) => void;

    // Push notification actions
    initializePushNotifications: () => Promise<void>;
    disableNotifications: () => Promise<void>;
    loadNotificationSettings: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    hasMore: true,
    page: 0,
    pushToken: null,
    isNotificationsEnabled: true,

    fetchNotifications: async (reset = false) => {
        if (!reset && !get().hasMore) return;
        const page = reset ? 0 : get().page;
        set({ isLoading: true });
        try {
            const data = await notificationService.getNotifications(page);
            set(state => ({
                notifications: reset ? data.content : [...state.notifications, ...data.content],
                hasMore: !data.last,
                page: data.number + 1,
                isLoading: false,
            }));
        } catch (error) {
            set({ isLoading: false });
        }
    },

    markAsRead: async (id: number) => {
        try {
            await notificationService.markAsRead(id);
            set(state => ({
                notifications: state.notifications.map(n =>
                    n.id === id ? { ...n, isRead: true } : n
                ),
                unreadCount: Math.max(0, state.unreadCount - 1),
            }));
            // Cập nhật badge
            await setBadgeCount(Math.max(0, get().unreadCount - 1));
        } catch (error) {
            console.error('Mark notification read error', error);
        }
    },

    markAllAsRead: async () => {
        try {
            await notificationService.markAllAsRead();
            set(state => ({
                notifications: state.notifications.map(n => ({ ...n, isRead: true })),
                unreadCount: 0,
            }));
            // Reset badge
            await setBadgeCount(0);
        } catch (error) {
            console.error('Mark all read error', error);
        }
    },

    fetchUnreadCount: async () => {
        try {
            const count = await notificationService.getUnreadCount();
            set({ unreadCount: count });
            // Đồng bộ badge với unread count
            await setBadgeCount(count);
        } catch (error) {
            // Silently fail
        }
    },

    // Thêm notification mới vào danh sách (khi nhận foreground)
    addLocalNotification: (notif: Notification) => {
        set(state => ({
            notifications: [notif, ...state.notifications],
            unreadCount: state.unreadCount + 1,
        }));
        setBadgeCount(get().unreadCount + 1);
    },

    // Khởi tạo push notifications (đăng ký token + lưu server)
    initializePushNotifications: async () => {
        try {
            const token = await initializePushNotifications();
            if (token) {
                set({ pushToken: token, isNotificationsEnabled: true });
            }
        } catch (error) {
            console.error('Lỗi khởi tạo push notifications:', error);
        }
    },

    // Tắt push notifications (xóa token khỏi server)
    disableNotifications: async () => {
        try {
            await removePushToken();
            set({ pushToken: null, isNotificationsEnabled: false });
        } catch (error) {
            console.error('Lỗi tắt push notifications:', error);
        }
    },

    // Load trạng thái notifications từ storage (khi khởi động)
    loadNotificationSettings: async () => {
        try {
            const [token, enabled] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN),
                AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED),
            ]);
            set({
                pushToken: token,
                isNotificationsEnabled: enabled !== 'false', // Mặc định enabled
            });
        } catch (error) {
            console.error('Lỗi load notification settings:', error);
        }
    },
}));
