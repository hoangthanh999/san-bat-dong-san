import { create } from 'zustand';
import { interactionService, InteractionPropertyDTO } from '../services/api/interaction';

interface InteractionState {
    // Cache trạng thái like/save theo propertyId
    likedIds: Set<number>;
    savedIds: Set<number>;

    // Danh sách BĐS đã lưu (tab profile)
    savedProperties: InteractionPropertyDTO[];
    savedPage: number;
    savedHasMore: boolean;
    isLoadingSaved: boolean;

    // Danh sách BĐS đã thích
    likedProperties: InteractionPropertyDTO[];
    likedPage: number;
    likedHasMore: boolean;
    isLoadingLiked: boolean;

    // Actions
    toggleLike: (propertyId: number) => Promise<void>;
    toggleSave: (propertyId: number) => Promise<void>;
    isLiked: (propertyId: number) => boolean;
    isSaved: (propertyId: number) => boolean;
    setLiked: (propertyId: number, value: boolean) => void;
    setSaved: (propertyId: number, value: boolean) => void;

    fetchSavedProperties: (reset?: boolean) => Promise<void>;
    loadMoreSaved: () => Promise<void>;

    fetchLikedProperties: (reset?: boolean) => Promise<void>;
    loadMoreLiked: () => Promise<void>;
}

export const useInteractionStore = create<InteractionState>((set, get) => ({
    likedIds: new Set<number>(),
    savedIds: new Set<number>(),

    savedProperties: [],
    savedPage: 0,
    savedHasMore: true,
    isLoadingSaved: false,

    likedProperties: [],
    likedPage: 0,
    likedHasMore: true,
    isLoadingLiked: false,

    // ===========================
    // Getters (check cache)
    // ===========================
    isLiked: (propertyId: number) => get().likedIds.has(propertyId),
    isSaved: (propertyId: number) => get().savedIds.has(propertyId),

    setLiked: (propertyId: number, value: boolean) => {
        set(state => {
            const next = new Set(state.likedIds);
            if (value) next.add(propertyId);
            else next.delete(propertyId);
            return { likedIds: next };
        });
    },

    setSaved: (propertyId: number, value: boolean) => {
        set(state => {
            const next = new Set(state.savedIds);
            if (value) next.add(propertyId);
            else next.delete(propertyId);
            return { savedIds: next };
        });
    },

    // ===========================
    // Toggle Like
    // POST /properties/{id}/like
    // ===========================
    toggleLike: async (propertyId: number) => {
        const wasLiked = get().isLiked(propertyId);
        // Optimistic update
        get().setLiked(propertyId, !wasLiked);
        try {
            await interactionService.toggleLike(propertyId);
        } catch (e) {
            // Rollback on error
            get().setLiked(propertyId, wasLiked);
            throw e;
        }
    },

    // ===========================
    // Toggle Save
    // POST /properties/{id}/save
    // ===========================
    toggleSave: async (propertyId: number) => {
        const wasSaved = get().isSaved(propertyId);
        // Optimistic update
        get().setSaved(propertyId, !wasSaved);
        try {
            await interactionService.toggleSave(propertyId);
            // Nếu vừa unsave thì xóa khỏi savedProperties list
            if (wasSaved) {
                set(state => ({
                    savedProperties: state.savedProperties.filter(p => p.id !== propertyId),
                }));
            }
        } catch (e) {
            // Rollback on error
            get().setSaved(propertyId, wasSaved);
            throw e;
        }
    },

    // ===========================
    // Saved Properties List
    // GET /properties/me/saved
    // ===========================
    fetchSavedProperties: async (reset = true) => {
        if (get().isLoadingSaved) return;
        set({ isLoadingSaved: true });
        try {
            const page = reset ? 0 : get().savedPage;
            const data = await interactionService.getSavedProperties(page, 10);

            // Cập nhật cache savedIds
            const savedSet = new Set(get().savedIds);
            data.content.forEach(p => savedSet.add(p.id));

            set(state => ({
                savedProperties: reset ? data.content : [...state.savedProperties, ...data.content],
                savedPage: data.number,
                savedHasMore: !data.last,
                isLoadingSaved: false,
                savedIds: savedSet,
            }));
        } catch {
            set({ isLoadingSaved: false });
        }
    },

    loadMoreSaved: async () => {
        const { savedHasMore, isLoadingSaved, savedPage } = get();
        if (!savedHasMore || isLoadingSaved) return;
        set({ isLoadingSaved: true });
        try {
            const data = await interactionService.getSavedProperties(savedPage + 1, 10);
            const savedSet = new Set(get().savedIds);
            data.content.forEach(p => savedSet.add(p.id));
            set(state => ({
                savedProperties: [...state.savedProperties, ...data.content],
                savedPage: data.number,
                savedHasMore: !data.last,
                isLoadingSaved: false,
                savedIds: savedSet,
            }));
        } catch {
            set({ isLoadingSaved: false });
        }
    },

    // ===========================
    // Liked Properties List
    // GET /properties/me/liked
    // ===========================
    fetchLikedProperties: async (reset = true) => {
        if (get().isLoadingLiked) return;
        set({ isLoadingLiked: true });
        try {
            const page = reset ? 0 : get().likedPage;
            const data = await interactionService.getLikedProperties(page, 10);

            const likedSet = new Set(get().likedIds);
            data.content.forEach(p => likedSet.add(p.id));

            set(state => ({
                likedProperties: reset ? data.content : [...state.likedProperties, ...data.content],
                likedPage: data.number,
                likedHasMore: !data.last,
                isLoadingLiked: false,
                likedIds: likedSet,
            }));
        } catch {
            set({ isLoadingLiked: false });
        }
    },

    loadMoreLiked: async () => {
        const { likedHasMore, isLoadingLiked, likedPage } = get();
        if (!likedHasMore || isLoadingLiked) return;
        set({ isLoadingLiked: true });
        try {
            const data = await interactionService.getLikedProperties(likedPage + 1, 10);
            const likedSet = new Set(get().likedIds);
            data.content.forEach(p => likedSet.add(p.id));
            set(state => ({
                likedProperties: [...state.likedProperties, ...data.content],
                likedPage: data.number,
                likedHasMore: !data.last,
                isLoadingLiked: false,
                likedIds: likedSet,
            }));
        } catch {
            set({ isLoadingLiked: false });
        }
    },
}));
