import { create } from 'zustand';
import {
    PropertyAnalyticsResponse,
    MarketInsight,
    PriceTrendItem,
    WardPriceDTO,
    RegionTransactionStat,
} from '../types';
import { analyticsService } from '../services/api/analytics';

export const DEFAULT_ANALYTICS_PROVINCE = 'Thành phố Hồ Chí Minh';
export const ALL_HCM_WARDS_LABEL = 'Toàn TP.HCM';
const ANALYTICS_ERROR_MESSAGE = 'Không tải được dữ liệu phân tích thị trường';

interface AnalyticsState {
    // Transaction type filter
    transactionType: 'FOR_RENT' | 'FOR_SALE';

    // Price trends + market insights (from /price-trends)
    priceTrends: PriceTrendItem[];
    marketInsights: MarketInsight | null;
    isLoadingTrends: boolean;

    // Top regions (from /top-regions)
    topRegions: RegionTransactionStat[];
    isLoadingRegions: boolean;

    // Ward prices (from /ward-prices)
    wardPrices: WardPriceDTO[];
    selectedDistrict: string;
    isLoadingWards: boolean;

    // Error
    error: string | null;

    // Actions
    setTransactionType: (type: 'FOR_RENT' | 'FOR_SALE') => void;
    setSelectedDistrict: (district: string) => void;
    fetchPriceTrends: (province?: string) => Promise<void>;
    fetchTopRegions: () => Promise<void>;
    fetchWardPrices: () => Promise<void>;
    fetchAll: () => Promise<void>;
    clearError: () => void;
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
    transactionType: 'FOR_RENT',
    priceTrends: [],
    marketInsights: null,
    isLoadingTrends: false,
    topRegions: [],
    isLoadingRegions: false,
    wardPrices: [],
    selectedDistrict: '',
    isLoadingWards: false,
    error: null,

    setTransactionType: (type) => set({ transactionType: type }),

    setSelectedDistrict: (district) => set({ selectedDistrict: district }),

    /**
     * Lấy xu hướng giá + market insights
     * GET /api/v1/analytics/price-trends?transactionType=X&province=Y
     */
    fetchPriceTrends: async (province?: string) => {
        const { transactionType } = get();
        set({ isLoadingTrends: true, error: null });
        try {
            const data: PropertyAnalyticsResponse = await analyticsService.getPriceTrends({
                transactionType,
                province: province || DEFAULT_ANALYTICS_PROVINCE,
            });
            set({
                priceTrends: data.trends ?? [],
                marketInsights: data.marketInsights ?? null,
                isLoadingTrends: false,
            });
        } catch (error: any) {
            console.error('[analyticsStore] fetchPriceTrends error:', error.message);
            set({
                isLoadingTrends: false,
                error: error.message || ANALYTICS_ERROR_MESSAGE,
                priceTrends: [],
                marketInsights: null,
            });
        }
    },

    /**
     * Lấy top khu vực giao dịch nhiều nhất
     * GET /api/v1/analytics/top-regions?limit=5
     */
    fetchTopRegions: async () => {
        set({ isLoadingRegions: true, error: null });
        try {
            const data = await analyticsService.getTopRegions({ limit: 5 });
            set({ topRegions: data, isLoadingRegions: false });
        } catch (error: any) {
            console.error('[analyticsStore] fetchTopRegions error:', error.message);
            set({
                isLoadingRegions: false,
                topRegions: [],
                error: error.message || ANALYTICS_ERROR_MESSAGE,
            });
        }
    },

    /**
     * Lấy giá theo phường/xã trong quận đang chọn
     * GET /api/v1/analytics/ward-prices?district=X&transactionType=Y
     */
    fetchWardPrices: async () => {
        const { transactionType, selectedDistrict } = get();
        set({ isLoadingWards: true, error: null });
        try {
            const data = await analyticsService.getWardPrices({
                transactionType,
                province: DEFAULT_ANALYTICS_PROVINCE,
                ...(selectedDistrict ? { district: selectedDistrict } : {}),
            });
            set({ wardPrices: data, isLoadingWards: false });
        } catch (error: any) {
            console.error('[analyticsStore] fetchWardPrices error:', error.message);
            set({
                isLoadingWards: false,
                wardPrices: [],
                error: error.message || ANALYTICS_ERROR_MESSAGE,
            });
        }
    },

    /**
     * Tải tất cả dữ liệu analytics cùng lúc
     */
    fetchAll: async () => {
        const store = get();
        await Promise.allSettled([
            store.fetchPriceTrends(),
            store.fetchTopRegions(),
            store.fetchWardPrices(),
        ]);
    },

    clearError: () => set({ error: null }),
}));
