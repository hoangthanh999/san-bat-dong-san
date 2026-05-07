// ⚠️ Backend KHÔNG có Review Service — đã xóa toàn bộ API calls
// File giữ lại để tránh import errors, tất cả trả về dữ liệu rỗng

import { Review, PaginatedResponse } from '../../types';

export const reviewService = {
    getRoomReviews: async (roomId: number, page = 0, size = 10): Promise<PaginatedResponse<Review>> => {
        console.warn('[reviewService] Backend KHÔNG có Review API — chức năng đang phát triển');
        return { content: [], totalElements: 0, totalPages: 0, size, number: page, first: true, last: true };
    },

    addReview: async (roomId: number, rating: number, comment: string, reviewImages?: string[]): Promise<Review | null> => {
        console.warn('[reviewService] Backend KHÔNG có Review API — chức năng đang phát triển');
        return null;
    },

    replyReview: async (reviewId: number, reply: string): Promise<Review | null> => {
        console.warn('[reviewService] Backend KHÔNG có Review API — chức năng đang phát triển');
        return null;
    },

    deleteReview: async (reviewId: number): Promise<void> => {
        console.warn('[reviewService] Backend KHÔNG có Review API — chức năng đang phát triển');
    },
};
