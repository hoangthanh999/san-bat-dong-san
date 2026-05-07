import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, StatusBar,
    Platform, ScrollView, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useWalletStore } from '../../store/walletStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthGuardScreen } from '../../components/auth/AuthGuardScreen';

const QUICK_AMOUNTS = [100000, 200000, 500000, 1000000, 2000000, 5000000];

export default function DepositScreen() {
    return (
        <AuthGuardScreen
            message="Đăng nhập để nạp tiền vào ví"
            icon="wallet-outline"
        >
            <DepositContent />
        </AuthGuardScreen>
    );
}

function DepositContent() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { transactions, createPayment, isCreatingPayment } = useWalletStore();

    // Tính balance từ transaction history (backend chưa có wallet balance API)
    const balance = transactions.reduce((sum, tx) => {
        if (tx.status !== 'SUCCESS') return sum;
        const amt = Number(tx.amount) || 0;
        if (tx.type === 'DEPOSIT' || tx.type === 'REFUND') return sum + amt;
        return sum - amt;
    }, 0);
    const [selectedAmount, setSelectedAmount] = useState<number>(500000);
    const [customAmount, setCustomAmount] = useState('');

    const getAmount = () => {
        if (customAmount) {
            return parseInt(customAmount.replace(/\D/g, ''), 10);
        }
        return selectedAmount;
    };

    const formatCurrency = (n: number) => n.toLocaleString('vi-VN');

    const handleCustomChange = (text: string) => {
        const digits = text.replace(/\D/g, '');
        setCustomAmount(digits);
        if (digits) setSelectedAmount(0);
    };

    const handleQuickSelect = (amount: number) => {
        setSelectedAmount(amount);
        setCustomAmount('');
    };

    const handleContinue = async () => {
        const amount = getAmount();
        if (!amount || amount < 10000) {
            Alert.alert('Số tiền không hợp lệ', 'Số tiền nạp tối thiểu là 10,000đ');
            return;
        }
        try {
            const paymentUrl = await createPayment(amount);
            router.push({ pathname: '/wallet/vnpay' as any, params: { paymentUrl, amount } });
        } catch (error: any) {
            Alert.alert('Lỗi', error.message || 'Không thể tạo giao dịch. Vui lòng thử lại.');
        }
    };

    const amount = getAmount();

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Nạp tiền vào ví</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    {/* Current balance */}
                    <View style={styles.balanceRow}>
                        <Ionicons name="wallet" size={18} color="#666" />
                        <Text style={styles.balanceLabel}>Số dư hiện tại:</Text>
                        <Text style={styles.balanceValue}>{formatCurrency(balance)}đ</Text>
                    </View>

                    {/* Quick amounts */}
                    <Text style={styles.sectionLabel}>Chọn số tiền nạp:</Text>
                    <View style={styles.amountGrid}>
                        {QUICK_AMOUNTS.map((a) => (
                            <TouchableOpacity
                                key={a}
                                style={[styles.amountChip, selectedAmount === a && styles.amountChipSelected]}
                                onPress={() => handleQuickSelect(a)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.amountChipText, selectedAmount === a && styles.amountChipTextSelected]}>
                                    {a >= 1000000 ? `${a / 1000000} triệu` : `${formatCurrency(a)}đ`}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Custom amount */}
                    <Text style={styles.sectionLabel}>Hoặc nhập số tiền khác:</Text>
                    <View style={styles.inputWrap}>
                        <TextInput
                            style={styles.input}
                            placeholder="Nhập số tiền..."
                            value={customAmount ? formatCurrency(parseInt(customAmount, 10)) : ''}
                            onChangeText={handleCustomChange}
                            keyboardType="number-pad"
                            placeholderTextColor="#AAA"
                        />
                        <Text style={styles.inputSuffix}>đ</Text>
                    </View>
                    <Text style={styles.minNote}>Tối thiểu 10,000đ</Text>

                    {/* Summary */}
                    {amount >= 10000 && (
                        <View style={styles.summaryCard}>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Số tiền nạp</Text>
                                <Text style={styles.summaryValue}>{formatCurrency(amount)}đ</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Số dư sau nạp</Text>
                                <Text style={[styles.summaryValue, { color: '#22C55E' }]}>
                                    {formatCurrency(balance + amount)}đ
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Payment method */}
                    <Text style={styles.sectionLabel}>Phương thức thanh toán:</Text>
                    <View style={styles.paymentMethod}>
                        <View style={styles.paymentRadio}>
                            <View style={styles.radioFill} />
                        </View>
                        <Ionicons name="card" size={22} color="#0066FF" />
                        <View style={styles.paymentInfo}>
                            <Text style={styles.paymentName}>💳 VNPay</Text>
                            <Text style={styles.paymentSub}>ATM / QR / Visa / MasterCard</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity
                    style={[styles.continueBtn, (amount < 10000 || isCreatingPayment) && styles.continueBtnDisabled]}
                    onPress={handleContinue}
                    disabled={amount < 10000 || isCreatingPayment}
                    activeOpacity={0.85}
                >
                    {isCreatingPayment ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Ionicons name="lock-closed" size={18} color="white" />
                            <Text style={styles.continueBtnText}>Tiếp tục thanh toán</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 0 /* paddingTop set via inline style using useSafeAreaInsets */, paddingBottom: 12,
        backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
    scroll: { flex: 1 },
    content: { padding: 16, paddingBottom: 40 },
    balanceRow: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#E8F0FF', borderRadius: 10, padding: 12,
        marginBottom: 20,
    },
    balanceLabel: { fontSize: 14, color: '#555', flex: 1 },
    balanceValue: { fontSize: 15, fontWeight: '700', color: '#0066FF' },
    sectionLabel: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12, marginTop: 4 },
    amountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    amountChip: {
        borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'white',
        minWidth: '30%', alignItems: 'center',
    },
    amountChipSelected: { borderColor: '#0066FF', backgroundColor: '#E8F0FF' },
    amountChipText: { fontSize: 14, fontWeight: '600', color: '#555' },
    amountChipTextSelected: { color: '#0066FF' },
    inputWrap: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'white', borderWidth: 1.5, borderColor: '#E0E0E0',
        borderRadius: 12, paddingHorizontal: 14, marginBottom: 6,
    },
    input: { flex: 1, fontSize: 18, fontWeight: '600', paddingVertical: 13, color: '#1A1A1A' },
    inputSuffix: { fontSize: 16, color: '#666', fontWeight: '600' },
    minNote: { fontSize: 12, color: '#999', marginBottom: 16 },
    summaryCard: {
        backgroundColor: 'white', borderRadius: 12, padding: 16,
        marginBottom: 20, gap: 10,
        borderLeftWidth: 3, borderLeftColor: '#0066FF',
    },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabel: { fontSize: 14, color: '#666' },
    summaryValue: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
    paymentMethod: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: 'white', borderRadius: 12, borderWidth: 1.5,
        borderColor: '#0066FF', padding: 14,
    },
    paymentRadio: {
        width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#0066FF',
        justifyContent: 'center', alignItems: 'center',
    },
    radioFill: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0066FF' },
    paymentInfo: { flex: 1 },
    paymentName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
    paymentSub: { fontSize: 12, color: '#888', marginTop: 2 },
    footer: {
        padding: 16, paddingBottom: 16, // overridden inline using insets.bottom
        backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F0F0F0',
    },
    continueBtn: {
        backgroundColor: '#0066FF', borderRadius: 14, paddingVertical: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    continueBtnDisabled: { backgroundColor: '#B0C4DE' },
    continueBtnText: { color: 'white', fontWeight: '700', fontSize: 17 },
});
