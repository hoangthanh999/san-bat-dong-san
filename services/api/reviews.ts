/**
 * reviews.ts
 * API service cho Owner Reviews — gọi đúng backend endpoint thật.
 *
 * ⚠️  Backend KHÔNG có /reviews, /reviews/room/{roomId}.
 * Endpoint đúng (xác nhận từ OwnerReviewController.java):
 *   POST   /owners/reviews                      (header: X-User-Id của reviewer)
 *   GET    /owners/reviews/{ownerId}            (public)
 *   GET    /owners/reviews/{ownerId}/summary    (public)
 *   POST   /owners/reviews/{reviewId}/reply     (header: X-User-Id của owner)
 *
 * ⚠️  Lưu ý production: nginx cần proxy /owners → property-service:8086
 */

import apiClient from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../constants';
import {
    OwnerReviewRequest,
    OwnerReviewResponse,
    OwnerRatingSummary,
} from '../../types';

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
        console.warn('[reviewService] Không lấy được userId:', e);
    }
    return {};
}

/**
 * Normalize response thành array an toàn.
 * Hỗ trợ: array trực tiếp, { result: [] }, { data: [] }, { content: [] }
 */
function normalizeList<T>(payload: any): T[] {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.result)) return payload.result;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.content)) return payload.content;
    console.warn('[reviewService] normalizeList: response không phải array, trả []', payload);
    return [];
}

/** Default summary khi backend trả sai shape */
const DEFAULT_SUMMARY = (ownerId: number): OwnerRatingSummary => ({
    ownerId,
    averageRating: 0,
    verifiedReviewCount: 0,
    reviewCount: 0,
    fiveStar: 0,
    fourStar: 0,
    threeStar: 0,
    twoStar: 0,
    oneStar: 0,
});

/**
 * Normalize response thành OwnerRatingSummary an toàn.
 * Hỗ trợ: object trực tiếp, { result: {} }, { data: {} }
 */
function normalizeSummary(payload: any, ownerId: number): OwnerRatingSummary {
    const obj =
        (payload?.result !== undefined ? payload.result : null) ??
        (payload?.data !== undefined ? payload.data : null) ??
        payload;
    if (obj && typeof obj === 'object' && 'ownerId' in obj) {
        return {
            ownerId: obj.ownerId ?? ownerId,
            averageRating: Number(obj.averageRating ?? 0),
            verifiedReviewCount: Number(obj.verifiedReviewCount ?? 0),
            reviewCount: Number(obj.reviewCount ?? 0),
            fiveStar: Number(obj.fiveStar ?? 0),
            fourStar: Number(obj.fourStar ?? 0),
            threeStar: Number(obj.threeStar ?? 0),
            twoStar: Number(obj.twoStar ?? 0),
            oneStar: Number(obj.oneStar ?? 0),
        };
    }
    console.warn('[reviewService] normalizeSummary: response không hợp lệ, dùng default', payload);
    return DEFAULT_SUMMARY(ownerId);
}

export const reviewService = {
    /**
     * Tạo hoặc cập nhật review cho owner.
     * Backend unique theo (ownerId + reviewerId + propertyId) → gửi lại = update.
     * Cần Authorization + X-User-Id.
     */
    createOrUpdateReview: async (
        request: OwnerReviewRequest,
    ): Promise<OwnerReviewResponse> => {
        const userIdHeader = await getUserIdHeader();
        if (!userIdHeader['X-User-Id']) {
            throw new Error('Bạn cần đăng nhập để gửi đánh giá.');
        }
        const res = await apiClient.post<OwnerReviewResponse>(
            '/owners/reviews',
            request,
            { headers: userIdHeader },
        );
        return res.data;
    },

    /**
     * Lấy danh sách review của một owner.
     * Public endpoint. Luôn trả array (không bao giờ undefined/crash).
     */
    getOwnerReviews: async (ownerId: number): Promise<OwnerReviewResponse[]> => {
        try {
            const res = await apiClient.get(`/owners/reviews/${ownerId}`);
            return normalizeList<OwnerReviewResponse>(res.data);
        } catch (e: any) {
            console.warn('[reviewService] getOwnerReviews error:', e?.message);
            return [];
        }
    },

    /**
     * Lấy thống kê rating của owner.
     * Public endpoint. Luôn trả object hợp lệ (không crash).
     */
    getOwnerRatingSummary: async (ownerId: number): Promise<OwnerRatingSummary> => {
        try {
            const res = await apiClient.get(`/owners/reviews/${ownerId}/summary`);
            return normalizeSummary(res.data, ownerId);
        } catch (e: any) {
            console.warn('[reviewService] getOwnerRatingSummary error:', e?.message);
            return DEFAULT_SUMMARY(ownerId);
        }
    },

    /**
     * Chủ nhà phản hồi review.
     * Cần Authorization + X-User-Id của owner.
     */
    replyReview: async (
        reviewId: number,
        reply: string,
    ): Promise<OwnerReviewResponse> => {
        const userIdHeader = await getUserIdHeader();
        if (!userIdHeader['X-User-Id']) {
            throw new Error('Bạn cần đăng nhập để phản hồi đánh giá.');
        }
        const res = await apiClient.post<OwnerReviewResponse>(
            `/owners/reviews/${reviewId}/reply`,
            { reply },
            { headers: userIdHeader },
        );
        return res.data;
    },
};
