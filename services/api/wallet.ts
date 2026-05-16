import apiClient from './client';
import paymentClient from './paymentClient';
import { API_ENDPOINTS } from '../../constants';
import { VNPayPaymentResponse, Transaction, WalletInfo, PaginatedResponse } from '../../types';

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
     * POST /api/payment/create (JWT)
     */
    createPayment: async (amount: number): Promise<string> => {
        const res = await apiClient.post<VNPayPaymentResponse>(
            '/api/payment/create',
            { amount }
        );
        return res.data.paymentUrl ?? res.data.result?.paymentUrl ?? '';
    },

    /**
     * Rút tiền — gọi POST /api/wallets/withdraw
     * Backend có thể map sang /release hoặc endpoint riêng
     * Body: WithdrawRequest
     */
    withdraw: async (payload: WithdrawRequest): Promise<WithdrawResponse> => {
        const res = await apiClient.post<WithdrawResponse>(
            '/api/wallets/withdraw',
            payload
        );
        // auto-unwrap nếu backend trả { result: ... }
        return (res.data as any).result ?? res.data;
    },

    /**
     * Lấy lịch sử giao dịch
     * GET /api/transactions/my-history/{userId}
     */
    fetchTransactions: async (userId: number): Promise<Transaction[]> => {
        const res = await paymentClient.get<PaginatedResponse<Transaction>>(
            `/api/transactions/my-history/${userId}`
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