import { create } from 'zustand';
import { Transaction, WalletInfo } from '../types';
import { walletService, WithdrawRequest } from '../services/api/wallet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';

// ─── Withdraw state ───────────────────────────────────────────
export type WithdrawStatus = 'idle' | 'loading' | 'success' | 'error';

interface WalletState {
    wallet: WalletInfo | null;
    transactions: Transaction[];
    paymentUrl: string | null;
    isLoading: boolean;
    isCreatingPayment: boolean;
    // ── Withdraw ──
    withdrawStatus: WithdrawStatus;
    withdrawError: string | null;
    withdrawTxId: string | null;
    error: string | null;

    fetchWallet: () => Promise<void>;
    createPayment: (amount: number) => Promise<string>;
    fetchTransactions: () => Promise<void>;
    clearPaymentUrl: () => void;
    // ── Withdraw actions ──
    withdraw: (payload: WithdrawRequest) => Promise<boolean>;
    resetWithdraw: () => void;
}

/**
 * Helper: Lấy userId đã lưu khi login từ AsyncStorage
 */
async function getUserId(): Promise<number> {
    const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (!userData) throw new Error('Chưa đăng nhập. Vui lòng đăng nhập lại.');
    const parsed = JSON.parse(userData);
    return parsed.id ?? parsed.userId;
}

export const useWalletStore = create<WalletState>((set, get) => ({
    wallet: null,
    transactions: [],
    paymentUrl: null,
    isLoading: false,
    isCreatingPayment: false,
    withdrawStatus: 'idle',
    withdrawError: null,
    withdrawTxId: null,
    error: null,

    // ── Lấy thông tin ví ──────────────────────────────────────
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

    // ── Tạo payment URL VNPay ─────────────────────────────────
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

    // ── Lấy lịch sử giao dịch ────────────────────────────────
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

    clearPaymentUrl: () => set({ paymentUrl: null }),

    // ── RÚT TIỀN ─────────────────────────────────────────────
    withdraw: async (payload: WithdrawRequest): Promise<boolean> => {
        set({ withdrawStatus: 'loading', withdrawError: null, withdrawTxId: null });
        try {
            const res = await walletService.withdraw(payload);
            set({
                withdrawStatus: 'success',
                withdrawTxId: res.transactionId ?? null,
            });
            // Refresh số dư sau khi rút thành công
            await get().fetchWallet();
            return true;
        } catch (err: any) {
            const msg =
                err?.response?.data?.message ??
                err?.response?.data?.result?.message ??
                'Rút tiền thất bại. Vui lòng thử lại.';
            set({ withdrawStatus: 'error', withdrawError: msg });
            return false;
        }
    },

    resetWithdraw: () =>
        set({ withdrawStatus: 'idle', withdrawError: null, withdrawTxId: null }),
}));