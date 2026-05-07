import { create } from 'zustand';
import { Transaction, WalletInfo } from '../types';
import { walletService } from '../services/api/wallet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';

interface WalletState {
    wallet: WalletInfo | null;
    transactions: Transaction[];
    paymentUrl: string | null;
    isLoading: boolean;
    isCreatingPayment: boolean;
    error: string | null;

    fetchWallet: () => Promise<void>;
    createPayment: (amount: number) => Promise<string>;
    fetchTransactions: () => Promise<void>;
    clearPaymentUrl: () => void;
}

/**
 * Helper: Lấy userId đã lưu khi login từ AsyncStorage
 */
async function getUserId(): Promise<number> {
    const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (!userData) throw new Error('Chưa đăng nhập. Vui lòng đăng nhập lại.');
    const user = JSON.parse(userData);
    return user.id;
}

export const useWalletStore = create<WalletState>((set, get) => ({
    wallet: null,
    transactions: [],
    paymentUrl: null,
    isLoading: false,
    isCreatingPayment: false,
    error: null,

    /**
     * Lấy thông tin ví (số dư, hold amount)
     * Backend: GET /api/wallets/me (JWT)
     * Trả về: WalletInfo { id, userId, balance, holdAmount }
     */
    fetchWallet: async () => {
        set({ isLoading: true, error: null });
        try {
            const walletData = await walletService.getMyWallet();
            set({ wallet: walletData, isLoading: false });
        } catch (error: any) {
            set({ error: error.message || 'Không thể tải thông tin ví', isLoading: false });
        }
    },

    /**
     * Tạo URL thanh toán VNPay
     * Backend: POST /api/payment/create-payment?amount=X&userId=Y
     * Trả về: { url: "https://sandbox.vnpay..." }
     */
    createPayment: async (amount: number): Promise<string> => {
        set({ isCreatingPayment: true, error: null });
        try {
            const userId = await getUserId();
            const data = await walletService.createVNPayPayment(amount, userId);
            set({ paymentUrl: data.url, isCreatingPayment: false });
            return data.url;
        } catch (error: any) {
            set({ error: error.message || 'Tạo thanh toán thất bại', isCreatingPayment: false });
            throw error;
        }
    },

    /**
     * Lấy lịch sử giao dịch
     * Backend: GET /api/transactions/my-history/{userId}
     * Trả về: List<Transaction> (không phân trang)
     */
    fetchTransactions: async () => {
        set({ isLoading: true, error: null });
        try {
            const userId = await getUserId();
            const data = await walletService.getTransactionHistory(userId);
            set({
                transactions: data,
                isLoading: false,
            });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    clearPaymentUrl: () => set({ paymentUrl: null }),
}));
