import apiClient from './client';
import { API_ENDPOINTS } from '../../constants';
import { ProjectResponseDTO, ProjectCreateDTO, PaginatedResponse } from '../../types';

/**
 * Project Service
 * Tất cả đi qua apiClient (nginx /public/projects, /admin/projects → property-service:8086)
 */
export const projectService = {
    // ============================================================
    // PUBLIC ENDPOINTS
    // ============================================================

    /**
     * Danh sách dự án công khai
     * GET /public/projects?page=0&size=10
     */
    getPublicProjects: async (page = 0, size = 10): Promise<PaginatedResponse<ProjectResponseDTO>> => {
        const response = await apiClient.get<PaginatedResponse<ProjectResponseDTO>>(
            API_ENDPOINTS.PUBLIC_PROJECTS,
            { params: { page, size } }
        );
        return response.data;
    },

    /**
     * Chi tiết dự án (Public)
     * GET /public/projects/{id}
     */
    getPublicProjectDetail: async (id: number): Promise<ProjectResponseDTO> => {
        const response = await apiClient.get<ProjectResponseDTO>(API_ENDPOINTS.PUBLIC_PROJECT_DETAIL(id));
        return response.data;
    },

    // ============================================================
    // ADMIN ENDPOINTS
    // ============================================================

    /**
     * Danh sách dự án (Admin)
     * GET /admin/projects?page=0&size=10
     */
    getAdminProjects: async (page = 0, size = 10): Promise<PaginatedResponse<ProjectResponseDTO>> => {
        const response = await apiClient.get<PaginatedResponse<ProjectResponseDTO>>(
            API_ENDPOINTS.ADMIN_PROJECTS,
            { params: { page, size } }
        );
        return response.data;
    },

    /**
     * Chi tiết dự án (Admin)
     * GET /admin/projects/{id}
     */
    getAdminProjectDetail: async (id: number): Promise<ProjectResponseDTO> => {
        const response = await apiClient.get<ProjectResponseDTO>(API_ENDPOINTS.ADMIN_PROJECT_DETAIL(id));
        return response.data;
    },

    /**
     * Tạo dự án (Admin)
     * POST /admin/projects — body: ProjectCreateDTO
     */
    createProject: async (data: ProjectCreateDTO): Promise<ProjectResponseDTO> => {
        const response = await apiClient.post<ProjectResponseDTO>(API_ENDPOINTS.ADMIN_PROJECTS, data);
        return response.data;
    },

    /**
     * Cập nhật dự án (Admin)
     * PUT /admin/projects/{id} — body: ProjectCreateDTO
     */
    updateProject: async (id: number, data: ProjectCreateDTO): Promise<ProjectResponseDTO> => {
        const response = await apiClient.put<ProjectResponseDTO>(API_ENDPOINTS.ADMIN_PROJECT_DETAIL(id), data);
        return response.data;
    },

    /**
     * Xóa mềm dự án (Admin)
     * DELETE /admin/projects/{id}
     */
    deleteProject: async (id: number): Promise<void> => {
        await apiClient.delete(API_ENDPOINTS.ADMIN_PROJECT_DETAIL(id));
    },

    /**
     * Xem thùng rác dự án (Admin)
     * GET /admin/projects/trash?page=0&size=10
     */
    getDeletedProjects: async (page = 0, size = 10): Promise<PaginatedResponse<ProjectResponseDTO>> => {
        const response = await apiClient.get<PaginatedResponse<ProjectResponseDTO>>(
            API_ENDPOINTS.ADMIN_PROJECT_TRASH,
            { params: { page, size } }
        );
        return response.data;
    },

    /**
     * Khôi phục dự án (Admin)
     * PUT /admin/projects/{id}/restore
     */
    restoreProject: async (id: number): Promise<void> => {
        await apiClient.put(API_ENDPOINTS.ADMIN_PROJECT_RESTORE(id));
    },

    /**
     * Xóa vĩnh viễn dự án (Admin)
     * DELETE /admin/projects/{id}/force
     */
    hardDeleteProject: async (id: number): Promise<void> => {
        await apiClient.delete(API_ENDPOINTS.ADMIN_PROJECT_HARD_DELETE(id));
    },
};
