import apiClient from './client';
import { API_ENDPOINTS } from '../../constants';
import {
    PropertySearchRequest,
    PropertySearchItem,
    PropertyAnalyticsResponse,
    WardPriceDTO,
    RegionTransactionStat,
    PaginatedResponse,
} from '../../types';

/**
 * Search & Analytics Service
 * Tất cả đi qua apiClient (nginx /search, /api/v1/analytics → search-service:8088)
 * Backend: SearchController, PropertyAnalyticsController
 */
export const searchService = {
    /**
     * Tìm kiếm bài đăng nâng cao
     * GET /search/properties — @ModelAttribute PropertySearchRequestDTO (25+ params)
     * Backend: SearchController.search()
     * 
     * Response: ApiResponse<Page<PropertySearchItemDTO>> (unwrapped by interceptor)
     */
    searchProperties: async (params: PropertySearchRequest): Promise<PaginatedResponse<PropertySearchItem>> => {
        const response = await apiClient.get<PaginatedResponse<PropertySearchItem>>(
            API_ENDPOINTS.SEARCH_PROPERTIES,
            {
                params,
                // Spring @ModelAttribute nhận: propertyTypes=X&propertyTypes=Y (lặp key)
                // Không dùng dạng comma-separated
                paramsSerializer: (p) => {
                    const parts: string[] = [];
                    Object.entries(p).forEach(([key, value]) => {
                        if (value === undefined || value === null || value === '') return;
                        if (Array.isArray(value)) {
                            value.forEach(v => parts.push(`${key}=${encodeURIComponent(v)}`));
                        } else {
                            parts.push(`${key}=${encodeURIComponent(value)}`);
                        }
                    });
                    return parts.join('&');
                },
            }
        );
        return response.data;
    },

    /**
     * Xu hướng giá theo thời gian
     * GET /api/v1/analytics/price-trends
     * Backend: PropertyAnalyticsController.getPriceTrends()
     * 
     * Response: ResponseEntity<PropertyAnalyticsResponse> (không dùng ApiResponse wrapper)
     */
    getPriceTrends: async (params: {
        province?: string;
        district?: string;
        ward?: string;
        propertyType?: string;
        transactionType: string;    // Bắt buộc: "FOR_RENT" | "FOR_SALE"
    }): Promise<PropertyAnalyticsResponse> => {
        const response = await apiClient.get<PropertyAnalyticsResponse>(
            API_ENDPOINTS.ANALYTICS_PRICE_TRENDS,
            { params }
        );
        return response.data;
    },

    /**
     * Giá theo phường/xã
     * GET /api/v1/analytics/ward-prices
     * Backend: PropertyAnalyticsController.getWardPrices()
     * 
     * Response: ResponseEntity<List<WardPriceDTO>>
     */
    getWardPrices: async (params: {
        province?: string;
        district: string;           // Bắt buộc
        propertyType?: string;
        transactionType: string;    // Bắt buộc
    }): Promise<WardPriceDTO[]> => {
        const response = await apiClient.get<WardPriceDTO[]>(
            API_ENDPOINTS.ANALYTICS_WARD_PRICES,
            { params }
        );
        return response.data;
    },

    /**
     * Top khu vực giao dịch nhiều nhất
     * GET /api/v1/analytics/top-regions
     * Backend: PropertyAnalyticsController.getTopRegions()
     * 
     * Response: ResponseEntity<List<RegionTransactionStatDTO>>
     */
    getTopRegions: async (params?: {
        limit?: number;             // Default: 5
        regionField?: string;       // Default: 'province.keyword'
    }): Promise<RegionTransactionStat[]> => {
        const response = await apiClient.get<RegionTransactionStat[]>(
            API_ENDPOINTS.ANALYTICS_TOP_REGIONS,
            { params }
        );
        return response.data;
    },
};
