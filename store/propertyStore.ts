import { create } from 'zustand';
import { Room, RoomFilters, SearchParams } from '../types';
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

    // Actions
    fetchRooms: () => Promise<void>;
    loadMoreRooms: () => Promise<void>;
    fetchRoomDetail: (id: number) => Promise<void>;
    searchRooms: (params: SearchParams) => Promise<void>;
    setFilters: (filters: RoomFilters) => void;
    resetFilters: () => void;
    toggleFavorite: (id: number) => Promise<void>;
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

    fetchRooms: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await roomService.getRooms(get().searchParams);

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

    loadMoreRooms: async () => {
        const { hasMore, isLoadingMore, searchParams, page, rooms } = get();
        if (!hasMore || isLoadingMore) return;

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

    fetchRoomDetail: async (id: number) => {
        set({ isLoading: true, error: null, currentRoom: null });
        try {
            const response = await roomService.getRoomDetail(id);
            set({
                currentRoom: response.data,
                isLoading: false
            });
        } catch (error: any) {
            set({
                error: error.message || 'Lỗi khi tải chi tiết phòng',
                isLoading: false
            });
        }
    },

    searchRooms: async (params: SearchParams) => {
        set({ isLoading: true, error: null, searchParams: params, page: 0, hasMore: true });
        try {
            const response = await roomService.searchRooms(params);

            set({
                rooms: response.content,
                totalElements: response.totalElements,
                page: response.number,
                hasMore: !response.last,
                isLoading: false
            });
        } catch (error: any) {
            set({
                error: error.message || 'Lỗi tìm kiếm phòng',
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

    toggleFavorite: async (id: number) => {
        try {
            await roomService.toggleFavorite(id);
            // Optimistic update logic if needed
            // Or just invalidate data
        } catch (error: any) {
            console.error('Lỗi khi thêm vào yêu thích', error);
            // Revert change?
        }
    },
}));
