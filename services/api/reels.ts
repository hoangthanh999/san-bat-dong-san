/**
 * reels.ts
 * API service cho Reels Feed — gọi property-service qua propertyClient
 * Endpoint: GET /public/properties/reels
 */
import propertyClient from './propertyClient';

// ─── Khớp với PropertyReelResponseDTO.java + doc interface ───
export interface PropertyReel {
    id: number;
    title: string;
    price: number;                    // BigDecimal → number

    // Media
    thumbnailUrl: string | null;      // ảnh đại diện
    videoUrl: string | null;          // null nếu chưa upload video

    // Location
    address: string;
    area: number;

    // Listing type
    listingType: 'RENT' | 'SALE' | 'FOR_RENT' | 'FOR_SALE';

    // Interaction
    likeCount: number;
    isLiked: boolean;
    isSaved: boolean;
    isPromoted: boolean;

    // Owner — backend dùng snapshot fields
    ownerSlug: string;
    ownerNameSnapshot: string | null;   // alias ownerName
    ownerAvatarSnapshot: string | null; // alias ownerAvatar

    // Timestamps
    createdAt: string;                  // ISO string
}

// ─── Cursor-based pagination response ────────────────────────
export interface ReelsFeedResponse {
    items: PropertyReel[];
    nextCursor: string | null;
    hasNext: boolean;
}

// ─── API calls ───────────────────────────────────────────────
export const reelsApi = {
    /**
     * Fetch lần đầu — không có cursor
     * GET /public/properties/reels?size=10
     */
    getFeed: async (size = 10): Promise<ReelsFeedResponse> => {
        const res = await propertyClient.get<ReelsFeedResponse>(
            '/public/properties/reels',
            { params: { size } }
        );
        return res.data;
    },

    /**
     * Load thêm bằng cursor
     * GET /public/properties/reels?cursor=xxx&size=10
     */
    loadMore: async (
        cursor: string,
        size = 10
    ): Promise<ReelsFeedResponse> => {
        const res = await propertyClient.get<ReelsFeedResponse>(
            '/public/properties/reels',
            { params: { cursor, size } }
        );
        return res.data;
    },
};