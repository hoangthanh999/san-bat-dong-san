import apiClient from './client';
import { KYCSubmitData, KYCStatusResponse } from '../../types';

export const kycService = {
    /**
     * Gửi hồ sơ KYC (ảnh base64 + thông tin CCCD)
     */
    submitKYC: async (data: KYCSubmitData): Promise<void> => {
        await apiClient.post('/users/kyc', data);
    },

    /**
     * Kiểm tra trạng thái KYC của user hiện tại
     */
    getKYCStatus: async (): Promise<KYCStatusResponse> => {
        const response = await apiClient.get<KYCStatusResponse>('/users/kyc/status');
        return response.data;
    },
};
