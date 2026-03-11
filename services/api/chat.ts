import apiClient from './client';
import { API_ENDPOINTS } from '../../constants';
import { Conversation, ChatMessage } from '../../types';

export const chatService = {
    getConversations: async (): Promise<Conversation[]> => {
        const response = await apiClient.get<Conversation[]>(API_ENDPOINTS.CHAT_CONVERSATIONS);
        return response.data;
    },

    getHistory: async (partnerId: number, page = 0, size = 30): Promise<ChatMessage[]> => {
        const response = await apiClient.get<ChatMessage[]>(API_ENDPOINTS.CHAT_HISTORY(partnerId), {
            params: { page, size },
        });
        return response.data;
    },

    sendMessage: async (receiverId: number, content: string, type = 'TEXT', metadata?: any): Promise<ChatMessage> => {
        const response = await apiClient.post<ChatMessage>(API_ENDPOINTS.CHAT_SEND, {
            receiverId,
            content,
            type,
            metadata,
        });
        return response.data;
    },

    startConversation: async (partnerId: number, roomId?: number): Promise<Conversation> => {
        const response = await apiClient.post<Conversation>(API_ENDPOINTS.CHAT_START, {
            partnerId,
            roomId,
        });
        return response.data;
    },

    markAsRead: async (partnerId: number): Promise<void> => {
        await apiClient.put(`/chat/read/${partnerId}`);
    },

    deleteConversation: async (partnerId: number): Promise<void> => {
        await apiClient.delete(`/chat/conversations/${partnerId}`);
    },
};
