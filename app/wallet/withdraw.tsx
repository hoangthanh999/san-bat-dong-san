import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    TextInput, StyleSheet, Alert, ActivityIndicator,
    KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWalletStore } from '../../store/walletStore';
import { WithdrawRequest } from '../../services/api/wallet';

// ─── Constants ───────────────────────────────────────────────
const MIN_AMOUNT = 50_000;

const QUICK_AMOUNTS = [
    { label: '100K', value: 100_000 },
    { label: '200K', value: 200_000 },
    { label: '500K', value: 500_000 },
    { label: '1 Tr', value: 1_000_000 },
    { label: '2 Tr', value: 2_000_000 },
    { label: '5 Tr', value: 5_000_000 },
];

const BANKS = [
    { code: 'VCB', name: 'Vietcombank', color: '#007B40' },
    { code: 'TCB', name: 'Techcombank', color: '#E31837' },
    { code: 'ACB', name: 'ACB', color: '#004B87' },
    { code: 'MB', name: 'MB Bank', color: '#0066CC' },
    { code: 'BIDV', name: 'BIDV', color: '#005BAA' },
    { code: 'VIB', name: 'VIB', color: '#005BAA' },
];

// ─── Helpers ─────────────────────────────────────────────────
function formatVND(n: number): string {
    return n.toLocaleString('vi-VN') + 'đ';
}

function parseAmount(s: string): number {
    return parseInt(s.replace(/\D/g, ''), 10) || 0;
}

// ════════════════════════════════════════════════════════════
// WithdrawScreen
// ════════════════════════════════════════════════════════════
export default function WithdrawScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const {
        wallet, fetchWallet,
        withdraw, withdrawStatus, withdrawError, withdrawTxId,
        resetWithdraw,
    } = useWalletStore();

    // ── Step: 1 = nhập thông tin, 2 = xác nhận ──
    const [step, setStep] = useState<1 | 2>(1);

    // ── Form state ──
    const [amountStr, setAmountStr] = useState('');
    const [selectedBank, setSelectedBank] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');
    const [note, setNote] = useState('');

    const amount = parseAmount(amountStr);
    const balance = wallet?.balance ?? 0;

    useEffect(() => {
        fetchWallet();
        return () => resetWithdraw();
    }, []);

    // ── Khi rút thành công → show alert rồi back ──
    useEffect(() => {
        if (withdrawStatus === 'success') {
            Alert.alert(
                '✅ Yêu cầu đã gửi',
                `Yêu cầu rút ${formatVND(amount)} đã được ghi nhận.\nThời gian xử lý: 1-3 ngày làm việc.\nMã giao dịch: ${withdrawTxId ?? 'N/A'}`,
                [{ text: 'Về trang ví', onPress: () => router.back() }]
            );
        }
    }, [withdrawStatus]);

    // ── Validation bước 1 ──
    const validateStep1 = useCallback((): string | null => {
        if (amount < MIN_AMOUNT)
            return `Số tiền tối thiểu là ${formatVND(MIN_AMOUNT)}`;
        if (amount > balance)
            return `Số tiền vượt quá số dư khả dụng (${formatVND(balance)})`;
        if (!selectedBank)
            return 'Vui lòng chọn ngân hàng';
        if (!accountNumber.trim())
            return 'Vui lòng nhập số tài khoản';
        if (!accountName.trim())
            return 'Vui lòng nhập tên chủ tài khoản';
        return null;
    }, [amount, balance, selectedBank, accountNumber, accountName]);

    const handleNextStep = useCallback(() => {
        const err = validateStep1();
        if (err) {
            Alert.alert('Thông tin chưa hợp lệ', err);
            return;
        }
        setStep(2);
    }, [validateStep1]);

    const handleConfirm = useCallback(async () => {
        const payload: WithdrawRequest = {
            amount,
            bankCode: selectedBank,
            bankAccountNumber: accountNumber.trim(),
            bankAccountName: accountName.trim(),
            note: note.trim() || undefined,
        };
        await withdraw(payload);
    }, [amount, selectedBank, accountNumber, accountName, note, withdraw]);

    const bankInfo = BANKS.find(b => b.code === selectedBank);

    // ════════════════════════════════════════════════════════
    // STEP 1 — Nhập thông tin
    // ════════════════════════════════════════════════════════
    const renderStep1 = () => (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            {/* Số dư khả dụng */}
            <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Số dư khả dụng</Text>
                <Text style={styles.balanceAmount}>{formatVND(balance)}</Text>
                {(wallet?.holdAmount ?? 0) > 0 && (
                    <Text style={styles.holdText}>
                        Đang giữ: {formatVND(wallet!.holdAmount ?? 0)}
                    </Text>
                )}
            </View>

            {/* Chọn nhanh số tiền */}
            <Text style={styles.sectionTitle}>Số tiền rút</Text>
            <View style={styles.quickGrid}>
                {QUICK_AMOUNTS.map(q => (
                    <TouchableOpacity
                        key={q.value}
                        style={[
                            styles.quickBtn,
                            amount === q.value && styles.quickBtnActive,
                            q.value > balance && styles.quickBtnDisabled,
                        ]}
                        onPress={() => {
                            if (q.value <= balance)
                                setAmountStr(q.value.toString());
                        }}
                        disabled={q.value > balance}
                        activeOpacity={0.75}
                    >
                        <Text style={[
                            styles.quickBtnText,
                            amount === q.value && styles.quickBtnTextActive,
                            q.value > balance && styles.quickBtnTextDisabled,
                        ]}>
                            {q.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Input số tiền */}
            <View style={styles.inputWrap}>
                <Text style={styles.inputPrefix}>₫</Text>
                <TextInput
                    style={styles.amountInput}
                    value={amountStr ? parseInt(amountStr).toLocaleString('vi-VN') : ''}
                    onChangeText={t => setAmountStr(t.replace(/\D/g, ''))}
                    placeholder="Nhập số tiền"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                />
            </View>
            {amount > 0 && amount < MIN_AMOUNT && (
                <Text style={styles.errorHint}>
                    Tối thiểu {formatVND(MIN_AMOUNT)}
                </Text>
            )}
            {amount > balance && (
                <Text style={styles.errorHint}>
                    Vượt quá số dư khả dụng
                </Text>
            )}

            {/* Chọn ngân hàng */}
            <Text style={styles.sectionTitle}>Ngân hàng</Text>
            <View style={styles.bankGrid}>
                {BANKS.map(b => (
                    <TouchableOpacity
                        key={b.code}
                        style={[
                            styles.bankBtn,
                            selectedBank === b.code && {
                                borderColor: b.color,
                                backgroundColor: b.color + '15',
                            },
                        ]}
                        onPress={() => setSelectedBank(b.code)}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.bankDot, { backgroundColor: b.color }]} />
                        <Text style={[
                            styles.bankCode,
                            selectedBank === b.code && { color: b.color, fontWeight: '800' },
                        ]}>
                            {b.code}
                        </Text>
                        <Text style={styles.bankName} numberOfLines={1}>{b.name}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Số tài khoản */}
            <Text style={styles.sectionTitle}>Thông tin tài khoản</Text>
            <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Số tài khoản *</Text>
                <TextInput
                    style={styles.fieldInput}
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    placeholder="Nhập số tài khoản ngân hàng"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    maxLength={20}
                />
            </View>

            {/* Tên chủ tài khoản */}
            <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Tên chủ tài khoản *</Text>
                <TextInput
                    style={styles.fieldInput}
                    value={accountName}
                    onChangeText={t => setAccountName(t.toUpperCase())}
                    placeholder="NGUYEN VAN A"
                    placeholderTextColor="#999"
                    autoCapitalize="characters"
                />
            </View>

            {/* Ghi chú */}
            <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Ghi chú (tuỳ chọn)</Text>
                <TextInput
                    style={[styles.fieldInput, { height: 72, textAlignVertical: 'top' }]}
                    value={note}
                    onChangeText={setNote}
                    placeholder="Nội dung chuyển khoản..."
                    placeholderTextColor="#999"
                    multiline
                    maxLength={100}
                />
            </View>

            {/* Thời gian xử lý */}
            <View style={styles.infoBox}>
                <Ionicons name="time-outline" size={16} color="#0066FF" />
                <Text style={styles.infoText}>
                    Thời gian xử lý: <Text style={{ fontWeight: '700' }}>1-3 ngày làm việc</Text>
                </Text>
            </View>

            {/* Nút tiếp theo */}
            <TouchableOpacity
                style={[
                    styles.primaryBtn,
                    (amount < MIN_AMOUNT || amount > balance || !selectedBank || !accountNumber || !accountName)
                    && styles.primaryBtnDisabled,
                ]}
                onPress={handleNextStep}
                activeOpacity={0.85}
            >
                <Text style={styles.primaryBtnText}>Tiếp tục →</Text>
            </TouchableOpacity>
        </ScrollView>
    );

    // ════════════════════════════════════════════════════════
    // STEP 2 — Xác nhận
    // ════════════════════════════════════════════════════════
    const renderStep2 = () => (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            {/* Cảnh báo */}
            <View style={styles.warningBox}>
                <Ionicons name="warning" size={20} color="#FF6B35" />
                <Text style={styles.warningText}>
                    Giao dịch rút tiền <Text style={{ fontWeight: '800' }}>không thể hoàn tác</Text> sau khi xác nhận.
                    Vui lòng kiểm tra kỹ thông tin.
                </Text>
            </View>

            {/* Tóm tắt */}
            <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Chi tiết giao dịch</Text>

                <Row label="Số tiền rút" value={formatVND(amount)} valueStyle={{ color: '#E31837', fontWeight: '800', fontSize: 18 }} />
                <Row label="Ngân hàng" value={`${bankInfo?.code} — ${bankInfo?.name}`} />
                <Row label="Số tài khoản" value={accountNumber} />
                <Row label="Chủ tài khoản" value={accountName} />
                {note ? <Row label="Ghi chú" value={note} /> : null}
                <Row label="Phí giao dịch" value="Miễn phí" valueStyle={{ color: '#00A651' }} />
                <Row label="Thời gian xử lý" value="1-3 ngày làm việc" />

                <View style={styles.divider} />
                <Row
                    label="Số dư sau rút"
                    value={formatVND(balance - amount)}
                    valueStyle={{ color: '#0066FF', fontWeight: '700' }}
                />
            </View>

            {/* Error */}
            {withdrawStatus === 'error' && withdrawError && (
                <View style={styles.errorBox}>
                    <Ionicons name="close-circle" size={18} color="#E31837" />
                    <Text style={styles.errorBoxText}>{withdrawError}</Text>
                </View>
            )}

            {/* Nút xác nhận */}
            <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#E31837' }]}
                onPress={handleConfirm}
                disabled={withdrawStatus === 'loading'}
                activeOpacity={0.85}
            >
                {withdrawStatus === 'loading' ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <Text style={styles.primaryBtnText}>Xác nhận rút tiền</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => { resetWithdraw(); setStep(1); }}
                disabled={withdrawStatus === 'loading'}
                activeOpacity={0.8}
            >
                <Text style={styles.secondaryBtnText}>← Chỉnh sửa</Text>
            </TouchableOpacity>
        </ScrollView>
    );

    // ════════════════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════════════════
    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity
                    onPress={() => step === 2 ? setStep(1) : router.back()}
                    style={styles.backBtn}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={22} color="#1a1a2e" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Rút tiền</Text>
                {/* Step indicator */}
                <View style={styles.stepIndicator}>
                    <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
                    <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
                    <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
                </View>
            </View>

            {/* Step label */}
            <View style={styles.stepLabelRow}>
                <Text style={[styles.stepLabel, step === 1 && styles.stepLabelActive]}>
                    1. Nhập thông tin
                </Text>
                <Text style={styles.stepSep}>›</Text>
                <Text style={[styles.stepLabel, step === 2 && styles.stepLabelActive]}>
                    2. Xác nhận
                </Text>
            </View>

            {step === 1 ? renderStep1() : renderStep2()}
        </KeyboardAvoidingView>
    );
}

// ─── Row component ────────────────────────────────────────────
function Row({ label, value, valueStyle }: {
    label: string;
    value: string;
    valueStyle?: object;
}) {
    return (
        <View style={rowStyles.row}>
            <Text style={rowStyles.label}>{label}</Text>
            <Text style={[rowStyles.value, valueStyle]}>{value}</Text>
        </View>
    );
}
const rowStyles = StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8 },
    label: { color: '#666', fontSize: 14, flex: 1 },
    value: { color: '#1a1a2e', fontSize: 14, fontWeight: '600', flex: 1.2, textAlign: 'right' },
});

// ════════════════════════════════════════════════════════════
// Styles
// ════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },

    // ── Header ──
    header: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        gap: 12,
    },
    backBtn: { padding: 4 },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
    stepIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ddd' },
    stepDotActive: { backgroundColor: '#0066FF' },
    stepLine: { width: 20, height: 2, backgroundColor: '#ddd' },
    stepLineActive: { backgroundColor: '#0066FF' },

    // ── Step labels ──
    stepLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    stepLabel: { fontSize: 13, color: '#999', fontWeight: '500' },
    stepLabelActive: { color: '#0066FF', fontWeight: '700' },
    stepSep: { color: '#ccc', fontSize: 16 },

    // ── Balance card ──
    balanceCard: {
        backgroundColor: '#0066FF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        alignItems: 'center',
    },
    balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 4 },
    balanceAmount: { color: '#fff', fontSize: 28, fontWeight: '800' },
    holdText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4 },

    // ── Section title ──
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1a1a2e',
        marginBottom: 10,
        marginTop: 4,
    },

    // ── Quick amounts ──
    quickGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    quickBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#E0E0E0',
        backgroundColor: '#fff',
    },
    quickBtnActive: { borderColor: '#0066FF', backgroundColor: '#EBF3FF' },
    quickBtnDisabled: { borderColor: '#F0F0F0', backgroundColor: '#FAFAFA' },
    quickBtnText: { fontSize: 14, fontWeight: '600', color: '#333' },
    quickBtnTextActive: { color: '#0066FF' },
    quickBtnTextDisabled: { color: '#ccc' },

    // ── Amount input ──
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E0E0E0',
        paddingHorizontal: 14,
        marginBottom: 4,
        height: 52,
    },
    inputPrefix: { fontSize: 20, color: '#0066FF', fontWeight: '700', marginRight: 8 },
    amountInput: { flex: 1, fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
    errorHint: { color: '#E31837', fontSize: 12, marginBottom: 8, marginLeft: 4 },

    // ── Banks ──
    bankGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    bankBtn: {
        width: '30%',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#E0E0E0',
        backgroundColor: '#fff',
        alignItems: 'center',
        gap: 4,
    },
    bankDot: { width: 8, height: 8, borderRadius: 4 },
    bankCode: { fontSize: 13, fontWeight: '700', color: '#333' },
    bankName: { fontSize: 10, color: '#888', textAlign: 'center' },

    // ── Fields ──
    fieldWrap: { marginBottom: 12 },
    fieldLabel: { fontSize: 13, color: '#555', fontWeight: '600', marginBottom: 6 },
    fieldInput: {
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#E0E0E0',
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1a1a2e',
    },

    // ── Info box ──
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#EBF3FF',
        borderRadius: 10,
        padding: 12,
        marginBottom: 20,
    },
    infoText: { color: '#0066FF', fontSize: 13, flex: 1 },

    // ── Warning box ──
    warningBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#FFF3EE',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#FFD4C2',
    },
    warningText: { color: '#CC4400', fontSize: 13, flex: 1, lineHeight: 20 },

    // ── Summary card ──
    summaryCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 18,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a2e',
        marginBottom: 12,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 8 },

    // ── Error box ──
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FFF0F0',
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#FFD0D0',
    },
    errorBoxText: { color: '#E31837', fontSize: 13, flex: 1 },

    // ── Buttons ──
    primaryBtn: {
        backgroundColor: '#0066FF',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 10,
    },
    primaryBtnDisabled: { backgroundColor: '#B0C4DE' },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    secondaryBtn: {
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#E0E0E0',
        backgroundColor: '#fff',
    },
    secondaryBtnText: { color: '#555', fontSize: 15, fontWeight: '600' },
});