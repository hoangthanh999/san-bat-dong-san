import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
    Platform, Modal, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { usePackageStore } from '../../store/packageStore';
import { useWalletStore } from '../../store/walletStore';
import { ServicePackage } from '../../types';

function PackageCard({ pkg, onBuy }: { pkg: ServicePackage; onBuy: () => void }) {
    return (
        <View style={[styles.pkgCard, pkg.isPopular && styles.pkgCardPopular]}>
            {pkg.isPopular && (
                <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>⭐ Phổ biến</Text>
                </View>
            )}
            <Text style={styles.pkgName}>{pkg.name}</Text>
            <Text style={styles.pkgPrice}>{pkg.price.toLocaleString('vi-VN')}đ<Text style={styles.pkgDuration}> / {pkg.durationDays} ngày</Text></Text>
            {pkg.description && <Text style={styles.pkgDesc}>{pkg.description}</Text>}
            {pkg.features && pkg.features.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                    <Text style={styles.featureText}>{f}</Text>
                </View>
            ))}
            <TouchableOpacity
                style={[styles.buyBtn, pkg.isPopular && styles.buyBtnPrimary]}
                onPress={onBuy}
                activeOpacity={0.85}
            >
                <Text style={[styles.buyBtnText, pkg.isPopular && styles.buyBtnTextPrimary]}>Mua ngay</Text>
            </TouchableOpacity>
        </View>
    );
}

export default function PackagesScreen() {
    const router = useRouter();
    const { membershipPackages, boostPackages, isLoading, isPurchasing, fetchPackages, purchaseMembership } = usePackageStore();
    const { transactions, fetchTransactions } = useWalletStore();
    const [activeTab, setActiveTab] = useState<'MEMBERSHIP' | 'ROOM_PROMOTION'>('MEMBERSHIP');
    const [confirmPkg, setConfirmPkg] = useState<ServicePackage | null>(null);

    // Tính balance từ transaction history (backend chưa có wallet balance API)
    const balance = transactions.reduce((sum, tx) => {
        if (tx.status !== 'SUCCESS') return sum;
        const amount = Number(tx.amount) || 0;
        if (tx.type === 'DEPOSIT' || tx.type === 'REFUND') return sum + amount;
        return sum - amount;
    }, 0);

    useEffect(() => {
        fetchPackages();
        fetchTransactions();
    }, []);

    const packages = activeTab === 'MEMBERSHIP' ? membershipPackages : boostPackages;

    const handleBuy = (pkg: ServicePackage) => {
        setConfirmPkg(pkg);
    };

    const handleConfirmPurchase = async () => {
        if (!confirmPkg) return;
        if (balance < confirmPkg.price) {
            setConfirmPkg(null);
            Alert.alert(
                'Số dư không đủ',
                `Bạn cần thêm ${(confirmPkg.price - balance).toLocaleString('vi-VN')}đ để mua gói này.`,
                [
                    { text: 'Hủy', style: 'cancel' },
                    { text: 'Nạp tiền', onPress: () => router.push('/wallet/deposit' as any) },
                ]
            );
            return;
        }
        try {
            await purchaseMembership(confirmPkg.id);
            setConfirmPkg(null);
            await fetchTransactions();
            Alert.alert('Thành công! 🎉', `Bạn đã mua ${confirmPkg.name} thành công!`);
        } catch (e: any) {
            setConfirmPkg(null);
            Alert.alert('Lỗi', e.message || 'Mua gói thất bại. Vui lòng thử lại.');
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Gói dịch vụ</Text>
                <TouchableOpacity onPress={() => router.push('/wallet' as any)}>
                    <View style={styles.balanceBadge}>
                        <Ionicons name="wallet-outline" size={14} color="#0066FF" />
                        <Text style={styles.balanceText}>{(balance / 1000).toFixed(0)}K</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'MEMBERSHIP' && styles.tabActive]}
                    onPress={() => setActiveTab('MEMBERSHIP')}
                >
                    <Ionicons name="star-outline" size={16} color={activeTab === 'MEMBERSHIP' ? '#0066FF' : '#888'} />
                    <Text style={[styles.tabText, activeTab === 'MEMBERSHIP' && styles.tabTextActive]}>Hội viên</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'ROOM_PROMOTION' && styles.tabActive]}
                    onPress={() => setActiveTab('ROOM_PROMOTION')}
                >
                    <Ionicons name="rocket-outline" size={16} color={activeTab === 'ROOM_PROMOTION' ? '#0066FF' : '#888'} />
                    <Text style={[styles.tabText, activeTab === 'ROOM_PROMOTION' && styles.tabTextActive]}>Đẩy tin</Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#0066FF" />
                </View>
            ) : (
                <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <Text style={styles.subtitle}>
                        {activeTab === 'MEMBERSHIP'
                            ? 'Nâng cấp tài khoản để đăng tin không giới hạn và nhiều ưu đãi hơn'
                            : 'Đẩy tin lên top để tiếp cận nhiều khách thuê hơn'}
                    </Text>
                    {packages.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="cube-outline" size={48} color="#CCC" />
                            <Text style={styles.emptyText}>Chưa có gói dịch vụ</Text>
                        </View>
                    ) : (
                        packages.map((pkg) => <PackageCard key={pkg.id} pkg={pkg} onBuy={() => handleBuy(pkg)} />)
                    )}
                </ScrollView>
            )}

            {/* Confirm Modal */}
            <Modal visible={!!confirmPkg} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Xác nhận thanh toán</Text>
                        {confirmPkg && (
                            <>
                                <View style={styles.modalInfoRow}>
                                    <Text style={styles.modalLabel}>Gói</Text>
                                    <Text style={styles.modalValue}>{confirmPkg.name}</Text>
                                </View>
                                <View style={styles.modalInfoRow}>
                                    <Text style={styles.modalLabel}>Thời hạn</Text>
                                    <Text style={styles.modalValue}>{confirmPkg.durationDays} ngày</Text>
                                </View>
                                <View style={styles.modalInfoRow}>
                                    <Text style={styles.modalLabel}>Số tiền</Text>
                                    <Text style={[styles.modalValue, { color: '#EF4444', fontWeight: '800' }]}>
                                        {confirmPkg.price.toLocaleString('vi-VN')}đ
                                    </Text>
                                </View>
                                <View style={[styles.modalInfoRow, { borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 12, marginTop: 4 }]}>
                                    <Text style={styles.modalLabel}>Số dư hiện tại</Text>
                                    <Text style={styles.modalValue}>{balance.toLocaleString('vi-VN')}đ</Text>
                                </View>
                                <View style={styles.modalInfoRow}>
                                    <Text style={styles.modalLabel}>Số dư sau khi mua</Text>
                                    <Text style={[styles.modalValue, { color: '#22C55E' }]}>
                                        {(balance - confirmPkg.price).toLocaleString('vi-VN')}đ
                                    </Text>
                                </View>
                            </>
                        )}
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setConfirmPkg(null)}>
                                <Text style={styles.modalCancelText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalConfirmBtn}
                                onPress={handleConfirmPurchase}
                                disabled={isPurchasing}
                            >
                                {isPurchasing
                                    ? <ActivityIndicator color="white" />
                                    : <Text style={styles.modalConfirmText}>Xác nhận mua</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight ?? 24) + 8, paddingBottom: 12,
        backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
    balanceBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#E8F0FF', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    },
    balanceText: { color: '#0066FF', fontWeight: '700', fontSize: 13 },
    tabBar: {
        flexDirection: 'row', backgroundColor: 'white',
        borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    },
    tab: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 12 },
    tabActive: { borderBottomWidth: 2, borderBottomColor: '#0066FF' },
    tabText: { fontSize: 14, color: '#888', fontWeight: '500' },
    tabTextActive: { color: '#0066FF', fontWeight: '700' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
    pkgCard: {
        backgroundColor: 'white', borderRadius: 16, padding: 18, marginBottom: 14,
        borderWidth: 1.5, borderColor: '#E8E8E8', gap: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    },
    pkgCardPopular: { borderColor: '#0066FF', backgroundColor: '#FAFCFF' },
    popularBadge: {
        alignSelf: 'flex-start', backgroundColor: '#0066FF', borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 4, marginBottom: 4,
    },
    popularText: { color: 'white', fontSize: 12, fontWeight: '700' },
    pkgName: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
    pkgPrice: { fontSize: 24, fontWeight: '800', color: '#0066FF' },
    pkgDuration: { fontSize: 14, color: '#888', fontWeight: '400' },
    pkgDesc: { fontSize: 13, color: '#666', lineHeight: 20 },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    featureText: { fontSize: 14, color: '#333' },
    buyBtn: {
        marginTop: 6, borderWidth: 1.5, borderColor: '#0066FF', borderRadius: 12,
        paddingVertical: 13, alignItems: 'center',
    },
    buyBtnPrimary: { backgroundColor: '#0066FF' },
    buyBtnText: { fontSize: 15, fontWeight: '700', color: '#0066FF' },
    buyBtnTextPrimary: { color: 'white' },
    emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
    emptyText: { fontSize: 16, color: '#888' },
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },
    modalInfoRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 8,
    },
    modalLabel: { fontSize: 14, color: '#555' },
    modalValue: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    modalCancelBtn: {
        flex: 1, borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12,
        paddingVertical: 13, alignItems: 'center',
    },
    modalCancelText: { fontSize: 15, color: '#666', fontWeight: '600' },
    modalConfirmBtn: {
        flex: 2, backgroundColor: '#0066FF', borderRadius: 12, paddingVertical: 13, alignItems: 'center',
    },
    modalConfirmText: { fontSize: 15, color: 'white', fontWeight: '700' },
});
