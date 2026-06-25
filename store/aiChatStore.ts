import { create } from 'zustand';
import { IMessage } from '@stomp/stompjs';
import { jwtDecode } from 'jwt-decode';
import { useAuthStore } from './authStore';
import { useChatStore } from './chatStore';
import { getAccessToken } from '../services/storage/tokenStorage';
import { searchService } from '../services/api/search';
import { PropertySearchItem } from '../types';

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

export type AiConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

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

interface AiChatState {
    messages: AiChatMessage[];
    conversationId: string;
    isConnected: boolean;
    connectionState: AiConnectionState;
    connectionError: string | null;
    isThinking: boolean;
    _unsubscribeAi: (() => void) | null;

    connectAiWebSocket: () => Promise<void>;
    disconnectAiWebSocket: () => void;
    sendAiMessage: (userMessage: string) => Promise<void>;
    clearMessages: () => void;
}

let aiConnectPromise: Promise<void> | null = null;

function generateConversationId(userId: string | number): string {
    return `conv-${userId}-ai`;
}

function isJwtExpired(token: string): boolean {
    try {
        const decoded = jwtDecode<{ exp?: number }>(token);
        if (!decoded.exp) return false;
        return decoded.exp * 1000 <= Date.now();
    } catch {
        return true;
    }
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
        console.warn('[AI-WS] Could not hydrate AI property cards:', error);
        return items;
    }
}

export const useAiChatStore = create<AiChatState>((set, get) => ({
    messages: [],
    conversationId: '',
    isConnected: false,
    connectionState: 'idle',
    connectionError: null,
    isThinking: false,
    _unsubscribeAi: null,

    clearMessages: () => set({ messages: [] }),

    connectAiWebSocket: async () => {
        const { user } = useAuthStore.getState();
        const token = await getAccessToken();

        if (!token || !user?.id) {
            set({
                isConnected: false,
                isThinking: false,
                connectionState: 'disconnected',
                connectionError: 'Chua dang nhap',
            });
            return;
        }

        if (isJwtExpired(token)) {
            set({
                isConnected: false,
                isThinking: false,
                connectionState: 'error',
                connectionError: 'Phien dang nhap da het han',
            });
            throw new Error('Phien dang nhap da het han');
        }

        if (get()._unsubscribeAi && get().connectionState === 'connected') {
            set({ isConnected: true, connectionError: null });
            return;
        }

        if (aiConnectPromise && get().connectionState === 'connecting') {
            return aiConnectPromise;
        }

        set({
            conversationId: generateConversationId(user.id),
            isConnected: false,
            isThinking: false,
            connectionState: 'connecting',
            connectionError: null,
        });

        aiConnectPromise = useChatStore.getState().subscribeAiResponse(async (message: IMessage) => {
            try {
                const response: AiChatResponse = JSON.parse(message.body);
                if (__DEV__) {
                    console.log('[AI-WS] response received');
                }

                if (!response.aiReply) return;

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
            } catch (error) {
                console.warn('[AI-WS] Parse error:', error);
                set({
                    isThinking: false,
                    connectionError: 'Khong doc duoc phan hoi AI',
                });
            }
        }).then(unsubscribe => {
            set({
                _unsubscribeAi: unsubscribe,
                isConnected: true,
                connectionState: 'connected',
                connectionError: null,
            });
            if (__DEV__) {
                console.log('[AI-WS] subscribed on shared chat socket');
            }
        }).catch(error => {
            set({
                isConnected: false,
                isThinking: false,
                connectionState: 'error',
                connectionError: error?.message || 'Khong the ket noi AI Chat',
            });
            throw error;
        }).finally(() => {
            aiConnectPromise = null;
        });

        return aiConnectPromise;
    },

    disconnectAiWebSocket: () => {
        const unsubscribe = get()._unsubscribeAi;
        if (unsubscribe) {
            unsubscribe();
        }
        aiConnectPromise = null;
        set({
            _unsubscribeAi: null,
            isConnected: false,
            isThinking: false,
            connectionState: 'disconnected',
            connectionError: null,
        });
    },

    sendAiMessage: async (userMessage: string) => {
        const { user } = useAuthStore.getState();
        if (!user?.id) {
            throw new Error('Chua dang nhap');
        }

        await get().connectAiWebSocket();

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
            conversationId: get().conversationId || generateConversationId(user.id),
            userMessage,
        };

        await useChatStore.getState().publishAiMessage(request);

        if (__DEV__) {
            console.log('[AI-WS] message sent on shared chat socket');
        }
    },
}));
