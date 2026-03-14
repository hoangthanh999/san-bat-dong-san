import apiClient from './client';
import { Contract, PaginatedResponse, ContractStatus } from '../../types';

export const contractService = {
    /**
     * Lấy danh sách hợp đồng của user hiện tại
     */
    getMyContracts: async (params?: {
        status?: ContractStatus;
        page?: number;
        size?: number;
    }): Promise<PaginatedResponse<Contract>> => {
        const response = await apiClient.get<PaginatedResponse<Contract>>('/contracts/my', {
            params: { page: 0, size: 20, ...params },
        });
        return response.data;
    },

    /**
     * Chi tiết hợp đồng theo ID
     */
    getContractDetail: async (id: number): Promise<Contract> => {
        const response = await apiClient.get<Contract>(`/contracts/${id}`);
        return response.data;
    },

    /**
     * Tải file PDF hợp đồng (blob)
     */
    downloadContractPDF: async (id: number): Promise<Blob> => {
        const response = await apiClient.get<Blob>(`/contracts/${id}/pdf`, {
            responseType: 'blob',
        });
        return response.data;
    },
};
