import apiClient from './client';
import { API_ENDPOINTS } from '../../constants';
import {
    PropertyAnalyticsResponse,
    WardPriceDTO,
    RegionTransactionStat,
} from '../../types';

type AnalyticsParams = Record<string, string | number | undefined | null>;

function compactParams<T extends AnalyticsParams>(params?: T) {
    return Object.fromEntries(
        Object.entries(params ?? {}).filter(([, value]) => (
            value !== undefined && value !== null && value !== ''
        ))
    );
}

/**
 * Analytics Service
 * Tất cả đi qua apiClient (nginx /api/v1/analytics → search-service:8088)
 * Backend: PropertyAnalyticsController
 *
 * ⚠️ Backend trả ResponseEntity<T> trực tiếp (KHÔNG dùng ApiResponse wrapper)
 * → Interceptor sẽ KHÔNG unwrap "result" field → response.data là data thật
 */
export const analyticsService = {
    /**
     * Xu hướng giá theo thời gian
     * GET /api/v1/analytics/price-trends
     * @param transactionType  Bắt buộc: "FOR_RENT" | "FOR_SALE"
     * @param province         Tùy chọn: lọc theo tỉnh/thành
     * @param district         Tùy chọn: lọc theo quận/huyện
     * @param ward             Tùy chọn: lọc theo phường/xã
     * @param propertyType     Tùy chọn: "APARTMENT" | "HOUSE" | "LAND" | "ROOM"
     */
    getPriceTrends: async (params: {
        transactionType: 'FOR_RENT' | 'FOR_SALE';
        province?: string;
        district?: string;
        ward?: string;
        propertyType?: string;
    }): Promise<PropertyAnalyticsResponse> => {
        const response = await apiClient.get<PropertyAnalyticsResponse>(
            API_ENDPOINTS.ANALYTICS_PRICE_TRENDS,
            { params: compactParams(params), _silentError: true } as any
        );
        return response.data;
    },

    /**
     * Giá trung bình theo phường/xã trong một quận
     * GET /api/v1/analytics/ward-prices
     * @param district         Bắt buộc: tên quận
     * @param transactionType  Bắt buộc: "FOR_RENT" | "FOR_SALE"
     * @param province         Tùy chọn
     * @param propertyType     Tùy chọn
     */
    getWardPrices: async (params: {
        district?: string;
        transactionType: 'FOR_RENT' | 'FOR_SALE';
        province?: string;
        propertyType?: string;
    }): Promise<WardPriceDTO[]> => {
        const response = await apiClient.get<WardPriceDTO[]>(
            API_ENDPOINTS.ANALYTICS_WARD_PRICES,
            { params: compactParams(params), _silentError: true } as any
        );
        return response.data;
    },

    /**
     * Top khu vực có nhiều giao dịch nhất
     * GET /api/v1/analytics/top-regions
     * @param limit       Số khu vực trả về (default: 5)
     * @param regionField Field group by: "province.keyword" | "district.keyword" (default: province)
     */
    getTopRegions: async (params?: {
        limit?: number;
        regionField?: string;
    }): Promise<RegionTransactionStat[]> => {
        const response = await apiClient.get<RegionTransactionStat[]>(
            API_ENDPOINTS.ANALYTICS_TOP_REGIONS,
            { params: compactParams({ limit: 5, ...params }), _silentError: true } as any
        );
        return response.data;
    },
};
