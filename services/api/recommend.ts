import AsyncStorage from '@react-native-async-storage/async-storage';

import apiClient from './client';
import { API_ENDPOINTS, STORAGE_KEYS } from '../../constants';

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
}

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
    trackBehavior: async (
        itemId: number,
        itemType: RecommendItemType,
        action: RecommendAction,
        metadata: RecommendTrackMetadata = {}
    ): Promise<void> => {
        try {
            await apiClient.post(API_ENDPOINTS.RECOMMEND_TRACK, {
                userId: await getRecommendUserId(),
                itemId: Number(itemId),
                itemType,
                action,
                watchTime: Number(metadata.watchTime || 0),
                duration: Number(metadata.duration || 1),
                price: Number(metadata.price || 0),
                userBudget: Number(metadata.userBudget || 0),
                locationMatch: Number(metadata.locationMatch || 0),
                categoryMatch: Number(metadata.categoryMatch || 0),
                district: metadata.district || '',
            }, { _silentError: true } as any);
        } catch {
        }
    },
};
