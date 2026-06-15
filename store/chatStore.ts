import { create } from 'zustand';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Conversation, ChatMessage } from '../types';
import { chatService } from '../services/api/chat';
import { userService } from '../services/api/user';
import { getChatWebSocketUrl } from '../services/api/environment';
import { useAuthStore } from './authStore';

interface ChatState {
    conversations: Conversation[];
    messages: Record<number, ChatMessage[]>;
    isLoading: boolean;
    isConnected: boolean;
    totalUnread: number;
    /** Cache avatar URL theo partnerId để tránh gọi summary lặp lại */
    avatarCache: Record<number, string>;
    _stompClient: Client | null;

    fetchConversations: () => Promise<void>;
    fetchHistory: (partnerId: number) => Promise<void>;
    sendMessage: (partnerId: number, content: string, type?: string, metadata?: any) => Promise<void>;
    receiveMessage: (message: ChatMessage) => void;
    markAsRead: (partnerId: number) => Promise<void>;
    connectWebSocket: () => void;
    disconnectWebSocket: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
    conversations: [],
    messages: {},
    isLoading: false,
    isConnected: false,
    totalUnread: 0,
    avatarCache: {},
    _stompClient: null,

    fetchConversations: async () => {
        set({ isLoading: true });
        try {
            const conversations = await chatService.getConversations();

            // Enrich avatar cho conversation thiếu avatar (giống web ChatPage.jsx)
            // Chỉ gọi summary cho conv thiếu avatar, Promise.all song song, cache kết quả
            const enriched = await Promise.all(
                conversations.map(async (conv) => {
                    // Đã có avatar → giữ nguyên, không gọi thêm
                    if (conv.avatar) return conv;

                    const partnerId = conv.id;
                    if (!partnerId || isNaN(partnerId)) return conv;

                    // Tra cache trước để tránh gọi lặp khi refresh
                    const cached = get().avatarCache[partnerId];
                    if (cached) return { ...conv, avatar: cached };

                    // Gọi /customers/{partnerId}/summary (public, không cần JWT)
                    try {
                        const summary = await userService.getUserSummary(partnerId);
                        if (summary.avatarUrl) {
                            // Lưu cache theo partnerId
                            set(state => ({
                                avatarCache: { ...state.avatarCache, [partnerId]: summary.avatarUrl! },
                            }));
                            return { ...conv, avatar: summary.avatarUrl };
                        }
                    } catch {
                        // Fail silent — nếu summary fail thì giữ nguyên conv, không crash chat
                    }
                    return conv;
                })
            );

            const totalUnread = enriched.reduce((sum, c) => sum + c.unreadCount, 0);
            set({ conversations: enriched, totalUnread, isLoading: false });
        } catch (error) {
            set({ isLoading: false });
        }
    },

    fetchHistory: async (partnerId: number) => {
        if (!partnerId || isNaN(partnerId)) {
            console.warn('[Chat] fetchHistory: partnerId khong hop le', partnerId);
            return;
        }

        set({ isLoading: true });
        try {
            const history = await chatService.getHistory(partnerId);
            set(state => ({
                messages: { ...state.messages, [partnerId]: history.reverse() },
                isLoading: false,
            }));
        } catch (error) {
            set({ isLoading: false });
        }
    },

    sendMessage: async (partnerId: number, content: string, type = 'TEXT', metadata?: any) => {
        const { user } = useAuthStore.getState();
        if (!user) return;

        const tempMessage: ChatMessage = {
            id: `temp-${Date.now()}`,
            senderId: user.id,
            receiverId: partnerId,
            content,
            type: type as any,
            metadata,
            isRead: false,
            createdAt: new Date().toISOString(),
        };

        set(state => ({
            messages: {
                ...state.messages,
                [partnerId]: [...(state.messages[partnerId] || []), tempMessage],
            },
        }));

        try {
            const sent = await chatService.sendMessage(user.id, partnerId, content, type);
            set(state => ({
                messages: {
                    ...state.messages,
                    [partnerId]: (state.messages[partnerId] || []).map(m =>
                        m.id === tempMessage.id ? sent : m
                    ),
                },
            }));
            set(state => ({
                conversations: state.conversations.map(c =>
                    c.id === partnerId
                        ? { ...c, lastMessage: content, lastTime: sent.createdAt }
                        : c
                ),
            }));
        } catch (error) {
            set(state => ({
                messages: {
                    ...state.messages,
                    [partnerId]: (state.messages[partnerId] || []).filter(m => m.id !== tempMessage.id),
                },
            }));
        }
    },

    receiveMessage: (message: ChatMessage) => {
        const partnerId = message.senderId;

        set(state => {
            const currentMessages = state.messages[partnerId] || [];
            const alreadyExists = Boolean(message.id) && currentMessages.some(m => m.id === message.id);

            return {
                messages: {
                    ...state.messages,
                    [partnerId]: alreadyExists ? currentMessages : [...currentMessages, message],
                },
                conversations: state.conversations.map(c =>
                    c.id === partnerId
                        ? {
                            ...c,
                            lastMessage: message.content,
                            lastTime: message.createdAt,
                            unreadCount: c.unreadCount + 1,
                        }
                        : c
                ),
                totalUnread: alreadyExists ? state.totalUnread : state.totalUnread + 1,
            };
        });
    },

    markAsRead: async (partnerId: number) => {
        if (!partnerId || isNaN(partnerId)) return;
        try {
            await chatService.markAsRead(partnerId);
            set(state => {
                const conv = state.conversations.find(c => c.id === partnerId);
                const prevUnread = conv?.unreadCount || 0;
                return {
                    conversations: state.conversations.map(c =>
                        c.id === partnerId ? { ...c, unreadCount: 0 } : c
                    ),
                    totalUnread: Math.max(0, state.totalUnread - prevUnread),
                };
            });
        } catch (error) {
            console.error('Mark as read error', error);
        }
    },

    connectWebSocket: async () => {
        const { token, user } = useAuthStore.getState();
        if (!token || !user?.id) return;

        const existingClient = get()._stompClient;
        if (existingClient?.active) return;

        const handleMessage = (message: IMessage) => {
            try {
                const chatMessage: ChatMessage = JSON.parse(message.body);

                if (chatMessage.senderId === user.id) {
                    return;
                }

                get().receiveMessage(chatMessage);
            } catch (error) {
                console.error('[ChatWS] Parse error', error);
            }
        };

        const wsUrl = await getChatWebSocketUrl();

        const client = new Client({
            webSocketFactory: () => new (SockJS as any)(wsUrl),
            connectHeaders: {
                Authorization: `Bearer ${token}`,
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,

            onConnect: () => {
                set({ isConnected: true });
                client.subscribe('/user/queue/messages', handleMessage);
                client.subscribe(`/topic/user/${user.id}`, handleMessage);
            },

            onDisconnect: () => {
                set({ isConnected: false });
            },

            onStompError: (frame) => {
                console.error('[ChatWS] STOMP error:', frame.headers?.message);
                set({ isConnected: false });
            },

            onWebSocketClose: () => {
                set({ isConnected: false });
            },

            onWebSocketError: (event) => {
                console.error('[ChatWS] WebSocket error:', event);
                set({ isConnected: false });
            },
        });

        client.activate();
        set({ _stompClient: client });
    },

    disconnectWebSocket: () => {
        const client = get()._stompClient;
        if (client) {
            client.deactivate();
        }
        set({ _stompClient: null, isConnected: false });
    },
}));
