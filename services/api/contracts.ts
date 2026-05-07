// ⚠️ Backend KHÔNG có Contract Service — đã xóa toàn bộ API calls
// File giữ lại để tránh import errors, tất cả trả về dữ liệu rỗng

import { Contract, PaginatedResponse, ContractStatus } from '../../types';

export const contractService = {
    getMyContracts: async (params?: {
        status?: ContractStatus;
        page?: number;
        size?: number;
    }): Promise<PaginatedResponse<Contract>> => {
        console.warn('[contractService] Backend KHÔNG có Contract API — chức năng đang phát triển');
        return { content: [], totalElements: 0, totalPages: 0, size: 20, number: 0, first: true, last: true };
    },

    getContractDetail: async (id: number): Promise<Contract | null> => {
        console.warn('[contractService] Backend KHÔNG có Contract API — chức năng đang phát triển');
        return null;
    },

    downloadContractPDF: async (id: number): Promise<null> => {
        console.warn('[contractService] Backend KHÔNG có Contract API — chức năng đang phát triển');
        return null;
    },
};
