import propertyClient from './propertyClient';
import { API_ENDPOINTS } from '../../constants';
import { Room, PropertyRequestDTO, SearchParams, PaginatedResponse } from '../../types';

export const roomService = {
    // Get all properties (paginated) - public
    getRooms: async (params: SearchParams): Promise<PaginatedResponse<Room>> => {
        const response = await propertyClient.get<PaginatedResponse<Room>>(API_ENDPOINTS.PROPERTIES, {
            params: { page: params.page || 0, size: params.size || 10 },
        });
        return response.data;
    },

    // Get property detail - public
    getRoomDetail: async (id: number): Promise<Room> => {
        const response = await propertyClient.get<Room>(API_ENDPOINTS.PROPERTY_DETAIL(id));
        return response.data; // đã unwrap result
    },

    // Search properties (nâng cao) - public
    searchRooms: async (params: SearchParams): Promise<PaginatedResponse<Room>> => {
        const response = await propertyClient.get<PaginatedResponse<Room>>(API_ENDPOINTS.PROPERTIES_SEARCH, {
            params,
        });
        return response.data;
    },

    // Get properties by landlord - public
    getPropertiesByLandlord: async (landlordId: number, page = 0, size = 10): Promise<PaginatedResponse<Room>> => {
        const response = await propertyClient.get<PaginatedResponse<Room>>(
            API_ENDPOINTS.PROPERTIES_BY_LANDLORD(landlordId),
            { params: { page, size } }
        );
        return response.data;
    },

    // Create property - yêu cầu JWT (OWNER)
    createRoom: async (data: PropertyRequestDTO): Promise<Room> => {
        // Backend nhận JSON, không phải FormData
        const response = await propertyClient.post<Room>(API_ENDPOINTS.PROPERTIES, data);
        return response.data;
    },

    // Update property - yêu cầu JWT (OWNER)
    updateRoom: async (id: number, data: PropertyRequestDTO): Promise<Room> => {
        const response = await propertyClient.put<Room>(API_ENDPOINTS.PROPERTY_DETAIL(id), data);
        return response.data;
    },

    // Delete property - yêu cầu JWT (OWNER)
    deleteRoom: async (id: number): Promise<void> => {
        await propertyClient.delete(API_ENDPOINTS.PROPERTY_DETAIL(id));
    },

    // Update property status - yêu cầu JWT
    // Backend dùng PATCH + query param
    updateStatus: async (id: number, status: string): Promise<void> => {
        await propertyClient.patch(API_ENDPOINTS.PROPERTY_STATUS(id), null, {
            params: { status },
        });
    },

    // Admin: Get pending properties - yêu cầu ADMIN JWT
    getPendingProperties: async (page = 0, size = 10): Promise<PaginatedResponse<Room>> => {
        const response = await propertyClient.get<PaginatedResponse<Room>>(
            API_ENDPOINTS.PROPERTIES_ADMIN_PENDING,
            { params: { page, size } }
        );
        return response.data;
    },

    // === Các method giữ cho tương lai (chưa có backend) ===

    // Toggle favorite
    toggleFavorite: async (roomId: number): Promise<void> => {
        // TODO: Chưa có favorite API trong backend
        console.warn('[roomService] toggleFavorite: API chưa có trong backend');
    },

    // Check if room is favorited
    checkFavorite: async (roomId: number): Promise<boolean> => {
        // TODO: Chưa có favorite API trong backend
        console.warn('[roomService] checkFavorite: API chưa có trong backend');
        return false;
    },
};
