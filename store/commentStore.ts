/**
 * commentStore.ts
 * Zustand store quản lý comment của property.
 * Gọi đúng backend endpoint qua commentService.
 */

import { create } from 'zustand';
import { CommentResponse, CommentRequest } from '../types';
import { commentService } from '../services/api/comments';

interface CommentState {
    // commentsByProperty: propertyId → danh sách comment
    commentsByProperty: Record<number, CommentResponse[]>;
    // repliesByParent: parentId → danh sách reply
    repliesByParent: Record<number, CommentResponse[]>;
    // countByProperty: propertyId → tổng số comment
    countByProperty: Record<number, number>;
    // hasMore: propertyId → còn trang tiếp không
    hasMore: Record<number, boolean>;

    isLoading: boolean;
    isSubmitting: boolean;
    error: string | null;

    // Actions
    fetchComments: (propertyId: number, reset?: boolean) => Promise<void>;
    fetchReplies: (parentId: number) => Promise<void>;
    fetchCount: (propertyId: number) => Promise<void>;
    addComment: (request: CommentRequest) => Promise<CommentResponse>;
    deleteComment: (commentId: number, propertyId: number) => Promise<void>;
    clearError: () => void;
}

export const useCommentStore = create<CommentState>((set, get) => ({
    commentsByProperty: {},
    repliesByParent: {},
    countByProperty: {},
    hasMore: {},
    isLoading: false,
    isSubmitting: false,
    error: null,

    fetchComments: async (propertyId: number, reset = false) => {
        set({ isLoading: true, error: null });
        try {
            const existing = get().commentsByProperty[propertyId] || [];
            const page = reset ? 0 : Math.floor(existing.length / 10);

            const data = await commentService.getComments(propertyId, page, 10);
            // commentService đã normalize → content luôn là array, guard thêm lần nữa để chắc chắn
            const safeContent = Array.isArray(data.content) ? data.content : [];

            set(state => ({
                commentsByProperty: {
                    ...state.commentsByProperty,
                    [propertyId]: reset
                        ? safeContent
                        : [...(state.commentsByProperty[propertyId] || []), ...safeContent],
                },
                countByProperty: {
                    ...state.countByProperty,
                    [propertyId]: data.totalElements ?? safeContent.length,
                },
                hasMore: {
                    ...state.hasMore,
                    [propertyId]: !data.last,
                },
                isLoading: false,
            }));
        } catch (error: any) {
            // Ngay cả khi lỗi vẫn set [] để tránh crash UI
            set(state => ({
                commentsByProperty: { ...state.commentsByProperty, [propertyId]: [] },
                error: error.message || 'Không thể tải bình luận',
                isLoading: false,
            }));
        }
    },

    fetchReplies: async (parentId: number) => {
        try {
            const data = await commentService.getReplies(parentId, 0, 20);
            set(state => ({
                repliesByParent: {
                    ...state.repliesByParent,
                    [parentId]: Array.isArray(data.content) ? data.content : [],
                },
            }));
        } catch (error: any) {
            console.warn('[commentStore] fetchReplies error:', error.message);
        }
    },

    fetchCount: async (propertyId: number) => {
        try {
            const count = await commentService.countComments(propertyId);
            set(state => ({
                countByProperty: {
                    ...state.countByProperty,
                    [propertyId]: count,
                },
            }));
        } catch (error: any) {
            console.warn('[commentStore] fetchCount error:', error.message);
        }
    },

    addComment: async (request: CommentRequest) => {
        set({ isSubmitting: true, error: null });
        try {
            const newComment = await commentService.createComment(request);

            set(state => {
                const propertyId = request.propertyId;
                if (request.parentId) {
                    // Là reply → thêm vào repliesByParent
                    return {
                        repliesByParent: {
                            ...state.repliesByParent,
                            [request.parentId]: [
                                newComment,
                                ...(state.repliesByParent[request.parentId] || []),
                            ],
                        },
                        isSubmitting: false,
                    };
                } else {
                    // Là comment gốc → thêm vào đầu danh sách
                    const prevCount = state.countByProperty[propertyId] || 0;
                    return {
                        commentsByProperty: {
                            ...state.commentsByProperty,
                            [propertyId]: [
                                newComment,
                                ...(state.commentsByProperty[propertyId] || []),
                            ],
                        },
                        countByProperty: {
                            ...state.countByProperty,
                            [propertyId]: prevCount + 1,
                        },
                        isSubmitting: false,
                    };
                }
            });

            return newComment;
        } catch (error: any) {
            set({ error: error.message || 'Gửi bình luận thất bại', isSubmitting: false });
            throw error;
        }
    },

    deleteComment: async (commentId: number, propertyId: number) => {
        try {
            await commentService.deleteComment(commentId);
            set(state => {
                const prevComments = state.commentsByProperty[propertyId] || [];
                const filtered = prevComments.filter(c => c.id !== commentId);
                const prevCount = state.countByProperty[propertyId] || 0;
                return {
                    commentsByProperty: {
                        ...state.commentsByProperty,
                        [propertyId]: filtered,
                    },
                    countByProperty: {
                        ...state.countByProperty,
                        [propertyId]: Math.max(0, prevCount - 1),
                    },
                };
            });
        } catch (error: any) {
            console.error('[commentStore] deleteComment error:', error.message);
            throw error;
        }
    },

    clearError: () => set({ error: null }),
}));
