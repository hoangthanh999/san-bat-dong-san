import apiClient from './client';

/**
 * Interaction Service
 * Khớp với InteractionController (property-service)
 * Endpoints đi qua nginx: /properties/... → property-service:8086
 */

export interface InteractionPropertyDTO {
    id: number;
    title: string;
    price: number;
    province?: string;
    district?: string;
    address: string;
    propertyType?: string;
    transactionType?: string;
    imageUrl?: string;
    createdAt: string;
    liked: boolean;
    saved: boolean;
}

export interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
}

export const interactionService = {
    /**
     * Toggle Like/Unlike bài đăng
     * POST /properties/{id}/like
     * Header: Authorization Bearer JWT
     * Response: "Thao tác Like thành công" | "Đã bỏ Like (Unlike) thành công"
     */
    toggleLike: async (propertyId: number): Promise<string> => {
        const response = await apiClient.post<string>(
            `/properties/${propertyId}/like`,
            null
        );
        return response.data;
    },

    /**
     * Toggle Save/Unsave bài đăng
     * POST /properties/{id}/save
     * Header: Authorization Bearer JWT
     * Response: "Đã lưu tin thành công" | "Đã bỏ lưu (Unsave) thành công"
     */
    toggleSave: async (propertyId: number): Promise<string> => {
        const response = await apiClient.post<string>(
            `/properties/${propertyId}/save`,
            null
        );
        return response.data;
    },

    /**
     * Lấy danh sách BĐS đã Like
     * GET /properties/me/liked?page=0&size=10
     * Header: Authorization Bearer JWT
     */
    getLikedProperties: async (
        page = 0,
        size = 10
    ): Promise<PageResponse<InteractionPropertyDTO>> => {
        const response = await apiClient.get<PageResponse<InteractionPropertyDTO>>(
            '/properties/me/liked',
            { params: { page, size } }
        );
        return response.data;
    },

    /**
     * Lấy danh sách BĐS đã Lưu
     * GET /properties/me/saved?page=0&size=10
     * Header: Authorization Bearer JWT
     */
    getSavedProperties: async (
        page = 0,
        size = 10
    ): Promise<PageResponse<InteractionPropertyDTO>> => {
        const response = await apiClient.get<PageResponse<InteractionPropertyDTO>>(
            '/properties/me/saved',
            { params: { page, size } }
        );
        return response.data;
    },
};
