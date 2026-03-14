import { create } from 'zustand';
import { KYCStatus, KYCSubmitData, KYCStatusResponse } from '../types';
import { kycService } from '../services/api/kyc';

interface KYCState {
    kycStatus: KYCStatus;
    statusData: KYCStatusResponse | null;
    isLoading: boolean;
    isSubmitting: boolean;
    error: string | null;

    fetchKYCStatus: () => Promise<void>;
    submitKYC: (data: KYCSubmitData) => Promise<void>;
    clearError: () => void;
}

export const useKYCStore = create<KYCState>((set) => ({
    kycStatus: 'UNVERIFIED',
    statusData: null,
    isLoading: false,
    isSubmitting: false,
    error: null,

    fetchKYCStatus: async () => {
        set({ isLoading: true, error: null });
        try {
            const data = await kycService.getKYCStatus();
            set({ statusData: data, kycStatus: data.kycStatus, isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    submitKYC: async (data: KYCSubmitData) => {
        set({ isSubmitting: true, error: null });
        try {
            await kycService.submitKYC(data);
            set({ kycStatus: 'PENDING', isSubmitting: false });
        } catch (error: any) {
            set({ error: error.message || 'Gửi hồ sơ thất bại', isSubmitting: false });
            throw error;
        }
    },

    clearError: () => set({ error: null }),
}));
