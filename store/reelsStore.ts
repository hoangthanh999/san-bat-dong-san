/**
 * reelsStore.ts
 * Zustand store cho Reels Feed
 *
 * ⚠️  Like/Save KHÔNG quản lý ở đây
 *     → Dùng useInteractionStore (gọi API thật, sync toàn app)
 *
 * Store này chỉ quản lý:
 *   - Danh sách reels
 *   - Cursor-based pagination
 *   - Loading / refreshing state
 *   - Active index (để sau này auto-play video)
 */
import { useInteractionStore } from './interactionStore';
import { create } from 'zustand';
import { reelsApi, PropertyReel } from '../services/api/reels';

// ─── State interface ──────────────────────────────────────────
interface ReelsState {
    // Data
    reels: PropertyReel[];
    nextCursor: string | null;
    hasNext: boolean;

    // UI state
    loading: boolean;
    refreshing: boolean;
    activeIndex: number;
    error: string | null;

    // Actions
    fetchReels: () => Promise<void>;
    loadMore: () => Promise<void>;
    refresh: () => Promise<void>;
    setActiveIndex: (index: number) => void;
}

// ─── Store ───────────────────────────────────────────────────
export const useReelsStore = create<ReelsState>((set, get) => ({
    // ── Initial state ──
    reels: [],
    nextCursor: null,
    hasNext: true,
    loading: false,
    refreshing: false,
    activeIndex: 0,
    error: null,

    // ── Fetch lần đầu ────────────────────────────────────────
    fetchReels: async () => {
        if (get().loading) return;
        set({ loading: true, error: null });
        try {
            const data = await reelsApi.getFeed(10);
            syncInteractions(data.items); // ✅ thêm dòng này
            set({
                reels: data.items,
                nextCursor: data.nextCursor,
                hasNext: data.hasNext,
            });
        } catch (e) {
            console.error('[ReelsStore] fetchReels error:', e);
            set({ error: 'Không tải được video bất động sản.' });
        } finally {
            set({ loading: false });
        }
    },

    loadMore: async () => {
        const { hasNext, loading, nextCursor, reels } = get();
        if (!hasNext || loading || !nextCursor) return;
        set({ loading: true, error: null });
        try {
            const data = await reelsApi.loadMore(nextCursor, 10);
            syncInteractions(data.items); // ✅ thêm dòng này
            set({
                reels: [...reels, ...data.items],
                nextCursor: data.nextCursor,
                hasNext: data.hasNext,
            });
        } catch (e) {
            console.error('[ReelsStore] loadMore error:', e);
            set({ error: 'Không tải thêm được Reels.' });
        } finally {
            set({ loading: false });
        }
    },

    refresh: async () => {
        set({ refreshing: true, error: null });
        try {
            const data = await reelsApi.getFeed(10);
            syncInteractions(data.items); // ✅ thêm dòng này
            set({
                reels: data.items,
                nextCursor: data.nextCursor,
                hasNext: data.hasNext,
                activeIndex: 0,
            });
        } catch (e) {
            console.error('[ReelsStore] refresh error:', e);
            set({ error: 'Không làm mới được Reels.' });
        } finally {
            set({ refreshing: false });
        }
    },

    setActiveIndex: (index) => set({ activeIndex: index }),
}));
function syncInteractions(items: PropertyReel[]) {
    const { setLiked, setSaved } = useInteractionStore.getState();
    items.forEach(item => {
        setLiked(item.id, item.liked);   // ✅ dùng item.liked
        setSaved(item.id, item.saved);   // ✅ dùng item.saved
    });
}
