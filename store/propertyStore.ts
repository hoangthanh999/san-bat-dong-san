import { create } from 'zustand';
import { Room, RoomFilters, SearchParams, ReelsFeedResponse, PropertyReelItem } from '../types';
import { roomService } from '../services/api/rooms';
import { DEFAULT_PAGE_SIZE } from '../constants';

interface PropertyState {
    rooms: Room[];
    featuredRooms: Room[];
    currentRoom: Room | null;
    isLoading: boolean;
    isLoadingMore: boolean;
    error: string | null;
    filters: RoomFilters;
    searchParams: SearchParams;
    page: number;
    totalElements: number;
    hasMore: boolean;

    // Reels state
    reels: PropertyReelItem[];
    reelsCursor: string | null;
    reelsHasMore: boolean;
    isLoadingReels: boolean;

    // Actions
    fetchRooms: () => Promise<void>;
    loadMoreRooms: () => Promise<void>;
    fetchRoomDetail: (id: number) => Promise<void>;
    setFilters: (filters: RoomFilters) => void;
    resetFilters: () => void;
    toggleFavorite: (id: number) => Promise<void>;

    // Search results (từ search-service)
    searchResults: Room[] | null;   // null = chưa search, [] = search không có kết quả
    setSearchResults: (results: any) => void;
    clearSearchResults: () => void;

    // Reels actions
    fetchReels: (guestId?: string) => Promise<void>;
    loadMoreReels: (guestId?: string) => Promise<void>;

    // Interaction actions
    toggleLike: (id: number, guestId?: string) => Promise<string>;
    toggleSave: (id: number, guestId?: string) => Promise<string>;
}

const initialFilters: RoomFilters = {};

export const usePropertyStore = create<PropertyState>((set, get) => ({
    rooms: [],
    featuredRooms: [],
    currentRoom: null,
    isLoading: false,
    isLoadingMore: false,
    error: null,
    filters: initialFilters,
    searchParams: { page: 0, size: DEFAULT_PAGE_SIZE },
    page: 0,
    totalElements: 0,
    hasMore: true,
    searchResults: null,

    // Reels state
    reels: [],
    reelsCursor: null,
    reelsHasMore: true,
    isLoadingReels: false,

    /**
     * Lấy danh sách bài đăng công khai
     * GET /public/properties?page=0&size=10
     */
    fetchRooms: async () => {
        set({ isLoading: true, error: null, page: 0 });
        try {
            const { searchParams } = get();
            const response = await roomService.getRooms({ ...searchParams, page: 0 });

            set({
                rooms: response.content,
                totalElements: response.totalElements,
                page: response.number,
                hasMore: !response.last,
                isLoading: false
            });
        } catch (error: any) {
            set({
                error: error.message || 'Lấy danh sách phòng thất bại',
                isLoading: false
            });
        }
    },

    /**
     * Tải thêm bài đăng (infinite scroll)
     */
    loadMoreRooms: async () => {
        const { hasMore, isLoadingMore, searchParams, page, rooms } = get();
        if (!hasMore || isLoadingMore || get().isLoading) return;

        set({ isLoadingMore: true });
        try {
            const nextPage = page + 1;
            const response = await roomService.getRooms({
                ...searchParams,
                page: nextPage,
            });

            set({
                rooms: [...rooms, ...response.content],
                page: response.number,
                hasMore: !response.last,
                isLoadingMore: false
            });
        } catch (error: any) {
            set({
                error: error.message || 'Lỗi khi tải thêm danh sách',
                isLoadingMore: false
            });
        }
    },

    /**
     * Lấy chi tiết 1 bài đăng
     * GET /public/properties/{id}
     */
    fetchRoomDetail: async (id: number) => {
        set({ isLoading: true, error: null, currentRoom: null });
        try {
            const room = await roomService.getRoomDetail(id);
            set({
                currentRoom: room,
                isLoading: false
            });
        } catch (error: any) {
            set({
                error: error.message || 'Lỗi khi tải chi tiết phòng',
                isLoading: false
            });
        }
    },

    setFilters: (filters: RoomFilters) => {
        set({ filters: { ...get().filters, ...filters } });
    },

    resetFilters: () => {
        set({ filters: initialFilters });
    },

    // Search results từ search-service
    setSearchResults: (page: any) => {
        // page là Page<PropertySearchItemDTO> từ search-service
        // Map sang Room[] để hiển thị chung với rooms
        const items = page?.content ?? [];
        const mapped: Room[] = items.map((item: any) => ({
            id: item.id,
            title: item.title,
            price: item.price,
            area: item.area,
            address: item.address,
            province: item.province,
            district: item.district,
            ward: item.ward,
            street: item.street,
            propertyType: item.propertyType,
            transactionType: item.transactionType,
            images: item.thumbnail ? [item.thumbnail] : [],
            status: 'ACTIVE' as any,
            ownerId: 0,
            bedrooms: item.bedrooms,
            bathrooms: item.bathrooms,
            hasBalcony: item.hasBalcony,
            furnishingStatus: item.furnishingStatus,
            latitude: item.latitude ?? 0,
            longitude: item.longitude ?? 0,
            createdAt: item.createdAt,
        }));
        set({ searchResults: mapped });
    },

    clearSearchResults: () => {
        set({ searchResults: null });
    },

    toggleFavorite: async (id: number) => {
        try {
            // Dùng Save API thật của backend: POST /properties/{id}/save
            await roomService.toggleSave(id);
        } catch (error: any) {
            console.error('Lỗi khi lưu/bỏ lưu', error);
        }
    },

    // ============================================================
    // REELS
    // ============================================================

    /**
     * Lấy feed reels (lần đầu)
     * GET /public/properties/reels?size=10
     */
    fetchReels: async (guestId?: string) => {
        set({ isLoadingReels: true, error: null });
        try {
            const response = await roomService.getReelsFeed(undefined, 10, guestId);
            set({
                reels: response.items,
                reelsCursor: response.nextCursor,
                reelsHasMore: response.hasNext,
                isLoadingReels: false,
            });
        } catch (error: any) {
            set({
                error: error.message || 'Lỗi khi tải reels',
                isLoadingReels: false,
            });
        }
    },

    /**
     * Tải thêm reels (infinite scroll theo cursor)
     * GET /public/properties/reels?cursor=xxx&size=10
     */
    loadMoreReels: async (guestId?: string) => {
        const { reelsHasMore, isLoadingReels, reelsCursor, reels } = get();
        if (!reelsHasMore || isLoadingReels) return;

        set({ isLoadingReels: true });
        try {
            const response = await roomService.getReelsFeed(reelsCursor || undefined, 10, guestId);
            set({
                reels: [...reels, ...response.items],
                reelsCursor: response.nextCursor,
                reelsHasMore: response.hasNext,
                isLoadingReels: false,
            });
        } catch (error: any) {
            set({
                error: error.message || 'Lỗi khi tải thêm reels',
                isLoadingReels: false,
            });
        }
    },

    // ============================================================
    // INTERACTIONS
    // ============================================================

    /**
     * Like/Unlike bài đăng
     * POST /properties/{id}/like
     */
    toggleLike: async (id: number, guestId?: string): Promise<string> => {
        try {
            return await roomService.toggleLike(id, guestId);
        } catch (error: any) {
            console.error('Lỗi khi like/unlike', error);
            throw error;
        }
    },

    /**
     * Save/Unsave bài đăng
     * POST /properties/{id}/save
     */
    toggleSave: async (id: number, guestId?: string): Promise<string> => {
        try {
            return await roomService.toggleSave(id, guestId);
        } catch (error: any) {
            console.error('Lỗi khi save/unsave', error);
            throw error;
        }
    },
}));
