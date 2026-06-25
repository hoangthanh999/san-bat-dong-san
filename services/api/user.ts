import apiClient from './client';
import { API_ENDPOINTS } from '../../constants';
import { User, CustomerResponseDTO, CustomerProfileDTO, Room, Favorite, PaginatedResponse } from '../../types';
import { getApiBaseUrl } from './environment';
import { getAccessToken } from '../storage/tokenStorage';

export interface UserSummaryDTO {
    id: number;
    fullName: string;
    avatarUrl?: string;
}

/**
 * Cache summary theo userId — lưu cả Promise đang chạy để tránh gọi song song
 * Nếu đã fail, cache kết quả null để không spam API lỗi lặp lại trong session
 */
const _userSummaryCache = new Map<number, Promise<UserSummaryDTO | null>>();

/**
 * Lấy user summary an toàn, không throw, không log đỏ, không toast.
 * Dùng cho tất cả nơi gọi summary phụ trợ (comment author, chat avatar, landlord profile).
 * - Mỗi userId catch riêng.
 * - Cache kết quả (kể cả fail → null) trong session.
 * - Dùng _silentError để apiClient interceptor không log console.error / show toast.
 */
export async function getUserSummarySilent(userId: number): Promise<UserSummaryDTO | null> {
    if (!userId || isNaN(userId)) return null;

    if (!_userSummaryCache.has(userId)) {
        _userSummaryCache.set(
            userId,
            apiClient
                .get<UserSummaryDTO>(API_ENDPOINTS.CUSTOMER_SUMMARY(userId), {
                    _silentError: true,
                } as any)
                .then(res => {
                    // apiClient interceptor đã unwrap .result nếu có
                    return res.data ?? null;
                })
                .catch(() => {
                    console.warn(`[UserSummary] Không lấy được summary user ${userId}, dùng fallback`);
                    return null;
                }),
        );
    }

    return _userSummaryCache.get(userId)!;
}

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
        const token = await getAccessToken();
        const response = await fetch(`${await getApiBaseUrl()}${API_ENDPOINTS.CUSTOMER_AVATAR}`, {
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
        const token = await getAccessToken();
        const response = await fetch(`${await getApiBaseUrl()}${API_ENDPOINTS.CUSTOMER_BANNER}`, {
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
     * Lấy banner công khai của chủ nhà theo slug
     * GET /customers/{slug}/public-banner
     * Response: { bannerUrl: string }
     */
    getPublicBanner: async (slug: string): Promise<{ bannerUrl: string }> => {
        const response = await apiClient.get<{ bannerUrl: string }>(API_ENDPOINTS.CUSTOMER_PUBLIC_BANNER(slug));
        return response.data;
    },

    /**
     * Lấy thông tin gọn của user theo id
     * GET /customers/{id}/summary
     */
    getUserSummary: async (id: number): Promise<UserSummaryDTO> => {
        const response = await apiClient.get<UserSummaryDTO>(API_ENDPOINTS.CUSTOMER_SUMMARY(id));
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
    // LƯU Ý: Backend KHÔNG có API riêng cho "Favorites list".
    // Chức năng "Lưu tin" dùng POST /properties/{id}/save (toggle)
    // nhưng KHÔNG có endpoint để lấy danh sách bài đã lưu.
    // ============================================================
};
