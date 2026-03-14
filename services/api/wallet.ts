import apiClient from './client';
import { WalletBalance, VNPayPaymentResponse, Transaction, PaginatedResponse } from '../../types';

export const walletService = {
    /**
     * Lấy số dư ví hiện tại
     */
    getWalletBalance: async (): Promise<WalletBalance> => {
        const response = await apiClient.get<WalletBalance>('/wallet/balance');
        return response.data;
    },

    /**
     * Tạo URL thanh toán VNPay để nạp tiền vào ví
     */
    createVNPayPayment: async (amount: number): Promise<VNPayPaymentResponse> => {
        const response = await apiClient.post<VNPayPaymentResponse>('/payment/vnpay/create', { amount });
        return response.data;
    },

    /**
     * Lịch sử giao dịch (phân trang)
     * type: DEPOSIT | POST_FEE | MEMBERSHIP | BOOST | REFUND
     */
    getTransactionHistory: async (params: {
        page: number;
        size?: number;
        type?: string;
    }): Promise<PaginatedResponse<Transaction>> => {
        const response = await apiClient.get<PaginatedResponse<Transaction>>('/wallet/transactions', {
            params: { size: 20, ...params },
        });
        return response.data;
    },
};
