import apiClient from './client';
import propertyClient from './propertyClient';
import { API_ENDPOINTS } from '../../constants';
import { User, CustomerResponseDTO, CustomerProfileDTO, Room, Favorite, PaginatedResponse } from '../../types';

export const userService = {
    // Lấy profile từ customer-service
    getProfile: async (): Promise<CustomerResponseDTO> => {
        const response = await apiClient.get<CustomerResponseDTO>(API_ENDPOINTS.CUSTOMER_PROFILE);
        return response.data; // đã unwrap result
    },

    // Cập nhật profile qua customer-service
    updateProfile: async (data: CustomerProfileDTO): Promise<CustomerResponseDTO> => {
        const response = await apiClient.put<CustomerResponseDTO>(API_ENDPOINTS.CUSTOMER_PROFILE, data);
        return response.data;
    },

    // Upload avatar qua customer-service (multipart/form-data)
    // Dùng fetch thay axios vì axios trên React Native không gửi được FormData chứa file
    updateAvatar: async (formData: FormData): Promise<CustomerResponseDTO> => {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        const { API_BASE_URL, STORAGE_KEYS } = await import('../../constants');
        const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CUSTOMER_AVATAR}`, {
            method: 'POST',
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: formData,
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.message || 'Upload avatar thất bại');
        return json.result !== undefined ? json.result : json;
    },

    // Upload banner qua customer-service (multipart/form-data)
    updateBanner: async (formData: FormData): Promise<CustomerResponseDTO> => {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        const { API_BASE_URL, STORAGE_KEYS } = await import('../../constants');
        const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CUSTOMER_BANNER}`, {
            method: 'POST',
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: formData,
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.message || 'Upload banner thất bại');
        return json.result !== undefined ? json.result : json;
    },

    // Lấy public profile theo slug (publicId)
    getPublicProfile: async (slug: string) => {
        const response = await apiClient.get(API_ENDPOINTS.CUSTOMER_PUBLIC_PROFILE(slug));
        return response.data;
    },

    // Lấy BĐS của chủ trọ qua property-service
    getMyRooms: async (landlordId: number, page = 0, size = 10): Promise<PaginatedResponse<Room>> => {
        const response = await propertyClient.get<PaginatedResponse<Room>>(
            API_ENDPOINTS.PROPERTIES_BY_LANDLORD(landlordId),
            { params: { page, size } }
        );
        return response.data;
    },

    // === Chưa có backend ===

    getFavorites: async (page = 0, size = 10): Promise<PaginatedResponse<Favorite>> => {
        // TODO: Chưa có favorite API trong backend
        console.warn('[userService] getFavorites: API chưa có trong backend');
        return { content: [], totalElements: 0, totalPages: 0, size, number: page, first: true, last: true };
    },

    removeFavorite: async (roomId: number): Promise<void> => {
        // TODO: Chưa có favorite API trong backend
        console.warn('[userService] removeFavorite: API chưa có trong backend');
    },
};
