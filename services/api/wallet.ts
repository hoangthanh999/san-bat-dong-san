import apiClient from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS, STORAGE_KEYS } from '../../constants';
import { VNPayPaymentResponse, Transaction, WalletInfo, PaginatedResponse } from '../../types';
import paymentClient from './paymentClient';

// ─── Withdraw Request DTO (khớp backend ReleaseRequest) ──────
export interface WithdrawRequest {
    amount: number;           // số tiền rút (VND)
    bankCode: string;         // mã ngân hàng: VCB, TCB, ACB...
    bankAccountNumber: string;// số tài khoản
    bankAccountName: string;  // tên chủ tài khoản
    note?: string;            // ghi chú (optional)
}

export interface WithdrawResponse {
    transactionId?: string;
    status: string;           // PENDING | SUCCESS | FAILED
    message: string;
    amount: number;
    createdAt?: string;
}

interface ReleaseRequest {
    userId: number;
    amount: number;
    referenceId: string;
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

/**
 * Wallet Service
 * - Wallet APIs qua apiClient (Nginx :8080 → /api/wallets → wallet-service:8089)
 * - Payment tạo URL qua apiClient (Nginx :8080 → /api/payment → payment-service:8087)
 * - Transaction history qua paymentClient (trực tiếp :8087 → /api/transactions)
 */
export const walletService = {
    /**
     * Lấy thông tin ví (số dư, hold amount)
     * GET /api/wallets/me (JWT)
     */
    getWallet: async (): Promise<WalletInfo> => {
        const res = await apiClient.get<WalletInfo>('/api/wallets/me');
        return res.data;
    },

    /**
     * Tạo payment URL VNPay để nạp tiền
     * POST /api/payment/create-payment?amount=&userId= (JWT)
     */
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

    /**
     * Rút tiền — backend hiện expose POST /api/wallets/release
     * Body backend cần: { userId, amount, referenceId }
     */
    withdraw: async (payload: WithdrawRequest): Promise<WithdrawResponse> => {
        const userId = await getStoredUserId();
        const releasePayload: ReleaseRequest = {
            userId,
            amount: payload.amount,
            referenceId: [
                payload.bankCode,
                payload.bankAccountNumber,
                payload.bankAccountName,
                payload.note,
            ].filter(Boolean).join(' | '),
        };
        const res = await apiClient.post<string | WithdrawResponse>(
            API_ENDPOINTS.WALLET_RELEASE,
            releasePayload
        );
        const data = (res.data as any).result ?? res.data;
        if (typeof data === 'string') {
            return {
                status: 'SUCCESS',
                message: data,
                amount: payload.amount,
            };
        }
        return data;
    },

    /**
     * Lấy lịch sử giao dịch
     * GET /api/wallets/transactions
     */
    fetchTransactions: async (_userId?: number): Promise<Transaction[]> => {
        const res = await apiClient.get<PaginatedResponse<Transaction>>(
            API_ENDPOINTS.WALLET_TRANSACTIONS,
            { params: { page: 0, size: 50 } }
        );
        return res.data.content ?? [];
    },

    /**
     * Lấy danh sách bills
     * GET /api/bills/my
     */
    fetchBills: async (): Promise<any[]> => {
        const res = await apiClient.get('/api/bills/my');
        return (res.data as any).result ?? res.data ?? [];
    },
};
