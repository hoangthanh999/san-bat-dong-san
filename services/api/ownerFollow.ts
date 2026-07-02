import apiClient from './client';
import { API_ENDPOINTS } from '../../constants';
import { OwnerFollowResponse } from '../../types';

export const ownerFollowService = {
    toggleFollowOwner: async (ownerId: number): Promise<OwnerFollowResponse> => {
        const response = await apiClient.post(API_ENDPOINTS.OWNER_TOGGLE_FOLLOW(ownerId));
        return response.data;
    },
    getOwnerFollowStatus: async (ownerId: number): Promise<boolean> => {
        const response = await apiClient.get(API_ENDPOINTS.OWNER_IS_FOLLOWING(ownerId));
        return response.data;
    },
    getOwnerFollowerCount: async (ownerId: number): Promise<number> => {
        const response = await apiClient.get(API_ENDPOINTS.OWNER_FOLLOWERS_COUNT(ownerId));
        return response.data;
    }
};
