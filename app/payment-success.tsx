import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeRouter } from '../hooks/useSafeRouter';
import { useWalletStore } from '../store/walletStore';

type SearchParamValue = string | string[] | undefined;

function firstParam(value: SearchParamValue) {
    return Array.isArray(value) ? value[0] : value;
}

export default function PaymentSuccessDeepLinkScreen() {
    const { safeReplace } = useSafeRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{
        status?: string;
        amount?: string;
        txnRef?: string;
        txRef?: string;
        transactionId?: string;
        message?: string;
    }>();
    const { fetchWallet, fetchTransactions, fetchPaymentTransactions } = useWalletStore();
    const [isRefreshing, setIsRefreshing] = useState(true);
    const [refreshFailed, setRefreshFailed] = useState(false);

    const status = firstParam(params.status);
    const message = firstParam(params.message);
    const amount = firstParam(params.amount);
    const txnRef = firstParam(params.txnRef) || firstParam(params.txRef) || firstParam(params.transactionId);
    const isFailed = status === 'failed' || message === 'payment_failed';

    const formattedAmount = useMemo(() => {
        const value = Number(amount);
        return Number.isFinite(value) && value > 0 ? value.toLocaleString('vi-VN') : null;
    }, [amount]);

    useEffect(() => {
        let mounted = true;

        async function refreshWalletData() {
            setIsRefreshing(true);
            const results = await Promise.allSettled([
                fetchWallet(),
                fetchTransactions(),
                fetchPaymentTransactions(),
            ]);

            if (!mounted) return;
            setRefreshFailed(results.some((result) => result.status === 'rejected'));
            setIsRefreshing(false);
        }

        void refreshWalletData();

        return () => {
            mounted = false;
        };
    }, [fetchPaymentTransactions, fetchTransactions, fetchWallet]);

    return (
        <View style={[styles.container, isFailed && styles.failedContainer]}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.content}>
                <View style={[styles.iconCircle, isFailed && styles.failedIconCircle]}>
                    <Ionicons
                        name={isFailed ? 'close-circle' : 'checkmark-circle'}
                        size={72}
                        color={isFailed ? '#EF4444' : '#22C55E'}
                    />
                </View>

                <Text style={styles.title}>
                    {isFailed ? 'Thanh toan that bai' : 'Nap tien thanh cong'}
                </Text>

                {formattedAmount ? (
                    <Text style={[styles.amount, isFailed && styles.failedAmount]}>
                        {isFailed ? '' : '+'}{formattedAmount} d
                    </Text>
                ) : null}

                {txnRef ? (
                    <Text style={styles.txRef}>Ma giao dich: {txnRef}</Text>
                ) : null}

                <View style={[styles.infoCard, isFailed && styles.failedInfoCard]}>
                    {isRefreshing ? (
                        <ActivityIndicator size="small" color={isFailed ? '#EF4444' : '#22C55E'} />
                    ) : (
                        <Ionicons
                            name={refreshFailed ? 'alert-circle-outline' : 'wallet-outline'}
                            size={20}
                            color={refreshFailed ? '#F59E0B' : isFailed ? '#EF4444' : '#22C55E'}
                        />
                    )}
                    <Text style={styles.infoText}>
                        {isRefreshing
                            ? 'Dang cap nhat vi va lich su giao dich...'
                            : refreshFailed
                                ? 'Giao dich da hoan tat, nhung chua lam moi du lieu. Vui long vao vi de tai lai.'
                                : isFailed
                                    ? 'Giao dich bi huy hoac thanh toan khong thanh cong.'
                                    : 'So du vi va lich su giao dich da duoc cap nhat.'}
                    </Text>
                </View>
            </View>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity
                    style={[styles.walletBtn, isFailed && styles.failedWalletBtn]}
                    onPress={() => safeReplace('/wallet' as any)}
                    activeOpacity={0.85}
                >
                    <Ionicons name="wallet-outline" size={20} color="white" />
                    <Text style={styles.walletBtnText}>Ve vi cua toi</Text>
                </TouchableOpacity>
                {isFailed ? (
                    <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={() => safeReplace('/wallet/deposit' as any)}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.retryBtnText}>Thu lai</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.homeBtn}
                        onPress={() => safeReplace('/(tabs)' as any)}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.homeBtnText}>Ve trang chu</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0FDF4' },
    failedContainer: { backgroundColor: '#FFF5F5' },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30, gap: 12 },
    iconCircle: {
        width: 130,
        height: 130,
        borderRadius: 65,
        backgroundColor: '#DCFCE7',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    failedIconCircle: { backgroundColor: '#FEE2E2' },
    title: { fontSize: 26, fontWeight: '800', color: '#1A1A1A', textAlign: 'center' },
    amount: { fontSize: 36, fontWeight: '800', color: '#22C55E' },
    failedAmount: { color: '#EF4444' },
    txRef: { fontSize: 13, color: '#666', marginTop: 4 },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 14,
        borderLeftWidth: 3,
        borderLeftColor: '#22C55E',
        width: '100%',
        marginTop: 16,
    },
    failedInfoCard: { borderLeftColor: '#EF4444' },
    infoText: { flex: 1, fontSize: 14, color: '#333', lineHeight: 20 },
    footer: {
        padding: 16,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        gap: 10,
    },
    walletBtn: {
        backgroundColor: '#22C55E',
        borderRadius: 14,
        paddingVertical: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    failedWalletBtn: { backgroundColor: '#EF4444' },
    walletBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
    homeBtn: {
        borderWidth: 1.5,
        borderColor: '#22C55E',
        borderRadius: 14,
        paddingVertical: 13,
        alignItems: 'center',
    },
    homeBtnText: { color: '#22C55E', fontWeight: '700', fontSize: 16 },
    retryBtn: {
        borderWidth: 1.5,
        borderColor: '#EF4444',
        borderRadius: 14,
        paddingVertical: 13,
        alignItems: 'center',
    },
    retryBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 16 },
});
