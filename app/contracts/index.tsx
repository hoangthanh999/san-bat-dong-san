import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar,
    Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContractStore } from '../../store/contractStore';
import { Contract, ContractStatus } from '../../types';
import { AuthGuardScreen } from '../../components/auth/AuthGuardScreen';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    PENDING: { label: 'Chờ ký', color: '#FF9500', bg: '#FFF3E0' },
    ACTIVE: { label: 'Đang hiệu lực', color: '#22C55E', bg: '#F0FDF4' },
    EXPIRED: { label: 'Đã hết hạn', color: '#EF4444', bg: '#FFF0F0' },
    TERMINATED: { label: 'Đã chấm dứt', color: '#888', bg: '#F0F0F0' },
};

const TABS: { key: ContractStatus | 'ALL'; label: string }[] = [
    { key: 'ACTIVE', label: 'Đang hiệu lực' },
    { key: 'EXPIRED', label: 'Đã hết hạn' },
    { key: 'ALL', label: 'Tất cả' },
];

function ContractCard({ contract, onPress }: { contract: Contract; onPress: () => void }) {
    const config = STATUS_CONFIG[contract.status] || STATUS_CONFIG.PENDING;
    const startDate = new Date(contract.startDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const endDate = new Date(contract.endDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Days remaining
    const daysLeft = Math.max(0, Math.floor((new Date(contract.endDate).getTime() - Date.now()) / 86400000));

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
            <View style={styles.cardHeader}>
                <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
                    <View style={[styles.statusDot, { backgroundColor: config.color }]} />
                    <Text style={[styles.statusLabel, { color: config.color }]}>{config.label}</Text>
                </View>
                {contract.status === 'ACTIVE' && daysLeft <= 30 && (
                    <Text style={styles.expiringWarning}>⚠️ Còn {daysLeft} ngày</Text>
                )}
            </View>

            <View style={styles.cardBody}>
                <Text style={styles.roomTitle} numberOfLines={1}>
                    🏠 {contract.roomTitle || `Phòng #${contract.roomId}`}
                </Text>
                {contract.tenantName && (
                    <Text style={styles.tenantName}>👤 Thuê: {contract.tenantName}</Text>
                )}
                <Text style={styles.dateRow}>📅 {startDate} → {endDate}</Text>
                <Text style={styles.rentRow}>
                    💰 {contract.monthlyRent.toLocaleString('vi-VN')}đ/tháng
                </Text>
            </View>

            <View style={styles.cardFooter}>
                <TouchableOpacity style={styles.detailBtn} onPress={onPress}>
                    <Text style={styles.detailBtnText}>Xem chi tiết</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pdfBtn} onPress={onPress}>
                    <Ionicons name="download-outline" size={16} color="#0066FF" />
                    <Text style={styles.pdfBtnText}>PDF</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
}

export default function ContractsScreen() {
    return (
        <AuthGuardScreen
            message="Đăng nhập để xem hợp đồng thuê"
            icon="document-text-outline"
        >
            <ContractsContent />
        </AuthGuardScreen>
    );
}

function ContractsContent() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { contracts, isLoading, fetchContracts } = useContractStore();
    const [activeTab, setActiveTab] = useState<ContractStatus | 'ALL'>('ACTIVE');
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchContracts(true, activeTab === 'ALL' ? undefined : activeTab).catch(() => { });
    }, [activeTab]);

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await fetchContracts(true, activeTab === 'ALL' ? undefined : activeTab);
        } catch { }
        setRefreshing(false);
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Hợp đồng của tôi</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Development Banner */}
            <View style={styles.devBanner}>
                <Ionicons name="construct-outline" size={18} color="#E65100" />
                <Text style={styles.devBannerText}>
                    🚧 Tính năng đang phát triển — Dữ liệu sẽ được cập nhật khi backend hoàn thiện
                </Text>
            </View>

            <View style={styles.tabBar}>
                {TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {isLoading && contracts.length === 0 ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#0066FF" />
                </View>
            ) : contracts.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="document-text-outline" size={56} color="#CCC" />
                    <Text style={styles.emptyTitle}>Chưa có hợp đồng</Text>
                    <Text style={styles.emptySub}>Hợp đồng sẽ xuất hiện sau khi bạn thỏa thuận thuê phòng</Text>
                </View>
            ) : (
                <FlatList
                    data={contracts}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <ContractCard
                            contract={item}
                            onPress={() => router.push(`/contracts/${item.id}` as any)}
                        />
                    )}
                    contentContainerStyle={{ padding: 16, gap: 12 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0066FF" />}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    devBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#FFF3E0', paddingHorizontal: 16, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: '#FFE0B2',
    },
    devBannerText: { flex: 1, fontSize: 12, color: '#E65100', lineHeight: 17 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 0 /* paddingTop set via inline style using useSafeAreaInsets */, paddingBottom: 12,
        backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
    tabBar: {
        flexDirection: 'row', backgroundColor: 'white',
        borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    tabActive: { borderBottomWidth: 2, borderBottomColor: '#0066FF' },
    tabText: { fontSize: 13, color: '#888', fontWeight: '500' },
    tabTextActive: { color: '#0066FF', fontWeight: '700' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 17, fontWeight: '600', color: '#333' },
    emptySub: { fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 20 },
    card: {
        backgroundColor: 'white', borderRadius: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8,
    },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    },
    statusDot: { width: 7, height: 7, borderRadius: 3.5 },
    statusLabel: { fontSize: 13, fontWeight: '600' },
    expiringWarning: { fontSize: 12, color: '#FF9500', fontWeight: '600' },
    cardBody: { paddingHorizontal: 14, paddingBottom: 12, gap: 6 },
    roomTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
    tenantName: { fontSize: 14, color: '#555' },
    dateRow: { fontSize: 13, color: '#555' },
    rentRow: { fontSize: 14, fontWeight: '700', color: '#0066FF' },
    cardFooter: {
        flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F5F5F5',
        paddingHorizontal: 14, paddingVertical: 10, gap: 10,
    },
    detailBtn: {
        flex: 1, backgroundColor: '#E8F0FF', borderRadius: 8,
        paddingVertical: 9, alignItems: 'center',
    },
    detailBtnText: { color: '#0066FF', fontWeight: '600', fontSize: 14 },
    pdfBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        borderWidth: 1, borderColor: '#0066FF', borderRadius: 8,
        paddingHorizontal: 14, paddingVertical: 9,
    },
    pdfBtnText: { color: '#0066FF', fontWeight: '600', fontSize: 14 },
});
