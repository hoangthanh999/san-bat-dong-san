import propertyClient from './propertyClient';

export interface PropertyReel {
    id: number;
    title: string;
    price: number;
    address: string;
    area: number;

    // Media
    videoUrl: string | null;
    thumbnailUrl: string | null;

    // Listing
    listingType: 'FOR_RENT' | 'FOR_SALE' | 'RENT' | 'SALE';

    // Interaction — ✅ đúng với backend (không có prefix "is")
    likeCount: number;
    liked: boolean;    // ← đổi từ isLiked
    saved: boolean;    // ← đổi từ isSaved
    isPromoted: boolean;

    // Owner
    ownerSlug: string;
    ownerNameSnapshot: string | null;
    ownerAvatarSnapshot: string | null;

    // Meta
    createdAt: string;
}

export interface ReelsFeedResponse {
    items: PropertyReel[];
    nextCursor: string | null;
    hasNext: boolean;
}

function unwrap<T>(data: any): T {
    if (data && data.result !== undefined) return data.result as T;
    return data as T;
}

export const reelsApi = {
    getFeed: async (size = 10): Promise<ReelsFeedResponse> => {
        const res = await propertyClient.get<any>(
            '/public/properties/reels',
            { params: { size } }
        );
        const payload = unwrap<ReelsFeedResponse>(res.data);
        return {
            items: payload.items ?? [],
            nextCursor: payload.nextCursor ?? null,
            hasNext: payload.hasNext ?? false,
        };
    },

    loadMore: async (cursor: string, size = 10): Promise<ReelsFeedResponse> => {
        const res = await propertyClient.get<any>(
            '/public/properties/reels',
            { params: { cursor, size } }
        );
        const payload = unwrap<ReelsFeedResponse>(res.data);
        return {
            items: payload.items ?? [],
            nextCursor: payload.nextCursor ?? null,
            hasNext: payload.hasNext ?? false,
        };
    },
};
