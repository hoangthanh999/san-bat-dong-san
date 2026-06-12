import apiClient from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS, STORAGE_KEYS } from '../../constants';
import { VNPayPaymentResponse, Transaction, WalletInfo, PaginatedResponse } from '../../types';
import paymentClient from './paymentClient';

export interface ReleaseRequest {
    userId: number;
    amount: number;
    referenceId: string;
}

export interface WalletHoldRequest {
    amount: number;
    referenceId: string;
}

export interface WalletDebitRequest {
    amount: number;
}

async function getStoredUserId(): Promise<number> {
    const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (!userData) {
        throw new Error('Chưa đăng nhập. Vui lòng đăng nhập lại.');
    }

    const user = JSON.parse(userData);
    const userId = user.id ?? user.userId;
    if (!userId) {
        throw new Error('Không tìm thấy userId. Vui lòng đăng nhập lại.');
    }

    return Number(userId);
}

export const walletService = {
    getWallet: async (): Promise<WalletInfo> => {
        const res = await apiClient.get<WalletInfo>(API_ENDPOINTS.WALLET_ME);
        return res.data;
    },

    createPayment: async (amount: number): Promise<string> => {
        const userId = await getStoredUserId();
        const res = await paymentClient.post<VNPayPaymentResponse>(
            API_ENDPOINTS.PAYMENT_CREATE,
            null,
            { params: { amount, userId } }
        );
        return res.data.url
            ?? res.data.paymentUrl
            ?? res.data.result?.url
            ?? res.data.result?.paymentUrl
            ?? '';
    },

    releaseHeldFunds: async (request: ReleaseRequest): Promise<string> => {
        const res = await apiClient.post<string>(
            API_ENDPOINTS.WALLET_RELEASE,
            request
        );
        return (res.data as any).result ?? res.data;
    },

    fetchTransactions: async (_userId?: number): Promise<Transaction[]> => {
        const res = await apiClient.get<PaginatedResponse<Transaction>>(
            API_ENDPOINTS.WALLET_TRANSACTIONS,
            { params: { page: 0, size: 50 } }
        );
        return res.data.content ?? [];
    },

    fetchPaymentTransactions: async (userId?: number): Promise<Transaction[]> => {
        const resolvedUserId = userId ?? await getStoredUserId();
        const res = await paymentClient.get<Transaction[]>(
            API_ENDPOINTS.TRANSACTION_HISTORY(resolvedUserId)
        );
        return res.data ?? [];
    },

    holdMoney: async (payload: WalletHoldRequest): Promise<string> => {
        const userId = await getStoredUserId();
        const res = await apiClient.post<string>(
            API_ENDPOINTS.WALLET_HOLD,
            { userId, amount: payload.amount, referenceId: payload.referenceId }
        );
        return (res.data as any).result ?? res.data;
    },

    debitMoney: async (payload: WalletDebitRequest): Promise<string> => {
        const userId = await getStoredUserId();
        const res = await apiClient.post<string>(
            API_ENDPOINTS.WALLET_DEBIT,
            null,
            { params: { userId, amount: payload.amount } }
        );
        return (res.data as any).result ?? res.data;
    },
};
