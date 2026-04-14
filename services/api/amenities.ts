import apiClient from './client';
import { API_ENDPOINTS } from '../../constants';
import { Amenity } from '../../types';

/**
 * Amenity Service
 * Tất cả đi qua apiClient (nginx /amenities → property-service:8086)
 */
export const amenityService = {
    /**
     * Lấy danh sách tiện ích (Public - không cần auth)
     * GET /amenities
     * Backend: AmenityController.getAllAmenities() → ResponseEntity<List<Amenity>>
     */
    getAll: async (): Promise<Amenity[]> => {
        const response = await apiClient.get<Amenity[]>(API_ENDPOINTS.AMENITIES);
        return response.data;
    },

    /**
     * Tạo tiện ích mới (Admin)
     * POST /admin/amenities — body: { name, icon }
     */
    create: async (amenity: { name: string; icon?: string }): Promise<Amenity> => {
        const response = await apiClient.post<Amenity>(API_ENDPOINTS.ADMIN_AMENITIES, amenity);
        return response.data;
    },

    /**
     * Cập nhật tiện ích (Admin)
     * PUT /admin/amenities/{id} — body: { name, icon }
     */
    update: async (id: number, amenity: { name: string; icon?: string }): Promise<Amenity> => {
        const response = await apiClient.put<Amenity>(API_ENDPOINTS.ADMIN_AMENITY_DETAIL(id), amenity);
        return response.data;
    },

    /**
     * Xóa tiện ích (Admin)
     * DELETE /admin/amenities/{id}
     */
    delete: async (id: number): Promise<void> => {
        await apiClient.delete(API_ENDPOINTS.ADMIN_AMENITY_DETAIL(id));
    },
};
