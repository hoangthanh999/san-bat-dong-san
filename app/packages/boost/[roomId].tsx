import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
    Platform, Modal, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { usePackageStore } from '../../../store/packageStore';
import { useWalletStore } from '../../../store/walletStore';
import { ServicePackage } from '../../../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BoostRoomScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { roomId } = useLocalSearchParams<{ roomId: string }>();
    const { boostPackages, isLoading, isPurchasing, fetchPackages, boostRoom } = usePackageStore();
    const { transactions, fetchTransactions } = useWalletStore();
    const [selectedPkg, setSelectedPkg] = useState<ServicePackage | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);

    // Tính balance từ transaction history (backend chưa có wallet balance API)
    const balance = transactions.reduce((sum, tx) => {
        if (tx.status !== 'SUCCESS') return sum;
        const amount = Number(tx.amount) || 0;
        if (tx.type === 'DEPOSIT' || tx.type === 'REFUND') return sum + amount;
        return sum - amount;
    }, 0);

    useEffect(() => {
        fetchPackages('ROOM_PROMOTION');
        fetchTransactions();
    }, []);;

    const handleBoost = () => {
        if (!selectedPkg) {
            Alert.alert('Chưa chọn gói', 'Vui lòng chọn một gói đẩy tin');
            return;
        }
        setShowConfirm(true);
    };

    const handleConfirmBoost = async () => {
        if (!selectedPkg) return;
        if (balance < selectedPkg.price) {
            setShowConfirm(false);
            Alert.alert(
                'Số dư không đủ',
                `Cần thêm ${(selectedPkg.price - balance).toLocaleString('vi-VN')}đ`,
                [
                    { text: 'Hủy', style: 'cancel' },
                    { text: 'Nạp tiền', onPress: () => router.push('/wallet/deposit' as any) },
                ]
            );
            return;
        }
        try {
            await boostRoom(parseInt(roomId!, 10), selectedPkg.id);
            setShowConfirm(false);
            await fetchTransactions();
            Alert.alert('Thành công! 🚀', `Tin đăng đã được đẩy lên top trong ${selectedPkg.durationDays} ngày!`, [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (e: any) {
            setShowConfirm(false);
            Alert.alert('Lỗi', e.message || 'Boost tin thất bại.');
        }
    };

    const DURATION_ICONS: Record<number, string> = { 3: '🚀', 7: '🔥', 30: '⚡' };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Đẩy tin lên top</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>

                    {/* Room info */}
                    <View style={styles.roomCard}>
                        <Ionicons name="home" size={20} color="#0066FF" />
                        <Text style={styles.roomLabel}>Phòng #{roomId}</Text>
                    </View>

                    <Text style={styles.sectionTitle}>Chọn gói đẩy tin:</Text>

                    {isLoading ? (
                        <ActivityIndicator size="large" color="#0066FF" style={{ marginTop: 40 }} />
                    ) : (
                        boostPackages.map((pkg) => (
                            <TouchableOpacity
                                key={pkg.id}
                                style={[styles.pkgCard, selectedPkg?.id === pkg.id && styles.pkgCardSelected]}
                                onPress={() => setSelectedPkg(pkg)}
                                activeOpacity={0.85}
                            >
                                <View style={styles.pkgLeft}>
                                    <Text style={styles.pkgIcon}>{DURATION_ICONS[pkg.durationDays] || '⭐'}</Text>
                                    <View>
                                        <Text style={styles.pkgName}>{pkg.name}</Text>
                                        {pkg.description && <Text style={styles.pkgDesc}>{pkg.description}</Text>}
                                    </View>
                                </View>
                                <View style={styles.pkgRight}>
                                    <Text style={styles.pkgPrice}>{pkg.price.toLocaleString('vi-VN')}đ</Text>
                                    <Text style={styles.pkgDays}>{pkg.durationDays} ngày</Text>
                                </View>
                                {selectedPkg?.id === pkg.id && (
                                    <View style={styles.selectedCheck}>
                                        <Ionicons name="checkmark-circle" size={22} color="#0066FF" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))
                    )}

                    {/* Balance info */}
                    <View style={styles.balanceRow}>
                        <Ionicons name="wallet-outline" size={18} color="#0066FF" />
                        <Text style={styles.balanceLabel}>Số dư ví:</Text>
                        <Text style={styles.balanceValue}>{balance.toLocaleString('vi-VN')}đ</Text>
                        <TouchableOpacity onPress={() => router.push('/wallet/deposit' as any)}>
                            <Text style={styles.topUpLink}>Nạp thêm</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.boostBtn, (!selectedPkg || isPurchasing) && styles.boostBtnDisabled]}
                    onPress={handleBoost}
                    disabled={!selectedPkg || isPurchasing}
                    activeOpacity={0.85}
                >
                    <Ionicons name="rocket" size={20} color="white" />
                    <Text style={styles.boostBtnText}>
                        {selectedPkg ? `Thanh toán ${selectedPkg.price.toLocaleString('vi-VN')}đ từ ví` : 'Chọn gói để thanh toán'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Confirm modal */}
            <Modal visible={showConfirm} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Xác nhận boost tin</Text>
                        {selectedPkg && (
                            <>
                                <View style={styles.modalRow}>
                                    <Text style={styles.modalLabel}>Gói</Text>
                                    <Text style={styles.modalValue}>{selectedPkg.name}</Text>
                                </View>
                                <View style={styles.modalRow}>
                                    <Text style={styles.modalLabel}>Thời hạn</Text>
                                    <Text style={styles.modalValue}>{selectedPkg.durationDays} ngày</Text>
                                </View>
                                <View style={styles.modalRow}>
                                    <Text style={styles.modalLabel}>Chi phí</Text>
                                    <Text style={[styles.modalValue, { color: '#EF4444', fontWeight: '800' }]}>
                                        -{selectedPkg.price.toLocaleString('vi-VN')}đ
                                    </Text>
                                </View>
                                <View style={[styles.modalRow, { borderTopWidth: 1, borderTopColor: '#F0F0F0', marginTop: 8, paddingTop: 12 }]}>
                                    <Text style={styles.modalLabel}>Số dư sau thanh toán</Text>
                                    <Text style={[styles.modalValue, { color: '#22C55E' }]}>
                                        {(balance - selectedPkg.price).toLocaleString('vi-VN')}đ
                                    </Text>
                                </View>
                            </>
                        )}
                        <View style={styles.modalBtns}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowConfirm(false)}>
                                <Text style={styles.cancelBtnText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmBtn}
                                onPress={handleConfirmBoost}
                                disabled={isPurchasing}
                            >
                                {isPurchasing
                                    ? <ActivityIndicator color="white" />
                                    : <Text style={styles.confirmBtnText}>Xác nhận</Text>
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
        paddingHorizontal: 16, paddingTop: 0 /* paddingTop set via inline style using useSafeAreaInsets */, paddingBottom: 12,
        backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
    scroll: { flex: 1 },
    content: { padding: 16 },
    roomCard: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#E8F0FF', borderRadius: 10, padding: 12, marginBottom: 20,
    },
    roomLabel: { fontSize: 15, fontWeight: '700', color: '#0066FF' },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
    pkgCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
        borderRadius: 14, padding: 16, marginBottom: 12,
        borderWidth: 1.5, borderColor: '#E8E8E8',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    },
    pkgCardSelected: { borderColor: '#0066FF', backgroundColor: '#FAFCFF' },
    pkgLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    pkgIcon: { fontSize: 28 },
    pkgName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
    pkgDesc: { fontSize: 12, color: '#888', marginTop: 2 },
    pkgRight: { alignItems: 'flex-end' },
    pkgPrice: { fontSize: 17, fontWeight: '800', color: '#0066FF' },
    pkgDays: { fontSize: 12, color: '#888', marginTop: 2 },
    selectedCheck: { position: 'absolute', top: 12, right: 12 },
    balanceRow: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'white', borderRadius: 10, padding: 12, marginTop: 8,
        borderWidth: 1, borderColor: '#E8F0FF',
    },
    balanceLabel: { fontSize: 14, color: '#555', flex: 1 },
    balanceValue: { fontSize: 15, fontWeight: '700', color: '#0066FF' },
    topUpLink: { color: '#22C55E', fontWeight: '600', fontSize: 13 },
    footer: {
        padding: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F0F0F0',
    },
    boostBtn: {
        backgroundColor: '#0066FF', borderRadius: 14, paddingVertical: 15,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    boostBtnDisabled: { backgroundColor: '#B0C4DE' },
    boostBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: {
        backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 14 },
    modalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
    modalLabel: { fontSize: 14, color: '#555' },
    modalValue: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
    cancelBtn: {
        flex: 1, borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12,
        paddingVertical: 13, alignItems: 'center',
    },
    cancelBtnText: { fontSize: 15, color: '#666', fontWeight: '600' },
    confirmBtn: {
        flex: 2, backgroundColor: '#0066FF', borderRadius: 12, paddingVertical: 13, alignItems: 'center',
    },
    confirmBtnText: { fontSize: 15, color: 'white', fontWeight: '700' },
});
