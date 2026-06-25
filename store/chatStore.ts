import { create } from 'zustand';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Conversation, ChatMessage } from '../types';
import { chatService } from '../services/api/chat';
import { getUserSummarySilent } from '../services/api/user';
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
    _isConnecting: boolean;

    fetchConversations: () => Promise<void>;
    fetchHistory: (partnerId: number) => Promise<void>;
    sendMessage: (partnerId: number, content: string, type?: string, metadata?: any) => Promise<void>;
    receiveMessage: (message: ChatMessage) => void;
    markAsRead: (partnerId: number) => Promise<void>;
    connectWebSocket: () => Promise<void>;
    disconnectWebSocket: () => void;
    subscribeAiResponse: (handler: (message: IMessage) => void) => Promise<() => void>;
    publishAiMessage: (body: unknown) => Promise<void>;
}

function getMessageTime(message: ChatMessage): number {
    const value = (message as any).createdAt ?? (message as any).sentAt ?? (message as any).timestamp ?? 0;
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
}

function sortMessagesAsc(messages: ChatMessage[]): ChatMessage[] {
    return [...messages].sort((a, b) => getMessageTime(a) - getMessageTime(b));
}

function waitForConnected(getState: () => ChatState, timeoutMs = 10000): Promise<Client> {
    return new Promise((resolve, reject) => {
        const startedAt = Date.now();
        const timer = setInterval(() => {
            const client = getState()._stompClient;
            if (client?.connected) {
                clearInterval(timer);
                resolve(client);
                return;
            }

            if (Date.now() - startedAt >= timeoutMs) {
                clearInterval(timer);
                reject(new Error('Khong the ket noi WebSocket chat'));
            }
        }, 100);
    });
}

export const useChatStore = create<ChatState>((set, get) => ({
    conversations: [],
    messages: {},
    isLoading: false,
    isConnected: false,
    _isConnecting: false,
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

                    // Gọi summary an toàn — không throw, không log đỏ, cache per-user
                    const summary = await getUserSummarySilent(partnerId);
                    if (summary) {
                        if (summary.avatarUrl) {
                            set(state => ({
                                avatarCache: { ...state.avatarCache, [partnerId]: summary.avatarUrl! },
                            }));
                        }
                        return {
                            ...conv,
                            avatar: summary.avatarUrl || conv.avatar,
                            fullName: summary.fullName?.trim() || conv.fullName || `Người dùng #${partnerId}`,
                        };
                    }
                    // Summary null (fail) → giữ conv nguyên, fallback tên nếu thiếu
                    return {
                        ...conv,
                        fullName: conv.fullName || `Người dùng #${partnerId}`,
                    };
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
                messages: { ...state.messages, [partnerId]: sortMessagesAsc(history) },
                isLoading: false,
            }));
        } catch (error) {
            set({ isLoading: false });
        }
    },

    sendMessage: async (partnerId: number, content: string, type = 'TEXT', metadata?: any) => {
        const { user } = useAuthStore.getState();
        if (!user) return;
           // ✅ Chặn tự nhắn cho mình
   if (user.id === partnerId) {
        throw new Error('SELF_CHAT');
    }

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
                [partnerId]: sortMessagesAsc([...(state.messages[partnerId] || []), tempMessage]),
            },
        }));

        try {
            const sent = await chatService.sendMessage(user.id, partnerId, content, type);
            set(state => ({
                messages: {
                    ...state.messages,
                    [partnerId]: sortMessagesAsc((state.messages[partnerId] || []).map(m =>
                        m.id === tempMessage.id ? sent : m
                    )),
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
                    [partnerId]: alreadyExists ? currentMessages : sortMessagesAsc([...currentMessages, message]),
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

    // ✅ Chặn double-connect
    if (get()._isConnecting || get()._stompClient?.connected) return;
    set({ _isConnecting: true });

    // ✅ Deactivate client cũ nếu còn treo
    const existingClient = get()._stompClient;
    if (existingClient) {
        existingClient.deactivate();
        set({ _stompClient: null, isConnected: false });
    }

    const wsUrl = await getChatWebSocketUrl();

    const handleMessage = (message: IMessage) => {
        try {
            const chatMessage: ChatMessage = JSON.parse(message.body);
            if (chatMessage.senderId === user.id) return;
            get().receiveMessage(chatMessage);
        } catch (error) {
            console.error('[ChatWS] Parse error', error);
        }
    };

    const client = new Client({
        webSocketFactory: () => new (SockJS as any)(wsUrl),
        connectHeaders: { Authorization: `Bearer ${token}` },
        reconnectDelay: 0,        // ✅ tắt auto-reconnect → không loop
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,

        onConnect: () => {
            set({ isConnected: true, _isConnecting: false }); // ✅
            client.subscribe('/user/queue/messages', handleMessage);
            client.subscribe(`/topic/user/${user.id}`, handleMessage);
        },

        onDisconnect: () => {
            set({ isConnected: false, _isConnecting: false });
        },

        onStompError: (frame) => {
            if (__DEV__) {
                console.warn('[ChatWS] broker error:', {
                    message: frame.headers?.message,
                    body: frame.body,
                });
            } else {
                console.error('[ChatWS] STOMP error:', frame.headers?.message);
            }
            set({ isConnected: false, _isConnecting: false }); // ✅
            client.deactivate();
        },

        onWebSocketClose: (event) => {
            if (__DEV__) {
                console.warn('[ChatWS] closed', {
                    code: (event as any)?.code,
                    reason: (event as any)?.reason,
                    wasClean: (event as any)?.wasClean,
                });
            }
            set({ isConnected: false, _isConnecting: false });
        },

        onWebSocketError: (event) => {
            console.error('[ChatWS] WebSocket error:', event);
            set({ isConnected: false, _isConnecting: false });
        },
    });

    client.activate();
    set({ _stompClient: client });
},

  subscribeAiResponse: async (handler: (message: IMessage) => void) => {
    const { user } = useAuthStore.getState();
    if (!user?.id) {
        throw new Error('Chua dang nhap');
    }

    await get().connectWebSocket();
    const client = await waitForConnected(get);
    const subscription: StompSubscription = client.subscribe(`/topic/user/${user.id}/ai`, handler);

    return () => {
        subscription.unsubscribe();
    };
},

  publishAiMessage: async (body: unknown) => {
    await get().connectWebSocket();
    const client = await waitForConnected(get);

    client.publish({
        destination: '/app/ai-chat',
        body: JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
    });
},

  disconnectWebSocket: () => {
    const client = get()._stompClient;
    if (client) {
        client.deactivate();
    }
    set({ _stompClient: null, isConnected: false, _isConnecting: false }); // ✅ thêm _isConnecting: false
},
}));
