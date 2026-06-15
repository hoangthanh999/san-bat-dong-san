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
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getNotificationWebSocketUrl } from '../services/api/environment';




interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;
    hasMore: boolean;
    page: number;

    // Push notification state
    pushToken: string | null;
    isNotificationsEnabled: boolean;

    // WebSocket state
    wsConnected: boolean;
    _stompClient: Client | null;   // internal — không expose ra UI

    fetchNotifications: (reset?: boolean) => Promise<void>;
    markAsRead: (id: number) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    fetchUnreadCount: () => Promise<void>;
    addLocalNotification: (notif: Notification) => void;

    // Push notification actions
    initializePushNotifications: () => Promise<void>;
    disableNotifications: () => Promise<void>;
    loadNotificationSettings: () => Promise<void>;

    // WebSocket actions
    connectWS: (userId: number) => void;
    disconnectWS: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    hasMore: true,
    page: 0,
    pushToken: null,
    isNotificationsEnabled: true,
    wsConnected: false,
    _stompClient: null,

    // ── Fetch danh sách notifications ────────────────────────────────────────
    fetchNotifications: async (reset = false) => {
        if (!reset && !get().hasMore) return;
        const page = reset ? 0 : get().page;
        set({ isLoading: true });
        try {
            const data = await notificationService.getNotifications(page);
            set(state => ({
                notifications: reset
                    ? data.content
                    : [...state.notifications, ...data.content],
                hasMore: !data.last,
                page: data.number + 1,
                isLoading: false,
            }));
        } catch {
            set({ isLoading: false });
        }
    },

    // ── Mark as read ─────────────────────────────────────────────────────────
    markAsRead: async (id: number) => {
        try {
            await notificationService.markAsRead(id);
            set(state => ({
                notifications: state.notifications.map(n =>
                    n.id === id ? { ...n, isRead: true } : n
                ),
                unreadCount: Math.max(0, state.unreadCount - 1),
            }));
            await setBadgeCount(Math.max(0, get().unreadCount));
        } catch (error) {
            console.error('[NotifStore] markAsRead error:', error);
        }
    },

    // ── Mark all as read ─────────────────────────────────────────────────────
    markAllAsRead: async () => {
        try {
            await notificationService.markAllAsRead();
            set(state => ({
                notifications: state.notifications.map(n => ({ ...n, isRead: true })),
                unreadCount: 0,
            }));
            await setBadgeCount(0);
        } catch (error) {
            console.error('[NotifStore] markAllAsRead error:', error);
        }
    },

    // ── Fetch unread count ───────────────────────────────────────────────────
    fetchUnreadCount: async () => {
        try {
            const count = await notificationService.getUnreadCount();
            set({ unreadCount: count });
            await setBadgeCount(count);
        } catch {
            // Silently fail
        }
    },

    // ── Thêm notification mới vào đầu list (gọi từ WS handler) ──────────────
    addLocalNotification: (notif: Notification) => {
        set(state => ({
            // Tránh duplicate nếu cùng id đã tồn tại
            notifications: state.notifications.some(n => n.id === notif.id)
                ? state.notifications
                : [notif, ...state.notifications],
            unreadCount: state.unreadCount + 1,
        }));
        setBadgeCount(get().unreadCount);
    },

    // ── Kết nối WebSocket STOMP ──────────────────────────────────────────────
    connectWS: async (userId: number) => {
        // Tránh tạo nhiều connection
        const existing = get()._stompClient;
        if (existing?.connected) {
            console.log('[NotifWS] Đã kết nối rồi, bỏ qua.');
            return;
        }

        const getToken = async (): Promise<string> => {
            const raw = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
            return raw ?? '';
        };

        const createClient = (token: string, wsUrl: string): Client => {
            const client = new Client({
                // SockJS factory — STOMP over SockJS
                webSocketFactory: () => new SockJS(wsUrl) as any,

                // Gửi JWT để backend UserPresenceChannelInterceptor xác thực
                connectHeaders: {
                    Authorization: `Bearer ${token}`,
                },

                reconnectDelay: 5000,       // Tự reconnect sau 5s nếu mất kết nối
                heartbeatIncoming: 4000,
                heartbeatOutgoing: 4000,

                onConnect: () => {
                    console.log(`[NotifWS] Kết nối thành công cho user ${userId}`);
                    set({ wsConnected: true });

                    // Subscribe đúng topic backend push:
                    // messagingTemplate.convertAndSendToUser(userId, "/queue/notifications", ...)
                    // → STOMP client subscribe: /user/queue/notifications
                    client.subscribe(
                        `/user/queue/notifications`,
                        (message: IMessage) => {
                            try {
                                const notif: Notification = JSON.parse(message.body);
                                console.log('[NotifWS] Nhận notification mới:', notif.type, notif.title);
                                get().addLocalNotification(notif);
                            } catch (err) {
                                console.error('[NotifWS] Parse lỗi:', err);
                            }
                        }
                    );
                },

                onDisconnect: () => {
                    console.log('[NotifWS] Ngắt kết nối.');
                    set({ wsConnected: false });
                },

                onStompError: (frame) => {
                    console.error('[NotifWS] STOMP error:', frame.headers?.message);
                    set({ wsConnected: false });
                },

                onWebSocketError: (event) => {
                    console.error('[NotifWS] WebSocket error:', event);
                    set({ wsConnected: false });
                },
            });

            return client;
        };

        try {
            const [token, wsUrl] = await Promise.all([
                getToken(),
                getNotificationWebSocketUrl(),
            ]);

            if (!token) {
                console.warn('[NotifWS] Không có token, bỏ qua kết nối WS.');
                return;
            }

            const client = createClient(token, wsUrl);
            client.activate();
            set({ _stompClient: client });
        } catch (error) {
            console.error('[NotifWS] Không thể khởi tạo kết nối WS:', error);
        }
    },

    // ── Ngắt kết nối WebSocket ───────────────────────────────────────────────
    disconnectWS: () => {
        const client = get()._stompClient;
        if (client) {
            client.deactivate();
            console.log('[NotifWS] Đã deactivate STOMP client.');
        }
        set({ _stompClient: null, wsConnected: false });
    },

    // ── Push notification actions (giữ nguyên) ───────────────────────────────
    initializePushNotifications: async () => {
        try {
            const token = await initializePushNotifications();
            if (token) {
                set({ pushToken: token, isNotificationsEnabled: true });
            }
        } catch (error) {
            console.error('[NotifStore] Lỗi khởi tạo push notifications:', error);
        }
    },

    disableNotifications: async () => {
        try {
            await removePushToken();
            set({ pushToken: null, isNotificationsEnabled: false });
        } catch (error) {
            console.error('[NotifStore] Lỗi tắt push notifications:', error);
        }
    },

    loadNotificationSettings: async () => {
        try {
            const [token, enabled] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN),
                AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED),
            ]);
            set({
                pushToken: token,
                isNotificationsEnabled: enabled !== 'false',
            });
        } catch (error) {
            console.error('[NotifStore] Lỗi load notification settings:', error);
        }
    },
}));
