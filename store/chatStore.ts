import { create } from 'zustand';
import { Conversation, ChatMessage } from '../types';
import { chatService } from '../services/api/chat';
import { WS_URL } from '../constants';
import { useAuthStore } from './authStore';

interface ChatState {
    conversations: Conversation[];
    messages: Record<number, ChatMessage[]>; // keyed by partnerId
    isLoading: boolean;
    isConnected: boolean;
    totalUnread: number;
    ws: WebSocket | null;

    // Actions
    fetchConversations: () => Promise<void>;
    fetchHistory: (partnerId: number) => Promise<void>;
    sendMessage: (partnerId: number, content: string, type?: string, metadata?: any) => Promise<void>;
    receiveMessage: (message: ChatMessage) => void;
    markAsRead: (partnerId: number) => Promise<void>;
    deleteConversation: (partnerId: number) => Promise<void>;
    connectWebSocket: () => void;
    disconnectWebSocket: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
    conversations: [],
    messages: {},
    isLoading: false,
    isConnected: false,
    totalUnread: 0,
    ws: null,

    fetchConversations: async () => {
        set({ isLoading: true });
        try {
            const conversations = await chatService.getConversations();
            const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
            set({ conversations, totalUnread, isLoading: false });
        } catch (error) {
            set({ isLoading: false });
        }
    },

    fetchHistory: async (partnerId: number) => {
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
        const { token } = useAuthStore.getState();
        const { user } = useAuthStore.getState();
        if (!user) return;

        // Optimistic update
        const tempMessage: ChatMessage = {
            id: Date.now(),
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
            const sent = await chatService.sendMessage(partnerId, content, type, metadata);
            // Update with real message from server
            set(state => ({
                messages: {
                    ...state.messages,
                    [partnerId]: (state.messages[partnerId] || []).map(m =>
                        m.id === tempMessage.id ? sent : m
                    ),
                },
            }));
            // Update conversation last message
            set(state => ({
                conversations: state.conversations.map(c =>
                    c.partnerId === partnerId
                        ? { ...c, lastMessage: content, lastMessageAt: sent.createdAt }
                        : c
                ),
            }));
        } catch (error) {
            // Remove failed message
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
        set(state => ({
            messages: {
                ...state.messages,
                [partnerId]: [...(state.messages[partnerId] || []), message],
            },
            conversations: state.conversations.map(c =>
                c.partnerId === partnerId
                    ? {
                        ...c,
                        lastMessage: message.content,
                        lastMessageAt: message.createdAt,
                        unreadCount: c.unreadCount + 1,
                    }
                    : c
            ),
            totalUnread: state.totalUnread + 1,
        }));
    },

    markAsRead: async (partnerId: number) => {
        try {
            await chatService.markAsRead(partnerId);
            set(state => {
                const conv = state.conversations.find(c => c.partnerId === partnerId);
                const prevUnread = conv?.unreadCount || 0;
                return {
                    conversations: state.conversations.map(c =>
                        c.partnerId === partnerId ? { ...c, unreadCount: 0 } : c
                    ),
                    totalUnread: Math.max(0, state.totalUnread - prevUnread),
                };
            });
        } catch (error) {
            console.error('Mark as read error', error);
        }
    },

    deleteConversation: async (partnerId: number) => {
        try {
            await chatService.deleteConversation(partnerId);
            set(state => ({
                conversations: state.conversations.filter(c => c.partnerId !== partnerId),
            }));
        } catch (error) {
            console.error('Delete conversation error', error);
        }
    },

    connectWebSocket: () => {
        const { token } = useAuthStore.getState();
        if (!token) return;
        const existingWs = get().ws;
        if (existingWs) return;

        const ws = new WebSocket(`${WS_URL}/chat?token=${token}`);

        ws.onopen = () => {
            set({ isConnected: true });
        };

        ws.onmessage = (event) => {
            try {
                const message: ChatMessage = JSON.parse(event.data);
                get().receiveMessage(message);
            } catch (e) {
                console.error('WS parse error', e);
            }
        };

        ws.onclose = () => {
            set({ isConnected: false, ws: null });
        };

        ws.onerror = () => {
            set({ isConnected: false });
        };

        set({ ws });
    },

    disconnectWebSocket: () => {
        const ws = get().ws;
        if (ws) {
            ws.close();
            set({ ws: null, isConnected: false });
        }
    },
}));
