import apiClient from './client';
import { API_ENDPOINTS } from '../../constants';
import { User, CustomerResponseDTO, CustomerProfileDTO, Room, Favorite, PaginatedResponse } from '../../types';

export const userService = {
    /**
     * Lấy profile từ customer-service
     * GET /customers/profile (JWT required)
     */
    getProfile: async (): Promise<CustomerResponseDTO> => {
        const response = await apiClient.get<CustomerResponseDTO>(API_ENDPOINTS.CUSTOMER_PROFILE);
        return response.data; // đã unwrap result
    },

    /**
     * Cập nhật profile qua customer-service
     * PUT /customers/profile — body: CustomerProfileDTO
     */
    updateProfile: async (data: CustomerProfileDTO): Promise<CustomerResponseDTO> => {
        const response = await apiClient.put<CustomerResponseDTO>(API_ENDPOINTS.CUSTOMER_PROFILE, data);
        return response.data;
    },

    /**
     * Upload avatar qua customer-service (multipart/form-data)
     * POST /customers/avatar — FormData field: "file"
     * Dùng fetch thay axios vì axios trên React Native không gửi được FormData chứa file
     */
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

    /**
     * Upload banner qua customer-service (multipart/form-data)
     * POST /customers/banner — FormData field: "file"
     */
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

    /**
     * Lấy public profile theo slug (publicId)
     * GET /customers/{slug}/public-profile
     */
    getPublicProfile: async (slug: string) => {
        const response = await apiClient.get(API_ENDPOINTS.CUSTOMER_PUBLIC_PROFILE(slug));
        return response.data;
    },

    /**
     * Lấy BĐS của chủ trọ qua property-service (public endpoint)
     * GET /public/properties/owners/{ownerId}?page=0&size=10
     * Đi qua nginx gateway (apiClient)
     */
    getMyRooms: async (landlordId: number, page = 0, size = 10): Promise<PaginatedResponse<Room>> => {
        const response = await apiClient.get<PaginatedResponse<Room>>(
            API_ENDPOINTS.PUBLIC_PROPERTIES_BY_OWNER(landlordId),
            { params: { page, size } }
        );
        return response.data;
    },

    // ============================================================
    // FEATURES ĐANG PHÁT TRIỂN (chưa có backend endpoint)
    // ============================================================

    getFavorites: async (page = 0, size = 10): Promise<PaginatedResponse<Favorite>> => {
        // TODO: Backend chưa có favorite API — đang phát triển
        console.warn('[userService] getFavorites: API chưa có trong backend - đang phát triển');
        return { content: [], totalElements: 0, totalPages: 0, size, number: page, first: true, last: true };
    },

    removeFavorite: async (roomId: number): Promise<void> => {
        // TODO: Backend chưa có favorite API — đang phát triển
        console.warn('[userService] removeFavorite: API chưa có trong backend - đang phát triển');
    },
};
