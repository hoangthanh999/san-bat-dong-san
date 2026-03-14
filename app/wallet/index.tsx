import React, { useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, StatusBar,
    Platform, ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useWalletStore } from '../../store/walletStore';
import { Transaction } from '../../types';

function TransactionItem({ item }: { item: Transaction }) {
    const isIncoming = item.type === 'DEPOSIT' || item.type === 'REFUND';
    const isPending = item.status === 'PENDING';

    const typeLabel: Record<string, string> = {
        DEPOSIT: 'Nạp tiền qua VNPay',
        POST_FEE: 'Phí đăng tin',
        MEMBERSHIP: 'Mua gói hội viên',
        BOOST: 'Đẩy tin',
        REFUND: 'Hoàn tiền',
    };

    const formatDate = (d: string) =>
        new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    return (
        <View style={styles.txItem}>
            <View style={[
                styles.txIconWrap,
                { backgroundColor: isPending ? '#FFF8E1' : isIncoming ? '#F0FDF4' : '#FFF0F0' },
            ]}>
                <Ionicons
                    name={isPending ? 'time-outline' : isIncoming ? 'arrow-down-circle' : 'arrow-up-circle'}
                    size={24}
                    color={isPending ? '#FF9500' : isIncoming ? '#22C55E' : '#EF4444'}
                />
            </View>
            <View style={styles.txInfo}>
                <Text style={styles.txLabel}>{item.description || typeLabel[item.type] || item.type}</Text>
                {item.roomTitle && (
                    <Text style={styles.txSub} numberOfLines={1}>{item.roomTitle}</Text>
                )}
                {item.referenceCode && (
                    <Text style={styles.txRef}>Mã GD: {item.referenceCode}</Text>
                )}
                <Text style={styles.txDate}>{formatDate(item.createdAt)}</Text>
            </View>
            <Text style={[
                styles.txAmount,
                { color: isPending ? '#FF9500' : isIncoming ? '#22C55E' : '#EF4444' },
            ]}>
                {isIncoming ? '+' : '-'}
                {item.amount.toLocaleString('vi-VN')}đ
            </Text>
        </View>
    );
}

export default function WalletScreen() {
    const router = useRouter();
    const { balance, transactions, isLoading, fetchBalance, fetchTransactions } = useWalletStore();
    const [refreshing, setRefreshing] = React.useState(false);

    useEffect(() => {
        fetchBalance();
        fetchTransactions(true);
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchBalance(), fetchTransactions(true)]);
        setRefreshing(false);
    };

    const recentTx = transactions.slice(0, 5);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="light-content" />

            {/* Header gradient */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Ví của tôi</Text>
                <TouchableOpacity onPress={() => router.push('/wallet/history' as any)}>
                    <Ionicons name="receipt-outline" size={24} color="white" />
                </TouchableOpacity>
            </View>

            {/* Balance card */}
            <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>💳 Số dư khả dụng</Text>
                <Text style={styles.balanceAmount}>{balance.toLocaleString('vi-VN')} đ</Text>
                <TouchableOpacity
                    style={styles.depositBtn}
                    onPress={() => router.push('/wallet/deposit' as any)}
                    activeOpacity={0.85}
                >
                    <Ionicons name="add-circle-outline" size={20} color="white" />
                    <Text style={styles.depositBtnText}>Nạp tiền</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.body}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0066FF" />}
                showsVerticalScrollIndicator={false}
            >
                {/* Quick actions */}
                <View style={styles.quickActions}>
                    {[
                        { icon: 'add-circle', label: 'Nạp tiền', path: '/wallet/deposit', color: '#0066FF' },
                        { icon: 'receipt', label: 'Lịch sử', path: '/wallet/history', color: '#22C55E' },
                        { icon: 'star', label: 'Gói dịch vụ', path: '/packages', color: '#FF9500' },
                        { icon: 'rocket', label: 'Boost tin', path: '/packages', color: '#8B5CF6' },
                    ].map((action) => (
                        <TouchableOpacity
                            key={action.label}
                            style={styles.quickAction}
                            onPress={() => router.push(action.path as any)}
                        >
                            <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}15` }]}>
                                <Ionicons name={action.icon as any} size={26} color={action.color} />
                            </View>
                            <Text style={styles.quickActionLabel}>{action.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Recent transactions */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Giao dịch gần đây</Text>
                        <TouchableOpacity onPress={() => router.push('/wallet/history' as any)}>
                            <Text style={styles.seeAll}>Xem tất cả</Text>
                        </TouchableOpacity>
                    </View>

                    {isLoading && transactions.length === 0 ? (
                        <ActivityIndicator color="#0066FF" style={{ marginTop: 20 }} />
                    ) : recentTx.length === 0 ? (
                        <View style={styles.emptyTx}>
                            <Ionicons name="receipt-outline" size={40} color="#CCC" />
                            <Text style={styles.emptyText}>Chưa có giao dịch nào</Text>
                        </View>
                    ) : (
                        recentTx.map((tx) => <TransactionItem key={tx.id} item={tx} />)
                    )}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F4FF' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 54 : 20,
        paddingBottom: 16,
        backgroundColor: '#0066FF',
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: 'white' },
    balanceCard: {
        backgroundColor: '#0055DD', marginHorizontal: 16, marginTop: -1,
        borderRadius: 20, padding: 24, alignItems: 'center', gap: 10,
        shadowColor: '#0066FF', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
    },
    balanceLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
    balanceAmount: { fontSize: 34, fontWeight: '800', color: 'white', letterSpacing: 1 },
    depositBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 30,
        paddingHorizontal: 24, paddingVertical: 10, marginTop: 4,
    },
    depositBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
    body: { flex: 1, marginTop: 16 },
    quickActions: {
        flexDirection: 'row', justifyContent: 'space-around',
        backgroundColor: 'white', marginHorizontal: 16, borderRadius: 16,
        paddingVertical: 16, paddingHorizontal: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    },
    quickAction: { alignItems: 'center', gap: 6 },
    quickActionIcon: { width: 52, height: 52, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    quickActionLabel: { fontSize: 12, color: '#333', fontWeight: '500' },
    section: {
        backgroundColor: 'white', marginHorizontal: 16, marginTop: 16,
        borderRadius: 16, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    },
    sectionHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10,
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
    seeAll: { color: '#0066FF', fontSize: 14, fontWeight: '600' },
    txItem: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
        paddingVertical: 13, borderTopWidth: 1, borderTopColor: '#F5F5F5', gap: 12,
    },
    txIconWrap: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    txInfo: { flex: 1, gap: 2 },
    txLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
    txSub: { fontSize: 12, color: '#888' },
    txRef: { fontSize: 11, color: '#AAA' },
    txDate: { fontSize: 12, color: '#888', marginTop: 2 },
    txAmount: { fontSize: 15, fontWeight: '700' },
    emptyTx: { alignItems: 'center', paddingVertical: 30, gap: 8 },
    emptyText: { fontSize: 14, color: '#999' },
});
