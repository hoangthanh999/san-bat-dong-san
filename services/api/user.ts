import apiClient from './client';
import { API_ENDPOINTS } from '../../constants';
import { User, Room, Favorite, PaginatedResponse } from '../../types';

export const userService = {
    getProfile: async (): Promise<User> => {
        const response = await apiClient.get<User>(API_ENDPOINTS.USER_PROFILE);
        return response.data;
    },

    updateProfile: async (data: Partial<User> & { currentPassword?: string; newPassword?: string }): Promise<User> => {
        const response = await apiClient.put<User>(API_ENDPOINTS.USER_UPDATE, data);
        return response.data;
    },

    updateAvatar: async (formData: FormData): Promise<User> => {
        const response = await apiClient.post<User>('/users/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    getMyRooms: async (page = 0, size = 10): Promise<PaginatedResponse<Room>> => {
        const response = await apiClient.get<PaginatedResponse<Room>>(API_ENDPOINTS.ROOMS_MY, {
            params: { page, size },
        });
        return response.data;
    },

    getFavorites: async (page = 0, size = 10): Promise<PaginatedResponse<Favorite>> => {
        const response = await apiClient.get<PaginatedResponse<Favorite>>(API_ENDPOINTS.FAVORITES, {
            params: { page, size },
        });
        return response.data;
    },

    removeFavorite: async (roomId: number): Promise<void> => {
        await apiClient.delete(`/favorites/${roomId}`);
    },

    getUserById: async (userId: number): Promise<User> => {
        const response = await apiClient.get<User>(`/users/${userId}`);
        return response.data;
    },
};
