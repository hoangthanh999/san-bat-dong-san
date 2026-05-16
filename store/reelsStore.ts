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

    // ── Fetch lần đầu ────────────────────────────────────────
    fetchReels: async () => {
        // Guard: không fetch nếu đang loading
        if (get().loading) return;

        set({ loading: true });
        try {
            const data = await reelsApi.getFeed(10);
            set({
                reels: data.items,
                nextCursor: data.nextCursor,
                hasNext: data.hasNext,
            });
        } catch (e) {
            console.error('[ReelsStore] fetchReels error:', e);
        } finally {
            set({ loading: false });
        }
    },

    // ── Load thêm bằng cursor ─────────────────────────────────
    loadMore: async () => {
        const { hasNext, loading, nextCursor, reels } = get();

        // Guard: không load nếu hết data hoặc đang loading
        // hoặc không có cursor
        if (!hasNext || loading || !nextCursor) return;

        set({ loading: true });
        try {
            const data = await reelsApi.loadMore(nextCursor, 10);
            set({
                // Append vào cuối list, không replace
                reels: [...reels, ...data.items],
                nextCursor: data.nextCursor,
                hasNext: data.hasNext,
            });
        } catch (e) {
            console.error('[ReelsStore] loadMore error:', e);
        } finally {
            set({ loading: false });
        }
    },

    // ── Pull-to-refresh ───────────────────────────────────────
    refresh: async () => {
        // Không check loading vì user chủ động refresh
        set({ refreshing: true });
        try {
            const data = await reelsApi.getFeed(10);
            set({
                // Reset hoàn toàn — không append
                reels: data.items,
                nextCursor: data.nextCursor,
                hasNext: data.hasNext,
                activeIndex: 0,  // scroll về đầu
            });
        } catch (e) {
            console.error('[ReelsStore] refresh error:', e);
        } finally {
            set({ refreshing: false });
        }
    },

    // ── Active index (dùng cho auto-play video sau này) ───────
    setActiveIndex: (index) => set({ activeIndex: index }),
}));