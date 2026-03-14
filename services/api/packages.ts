import apiClient from './client';
import { ServicePackage, PackageType } from '../../types';

export const packageService = {
    /**
     * Lấy danh sách gói dịch vụ
     * type: MEMBERSHIP | ROOM_PROMOTION
     */
    getServicePackages: async (type?: PackageType): Promise<ServicePackage[]> => {
        const response = await apiClient.get<ServicePackage[]>('/packages', {
            params: type ? { type } : undefined,
        });
        return response.data;
    },

    /**
     * Mua gói hội viên — trừ tiền từ ví
     */
    purchaseMembership: async (packageId: number): Promise<void> => {
        await apiClient.post('/packages/purchase/membership', { packageId });
    },

    /**
     * Boost tin đăng — trừ tiền từ ví
     */
    boostRoom: async (data: { roomId: number; packageId: number }): Promise<void> => {
        await apiClient.post('/packages/purchase/boost', data);
    },
};
