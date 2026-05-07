import apiClient from './client';
import paymentClient from './paymentClient';
import { API_ENDPOINTS } from '../../constants';
import { VNPayPaymentResponse, Transaction, WalletInfo, PaginatedResponse } from '../../types';

/**
 * Wallet Service
 * - Wallet APIs qua apiClient (Nginx :8080 → /api/wallets → wallet-service:8089)
 * - Payment tạo URL qua apiClient (Nginx :8080 → /api/payment → payment-service:8087)
 * - Transaction history qua paymentClient (trực tiếp :8087 → /api/transactions)
 *   ✅ /api/transactions/ đã được thêm vào Nginx, nhưng paymentClient vẫn hoạt động.
 * - Bills: xem billService.ts (tạo hóa đơn tiền trọ)
 */
export const walletService = {
    /**
     * Lấy thông tin ví (số dư, hold amount)
     * GET /api/wallets/me (JWT)
     * Backend: WalletController.getMyWallet()
     * 
     * Response: Wallet entity { id, userId, balance, holdAmount }
     */
    getMyWallet: async (): Promise<WalletInfo> => {
        const response = await apiClient.get<WalletInfo>(API_ENDPOINTS.WALLET_ME);
        return response.data;
    },

    /**
     * Lấy lịch sử giao dịch ví (phân trang)
     * GET /api/wallets/transactions?page=0&size=10 (JWT)
     * Backend: WalletController.getTransactionHistory()
     * 
     * Đi qua nginx /api/wallets → wallet-service:8089
     */
    getWalletTransactions: async (page = 0, size = 10): Promise<PaginatedResponse<Transaction>> => {
        const response = await apiClient.get<PaginatedResponse<Transaction>>(
            API_ENDPOINTS.WALLET_TRANSACTIONS,
            { params: { page, size } }
        );
        return response.data;
    },

    /**
     * Tạo URL thanh toán VNPay để nạp tiền vào ví
     * POST /api/payment/create-payment?amount=X&userId=Y
     * Đi qua nginx (nginx route /api/payment/ → payment-service:8087)
     *
     * Backend trả về: { url: "https://sandbox.vnpay..." }
     */
    createVNPayPayment: async (amount: number, userId: number): Promise<VNPayPaymentResponse> => {
        const response = await apiClient.post<VNPayPaymentResponse>(
            API_ENDPOINTS.PAYMENT_CREATE,
            null,
            { params: { amount, userId } }
        );
        return response.data;
    },

    /**
     * Lịch sử giao dịch thanh toán của user (payment-service)
     * GET /api/transactions/my-history/{userId}
     * Gọi trực tiếp payment-service:8087 (không qua nginx vì nginx chỉ route /api/payment/)
     *
     * Backend trả về: List<Transaction> (không phân trang)
     */
    getTransactionHistory: async (userId: number): Promise<Transaction[]> => {
        const response = await paymentClient.get<Transaction[]>(
            API_ENDPOINTS.TRANSACTION_HISTORY(userId)
        );
        return response.data;
    },
};
