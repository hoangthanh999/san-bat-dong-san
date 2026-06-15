import { create } from 'zustand';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuthStore } from './authStore';
import { getAiWebSocketUrl } from '../services/api/environment';
import { searchService } from '../services/api/search';
import { PropertySearchItem } from '../types';

// ============================
// Types khớp với backend
// ============================
export interface PropertyCardDTO {
    propertyId: number;
    title: string;
    price: number;
    district?: string;
    imageUrl?: string;
}

export interface AiChatMessage {
    id: string;
    role: 'user' | 'ai';
    content: string;
    items?: PropertyCardDTO[];
    status?: string;
    createdAt: string;
}

interface AiChatRequest {
    conversationId: string;
    userMessage: string;
}

interface AiChatResponse {
    userId: string;
    conversationId: string;
    aiReply: string;
    status: string;
    items?: PropertyCardDTO[];
}

function mapSearchItemToPropertyCard(item: PropertySearchItem): PropertyCardDTO {
    return {
        propertyId: item.id,
        title: item.title,
        price: Number(item.price) || 0,
        district: item.district || item.province,
        imageUrl: item.thumbnail,
    };
}

async function hydratePropertyCards(items: PropertyCardDTO[] = []): Promise<PropertyCardDTO[]> {
    const ids = Array.from(
        new Set(
            items
                .map(item => Number(item.propertyId))
                .filter(id => Number.isFinite(id) && id > 0)
        )
    );

    if (ids.length === 0) return items;

    try {
        const properties = await searchService.getPropertiesByIds(ids);
        if (properties.length === 0) return items;

        const fallbackById = new Map(items.map(item => [Number(item.propertyId), item]));
        return properties.map(property => ({
            ...fallbackById.get(property.id),
            ...mapSearchItemToPropertyCard(property),
        }));
    } catch (error) {
        console.warn('[AI-WS] Không hydrate được danh sách BĐS từ /search/properties/by-ids:', error);
        return items;
    }
}

interface AiChatState {
    messages: AiChatMessage[];
    conversationId: string;
    isConnected: boolean;
    isThinking: boolean;
    _client: Client | null;

    // Actions
    connectAiWebSocket: () => void;
    disconnectAiWebSocket: () => void;
    sendAiMessage: (userMessage: string) => void;
    clearMessages: () => void;
}

function generateConversationId(userId: string | number): string {
    return `conv-${userId}-ai`;
}

export const useAiChatStore = create<AiChatState>((set, get) => ({
    messages: [],
    conversationId: '',
    isConnected: false,
    isThinking: false,
    _client: null,

    clearMessages: () => set({ messages: [] }),

    connectAiWebSocket: async () => {
        const { token, user } = useAuthStore.getState();
        if (!token || !user) {
            console.warn('[AI-WS] Chưa đăng nhập, bỏ qua kết nối');
            return;
        }

        // Nếu đã có client đang active thì bỏ qua
        const existing = get()._client;
        if (existing?.active) {
            console.log('[AI-WS] Client đã active, bỏ qua');
            return;
        }

        const conversationId = generateConversationId(user.id);
        set({ conversationId });

        const wsUrl = await getAiWebSocketUrl();

        const client = new Client({
            // ✅ SockJS factory - dùng http:// (không phải ws://)
            webSocketFactory: () => new (SockJS as any)(wsUrl),

            // ✅ Token trong STOMP CONNECT headers
            connectHeaders: {
                Authorization: `Bearer ${token}`,
            },

            // Tự reconnect sau 5s nếu mất kết nối
            reconnectDelay: 5000,

            onConnect: () => {
                console.log('[AI-WS] Kết nối STOMP thành công!');
                set({ isConnected: true });

                // ✅ Subscribe nhận phản hồi AI
                client.subscribe(`/topic/user/${user.id}/ai`, async (message: IMessage) => {
                    try {
                        const response: AiChatResponse = JSON.parse(message.body);
                        console.log('[AI-WS] Nhận phản hồi AI:', response);

                        if (response.aiReply) {
                            const hydratedItems = await hydratePropertyCards(response.items);
                            const aiMessage: AiChatMessage = {
                                id: `ai-${Date.now()}`,
                                role: 'ai',
                                content: response.aiReply,
                                items: hydratedItems,
                                status: response.status,
                                createdAt: new Date().toISOString(),
                            };
                            set(state => ({
                                messages: [...state.messages, aiMessage],
                                isThinking: false,
                            }));
                        }
                    } catch (e) {
                        console.warn('[AI-WS] Parse error:', e);
                        set({ isThinking: false });
                    }
                });
            },

            onDisconnect: () => {
                console.log('[AI-WS] Mất kết nối STOMP');
                set({ isConnected: false, isThinking: false });
            },

            onStompError: (frame) => {
                console.error('[AI-WS] STOMP Error:', frame.headers['message']);
                set({ isConnected: false, isThinking: false });
            },

            onWebSocketError: (event) => {
                console.error('[AI-WS] WebSocket Error:', event);
                set({ isConnected: false, isThinking: false });
            },
        });

        client.activate();
        set({ _client: client });
        console.log('[AI-WS] Đang kết nối tới', wsUrl);
    },

    disconnectAiWebSocket: () => {
        const client = get()._client;
        if (client?.active) {
            client.deactivate();
            console.log('[AI-WS] Đã ngắt kết nối');
        }
        set({
            _client: null,
            isConnected: false,
            isThinking: false,
        });
    },

    sendAiMessage: (userMessage: string) => {
        const { _client, isConnected, conversationId } = get();
        const { user } = useAuthStore.getState();

        if (!user) {
            console.error('[AI-WS] Chưa đăng nhập');
            return;
        }
        if (!_client || !isConnected) {
            console.error('[AI-WS] WebSocket chưa kết nối');
            return;
        }

        // Thêm tin nhắn user ngay lập tức (optimistic)
        const userMsg: AiChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: userMessage,
            createdAt: new Date().toISOString(),
        };
        set(state => ({
            messages: [...state.messages, userMsg],
            isThinking: true,
        }));

        const request: AiChatRequest = {
            conversationId: conversationId || generateConversationId(user.id),
            userMessage,
        };

        // ✅ Gửi qua STOMP publish
        _client.publish({
            destination: '/app/ai-chat',
            body: JSON.stringify(request),
            headers: { 'content-type': 'application/json' },
        });

        console.log('[AI-WS] Đã gửi tin nhắn:', request);
    },
}));
