import { create } from 'zustand';
import { ProjectResponseDTO, Room, PaginatedResponse } from '../types';
import { projectService } from '../services/api/projects';
import { searchService } from '../services/api/search';

interface ProjectState {
    // List
    projects: ProjectResponseDTO[];
    isLoading: boolean;
    isLoadingMore: boolean;
    page: number;
    totalPages: number;
    hasMore: boolean;
    filterType: string | null;

    // Detail
    selectedProject: ProjectResponseDTO | null;
    isLoadingDetail: boolean;

    // Properties in project
    propertiesInProject: Room[];
    isLoadingProperties: boolean;

    // Actions
    fetchProjects: (reset?: boolean) => Promise<void>;
    loadMoreProjects: () => Promise<void>;
    fetchProjectById: (id: number) => Promise<void>;
    fetchPropertiesInProject: (projectId: number, page?: number) => Promise<void>;
    setFilterType: (type: string | null) => void;
    resetDetail: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
    projects: [],
    isLoading: false,
    isLoadingMore: false,
    page: 0,
    totalPages: 0,
    hasMore: true,
    filterType: null,

    selectedProject: null,
    isLoadingDetail: false,

    propertiesInProject: [],
    isLoadingProperties: false,

    /**
     * Lấy danh sách dự án công khai
     * GET /public/projects?page=0&size=10
     */
    fetchProjects: async (reset = true) => {
        if (reset) {
            set({ isLoading: true, projects: [], page: 0, hasMore: true });
        }
        try {
            const response = await projectService.getPublicProjects(0, 10);
            set({
                projects: response.content,
                page: response.number,
                totalPages: response.totalPages,
                hasMore: !response.last,
                isLoading: false,
            });
        } catch (error: any) {
            console.error('[projectStore] fetchProjects error:', error.message);
            set({ isLoading: false });
        }
    },

    /**
     * Load thêm dự án (infinite scroll)
     */
    loadMoreProjects: async () => {
        const { hasMore, isLoadingMore, isLoading, page } = get();
        if (!hasMore || isLoadingMore || isLoading) return;

        set({ isLoadingMore: true });
        try {
            const nextPage = page + 1;
            const response = await projectService.getPublicProjects(nextPage, 10);
            set((state) => ({
                projects: [...state.projects, ...response.content],
                page: response.number,
                hasMore: !response.last,
                isLoadingMore: false,
            }));
        } catch (error: any) {
            console.error('[projectStore] loadMoreProjects error:', error.message);
            set({ isLoadingMore: false });
        }
    },

    /**
     * Lấy chi tiết dự án
     * GET /public/projects/{id}
     */
    fetchProjectById: async (id: number) => {
        set({ isLoadingDetail: true, selectedProject: null });
        try {
            const project = await projectService.getPublicProjectDetail(id);
            set({ selectedProject: project, isLoadingDetail: false });
        } catch (error: any) {
            console.error('[projectStore] fetchProjectById error:', error.message);
            set({ isLoadingDetail: false });
        }
    },

    /**
     * Lấy danh sách BĐS trong dự án
     * GET /search/properties?projectId=X
     */
    fetchPropertiesInProject: async (projectId: number, page = 0) => {
        set({ isLoadingProperties: true });
        try {
            const response = await searchService.searchProperties({
                projectId,
                page,
                size: 20,
                sortBy: 'createdAt',
                sortDir: 'desc',
            });

            // Map PropertySearchItem → Room for display
            const rooms: Room[] = response.content.map((item) => ({
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

            set({ propertiesInProject: rooms, isLoadingProperties: false });
        } catch (error: any) {
            console.error('[projectStore] fetchPropertiesInProject error:', error.message);
            set({ isLoadingProperties: false, propertiesInProject: [] });
        }
    },

    setFilterType: (type: string | null) => set({ filterType: type }),

    resetDetail: () => set({
        selectedProject: null,
        propertiesInProject: [],
        isLoadingDetail: false,
        isLoadingProperties: false,
    }),
}));
