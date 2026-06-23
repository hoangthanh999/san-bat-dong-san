/**
 * comments.ts
 * API service cho Property Comments — gọi đúng backend endpoint thật.
 *
 * Endpoints (xác nhận từ PropertyCommentController.java):
 *   GET    /properties/comments/{propertyId}?page=0&size=10
 *   GET    /properties/comments/replies/{parentId}?page=0&size=10
 *   GET    /properties/comments/count/{propertyId}
 *   POST   /properties/comments   (header: X-User-Id hoặc X-Guest-Id)
 *   DELETE /properties/comments/{commentId}  (header: X-User-Id)
 */

import apiClient from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../constants';
import { CommentRequest, CommentResponse, PaginatedResponse } from '../../types';
import { getApiBaseUrl } from './environment';
import { getUserSummarySilent, type UserSummaryDTO } from './user';

function normalizeMediaUrl(url?: string | null, baseUrl?: string): string | null {
    const value = url?.trim();
    if (!value) return null;

    if (/^(https?:|file:|data:)/i.test(value)) {
        return value;
    }

    const normalizedBase = (baseUrl || '').replace(/\/+$/, '');
    const normalizedPath = value.startsWith('/') ? value : `/${value}`;
    return normalizedBase ? `${normalizedBase}${normalizedPath}` : value;
}

async function enrichCommentAuthors(comments: CommentResponse[]): Promise<CommentResponse[]> {
    if (!comments.length) return comments;

    const baseUrl = await getApiBaseUrl();

    return Promise.all(comments.map(async comment => {
        const authorId = comment.userId ?? null;
        if (!authorId) {
            return {
                ...comment,
                authorId: null,
                displayName: comment.guestId ? 'Khách' : comment.displayName,
                displayAvatar: null,
            };
        }

        const summary = await getUserSummarySilent(authorId);

        return {
            ...comment,
            authorId,
            displayName: summary?.fullName?.trim() || comment.displayName || `Người dùng #${authorId}`,
            displayAvatar: normalizeMediaUrl(summary?.avatarUrl ?? comment.displayAvatar, baseUrl),
        };
    }));
}

// Helper: lấy userId từ storage để gắn X-User-Id header
async function getUserIdHeader(): Promise<Record<string, string>> {
    try {
        const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
        if (userData) {
            const user = JSON.parse(userData);
            if (user?.id) {
                return { 'X-User-Id': String(user.id) };
            }
        }
    } catch (e) {
        console.warn('[commentService] Không lấy được userId:', e);
    }
    return {};
}

/**
 * Normalize Spring Boot Page response thành PaginatedResponse an toàn.
 * Hỗ trợ:
 *   - Page trực tiếp: { content: [], totalElements, ... }
 *   - Bọc trong result: { result: { content: [], ... } }
 *   - Bọc trong data:   { data: { content: [], ... } }
 *   - Array thuần: [...]
 */
function normalizePage<T>(payload: any, page: number, size: number): PaginatedResponse<T> {
    const EMPTY: PaginatedResponse<T> = {
        content: [], totalElements: 0, totalPages: 0,
        size, number: page, first: true, last: true,
    };

    // Unwrap wrapper nếu có
    const raw =
        (payload?.result !== undefined ? payload.result : null) ??
        (payload?.data !== undefined ? payload.data : null) ??
        payload;

    if (!raw) return EMPTY;

    // Nếu backend trả array thuần (không phải Page)
    if (Array.isArray(raw)) {
        return { content: raw, totalElements: raw.length, totalPages: 1, size, number: 0, first: true, last: true };
    }

    // Spring Boot Page shape
    if (Array.isArray(raw.content)) {
        return {
            content: raw.content,
            totalElements: raw.totalElements ?? raw.content.length,
            totalPages: raw.totalPages ?? 1,
            size: raw.size ?? size,
            number: raw.number ?? page,
            first: raw.first ?? (page === 0),
            last: raw.last ?? true,
        };
    }

    console.warn('[commentService] normalizePage: không nhận ra shape response', payload);
    return EMPTY;
}

export const commentService = {
    /**
     * Lấy danh sách comment top-level theo property (phân trang).
     * Public endpoint — không cần Authorization.
     */
    getComments: async (
        propertyId: number,
        page = 0,
        size = 10,
    ): Promise<PaginatedResponse<CommentResponse>> => {
        try {
            const res = await apiClient.get(`/properties/comments/${propertyId}`, { params: { page, size } });
            const data = normalizePage<CommentResponse>(res.data, page, size);
            return {
                ...data,
                content: await enrichCommentAuthors(data.content),
            };
        } catch (e: any) {
            console.warn('[commentService] getComments error:', e?.message);
            return { content: [], totalElements: 0, totalPages: 0, size, number: page, first: true, last: true };
        }
    },

    /**
     * Lấy replies của một comment cha.
     * Public endpoint — không cần Authorization.
     */
    getReplies: async (
        parentId: number,
        page = 0,
        size = 10,
    ): Promise<PaginatedResponse<CommentResponse>> => {
        try {
            const res = await apiClient.get(`/properties/comments/replies/${parentId}`, { params: { page, size } });
            const data = normalizePage<CommentResponse>(res.data, page, size);
            return {
                ...data,
                content: await enrichCommentAuthors(data.content),
            };
        } catch (e: any) {
            console.warn('[commentService] getReplies error:', e?.message);
            return { content: [], totalElements: 0, totalPages: 0, size, number: page, first: true, last: true };
        }
    },

    /**
     * Lấy tổng số comment của một property.
     * Public endpoint — trả về number.
     */
    countComments: async (propertyId: number): Promise<number> => {
        try {
            const res = await apiClient.get(`/properties/comments/count/${propertyId}`);
            const val = res.data;
            // Normalize: number trực tiếp hoặc bọc trong result/data
            if (typeof val === 'number') return val;
            if (typeof val?.result === 'number') return val.result;
            if (typeof val?.data === 'number') return val.data;
            return 0;
        } catch (e: any) {
            console.warn('[commentService] countComments error:', e?.message);
            return 0;
        }
    },

    /**
     * Tạo comment mới.
     * Cần Authorization (gắn tự động bởi interceptor nếu user đã login).
     * Header X-User-Id gắn thủ công.
     */
    createComment: async (request: CommentRequest): Promise<CommentResponse> => {
        const userIdHeader = await getUserIdHeader();
        const res = await apiClient.post<CommentResponse>(
            '/properties/comments',
            request,
            { headers: userIdHeader },
        );
        const [comment] = await enrichCommentAuthors([res.data]);
        return comment;
    },

    /**
     * Xóa comment theo id.
     * Cần Authorization + X-User-Id. Chỉ user sở hữu comment được xóa.
     */
    deleteComment: async (commentId: number): Promise<void> => {
        const userIdHeader = await getUserIdHeader();
        await apiClient.delete(
            `/properties/comments/${commentId}`,
            { headers: userIdHeader },
        );
    },
};
