import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar,
    Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useWalletStore } from '../../store/walletStore';
import { Transaction } from '../../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FILTER_TABS = [
    { key: '', label: 'Tất cả' },
    { key: 'DEPOSIT', label: 'Nạp tiền' },
    { key: 'POST_FEE,MEMBERSHIP,BOOST', label: 'Chi tiêu' },
];

const TYPE_LABELS: Record<string, string> = {
    DEPOSIT: 'Nạp tiền VNPay',
    POST_FEE: 'Phí đăng tin',
    MEMBERSHIP: 'Mua gói hội viên',
    BOOST: 'Đẩy tin',
    REFUND: 'Hoàn tiền',
};

function TransactionCard({ item }: { item: Transaction }) {
    const isIncoming = item.type === 'DEPOSIT' || item.type === 'REFUND';
    const isPending = item.status === 'PENDING';
    const amountColor = isPending ? '#FF9500' : isIncoming ? '#22C55E' : '#EF4444';

    const formatDate = (d: string) => new Date(d).toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    });

    return (
        <View style={styles.card}>
            <View style={[styles.cardIconWrap, { backgroundColor: `${amountColor}15` }]}>
                <Ionicons
                    name={isPending ? 'time-outline' : isIncoming ? 'arrow-down-circle' : 'arrow-up-circle'}
                    size={26} color={amountColor}
                />
            </View>
            <View style={styles.cardBody}>
                <Text style={styles.cardLabel}>{item.description || TYPE_LABELS[item.type] || item.type}</Text>
                {item.vnpayCode && <Text style={styles.cardRef}>Mã GD: {item.vnpayCode}</Text>}
                <View style={styles.cardFooter}>
                    <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
                    <View style={[styles.statusDot, { backgroundColor: amountColor }]} />
                    <Text style={[styles.cardStatus, { color: amountColor }]}>
                        {isPending ? 'Đang xử lý' : item.status === 'SUCCESS' ? 'Thành công' : 'Thất bại'}
                    </Text>
                </View>
            </View>
            <Text style={[styles.cardAmount, { color: amountColor }]}>
                {isIncoming ? '+' : '-'}{item.amount.toLocaleString('vi-VN')}đ
            </Text>
        </View>
    );
}

function groupByMonth(txs: Transaction[]) {
    const groups: { title: string; data: Transaction[] }[] = [];
    const map = new Map<string, Transaction[]>();
    for (const tx of txs) {
        const d = new Date(tx.createdAt);
        const key = `Tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(tx);
    }
    map.forEach((data, title) => groups.push({ title, data }));
    return groups;
}

export default function TransactionHistoryScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { transactions, isLoading, fetchTransactions } = useWalletStore();
    const [activeFilter, setActiveFilter] = useState('');

    useEffect(() => {
        fetchTransactions();
    }, []);

    // Client-side filtering theo type
    const filteredTx = activeFilter
        ? transactions.filter(tx => activeFilter.split(',').includes(tx.type))
        : transactions;

    const groups = groupByMonth(filteredTx);

    const renderItem = ({ item }: { item: { title: string; data: Transaction[] } }) => (
        <View>
            <Text style={styles.monthHeader}>{item.title}</Text>
            {item.data.map((tx) => <TransactionCard key={tx.id} item={tx} />)}
        </View>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Lịch sử giao dịch</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Filter tabs */}
            <View style={styles.filterBar}>
                {FILTER_TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.filterTab, activeFilter === tab.key && styles.filterTabActive]}
                        onPress={() => setActiveFilter(tab.key)}
                    >
                        <Text style={[styles.filterText, activeFilter === tab.key && styles.filterTextActive]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {isLoading && transactions.length === 0 ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#0066FF" />
                </View>
            ) : groups.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="receipt-outline" size={56} color="#CCC" />
                    <Text style={styles.emptyTitle}>Chưa có giao dịch</Text>
                </View>
            ) : (
                <FlatList
                    data={groups}
                    keyExtractor={(item) => item.title}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListFooterComponent={isLoading ? <ActivityIndicator color="#0066FF" style={{ marginVertical: 16 }} /> : null}
                />
            )}
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
    filterBar: {
        flexDirection: 'row', backgroundColor: 'white',
        borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    },
    filterTab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    filterTabActive: { borderBottomWidth: 2, borderBottomColor: '#0066FF' },
    filterText: { fontSize: 14, color: '#888', fontWeight: '500' },
    filterTextActive: { color: '#0066FF', fontWeight: '700' },
    listContent: { padding: 16, paddingBottom: 40 },
    monthHeader: {
        fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase',
        marginBottom: 8, marginTop: 12, letterSpacing: 0.5,
    },
    card: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
        borderRadius: 14, padding: 14, marginBottom: 10, gap: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    cardIconWrap: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    cardBody: { flex: 1, gap: 3 },
    cardLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
    cardSub: { fontSize: 12, color: '#888' },
    cardRef: { fontSize: 11, color: '#AAA' },
    cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
    cardDate: { fontSize: 12, color: '#999' },
    statusDot: { width: 5, height: 5, borderRadius: 2.5 },
    cardStatus: { fontSize: 12, fontWeight: '600' },
    cardAmount: { fontSize: 15, fontWeight: '800' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: '#888' },
});
