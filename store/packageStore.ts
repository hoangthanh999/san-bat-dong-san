import { create } from 'zustand';
import { ServicePackage, PackageType } from '../types';
import { packageService } from '../services/api/packages';

interface PackageState {
    membershipPackages: ServicePackage[];
    boostPackages: ServicePackage[];
    isLoading: boolean;
    isPurchasing: boolean;
    error: string | null;

    fetchPackages: (type?: PackageType) => Promise<void>;
    purchaseMembership: (packageId: number) => Promise<void>;
    boostRoom: (roomId: number, packageId: number) => Promise<void>;
    clearError: () => void;
}

export const usePackageStore = create<PackageState>((set) => ({
    membershipPackages: [],
    boostPackages: [],
    isLoading: false,
    isPurchasing: false,
    error: null,

    fetchPackages: async (type?: PackageType) => {
        set({ isLoading: true, error: null });
        try {
            if (type === 'MEMBERSHIP') {
                const data = await packageService.getServicePackages('MEMBERSHIP');
                set({ membershipPackages: data, isLoading: false });
            } else if (type === 'ROOM_PROMOTION') {
                const data = await packageService.getServicePackages('ROOM_PROMOTION');
                set({ boostPackages: data, isLoading: false });
            } else {
                // Fetch both
                const [membership, boost] = await Promise.all([
                    packageService.getServicePackages('MEMBERSHIP'),
                    packageService.getServicePackages('ROOM_PROMOTION'),
                ]);
                set({ membershipPackages: membership, boostPackages: boost, isLoading: false });
            }
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    purchaseMembership: async (packageId: number) => {
        set({ isPurchasing: true, error: null });
        try {
            await packageService.purchaseMembership(packageId);
            set({ isPurchasing: false });
        } catch (error: any) {
            set({ error: error.message || 'Mua gói thất bại', isPurchasing: false });
            throw error;
        }
    },

    boostRoom: async (roomId: number, packageId: number) => {
        set({ isPurchasing: true, error: null });
        try {
            await packageService.boostRoom({ roomId, packageId });
            set({ isPurchasing: false });
        } catch (error: any) {
            set({ error: error.message || 'Boost tin thất bại', isPurchasing: false });
            throw error;
        }
    },

    clearError: () => set({ error: null }),
}));
