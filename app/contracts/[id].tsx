import React, { useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useContractStore } from '../../store/contractStore';
import { contractService } from '../../services/api/contracts';

export default function ContractDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { selectedContract, isLoadingDetail, fetchContractDetail } = useContractStore();

    useEffect(() => {
        fetchContractDetail(parseInt(id!, 10)).catch((e: any) => {
            Alert.alert('Lỗi', e.message || 'Không thể tải chi tiết hợp đồng.');
        });
    }, [id]);

    const handleDownloadPDF = async () => {
        Alert.alert(
            'Tải hợp đồng PDF',
            'Chức năng tải PDF sẽ lưu file vào thư mục Downloads của thiết bị.',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Tải xuống',
                    onPress: async () => {
                        try {
                            await contractService.downloadContractPDF(parseInt(id!, 10));
                            Alert.alert('Thành công', 'Hợp đồng đã được tải xuống thành công!');
                        } catch (e: any) {
                            Alert.alert('Lỗi', 'Không thể tải hợp đồng. Vui lòng thử lại.');
                        }
                    }
                }
            ]
        );
    };

    if (isLoadingDetail || !selectedContract) {
        return (
            <View style={styles.center}>
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator size="large" color="#0066FF" />
            </View>
        );
    }

    const contract = selectedContract;

    const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
        PENDING: { label: 'Chờ ký', color: '#FF9500' },
        ACTIVE: { label: 'Đang hiệu lực', color: '#22C55E' },
        EXPIRED: { label: 'Đã hết hạn', color: '#EF4444' },
        TERMINATED: { label: 'Đã chấm dứt', color: '#888' },
    };
    const statusConf = STATUS_CONFIG[contract.status];

    const startDate = new Date(contract.startDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const endDate = new Date(contract.endDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const daysLeft = Math.max(0, Math.floor((new Date(contract.endDate).getTime() - Date.now()) / 86400000));

    const InfoRow = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={[styles.infoValue, accent && styles.infoValueAccent]}>{value}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chi tiết hợp đồng</Text>
                <TouchableOpacity onPress={handleDownloadPDF}>
                    <Ionicons name="download-outline" size={24} color="#0066FF" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Status banner */}
                <View style={[styles.statusBanner, { borderColor: statusConf.color }]}>
                    <Text style={[styles.statusText, { color: statusConf.color }]}>● {statusConf.label}</Text>
                    {contract.status === 'ACTIVE' && (
                        <Text style={styles.daysLeft}>⏳ Còn {daysLeft} ngày</Text>
                    )}
                </View>

                {/* Room info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Thông tin phòng</Text>
                    <InfoRow label="🏠 Phòng" value={contract.roomTitle || `Phòng #${contract.roomId}`} />
                    {contract.roomAddress && (
                        <InfoRow label="📍 Địa chỉ" value={contract.roomAddress} />
                    )}
                </View>

                {/* Dates */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Thời hạn hợp đồng</Text>
                    <InfoRow label="📅 Bắt đầu" value={startDate} />
                    <InfoRow label="📅 Kết thúc" value={endDate} />
                </View>

                {/* Financial */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Tài chính (đã chốt)</Text>
                    <InfoRow
                        label="💰 Tiền thuê"
                        value={`${contract.monthlyRent.toLocaleString('vi-VN')}đ/tháng`}
                        accent
                    />
                    <InfoRow
                        label="🔒 Tiền cọc"
                        value={`${contract.deposit.toLocaleString('vi-VN')}đ`}
                    />
                    {contract.electricityPrice && (
                        <InfoRow
                            label="⚡ Giá điện"
                            value={`${contract.electricityPrice.toLocaleString('vi-VN')}đ/kWh`}
                        />
                    )}
                    {contract.waterPrice && (
                        <InfoRow
                            label="💧 Giá nước"
                            value={`${contract.waterPrice.toLocaleString('vi-VN')}đ/m³`}
                        />
                    )}
                </View>

                {/* Service fees */}
                {(contract.garbageFee || contract.wifiFee) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Phí dịch vụ</Text>
                        {contract.garbageFee && (
                            <InfoRow label="🗑️ Rác" value={`${contract.garbageFee.toLocaleString('vi-VN')}đ/tháng`} />
                        )}
                        {contract.wifiFee && (
                            <InfoRow label="📶 Wifi" value={`${contract.wifiFee.toLocaleString('vi-VN')}đ/tháng`} />
                        )}
                    </View>
                )}

                {/* Parties */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Các bên</Text>
                    {contract.landlordName && (
                        <InfoRow label="🏠 Chủ nhà" value={contract.landlordName} />
                    )}
                    {contract.tenantName && (
                        <InfoRow label="👤 Người thuê" value={contract.tenantName} />
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.pdfBtn} onPress={handleDownloadPDF} activeOpacity={0.85}>
                    <Ionicons name="download-outline" size={20} color="white" />
                    <Text style={styles.pdfBtnText}>Tải hợp đồng PDF</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 54 : 16, paddingBottom: 12,
        backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scroll: { flex: 1 },
    statusBanner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginHorizontal: 16, marginTop: 14, borderRadius: 12, padding: 14,
        borderWidth: 1.5, backgroundColor: 'white',
    },
    statusText: { fontSize: 15, fontWeight: '700' },
    daysLeft: { fontSize: 13, color: '#888' },
    section: {
        backgroundColor: 'white', marginHorizontal: 16, marginTop: 12,
        borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    },
    sectionTitle: {
        fontSize: 13, fontWeight: '700', color: '#888', marginBottom: 12,
        textTransform: 'uppercase', letterSpacing: 0.5,
    },
    infoRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
        paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
    },
    infoLabel: { fontSize: 14, color: '#555', flex: 1 },
    infoValue: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', textAlign: 'right', flex: 1 },
    infoValueAccent: { color: '#0066FF' },
    footer: {
        padding: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F0F0F0',
    },
    pdfBtn: {
        backgroundColor: '#0066FF', borderRadius: 14, paddingVertical: 15,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    pdfBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
