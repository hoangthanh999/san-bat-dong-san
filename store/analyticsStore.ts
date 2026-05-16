import { create } from 'zustand';
import {
    PropertyAnalyticsResponse,
    MarketInsight,
    PriceTrendItem,
    WardPriceDTO,
    RegionTransactionStat,
} from '../types';
import { analyticsService } from '../services/api/analytics';

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

// Danh sách quận TPHCM (mock để render picker — user có thể chọn)
export const HCM_DISTRICTS = [
    'Quận 1', 'Quận 2', 'Quận 3', 'Quận 4', 'Quận 5',
    'Quận 6', 'Quận 7', 'Quận 8', 'Quận 9', 'Quận 10',
    'Quận 11', 'Quận 12', 'Bình Thạnh', 'Gò Vấp', 'Phú Nhuận',
    'Tân Bình', 'Tân Phú', 'Thủ Đức', 'Bình Dương', 'Hà Nội',
];

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
    transactionType: 'FOR_RENT',
    priceTrends: [],
    marketInsights: null,
    isLoadingTrends: false,
    topRegions: [],
    isLoadingRegions: false,
    wardPrices: [],
    selectedDistrict: 'Quận 1',
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
                ...(province ? { province } : {}),
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
                error: error.message || 'Không tải được dữ liệu xu hướng giá',
                // Fallback mock data để UI không trống
                priceTrends: MOCK_TRENDS,
                marketInsights: MOCK_INSIGHTS,
            });
        }
    },

    /**
     * Lấy top khu vực giao dịch nhiều nhất
     * GET /api/v1/analytics/top-regions?limit=5
     */
    fetchTopRegions: async () => {
        set({ isLoadingRegions: true });
        try {
            const data = await analyticsService.getTopRegions({ limit: 5 });
            set({ topRegions: data, isLoadingRegions: false });
        } catch (error: any) {
            console.error('[analyticsStore] fetchTopRegions error:', error.message);
            set({ isLoadingRegions: false, topRegions: MOCK_REGIONS });
        }
    },

    /**
     * Lấy giá theo phường/xã trong quận đang chọn
     * GET /api/v1/analytics/ward-prices?district=X&transactionType=Y
     */
    fetchWardPrices: async () => {
        const { transactionType, selectedDistrict } = get();
        if (!selectedDistrict) return;
        set({ isLoadingWards: true });
        try {
            const data = await analyticsService.getWardPrices({
                district: selectedDistrict,
                transactionType,
            });
            set({ wardPrices: data, isLoadingWards: false });
        } catch (error: any) {
            console.error('[analyticsStore] fetchWardPrices error:', error.message);
            set({ isLoadingWards: false, wardPrices: [] });
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

// ──────────────────────────────────────────
// MOCK DATA (fallback khi API lỗi / chưa có data)
// ──────────────────────────────────────────
const MOCK_TRENDS: PriceTrendItem[] = [
    { month: '2024-10', averagePrice: 9800000, totalPosts: 145 },
    { month: '2024-11', averagePrice: 10200000, totalPosts: 162 },
    { month: '2024-12', averagePrice: 10500000, totalPosts: 178 },
    { month: '2025-01', averagePrice: 10800000, totalPosts: 190 },
    { month: '2025-02', averagePrice: 11200000, totalPosts: 205 },
    { month: '2025-03', averagePrice: 11500000, totalPosts: 220 },
];

const MOCK_INSIGHTS: MarketInsight = {
    popularPriceText: '8 – 15 triệu',
    popularPriceUnit: 'VND/tháng',
    popularPriceLabel: 'Phân khúc phổ biến nhất',
    yearlyGrowthPercent: 17.3,
    yearlyGrowthTrend: 'UP',
    yearlyGrowthLabel: 'Tăng trưởng năm 2024',
    diffFromPeakPercent: 8.5,
    diffFromPeakTrend: 'DOWN',
    diffFromPeakLabel: 'Cách đỉnh Q3/2023',
};

const MOCK_REGIONS: RegionTransactionStat[] = [
    { regionName: 'Hồ Chí Minh', totalPosts: 4520, forSaleCount: 1820, forRentCount: 2700 },
    { regionName: 'Hà Nội', totalPosts: 3840, forSaleCount: 1640, forRentCount: 2200 },
    { regionName: 'Bình Dương', totalPosts: 1280, forSaleCount: 780, forRentCount: 500 },
    { regionName: 'Đồng Nai', totalPosts: 960, forSaleCount: 610, forRentCount: 350 },
    { regionName: 'Đà Nẵng', totalPosts: 740, forSaleCount: 420, forRentCount: 320 },
];
