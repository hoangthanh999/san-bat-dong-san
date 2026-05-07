import apiClient from './client';
import { API_ENDPOINTS } from '../../constants';
import { Conversation, ChatMessage } from '../../types';

/**
 * Chat Service
 * Tất cả đi qua apiClient (nginx /api/chat → chat-service:8090)
 * Backend: ChatController
 */
export const chatService = {
    /**
     * Lấy danh sách hội thoại
     * GET /api/chat/conversations (JWT)
     * Backend: ChatController.getConversations()
     */
    getConversations: async (): Promise<Conversation[]> => {
        const response = await apiClient.get<Conversation[]>(API_ENDPOINTS.CHAT_CONVERSATIONS);
        return response.data;
    },

    /**
     * Lấy lịch sử chat với 1 người
     * GET /api/chat/history/{partnerId} (JWT)
     * Backend: ChatController.getChatHistory()
     */
    /**
     * Lấy toàn bộ lịch sử chat với 1 người
     * GET /api/chat/history/{partnerId} (JWT)
     * ⚠️ Backend KHÔNG hỗ trợ phân trang — trả về toàn bộ tin nhắn
     */
    getHistory: async (partnerId: number): Promise<ChatMessage[]> => {
        const response = await apiClient.get<ChatMessage[]>(API_ENDPOINTS.CHAT_HISTORY(partnerId));
        return response.data;
    },

    /**
     * Gửi tin nhắn qua HTTP (hybrid — cũng broadcast qua WebSocket)
     * POST /api/chat/send (JWT)
     * Backend: ChatController.sendViaHttp()
     * Body: ChatMessageDTO { senderId, receiverId, content, type }
     */
    sendMessage: async (senderId: number, receiverId: number, content: string, type = 'TEXT'): Promise<ChatMessage> => {
        const response = await apiClient.post<ChatMessage>(API_ENDPOINTS.CHAT_SEND, {
            senderId,
            receiverId,
            content,
            type,
        });
        return response.data;
    },

    /**
     * Bắt đầu cuộc hội thoại mới
     * POST /api/chat/start (JWT)
     * Backend: ChatController.startConversation()
     * Body: { partnerId }
     */
    startConversation: async (partnerId: number): Promise<string> => {
        const response = await apiClient.post<string>(API_ENDPOINTS.CHAT_START, {
            partnerId,
        });
        return response.data;
    },

    /**
     * Đánh dấu đã đọc tin nhắn với partner
     * PUT /api/chat/read/{partnerId} (JWT)
     * Backend: ChatController.markAsRead()
     */
    markAsRead: async (partnerId: number): Promise<void> => {
        await apiClient.put(API_ENDPOINTS.CHAT_READ(partnerId));
    },
};
