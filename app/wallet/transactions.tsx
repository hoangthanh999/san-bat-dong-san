import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    StatusBar, ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWalletStore } from '../../store/walletStore';
import { Transaction } from '../../types';
import { AuthGuardScreen } from '../../components/auth/AuthGuardScreen';

// ─── Filter tabs ──────────────────────────────────────────────
type FilterKey = 'ALL' | 'DEPOSIT' | 'SERVICE' | 'REFUND' | 'PAYMENT';

const FILTER_TABS: { key: FilterKey; label: string; icon: string }[] = [
    { key: 'ALL', label: 'Tất cả', icon: 'list-outline' },
    { key: 'DEPOSIT', label: 'Nạp tiền', icon: 'arrow-down-circle-outline' },
    { key: 'SERVICE', label: 'Mua gói', icon: 'cube-outline' },
    { key: 'REFUND', label: 'Hoàn tiền', icon: 'return-down-back-outline' },
    { key: 'PAYMENT', label: 'VNPay', icon: 'card-outline' },
];

// Map type → filter key
const TYPE_TO_FILTER: Record<string, FilterKey> = {
    DEPOSIT: 'DEPOSIT',
    REFUND: 'REFUND',
    POST_FEE: 'SERVICE',
    MEMBERSHIP: 'SERVICE',
    BOOST: 'SERVICE',
};

// Map type → label hiển thị
const TYPE_LABELS: Record<string, string> = {
    DEPOSIT: 'Nạp tiền VNPay',
    POST_FEE: 'Phí đăng tin',
    MEMBERSHIP: 'Mua gói hội viên',
    BOOST: 'Đẩy tin',
    REFUND: 'Hoàn tiền',
};

// Map status → config
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    SUCCESS: { label: 'Thành công', color: '#16A34A', bg: '#F0FDF4' },
    PENDING: { label: 'Đang xử lý', color: '#D97706', bg: '#FFFBEB' },
    FAILED: { label: 'Thất bại', color: '#DC2626', bg: '#FEF2F2' },
};

function formatVND(n: number): string {
    return n.toLocaleString('vi-VN') + 'đ';
}

function formatDate(d: string): string {
    const dt = new Date(d);
    return dt.toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    }) + ' ' + dt.toLocaleTimeString('vi-VN', {
        hour: '2-digit', minute: '2-digit',
    });
}

// ─── TransactionCard ──────────────────────────────────────────
function TransactionCard({ item }: { item: Transaction }) {
    const isIncoming = item.type === 'DEPOSIT' || item.type === 'REFUND';
    const amount = Number(item.amount) || 0;
    const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG['PENDING'];

    return (
        <View style={cardStyles.container}>
            {/* Icon + Info */}
            <View style={cardStyles.row}>
                <View style={[cardStyles.iconWrap, { backgroundColor: isIncoming ? '#F0FDF4' : '#FFF7ED' }]}>
                    <Ionicons
                        name={isIncoming ? 'arrow-down-circle' : 'arrow-up-circle'}
                        size={26}
                        color={isIncoming ? '#16A34A' : '#EA580C'}
                    />
                </View>

                <View style={cardStyles.info}>
                    <Text style={cardStyles.typeLabel} numberOfLines={1}>
                        {item.description || TYPE_LABELS[item.type] || item.type}
                    </Text>
                    <Text style={cardStyles.date}>{formatDate(item.createdAt)}</Text>
                    {/* Mã VNPay */}
                    {item.vnpayCode ? (
                        <View style={cardStyles.codeRow}>
                            <Ionicons name="receipt-outline" size={11} color="#94A3B8" />
                            <Text style={cardStyles.code}>{item.vnpayCode}</Text>
                        </View>
                    ) : null}
                </View>

                {/* Amount + Badge */}
                <View style={cardStyles.right}>
                    <Text style={[
                        cardStyles.amount,
                        { color: isIncoming ? '#16A34A' : '#EA580C' },
                    ]}>
                        {isIncoming ? '+' : '-'}{formatVND(amount)}
                    </Text>
                    <View style={[cardStyles.badge, { backgroundColor: statusCfg.bg }]}>
                        <Text style={[cardStyles.badgeText, { color: statusCfg.color }]}>
                            {statusCfg.label}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const cardStyles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 14,
        padding: 14,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    iconWrap: {
        width: 46, height: 46, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
    },
    info: { flex: 1, gap: 3 },
    typeLabel: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
    date: { fontSize: 12, color: '#94A3B8' },
    codeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    code: { fontSize: 11, color: '#94A3B8', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
    right: { alignItems: 'flex-end', gap: 6 },
    amount: { fontSize: 15, fontWeight: '800' },
    badge: {
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 20,
    },
    badgeText: { fontSize: 11, fontWeight: '600' },
});

// ════════════════════════════════════════════════════════════
// Main Screen
// ════════════════════════════════════════════════════════════
export default function TransactionsScreen() {
    return (
        <AuthGuardScreen message="Đăng nhập để xem lịch sử giao dịch" icon="receipt-outline">
            <TransactionsContent />
        </AuthGuardScreen>
    );
}

function TransactionsContent() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { transactions, paymentTransactions, isLoading, fetchTransactions, fetchPaymentTransactions } = useWalletStore();
    const [activeFilter, setActiveFilter] = useState<FilterKey>('ALL');
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchTransactions();
        fetchPaymentTransactions();
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([fetchTransactions(), fetchPaymentTransactions()]);
        setRefreshing(false);
    }, [fetchTransactions, fetchPaymentTransactions]);

    // ── Filter logic ──
    const filtered = useMemo(() => {
        if (activeFilter === 'PAYMENT') return paymentTransactions;
        if (activeFilter === 'ALL') return transactions;
        return transactions.filter(tx => TYPE_TO_FILTER[tx.type] === activeFilter);
    }, [transactions, paymentTransactions, activeFilter]);

    // ── Tổng tiền theo filter ──
    const summary = useMemo(() => {
        const income = filtered
            .filter(tx => (tx.type === 'DEPOSIT' || tx.type === 'REFUND') && tx.status === 'SUCCESS')
            .reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
        const expense = filtered
            .filter(tx => tx.type !== 'DEPOSIT' && tx.type !== 'REFUND' && tx.status === 'SUCCESS')
            .reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
        return { income, expense, count: filtered.length };
    }, [filtered]);

    // ── Empty state ──
    const renderEmpty = () => (
        <View style={styles.emptyWrap}>
            <Ionicons name="receipt-outline" size={56} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Chưa có giao dịch</Text>
            <Text style={styles.emptyDesc}>
                {activeFilter === 'ALL'
                    ? 'Bạn chưa có giao dịch nào.'
                    : 'Không có giao dịch nào trong danh mục này.'}
            </Text>
        </View>
    );

    // ── Header component (inside FlatList) ──
    const ListHeader = () => (
        <>
            {/* Summary card */}
            <View style={styles.summaryCard}>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Tổng nạp / hoàn</Text>
                    <Text style={[styles.summaryValue, { color: '#16A34A' }]}>
                        +{formatVND(summary.income)}
                    </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Tổng chi</Text>
                    <Text style={[styles.summaryValue, { color: '#EA580C' }]}>
                        -{formatVND(summary.expense)}
                    </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Số giao dịch</Text>
                    <Text style={[styles.summaryValue, { color: '#0066FF' }]}>
                        {summary.count}
                    </Text>
                </View>
            </View>

            {/* Filter tabs */}
            <View style={styles.filterWrap}>
                {FILTER_TABS.map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[
                            styles.filterTab,
                            activeFilter === tab.key && styles.filterTabActive,
                        ]}
                        onPress={() => setActiveFilter(tab.key)}
                        activeOpacity={0.75}
                    >
                        <Ionicons
                            name={tab.icon as any}
                            size={14}
                            color={activeFilter === tab.key ? '#fff' : '#64748B'}
                        />
                        <Text style={[
                            styles.filterTabText,
                            activeFilter === tab.key && styles.filterTabTextActive,
                        ]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Count label */}
            <Text style={styles.countLabel}>
                {summary.count} giao dịch
            </Text>
        </>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            {/* ── Header ── */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={22} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Lịch sử giao dịch</Text>
                <TouchableOpacity onPress={onRefresh} style={styles.backBtn} activeOpacity={0.7}>
                    <Ionicons name="refresh-outline" size={22} color="#1E293B" />
                </TouchableOpacity>
            </View>

            {/* ── Content ── */}
            {isLoading && filtered.length === 0 ? (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color="#0066FF" />
                    <Text style={styles.loadingText}>Đang tải giao dịch...</Text>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => `${activeFilter}-${item.id}`}
                    renderItem={({ item }) => <TransactionCard item={item} />}
                    ListHeaderComponent={<ListHeader />}
                    ListEmptyComponent={renderEmpty}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#0066FF"
                        />
                    }
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={15}
                    maxToRenderPerBatch={10}
                />
            )}
        </View>
    );
}

// ════════════════════════════════════════════════════════════
// Styles
// ════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F1F5F9' },

    // ── Header ──
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingBottom: 14,
        backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
        gap: 8,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#1E293B', textAlign: 'center' },

    // ── Loading ──
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: '#94A3B8', fontSize: 14 },

    // ── List ──
    listContent: { paddingBottom: 40 },

    // ── Summary card ──
    summaryCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 12,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    summaryItem: { flex: 1, alignItems: 'center', gap: 4 },
    summaryLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
    summaryValue: { fontSize: 15, fontWeight: '800' },
    summaryDivider: { width: 1, backgroundColor: '#F1F5F9', marginVertical: 4 },

    // ── Filter tabs ──
    filterWrap: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 8,
        marginBottom: 8,
        flexWrap: 'wrap',
    },
    filterTab: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1.5, borderColor: '#E2E8F0',
    },
    filterTabActive: {
        backgroundColor: '#0066FF',
        borderColor: '#0066FF',
    },
    filterTabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
    filterTabTextActive: { color: '#fff' },

    // ── Count label ──
    countLabel: {
        fontSize: 13, color: '#94A3B8', fontWeight: '500',
        paddingHorizontal: 20, marginBottom: 8,
    },

    // ── Empty ──
    emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 10 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: '#475569' },
    emptyDesc: { fontSize: 14, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 40 },
});
