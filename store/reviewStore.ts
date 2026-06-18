/**
 * reviewStore.ts
 * Zustand store quản lý Owner Review.
 * Gọi đúng backend endpoint qua reviewService (không mock).
 *
 * Endpoint backend (OwnerReviewController.java):
 *   POST   /owners/reviews
 *   GET    /owners/reviews/{ownerId}
 *   GET    /owners/reviews/{ownerId}/summary
 *   POST   /owners/reviews/{reviewId}/reply
 */

import { create } from 'zustand';
import { OwnerReviewResponse, OwnerReviewRequest, OwnerRatingSummary } from '../types';
import { reviewService } from '../services/api/reviews';

interface ReviewState {
    // reviewsByOwner: ownerId → danh sách review
    reviewsByOwner: Record<number, OwnerReviewResponse[]>;
    // summaryByOwner: ownerId → rating summary
    summaryByOwner: Record<number, OwnerRatingSummary>;

    isLoading: boolean;
    isSubmitting: boolean;
    error: string | null;

    fetchOwnerReviews: (ownerId: number) => Promise<void>;
    fetchOwnerSummary: (ownerId: number) => Promise<void>;
    submitReview: (request: OwnerReviewRequest) => Promise<void>;
    replyReview: (reviewId: number, ownerId: number, reply: string) => Promise<void>;
    clearError: () => void;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
    reviewsByOwner: {},
    summaryByOwner: {},
    isLoading: false,
    isSubmitting: false,
    error: null,

    fetchOwnerReviews: async (ownerId: number) => {
        set({ isLoading: true, error: null });
        try {
            const reviews = await reviewService.getOwnerReviews(ownerId);
            // reviewService.getOwnerReviews đã normalize → luôn là array
            const safeReviews = Array.isArray(reviews) ? reviews : [];
            set(state => ({
                reviewsByOwner: {
                    ...state.reviewsByOwner,
                    [ownerId]: safeReviews,
                },
                isLoading: false,
            }));
        } catch (error: any) {
            // Ngay cả khi lỗi vẫn set [] để tránh crash UI
            set(state => ({
                reviewsByOwner: { ...state.reviewsByOwner, [ownerId]: [] },
                error: error.message || 'Không thể tải đánh giá',
                isLoading: false,
            }));
        }
    },

    fetchOwnerSummary: async (ownerId: number) => {
        try {
            const summary = await reviewService.getOwnerRatingSummary(ownerId);
            set(state => ({
                summaryByOwner: {
                    ...state.summaryByOwner,
                    [ownerId]: summary,
                },
            }));
        } catch (error: any) {
            console.warn('[reviewStore] fetchOwnerSummary error:', error.message);
        }
    },

    submitReview: async (request: OwnerReviewRequest) => {
        set({ isSubmitting: true, error: null });
        try {
            const newReview = await reviewService.createOrUpdateReview(request);

            set(state => {
                const ownerId = request.ownerId;
                const existing = state.reviewsByOwner[ownerId] || [];
                // Backend unique theo ownerId+reviewerId+propertyId → nếu đã tồn tại thì update
                const idx = existing.findIndex(
                    r => r.propertyId === request.propertyId && r.reviewerId === newReview.reviewerId,
                );
                let updated: OwnerReviewResponse[];
                if (idx >= 0) {
                    updated = existing.map((r, i) => (i === idx ? newReview : r));
                } else {
                    updated = [newReview, ...existing];
                }
                return {
                    reviewsByOwner: {
                        ...state.reviewsByOwner,
                        [ownerId]: updated,
                    },
                    isSubmitting: false,
                };
            });
        } catch (error: any) {
            set({ error: error.message || 'Gửi đánh giá thất bại', isSubmitting: false });
            throw error;
        }
    },

    replyReview: async (reviewId: number, ownerId: number, reply: string) => {
        try {
            const updated = await reviewService.replyReview(reviewId, reply);
            set(state => ({
                reviewsByOwner: {
                    ...state.reviewsByOwner,
                    [ownerId]: (state.reviewsByOwner[ownerId] || []).map(r =>
                        r.id === reviewId ? updated : r,
                    ),
                },
            }));
        } catch (error: any) {
            set({ error: error.message || 'Phản hồi đánh giá thất bại' });
            throw error;
        }
    },

    clearError: () => set({ error: null }),
}));
