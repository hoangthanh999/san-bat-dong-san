import { create } from 'zustand';
import { Contract, ContractStatus } from '../types';
import { contractService } from '../services/api/contracts';

interface ContractState {
    contracts: Contract[];
    selectedContract: Contract | null;
    isLoading: boolean;
    isLoadingDetail: boolean;
    hasMore: boolean;
    page: number;
    error: string | null;

    fetchContracts: (reset?: boolean, status?: ContractStatus) => Promise<void>;
    fetchContractDetail: (id: number) => Promise<void>;
    clearSelected: () => void;
}

export const useContractStore = create<ContractState>((set, get) => ({
    contracts: [],
    selectedContract: null,
    isLoading: false,
    isLoadingDetail: false,
    hasMore: true,
    page: 0,
    error: null,

    fetchContracts: async (reset = false, status?: ContractStatus) => {
        const { page, hasMore } = get();
        if (!reset && !hasMore) return;
        const currentPage = reset ? 0 : page;
        set({ isLoading: true, error: null });
        try {
            const data = await contractService.getMyContracts({ page: currentPage, status });
            set((state) => ({
                contracts: reset ? data.content : [...state.contracts, ...data.content],
                hasMore: !data.last,
                page: data.number + 1,
                isLoading: false,
            }));
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    fetchContractDetail: async (id: number) => {
        set({ isLoadingDetail: true, error: null });
        try {
            const data = await contractService.getContractDetail(id);
            set({ selectedContract: data, isLoadingDetail: false });
        } catch (error: any) {
            set({ error: error.message, isLoadingDetail: false });
        }
    },

    clearSelected: () => set({ selectedContract: null }),
}));
