import { create } from 'zustand';
import { KYCStatus, KYCSubmitData, KYCStatusResponse, KycOcrResponseDTO } from '../types';
import { kycService } from '../services/api/kyc';

interface KYCState {
    kycStatus: KYCStatus;
    statusData: KYCStatusResponse | null;
    scanResult: KycOcrResponseDTO | null;
    isLoading: boolean;
    isScanning: boolean;
    isSubmitting: boolean;
    error: string | null;

    fetchKYCStatus: () => Promise<void>;
    scanCitizenId: (imageFile: any) => Promise<KycOcrResponseDTO>;
    submitKYC: (data: KYCSubmitData, frontImage: any, backImage: any) => Promise<void>;
    clearError: () => void;
    clearScanResult: () => void;
}

export const useKYCStore = create<KYCState>((set) => ({
    kycStatus: 'UNVERIFIED',
    statusData: null,
    scanResult: null,
    isLoading: false,
    isScanning: false,
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

    // Bước 1: Scan ảnh CCCD
    scanCitizenId: async (imageFile: any) => {
        set({ isScanning: true, error: null });
        try {
            const result = await kycService.scanCitizenId(imageFile);
            set({ scanResult: result, isScanning: false });
            return result;
        } catch (error: any) {
            set({ error: error.message || 'Scan CCCD thất bại', isScanning: false });
            throw error;
        }
    },

    // Bước 2: Nộp hồ sơ KYC
    submitKYC: async (data: KYCSubmitData, frontImage: any, backImage: any) => {
        set({ isSubmitting: true, error: null });
        try {
            await kycService.submitKYC(data, frontImage, backImage);
            set({ kycStatus: 'PENDING', isSubmitting: false, scanResult: null });
        } catch (error: any) {
            set({ error: error.message || 'Gửi hồ sơ thất bại', isSubmitting: false });
            throw error;
        }
    },

    clearError: () => set({ error: null }),
    clearScanResult: () => set({ scanResult: null }),
}));
