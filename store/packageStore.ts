import { create } from 'zustand';
import { ServicePackage, PackageType } from '../types';
import { packageService } from '../services/api/packages';

interface PackageState {
    membershipPackages: ServicePackage[];
    boostPackages: ServicePackage[];
    isLoading: boolean;
    isPurchasing: boolean;
    error: string | null;

    fetchPackages: (type?: 'MEMBERSHIP' | 'ROOM_PROMOTION') => Promise<void>; // ✅ Optional param
    purchaseMembership: (packageId: number) => Promise<void>;
    boostRoom: (roomId: number, packageId: number) => Promise<void>;
    clearError: () => void;
}

function mapPackage(p: any): ServicePackage {
    return {
        id: p.id,
        name: p.name ?? '',
        type: p.type as PackageType,
        price: Number(p.price) || 0,
        durationDays: p.durationDays ?? 0,
        description: p.description ?? '',
        features: [],
        isPopular: (p.priorityLevel ?? 0) > 0,
    };
}

export const usePackageStore = create<PackageState>((set) => ({
    membershipPackages: [],
    boostPackages: [],
    isLoading: false,
    isPurchasing: false,
    error: null,

    // ✅ Nhận optional type để filter thông minh hơn
    fetchPackages: async (type?: 'MEMBERSHIP' | 'ROOM_PROMOTION') => {
        set({ isLoading: true, error: null });
        try {
            const all: any[] = await packageService.getServicePackages();

            // Nếu truyền type cụ thể → chỉ load loại đó (tiết kiệm xử lý)
            if (type === 'ROOM_PROMOTION') {
                const boost = all
                    .filter((p) => p.type === 'ROOM_PROMOTION' && p.active !== false)
                    .map(mapPackage);
                set({ boostPackages: boost, isLoading: false });
                return;
            }

            if (type === 'MEMBERSHIP') {
                const membership = all
                    .filter((p) => p.type === 'MEMBERSHIP' && p.active !== false)
                    .map(mapPackage);
                set({ membershipPackages: membership, isLoading: false });
                return;
            }

            // Không truyền type → load tất cả (behavior cũ)
            const membership = all
                .filter((p) => p.type === 'MEMBERSHIP' && p.active !== false)
                .map(mapPackage);
            const boost = all
                .filter((p) => p.type === 'ROOM_PROMOTION' && p.active !== false)
                .map(mapPackage);

            set({ membershipPackages: membership, boostPackages: boost, isLoading: false });
        } catch (error: any) {
            console.error('[PackageStore] fetchPackages failed:', error?.message);
            set({
                isLoading: false,
                error: error?.message ?? 'Không thể tải gói dịch vụ',
            });
        }
    },

    purchaseMembership: async (packageId: number) => {
        set({ isPurchasing: true, error: null });
        try {
            await packageService.purchaseMembership(packageId);
            set({ isPurchasing: false });
        } catch (error: any) {
            const msg = error?.response?.data?.error
                ?? error?.message
                ?? 'Mua gói thất bại';
            set({ error: msg, isPurchasing: false });
            throw new Error(msg);
        }
    },

    boostRoom: async (roomId: number, packageId: number) => {
        set({ isPurchasing: true, error: null });
        try {
            await packageService.buyPromotion(packageId, roomId);
            set({ isPurchasing: false });
        } catch (error: any) {
            const msg = error?.response?.data?.error
                ?? error?.message
                ?? 'Boost tin thất bại';
            set({ error: msg, isPurchasing: false });
            throw new Error(msg);
        }
    },

    clearError: () => set({ error: null }),
}));
