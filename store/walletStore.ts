import { create } from 'zustand';
import { Transaction, WalletInfo } from '../types';
import { walletService, WalletDebitRequest, WalletHoldRequest } from '../services/api/wallet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';

interface WalletState {
    wallet: WalletInfo | null;
    transactions: Transaction[];
    paymentTransactions: Transaction[];
    paymentUrl: string | null;
    isLoading: boolean;
    isCreatingPayment: boolean;
    error: string | null;

    fetchWallet: () => Promise<void>;
    createPayment: (amount: number) => Promise<string>;
    fetchTransactions: () => Promise<void>;
    fetchPaymentTransactions: () => Promise<void>;
    holdMoney: (payload: WalletHoldRequest) => Promise<boolean>;
    debitMoney: (payload: WalletDebitRequest) => Promise<boolean>;
    clearPaymentUrl: () => void;
}

async function getUserId(): Promise<number> {
    const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (!userData) throw new Error('Chưa đăng nhập. Vui lòng đăng nhập lại.');
    const parsed = JSON.parse(userData);
    return parsed.id ?? parsed.userId;
}

export const useWalletStore = create<WalletState>((set, get) => ({
    wallet: null,
    transactions: [],
    paymentTransactions: [],
    paymentUrl: null,
    isLoading: false,
    isCreatingPayment: false,
    error: null,

    fetchWallet: async () => {
        set({ isLoading: true, error: null });
        try {
            const wallet = await walletService.getWallet();
            set({ wallet, isLoading: false });
        } catch (err: any) {
            set({
                isLoading: false,
                error: err?.response?.data?.message ?? 'Không thể tải thông tin ví',
            });
        }
    },

    createPayment: async (amount: number) => {
        set({ isCreatingPayment: true, error: null });
        try {
            const url = await walletService.createPayment(amount);
            set({ paymentUrl: url, isCreatingPayment: false });
            return url;
        } catch (err: any) {
            set({
                isCreatingPayment: false,
                error: err?.response?.data?.message ?? 'Không thể tạo thanh toán',
            });
            return '';
        }
    },

    fetchTransactions: async () => {
        set({ isLoading: true });
        try {
            const userId = await getUserId();
            const transactions = await walletService.fetchTransactions(userId);
            set({ transactions, isLoading: false });
        } catch (err: any) {
            set({
                isLoading: false,
                error: err?.response?.data?.message ?? 'Không thể tải lịch sử',
            });
        }
    },

    fetchPaymentTransactions: async () => {
        set({ isLoading: true });
        try {
            const userId = await getUserId();
            const paymentTransactions = await walletService.fetchPaymentTransactions(userId);
            set({ paymentTransactions, isLoading: false });
        } catch (err: any) {
            set({
                isLoading: false,
                error: err?.response?.data?.message ?? 'Không thể tải lịch sử thanh toán',
            });
        }
    },

    clearPaymentUrl: () => set({ paymentUrl: null }),

    holdMoney: async (payload: WalletHoldRequest): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
            await walletService.holdMoney(payload);
            await get().fetchWallet();
            await get().fetchTransactions();
            set({ isLoading: false });
            return true;
        } catch (err: any) {
            set({
                isLoading: false,
                error: err?.message ?? 'Không thể giữ tiền trong ví',
            });
            return false;
        }
    },

    debitMoney: async (payload: WalletDebitRequest): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
            await walletService.debitMoney(payload);
            await get().fetchWallet();
            await get().fetchTransactions();
            set({ isLoading: false });
            return true;
        } catch (err: any) {
            set({
                isLoading: false,
                error: err?.message ?? 'Không thể trừ tiền trong ví',
            });
            return false;
        }
    },
}));
