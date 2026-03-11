import { create } from 'zustand';
import { Review, PaginatedResponse } from '../types';
import { reviewService } from '../services/api/reviews';

interface ReviewState {
    reviewsByRoom: Record<number, Review[]>;
    isLoading: boolean;
    isSubmitting: boolean;
    error: string | null;
    totalReviews: Record<number, number>;
    hasMore: Record<number, boolean>;

    fetchReviews: (roomId: number, reset?: boolean) => Promise<void>;
    addReview: (roomId: number, rating: number, comment: string) => Promise<void>;
    replyReview: (reviewId: number, roomId: number, reply: string) => Promise<void>;
    deleteReview: (reviewId: number, roomId: number) => Promise<void>;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
    reviewsByRoom: {},
    isLoading: false,
    isSubmitting: false,
    error: null,
    totalReviews: {},
    hasMore: {},

    fetchReviews: async (roomId: number, reset = false) => {
        set({ isLoading: true, error: null });
        try {
            const existing = get().reviewsByRoom[roomId] || [];
            const page = reset ? 0 : Math.floor(existing.length / 10);
            const data = await reviewService.getRoomReviews(roomId, page);

            set(state => ({
                reviewsByRoom: {
                    ...state.reviewsByRoom,
                    [roomId]: reset ? data.content : [...(state.reviewsByRoom[roomId] || []), ...data.content],
                },
                totalReviews: { ...state.totalReviews, [roomId]: data.totalElements },
                hasMore: { ...state.hasMore, [roomId]: !data.last },
                isLoading: false,
            }));
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    addReview: async (roomId: number, rating: number, comment: string) => {
        set({ isSubmitting: true, error: null });
        try {
            const review = await reviewService.addReview(roomId, rating, comment);
            set(state => ({
                reviewsByRoom: {
                    ...state.reviewsByRoom,
                    [roomId]: [review, ...(state.reviewsByRoom[roomId] || [])],
                },
                totalReviews: { ...state.totalReviews, [roomId]: (state.totalReviews[roomId] || 0) + 1 },
                isSubmitting: false,
            }));
        } catch (error: any) {
            set({ error: error.message || 'Gửi đánh giá thất bại', isSubmitting: false });
            throw error;
        }
    },

    replyReview: async (reviewId: number, roomId: number, reply: string) => {
        try {
            const updated = await reviewService.replyReview(reviewId, reply);
            set(state => ({
                reviewsByRoom: {
                    ...state.reviewsByRoom,
                    [roomId]: (state.reviewsByRoom[roomId] || []).map(r =>
                        r.id === reviewId ? updated : r
                    ),
                },
            }));
        } catch (error: any) {
            console.error('Reply review error', error);
        }
    },

    deleteReview: async (reviewId: number, roomId: number) => {
        try {
            await reviewService.deleteReview(reviewId);
            set(state => ({
                reviewsByRoom: {
                    ...state.reviewsByRoom,
                    [roomId]: (state.reviewsByRoom[roomId] || []).filter(r => r.id !== reviewId),
                },
                totalReviews: { ...state.totalReviews, [roomId]: Math.max(0, (state.totalReviews[roomId] || 1) - 1) },
            }));
        } catch (error) {
            console.error('Delete review error', error);
        }
    },
}));
