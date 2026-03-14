import { create } from 'zustand';
import { Transaction, WalletBalance } from '../types';
import { walletService } from '../services/api/wallet';

interface WalletState {
    balance: number;
    transactions: Transaction[];
    paymentUrl: string | null;
    isLoading: boolean;
    isCreatingPayment: boolean;
    hasMore: boolean;
    page: number;
    error: string | null;

    fetchBalance: () => Promise<void>;
    createPayment: (amount: number) => Promise<string>;
    fetchTransactions: (reset?: boolean, type?: string) => Promise<void>;
    clearPaymentUrl: () => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
    balance: 0,
    transactions: [],
    paymentUrl: null,
    isLoading: false,
    isCreatingPayment: false,
    hasMore: true,
    page: 0,
    error: null,

    fetchBalance: async () => {
        try {
            const data = await walletService.getWalletBalance();
            set({ balance: data.balance });
        } catch (error: any) {
            console.error('Fetch wallet balance error:', error);
        }
    },

    createPayment: async (amount: number): Promise<string> => {
        set({ isCreatingPayment: true, error: null });
        try {
            const data = await walletService.createVNPayPayment(amount);
            set({ paymentUrl: data.paymentUrl, isCreatingPayment: false });
            return data.paymentUrl;
        } catch (error: any) {
            set({ error: error.message || 'Tạo thanh toán thất bại', isCreatingPayment: false });
            throw error;
        }
    },

    fetchTransactions: async (reset = false, type?: string) => {
        const { page, hasMore } = get();
        if (!reset && !hasMore) return;
        const currentPage = reset ? 0 : page;
        set({ isLoading: true });
        try {
            const data = await walletService.getTransactionHistory({ page: currentPage, type });
            set((state) => ({
                transactions: reset ? data.content : [...state.transactions, ...data.content],
                hasMore: !data.last,
                page: data.number + 1,
                isLoading: false,
            }));
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    clearPaymentUrl: () => set({ paymentUrl: null }),
}));
