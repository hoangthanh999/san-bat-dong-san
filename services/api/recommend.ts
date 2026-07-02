import AsyncStorage from '@react-native-async-storage/async-storage';

import apiClient from './client';
import { API_ENDPOINTS, STORAGE_KEYS } from '../../constants';
import { RecommendedProperty, RecommendedReel } from '../../types';

export type RecommendAction = 'VIEW' | 'CONTACT' | 'SHARE' | 'LIKE' | 'SAVE';
export type RecommendItemType = 'PROPERTY' | 'REEL';

export interface RecommendTrackMetadata {
    watchTime?: number;
    duration?: number;
    price?: number;
    userBudget?: number;
    locationMatch?: number;
    categoryMatch?: number;
    district?: string;
    ward?: string;
    province?: string;
    propertyType?: string;
    transactionType?: string;
}

const unwrapRecommendList = <T>(payload: any): T[] => {
    const candidates = [
        payload,
        payload?.data,
        payload?.result,
        payload?.content,
        payload?.items,
        payload?.recommendations,
        payload?.data?.content,
        payload?.result?.content,
        payload?.result?.items,
        payload?.result?.recommendations,
    ];
    const list = candidates.find(Array.isArray);
    return Array.isArray(list) ? list : [];
};

const limitList = <T>(items: T[], limit: number): T[] => {
    const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 5;
    return items.slice(0, safeLimit);
};

const normalizeRecommendedProperty = (item: any): RecommendedProperty | null => {
    const property = item?.property ?? item?.propertyDto ?? item?.propertyDetail ?? {};
    const id = Number(item?.id ?? item?.propertyId ?? item?.roomId ?? property?.id);
    if (!Number.isFinite(id) || id <= 0) return null;

    return {
        ...property,
        ...item,
        id,
        title: item?.title ?? property?.title ?? '',
        price: item?.price ?? property?.price,
        address: item?.address ?? property?.address,
        district: item?.district ?? property?.district,
        videoUrl: item?.videoUrl ?? property?.videoUrl,
        images: item?.images ?? property?.images ?? (item?.thumbnail ? [item.thumbnail] : property?.thumbnail ? [property.thumbnail] : undefined),
        createdAt: item?.createdAt ?? property?.createdAt,
        isPromoted: item?.isPromoted ?? property?.isPromoted,
        promotionExpiresAt: item?.promotionExpiresAt ?? property?.promotionExpiresAt,
        promotionPackageId: item?.promotionPackageId ?? property?.promotionPackageId,
        promotionPackageName: item?.promotionPackageName ?? property?.promotionPackageName,
    };
};

const getRecommendUserId = async (): Promise<number> => {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
        if (raw) {
            const parsed = JSON.parse(raw);
            const id = Number(parsed?.id ?? parsed?.userId);
            if (Number.isFinite(id) && id > 0) return id;
        }

        const storedGuestId = await AsyncStorage.getItem(STORAGE_KEYS.GUEST_ID);
        if (storedGuestId) {
            const numeric = Number(storedGuestId.replace(/\D/g, '').slice(0, 12));
            if (Number.isFinite(numeric) && numeric > 0) return numeric;
        }

        const nextGuestNumber = Date.now();
        await AsyncStorage.setItem(STORAGE_KEYS.GUEST_ID, `guest-${nextGuestNumber}`);
        return nextGuestNumber;
    } catch {
        return Date.now();
    }
};

export const recommendApi = {
    getFinalPropertyRecommendations: async (
        userId: number,
        limit = 5
    ): Promise<RecommendedProperty[]> => {
        try {
            const response = await apiClient.get<any>(
                API_ENDPOINTS.RECOMMEND_PROPERTIES_FINAL(userId),
                {
                    params: { limit },
                    _silentError: true,
                } as any
            );
            const items = unwrapRecommendList<any>(response.data)
                .map(normalizeRecommendedProperty)
                .filter((item): item is RecommendedProperty => item !== null);
            return limitList(items, limit);
        } catch {
            return [];
        }
    },

    getFinalReelRecommendations: async (
        userId: number,
        limit = 5
    ): Promise<RecommendedReel[]> => {
        try {
            const response = await apiClient.get<any>(
                API_ENDPOINTS.RECOMMEND_REELS_FINAL(userId),
                {
                    params: { limit },
                    _silentError: true,
                } as any
            );
            const items = unwrapRecommendList<RecommendedReel>(response.data)
                .filter(item => Number.isFinite(Number(item?.id)) && Number(item.id) > 0);
            return limitList(items, limit);
        } catch {
            return [];
        }
    },

    trackBehavior: async (
        itemId: number,
        itemType: RecommendItemType,
        action: RecommendAction,
        metadata: RecommendTrackMetadata = {}
    ): Promise<void> => {
        try {
            const payload: Record<string, any> = {
                userId: await getRecommendUserId(),
                itemId: Number(itemId),
                itemType,
                action,
                watchTime: Number(metadata.watchTime || 0),
                duration: Number(metadata.duration || 1),
                price: Number(metadata.price || 0),
                locationMatch: Number(metadata.locationMatch || 0),
                categoryMatch: Number(metadata.categoryMatch || 0),
                district: metadata.district || '',
                ward: metadata.ward || '',
                province: metadata.province || '',
                propertyType: metadata.propertyType || '',
                transactionType: metadata.transactionType || '',
            };

            if (metadata.userBudget !== undefined && metadata.userBudget !== null) {
                payload.userBudget = Number(metadata.userBudget);
            }

            await apiClient.post(API_ENDPOINTS.RECOMMEND_TRACK, payload, { _silentError: true } as any);
        } catch {
        }
    },
};
