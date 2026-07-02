export const WALLET_HISTORY_TYPES = new Set([
    'WALLET_TOPUP',
    'TOPUP_SUCCESS',
    'DEPOSIT_SUCCESS',
    'PAYMENT_SUCCESS',
    'WALLET_DEPOSIT',
    'WALLET_CREDIT',
    'WALLET_DEBIT',
    'WALLET_DEDUCT',
    'BALANCE_DEDUCTED',
    'PAYMENT_DEDUCTED',
    'PAYMENT_COMPLETED',
    'TRANSACTION_SUCCESS',
    'WITHDRAW',
    'WITHDRAW_SUCCESS',
    'REFUND',
    'REFUND_SUCCESS',
    'BOOKING_PAYMENT',
    'APPOINTMENT_PAYMENT',
    'PAYMENT',
    'WALLET',
    'DEPOSIT',
    'TRANSACTION',
    'PURCHASE_PACKAGE',
    'DEDUCTION'
]);

export function isWalletNotification(normalizedType: string): boolean {
    return WALLET_HISTORY_TYPES.has(normalizedType);
}
