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
import { getAccessToken } from '../services/storage/tokenStorage';
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
        if (get().isLoading) return;
        if (!reset && !get().hasMore) return;
        const page = reset ? 0 : get().page;
        set({ isLoading: true });
        try {
            const data = await notificationService.getNotifications(page);
            const normalizedData = data.content.map((n: any) => ({
                ...n,
                isRead: Boolean(n.isRead ?? n.read ?? false),
                type: n.type,
                referenceId: n.referenceId ?? n.refId ?? n.targetId,
                data: n.data ?? n.metadata ?? {},
                route: n.route ?? n.data?.route ?? n.metadata?.route,
            }));
            
            set(state => ({
                notifications: reset
                    ? normalizedData
                    : [...state.notifications, ...normalizedData],
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
            const state = get();
            const target = state.notifications.find(n => n.id === id);
            const wasUnread = target ? !target.isRead : false;

            if (wasUnread) {
                // Optimistic update
                const newUnreadCount = Math.max(0, state.unreadCount - 1);
                set(state => ({
                    notifications: state.notifications.map(n =>
                        n.id === id ? { ...n, isRead: true } : n
                    ),
                    unreadCount: newUnreadCount,
                }));
                setBadgeCount(newUnreadCount).catch(() => {});
                
                // Gọi API background
                await notificationService.markAsRead(id);
            } else {
                // Đã đọc thì không cần gọi API (hoặc cứ gọi ngầm cũng được, tuỳ logic,
                // nhưng tránh trừ unreadCount sai)
                await notificationService.markAsRead(id);
            }
        } catch (error) {
            console.error('[NotifStore] markAsRead error:', error);
            // Nếu API lỗi, fallback về backend count để đồng bộ lại
            get().fetchUnreadCount();
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
            const normalizedCount = Math.max(0, Number(count) || 0);
            set({ unreadCount: normalizedCount });
            await setBadgeCount(normalizedCount);
        } catch {
            // Silently fail
        }
    },

    // ── Thêm notification mới vào đầu list (gọi từ WS handler) ──────────────
    addLocalNotification: (notif: Notification) => {
        set(state => {
            const exists = state.notifications.some(n => n.id === notif.id);
            if (exists) {
                return { notifications: state.notifications };
            }

            const normalizedNotif = {
                ...notif,
                isRead: Boolean(notif.isRead ?? (notif as any).read ?? false),
                type: notif.type,
                referenceId: notif.referenceId ?? (notif as any).refId ?? (notif as any).targetId,
                data: notif.data ?? (notif as any).metadata ?? {},
                route: notif.route ?? notif.data?.route ?? (notif as any).metadata?.route,
            };

            return {
                notifications: [normalizedNotif, ...state.notifications],
                unreadCount: normalizedNotif.isRead ? state.unreadCount : state.unreadCount + 1,
            };
        });
        setBadgeCount(get().unreadCount);
    },

    // ── Kết nối WebSocket STOMP ──────────────────────────────────────────────
    connectWS: async (userId: number) => {
        // Tránh tạo nhiều connection
        const existing = get()._stompClient;
        if (existing?.connected) {
            if (__DEV__) {
                console.log('[NotifWS] Đã kết nối rồi, bỏ qua.');
            }
            return;
        }

        const getToken = async (): Promise<string> => {
            const raw = await getAccessToken();
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
                    if (__DEV__) {
                        console.log(`[NotifWS] Kết nối thành công cho user ${userId}`);
                    }
                    set({ wsConnected: true });

                    // Subscribe đúng topic backend push:
                    // messagingTemplate.convertAndSendToUser(userId, "/queue/notifications", ...)
                    // → STOMP client subscribe: /user/queue/notifications
                    client.subscribe(
                        `/user/queue/notifications`,
                        (message: IMessage) => {
                            try {
                                const notif: Notification = JSON.parse(message.body);
                                if (__DEV__) {
                                    console.log('[NotifWS] Nhận notification mới:', notif.type, notif.title);
                                }
                                get().addLocalNotification(notif);
                            } catch (err) {
                                console.error('[NotifWS] Parse lỗi:', err);
                            }
                        }
                    );
                },

                onDisconnect: () => {
                    if (__DEV__) {
                        console.log('[NotifWS] Ngắt kết nối.');
                    }
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
            if (__DEV__) {
                console.log('[NotifWS] Đã deactivate STOMP client.');
            }
        }
        set({ _stompClient: null, wsConnected: false });
    },

    // ── Push notification actions (giữ nguyên) ───────────────────────────────
    initializePushNotifications: async () => {
        try {
            const token = await initializePushNotifications();
            if (token) {
                set({ pushToken: token, isNotificationsEnabled: true });
            } else {
                set({ pushToken: null, isNotificationsEnabled: false });
            }
        } catch (error) {
            console.warn('[NotifStore] Bỏ qua push notifications vì chưa đăng ký được token.');
            set({ pushToken: null, isNotificationsEnabled: false });
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
