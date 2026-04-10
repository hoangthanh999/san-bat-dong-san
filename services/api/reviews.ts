import apiClient from './client';
import { API_ENDPOINTS } from '../../constants';
import { Review, PaginatedResponse } from '../../types';

export const reviewService = {
    getRoomReviews: async (roomId: number, page = 0, size = 10): Promise<PaginatedResponse<Review>> => {
        const response = await apiClient.get<PaginatedResponse<Review>>(
            API_ENDPOINTS.REVIEWS_ROOM(roomId),
            { params: { page, size } }
        );
        return response.data;
    },

    addReview: async (roomId: number, rating: number, comment: string, reviewImages?: string[]): Promise<Review> => {
        const response = await apiClient.post<Review>(API_ENDPOINTS.REVIEWS, {
            roomId,
            rating,
            comment,
            reviewImages,
        });
        return response.data;
    },

    replyReview: async (reviewId: number, reply: string): Promise<Review> => {
        const response = await apiClient.post<Review>(API_ENDPOINTS.REVIEW_REPLY(reviewId), { reply });
        return response.data;
    },

    deleteReview: async (reviewId: number): Promise<void> => {
        await apiClient.delete(`/reviews/${reviewId}`);
    },
};
