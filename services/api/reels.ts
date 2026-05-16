/**
 * reels.ts
 * API service cho Reels Feed — gọi property-service:8086
 * qua propertyClient (bypass Nginx, có JWT interceptor)
 *
 * Endpoint: GET /public/properties/reels
 * Backend DTO: PropertyReelResponseDTO, ReelsFeedResponse
 */
import propertyClient from './propertyClient';

// ─── Khớp 100% với PropertyReelResponseDTO.java ──────────────
export interface PropertyReel {
    id: number;
    title: string;
    price: number;               // BigDecimal → number
    address: string;             // địa chỉ gộp
    videoUrl: string | null;     // null nếu chưa upload video

    isLiked: boolean;
    isSaved: boolean;
    likeCount: number;

    ownerSlug: string;
    ownerNameSnapshot: string;
    ownerAvatarSnapshot: string | null;

    createdAt: string;           // LocalDateTime → ISO string
    isPromoted: boolean | null;
}

// ─── Khớp 100% với ReelsFeedResponse.java ────────────────────
// items: List<PropertyReelResponseDTO>
// nextCursor: String | null
// hasNext(): nextCursor != null && !nextCursor.isEmpty()
export interface ReelsFeedResponse {
    items: PropertyReel[];
    nextCursor: string | null;
    hasNext: boolean;
}

// ─── API ─────────────────────────────────────────────────────
export const reelsApi = {
    /**
     * Fetch lần đầu — không có cursor
     * GET /public/properties/reels?size=10
     *
     * propertyClient interceptor đã auto-unwrap { result: T } → T
     * nên chỉ cần res.data (không cần res.data?.data)
     */
    getFeed: async (size = 10): Promise<ReelsFeedResponse> => {
        const res = await propertyClient.get<ReelsFeedResponse>(
            '/public/properties/reels',
            { params: { size } }
        );
        return res.data;
    },

    /**
     * Load thêm bằng cursor (infinite scroll)
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