import apiClient from './client';
import { API_ENDPOINTS } from '../../constants';
import { Room, RoomFilters, SearchParams, PaginatedResponse, ApiResponse } from '../../types';

export const roomService = {
    // Get all rooms (paginated)
    getRooms: async (params: SearchParams): Promise<PaginatedResponse<Room>> => {
        const response = await apiClient.get<PaginatedResponse<Room>>(API_ENDPOINTS.ROOMS, {
            params,
        });
        return response.data;
    },

    // Get room detail
    getRoomDetail: async (id: number): Promise<ApiResponse<Room>> => {
        const response = await apiClient.get<ApiResponse<Room>>(API_ENDPOINTS.ROOM_DETAIL(id));
        return response.data;
    },

    // Search rooms
    searchRooms: async (params: SearchParams): Promise<PaginatedResponse<Room>> => {
        const response = await apiClient.get<PaginatedResponse<Room>>(API_ENDPOINTS.ROOMS_SEARCH, {
            params,
        });
        return response.data;
    },

    // Get featured rooms (e.g. videos)
    getFeaturedRooms: async (params: SearchParams): Promise<PaginatedResponse<Room>> => {
        const response = await apiClient.get<PaginatedResponse<Room>>(API_ENDPOINTS.ROOMS_VIDEOS, {
            params,
        });
        return response.data;
    },

    // Get my rooms (for landlord)
    getMyRooms: async (params: SearchParams): Promise<PaginatedResponse<Room>> => {
        const response = await apiClient.get<PaginatedResponse<Room>>(API_ENDPOINTS.ROOMS_MY, {
            params,
        });
        return response.data;
    },

    // Create room
    createRoom: async (roomData: FormData): Promise<ApiResponse<Room>> => {
        const response = await apiClient.post<ApiResponse<Room>>(API_ENDPOINTS.ROOMS, roomData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // Update room
    updateRoom: async (id: number, roomData: FormData): Promise<ApiResponse<Room>> => {
        const response = await apiClient.put<ApiResponse<Room>>(API_ENDPOINTS.ROOM_DETAIL(id), roomData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // Delete room
    deleteRoom: async (id: number): Promise<void> => {
        await apiClient.delete(API_ENDPOINTS.ROOM_DETAIL(id));
    },

    // Toggle favorite
    toggleFavorite: async (roomId: number): Promise<void> => {
        await apiClient.post(API_ENDPOINTS.FAVORITE_TOGGLE(roomId));
    },

    // Check if room is favorited
    checkFavorite: async (roomId: number): Promise<boolean> => {
        const response = await apiClient.get<{ isFavorited: boolean }>(API_ENDPOINTS.FAVORITE_CHECK(roomId));
        return response.data.isFavorited;
    },

    // Push room to top
    pushRoom: async (id: number): Promise<void> => {
        await apiClient.post(API_ENDPOINTS.ROOM_PUSH(id));
    },

    // Update room status
    updateStatus: async (id: number, status: string): Promise<void> => {
        await apiClient.put(API_ENDPOINTS.ROOM_STATUS(id), { status });
    },

    // Track room view
    trackView: async (id: number): Promise<void> => {
        await apiClient.post(API_ENDPOINTS.ROOM_VIEW(id));
    },
};
