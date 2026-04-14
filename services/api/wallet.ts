import apiClient from './client';
import paymentClient from './paymentClient';
import { API_ENDPOINTS } from '../../constants';
import { VNPayPaymentResponse, Transaction } from '../../types';

export const walletService = {
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
     * Lịch sử giao dịch của user
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
