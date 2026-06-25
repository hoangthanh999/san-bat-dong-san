import { create } from 'zustand';
import { User, Room, PaginatedResponse, CustomerResponseDTO, CustomerProfileDTO } from '../types';
import { userService } from '../services/api/user';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';
import { jwtDecode } from 'jwt-decode';
import { useAuthStore } from './authStore';
import { getAccessToken } from '../services/storage/tokenStorage';

interface UserState {
    profile: User | null;
    myRooms: Room[];
    isLoading: boolean;
    isUpdating: boolean;
    error: string | null;
    myRoomsHasMore: boolean;
    myRoomsPage: number;

    fetchProfile: () => Promise<void>;
    updateProfile: (data: CustomerProfileDTO) => Promise<void>;
    updateAvatar: (formData: FormData) => Promise<void>;
    updateBanner: (formData: FormData) => Promise<void>;
    fetchMyRooms: (reset?: boolean) => Promise<void>;
}

function isValidRole(role?: string): role is User['role'] {
    return role === 'ADMIN' || role === 'OWNER' || role === 'USER';
}

async function resolveAccountRole(fallback?: User['role']): Promise<User['role']> {
    try {
        const token = await getAccessToken();
        if (token) {
            const decoded: any = jwtDecode(token);
            if (isValidRole(decoded?.role)) return decoded.role;
        }
    } catch { }

    const authRole = useAuthStore.getState().user?.role;
    if (isValidRole(authRole)) return authRole;
    if (isValidRole(fallback)) return fallback;
    return 'USER';
}

async function persistProfile(profile: User) {
    const authUser = useAuthStore.getState().user;
    if (authUser) {
        useAuthStore.getState().setUser({ ...authUser, ...profile, role: profile.role });
    }
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(profile));
}

export const useUserStore = create<UserState>((set, get) => ({
    profile: null,
    myRooms: [],
    isLoading: false,
    isUpdating: false,
    error: null,
    myRoomsHasMore: true,
    myRoomsPage: 0,

    fetchProfile: async () => {
        set({ isLoading: true, error: null });
        try {
            // Lấy profile từ customer-service (CustomerResponseDTO)
            const customerProfile: CustomerResponseDTO = await userService.getProfile();
            const role = await resolveAccountRole(get().profile?.role);

            // Map CustomerResponseDTO → User
            const profile: User = {
                id: customerProfile.id,
                email: customerProfile.email,
                fullName: customerProfile.fullName,
                phone: customerProfile.phone,
                avatarUrl: customerProfile.avatarUrl,
                bannerUrl: customerProfile.bannerUrl,
                kycStatus: customerProfile.kycStatus,
                lifestyleProfile: customerProfile.lifestyleProfile,
                // customer-service không trả role; lấy role thật từ JWT/authStore.
                role,
            };

            set({ profile, isLoading: false });
            // Sync with auth store cached data
            await persistProfile(profile);
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    updateProfile: async (data: CustomerProfileDTO) => {
        set({ isUpdating: true, error: null });
        try {
            const customerProfile = await userService.updateProfile(data);
            const role = await resolveAccountRole(get().profile?.role);

            // Map CustomerResponseDTO → User
            const updated: User = {
                id: customerProfile.id,
                email: customerProfile.email,
                fullName: customerProfile.fullName,
                phone: customerProfile.phone,
                avatarUrl: customerProfile.avatarUrl,
                bannerUrl: customerProfile.bannerUrl,
                kycStatus: customerProfile.kycStatus,
                lifestyleProfile: customerProfile.lifestyleProfile,
                role,
            };

            set({ profile: updated, isUpdating: false });
            await persistProfile(updated);
        } catch (error: any) {
            set({ error: error.message || 'Cập nhật thất bại', isUpdating: false });
            throw error;
        }
    },

    updateAvatar: async (formData: FormData) => {
        set({ isUpdating: true });
        try {
            const customerProfile = await userService.updateAvatar(formData);
            const role = await resolveAccountRole(get().profile?.role);

            const updated: User = {
                id: customerProfile.id,
                email: customerProfile.email,
                fullName: customerProfile.fullName,
                phone: customerProfile.phone,
                avatarUrl: customerProfile.avatarUrl,
                bannerUrl: customerProfile.bannerUrl,
                kycStatus: customerProfile.kycStatus,
                lifestyleProfile: customerProfile.lifestyleProfile,
                role,
            };

            set({ profile: updated, isUpdating: false });
            await persistProfile(updated);
        } catch (error: any) {
            set({ error: error.message, isUpdating: false });
            throw error;
        }
    },

    updateBanner: async (formData: FormData) => {
        set({ isUpdating: true });
        try {
            const customerProfile = await userService.updateBanner(formData);
            const role = await resolveAccountRole(get().profile?.role);

            const updated: User = {
                id: customerProfile.id,
                email: customerProfile.email,
                fullName: customerProfile.fullName,
                phone: customerProfile.phone,
                avatarUrl: customerProfile.avatarUrl,
                bannerUrl: customerProfile.bannerUrl,
                kycStatus: customerProfile.kycStatus,
                lifestyleProfile: customerProfile.lifestyleProfile,
                role,
            };

            set({ profile: updated, isUpdating: false });
            await persistProfile(updated);
        } catch (error: any) {
            set({ error: error.message, isUpdating: false });
            throw error;
        }
    },

    fetchMyRooms: async (reset = false) => {
        const page = reset ? 0 : get().myRoomsPage;
        if (!reset && !get().myRoomsHasMore) return;

        // Lấy landlordId từ profile
        const profile = get().profile;
        if (!profile) {
            console.warn('[userStore] fetchMyRooms: Chưa load profile');
            return;
        }

        set({ isLoading: true });
        try {
            const data = await userService.getMyRooms(profile.id, page);
            set(state => ({
                myRooms: reset ? data.content : [...state.myRooms, ...data.content],
                myRoomsHasMore: !data.last,
                myRoomsPage: data.number + 1,
                isLoading: false,
            }));
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },
}));
