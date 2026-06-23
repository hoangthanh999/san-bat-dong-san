import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthGuardScreen } from '../../components/auth/AuthGuardScreen';
import { useWalletStore } from '../../store/walletStore';

type OperationMode = 'hold' | 'debit';

function parseAmount(value: string): number {
    return parseInt(value.replace(/\D/g, ''), 10) || 0;
}

function formatVND(value: number): string {
    return value.toLocaleString('vi-VN');
}

export default function WalletOperationsScreen() {
    return (
        <AuthGuardScreen message="Đăng nhập để thao tác ví" icon="wallet-outline">
            <WalletOperationsContent />
        </AuthGuardScreen>
    );
}

function WalletOperationsContent() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { wallet, fetchWallet, holdMoney, debitMoney, isLoading, error } = useWalletStore();
    const [mode, setMode] = useState<OperationMode>('hold');
    const [amountText, setAmountText] = useState('');
    const [referenceId, setReferenceId] = useState('');

    useEffect(() => {
        fetchWallet();
    }, []);

    const amount = parseAmount(amountText);
    const balance = wallet?.balance ?? 0;
    const holdAmount = wallet?.holdBalance ?? wallet?.holdAmount ?? 0;

    const handleSubmit = async () => {
        if (amount <= 0) {
            Alert.alert('Số tiền không hợp lệ', 'Vui lòng nhập số tiền lớn hơn 0.');
            return;
        }

        if (mode === 'hold' && !referenceId.trim()) {
            Alert.alert('Thiếu mã tham chiếu', 'Vui lòng nhập mã tham chiếu cho khoản giữ tiền.');
            return;
        }

        const ok = mode === 'hold'
            ? await holdMoney({ amount, referenceId: referenceId.trim() })
            : await debitMoney({ amount });

        if (ok) {
            Alert.alert(
                'Thành công',
                mode === 'hold' ? 'Đã giữ tiền trong ví.' : 'Đã trừ tiền trong ví.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Thao tác ví</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[
                    styles.content,
                    { paddingBottom: Math.max(insets.bottom + 24, 32) },
                ]}
            >
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Số dư khả dụng</Text>
                    <Text style={styles.balanceValue}>{formatVND(balance)} đ</Text>
                    <Text style={styles.holdValue}>Đang giữ: {formatVND(holdAmount)} đ</Text>
                </View>

                <View style={styles.segment}>
                    <TouchableOpacity
                        style={[styles.segmentBtn, mode === 'hold' && styles.segmentBtnActive]}
                        onPress={() => setMode('hold')}
                    >
                        <Text style={[styles.segmentText, mode === 'hold' && styles.segmentTextActive]}>
                            Giữ tiền
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.segmentBtn, mode === 'debit' && styles.segmentBtnActive]}
                        onPress={() => setMode('debit')}
                    >
                        <Text style={[styles.segmentText, mode === 'debit' && styles.segmentTextActive]}>
                            Trừ tiền
                        </Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.label}>Số tiền</Text>
                <View style={styles.inputWrap}>
                    <TextInput
                        style={styles.input}
                        value={amountText ? formatVND(amount) : ''}
                        onChangeText={text => setAmountText(text.replace(/\D/g, ''))}
                        placeholder="Nhập số tiền"
                        placeholderTextColor="#AAA"
                        keyboardType="number-pad"
                    />
                    <Text style={styles.suffix}>đ</Text>
                </View>

                {mode === 'hold' && (
                    <>
                        <Text style={styles.label}>Mã tham chiếu</Text>
                        <View style={styles.inputWrap}>
                            <TextInput
                                style={styles.input}
                                value={referenceId}
                                onChangeText={setReferenceId}
                                placeholder="VD: DEPOSIT_PROPERTY_123"
                                placeholderTextColor="#AAA"
                                autoCapitalize="characters"
                            />
                        </View>
                    </>
                )}

                <View style={styles.noteBox}>
                    <Ionicons name="information-circle-outline" size={18} color="#0066FF" />
                    <Text style={styles.noteText}>
                        {mode === 'hold'
                            ? 'Endpoint /api/wallets/hold dùng để giữ tiền theo referenceId.'
                            : 'Endpoint /api/wallets/debit dùng để trừ tiền trực tiếp từ ví hiện tại.'}
                    </Text>
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <TouchableOpacity
                    style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={isLoading}
                    activeOpacity={0.85}
                >
                    {isLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Ionicons
                                name={mode === 'hold' ? 'shield-checkmark-outline' : 'remove-circle-outline'}
                                size={18}
                                color="white"
                            />
                            <Text style={styles.submitText}>
                                {mode === 'hold' ? 'Giữ tiền' : 'Trừ tiền'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
    scroll: { flex: 1 },
    content: { padding: 16, gap: 14 },
    balanceCard: { backgroundColor: '#0066FF', borderRadius: 16, padding: 18, gap: 6 },
    balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
    balanceValue: { color: 'white', fontSize: 28, fontWeight: '800' },
    holdValue: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
    segment: { flexDirection: 'row', backgroundColor: '#E8F0FF', borderRadius: 12, padding: 4, gap: 4 },
    segmentBtn: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 9 },
    segmentBtnActive: { backgroundColor: '#0066FF' },
    segmentText: { color: '#0066FF', fontSize: 14, fontWeight: '700' },
    segmentTextActive: { color: 'white' },
    label: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E0E0E0',
        paddingHorizontal: 14,
    },
    input: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1A1A1A', paddingVertical: 13 },
    suffix: { color: '#666', fontWeight: '700' },
    noteBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: '#E8F0FF',
        borderRadius: 12,
        padding: 12,
    },
    noteText: { flex: 1, color: '#2457A6', fontSize: 13, lineHeight: 18 },
    errorText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#0066FF',
        borderRadius: 14,
        paddingVertical: 15,
        marginTop: 6,
    },
    submitBtnDisabled: { backgroundColor: '#AAC8FF' },
    submitText: { color: 'white', fontSize: 16, fontWeight: '800' },
});
