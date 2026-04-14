import apiClient from './client';
import { API_ENDPOINTS } from '../../constants';
import { Room, PropertyRequestDTO, SearchParams, PaginatedResponse, ReelsFeedResponse } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../constants';

/**
 * Tất cả property endpoints đi qua apiClient (nginx gateway)
 * Nginx đã route: /public/properties, /properties, /admin/properties → property-service:8086
 */
export const roomService = {
    // ============================================================
    // PUBLIC ENDPOINTS (không cần auth)
    // ============================================================

    /**
     * Danh sách bài đăng công khai (trang chủ)
     * GET /public/properties?page=0&size=10
     */
    getRooms: async (params: SearchParams): Promise<PaginatedResponse<Room>> => {
        const response = await apiClient.get<PaginatedResponse<Room>>(API_ENDPOINTS.PUBLIC_PROPERTIES, {
            params: { page: params.page || 0, size: params.size || 10 },
        });
        return response.data;
    },

    /**
     * Chi tiết 1 bài đăng (public)
     * GET /public/properties/{id}
     */
    getRoomDetail: async (id: number): Promise<Room> => {
        const response = await apiClient.get<Room>(API_ENDPOINTS.PUBLIC_PROPERTY_DETAIL(id));
        return response.data;
    },

    /**
     * Bài đăng của 1 chủ nhà (public)
     * GET /public/properties/owners/{ownerId}?page=0&size=10
     */
    getPropertiesByLandlord: async (landlordId: number, page = 0, size = 10): Promise<PaginatedResponse<Room>> => {
        const response = await apiClient.get<PaginatedResponse<Room>>(
            API_ENDPOINTS.PUBLIC_PROPERTIES_BY_OWNER(landlordId),
            { params: { page, size } }
        );
        return response.data;
    },

    /**
     * Lướt Reels (Video ngắn)
     * GET /public/properties/reels?cursor=xxx&size=10
     * Header: X-Guest-Id (optional, bắt buộc nếu chưa đăng nhập)
     */
    getReelsFeed: async (cursor?: string, size: number = 10, guestId?: string): Promise<ReelsFeedResponse> => {
        const headers: Record<string, string> = {};
        if (guestId) {
            headers['X-Guest-Id'] = guestId;
        }

        const response = await apiClient.get<ReelsFeedResponse>(API_ENDPOINTS.PUBLIC_PROPERTIES_REELS, {
            params: { ...(cursor ? { cursor } : {}), size },
            headers,
        });
        return response.data;
    },

    // ============================================================
    // OWNER ENDPOINTS (yêu cầu JWT + role OWNER)
    // ============================================================

    /**
     * Tạo bài đăng mới
     * POST /properties — body: PropertyCreateDTO (JSON)
     */
    createRoom: async (data: PropertyRequestDTO): Promise<Room> => {
        const response = await apiClient.post<Room>(API_ENDPOINTS.OWNER_PROPERTIES, data);
        return response.data;
    },

    /**
     * Cập nhật bài đăng
     * PUT /properties/{id} — body: PropertyCreateDTO (JSON)
     */
    updateRoom: async (id: number, data: PropertyRequestDTO): Promise<Room> => {
        const response = await apiClient.put<Room>(API_ENDPOINTS.OWNER_PROPERTY_DETAIL(id), data);
        return response.data;
    },

    /**
     * Xóa mềm bài đăng (chuyển vào thùng rác)
     * DELETE /properties/{id}
     */
    deleteRoom: async (id: number): Promise<void> => {
        await apiClient.delete(API_ENDPOINTS.OWNER_PROPERTY_DETAIL(id));
    },

    /**
     * Xem thùng rác của chủ nhà
     * GET /properties/trash?page=0&size=10
     */
    getMyTrash: async (page = 0, size = 10): Promise<PaginatedResponse<Room>> => {
        const response = await apiClient.get<PaginatedResponse<Room>>(API_ENDPOINTS.OWNER_PROPERTY_TRASH, {
            params: { page, size },
        });
        return response.data;
    },

    /**
     * Khôi phục bài đăng từ thùng rác
     * PUT /properties/{id}/restore
     */
    restoreProperty: async (id: number): Promise<void> => {
        await apiClient.put(API_ENDPOINTS.OWNER_PROPERTY_RESTORE(id));
    },

    /**
     * Xóa vĩnh viễn bài đăng
     * DELETE /properties/{id}/force
     */
    hardDeleteProperty: async (id: number): Promise<void> => {
        await apiClient.delete(API_ENDPOINTS.OWNER_PROPERTY_HARD_DELETE(id));
    },

    // ============================================================
    // INTERACTION ENDPOINTS (cần userId hoặc guestId)
    // ============================================================

    /**
     * Like/Unlike bài đăng
     * POST /properties/{id}/like
     * Header: X-Guest-Id (optional - bắt buộc nếu chưa đăng nhập)
     */
    toggleLike: async (id: number, guestId?: string): Promise<string> => {
        const headers: Record<string, string> = {};
        if (guestId) {
            headers['X-Guest-Id'] = guestId;
        }

        const response = await apiClient.post<string>(API_ENDPOINTS.PROPERTY_LIKE(id), null, { headers });
        return response.data;
    },

    /**
     * Save/Unsave bài đăng
     * POST /properties/{id}/save
     * Header: X-Guest-Id (optional - bắt buộc nếu chưa đăng nhập)
     */
    toggleSave: async (id: number, guestId?: string): Promise<string> => {
        const headers: Record<string, string> = {};
        if (guestId) {
            headers['X-Guest-Id'] = guestId;
        }

        const response = await apiClient.post<string>(API_ENDPOINTS.PROPERTY_SAVE(id), null, { headers });
        return response.data;
    },

    // ============================================================
    // ADMIN ENDPOINTS (yêu cầu JWT + role ADMIN)
    // ============================================================

    /**
     * Danh sách bài đăng cho Admin (có thể lọc theo status)
     * GET /admin/properties?page=0&size=10&status=PENDING
     */
    getAdminProperties: async (page = 0, size = 10, status?: string): Promise<PaginatedResponse<Room>> => {
        const response = await apiClient.get<PaginatedResponse<Room>>(
            API_ENDPOINTS.ADMIN_PROPERTIES,
            { params: { page, size, ...(status ? { status } : {}) } }
        );
        return response.data;
    },

    /**
     * Danh sách bài đăng chờ duyệt (Admin) — shortcut cho status=PENDING
     * GET /admin/properties?status=PENDING&page=0&size=10
     */
    getPendingProperties: async (page = 0, size = 10): Promise<PaginatedResponse<Room>> => {
        const response = await apiClient.get<PaginatedResponse<Room>>(
            API_ENDPOINTS.ADMIN_PROPERTIES,
            { params: { page, size, status: 'PENDING' } }
        );
        return response.data;
    },

    /**
     * Chi tiết bài đăng (Admin - xem cả bài ẩn/chờ duyệt)
     * GET /admin/properties/{id}
     */
    getAdminPropertyDetail: async (id: number): Promise<Room> => {
        const response = await apiClient.get<Room>(API_ENDPOINTS.ADMIN_PROPERTY_DETAIL(id));
        return response.data;
    },

    /**
     * Duyệt / Đổi trạng thái bài đăng (Admin)
     * PATCH /admin/properties/{id}/status?status=APPROVED
     */
    updatePropertyStatus: async (id: number, status: string): Promise<void> => {
        await apiClient.patch(API_ENDPOINTS.ADMIN_PROPERTY_STATUS(id), null, {
            params: { status },
        });
    },

    /**
     * Gỡ bài vi phạm - soft delete (Admin)
     * DELETE /admin/properties/{id}
     */
    adminDeleteProperty: async (id: number): Promise<void> => {
        await apiClient.delete(API_ENDPOINTS.ADMIN_PROPERTY_DELETE(id));
    },

    /**
     * Xem thùng rác (Admin)
     * GET /admin/properties/trash?page=0&size=10
     */
    getAdminTrash: async (page = 0, size = 10): Promise<PaginatedResponse<Room>> => {
        const response = await apiClient.get<PaginatedResponse<Room>>(API_ENDPOINTS.ADMIN_PROPERTY_TRASH, {
            params: { page, size },
        });
        return response.data;
    },

    /**
     * Khôi phục bài đăng (Admin)
     * PUT /admin/properties/{id}/restore
     */
    adminRestoreProperty: async (id: number): Promise<void> => {
        await apiClient.put(API_ENDPOINTS.ADMIN_PROPERTY_RESTORE(id));
    },

    /**
     * Xóa vĩnh viễn (Admin)
     * DELETE /admin/properties/{id}/force
     */
    adminHardDeleteProperty: async (id: number): Promise<void> => {
        await apiClient.delete(API_ENDPOINTS.ADMIN_PROPERTY_HARD_DELETE(id));
    },

    // ============================================================
    // FEATURES ĐANG PHÁT TRIỂN (chưa có backend endpoint)
    // ============================================================

    // Toggle favorite (chưa có backend)
    toggleFavorite: async (roomId: number): Promise<void> => {
        console.warn('[roomService] toggleFavorite: API chưa có trong backend - đang phát triển');
    },

    // Check if room is favorited (chưa có backend)
    checkFavorite: async (roomId: number): Promise<boolean> => {
        console.warn('[roomService] checkFavorite: API chưa có trong backend - đang phát triển');
        return false;
    },
};
