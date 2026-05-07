import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar,
    Platform, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useAppointmentStore } from '../../store/appointmentStore';
import { Appointment } from '../../types';
import { AuthGuardScreen } from '../../components/auth/AuthGuardScreen';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    PENDING: { label: 'Chờ xác nhận', color: '#FF9500', bg: '#FFF3E0' },
    CONFIRMED: { label: 'Đã xác nhận', color: '#22C55E', bg: '#F0FDF4' },
    CANCELLED: { label: 'Đã hủy', color: '#EF4444', bg: '#FFF0F0' },
    COMPLETED: { label: 'Hoàn thành', color: '#0066FF', bg: '#E8F0FF' },
    RESCHEDULED: { label: 'Đề xuất giờ mới', color: '#8B5CF6', bg: '#F3EEFF' },
};

const TABS = [
    { key: 'upcoming', label: 'Sắp tới', statuses: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] },
    { key: 'past', label: 'Đã qua', statuses: ['COMPLETED'] },
    { key: 'cancelled', label: 'Đã hủy', statuses: ['CANCELLED'] },
];

function AppointmentCard({ appt, onPress, onCancel }: {
    appt: Appointment;
    onPress: () => void;
    onCancel?: () => void;
}) {
    const config = STATUS_CONFIG[appt.status] || STATUS_CONFIG.PENDING;
    const date = new Date(appt.scheduledAt);
    const suggestedDate = appt.suggestedMeetTime ? new Date(appt.suggestedMeetTime) : null;

    const formatDT = (d: Date) => d.toLocaleDateString('vi-VN', {
        weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
    }) + ' - ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
            <View style={styles.cardHeader}>
                <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
                    <View style={[styles.statusDot, { backgroundColor: config.color }]} />
                    <Text style={[styles.statusLabel, { color: config.color }]}>{config.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#CCC" />
            </View>

            <View style={styles.cardBody}>
                <View style={styles.roomInfo}>
                    <Ionicons name="home-outline" size={16} color="#666" />
                    <Text style={styles.roomTitle} numberOfLines={1}>
                        {appt.roomTitle || `Phòng #${appt.roomId}`}
                    </Text>
                </View>

                {appt.status === 'RESCHEDULED' && suggestedDate ? (
                    <View style={styles.rescheduleBlock}>
                        <View style={styles.timeRow}>
                            <Ionicons name="close-circle" size={14} color="#EF4444" />
                            <Text style={styles.oldTime}>Giờ cũ: {formatDT(date)}</Text>
                        </View>
                        <View style={styles.timeRow}>
                            <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
                            <Text style={styles.newTime}>Giờ mới: {formatDT(suggestedDate)}</Text>
                        </View>
                    </View>
                ) : (
                    <View style={styles.timeRow}>
                        <Ionicons name="calendar-outline" size={15} color="#555" />
                        <Text style={styles.timeText}>{formatDT(date)}</Text>
                    </View>
                )}

                {appt.landlordName && (
                    <View style={styles.personRow}>
                        <Ionicons name="person-outline" size={14} color="#888" />
                        <Text style={styles.personText}>Chủ: {appt.landlordName}</Text>
                    </View>
                )}
            </View>

            <View style={styles.cardActions}>
                {appt.status === 'RESCHEDULED' && (
                    <>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#E8F5E9', borderColor: '#22C55E' }]}
                            onPress={(e) => { e.stopPropagation(); onPress(); }}
                        >
                            <Ionicons name="checkmark" size={16} color="#22C55E" />
                            <Text style={[styles.actionBtnText, { color: '#22C55E' }]}>Đồng ý</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#FFF0F0', borderColor: '#EF4444' }]}
                            onPress={(e) => { e.stopPropagation(); onCancel?.(); }}
                        >
                            <Ionicons name="close" size={16} color="#EF4444" />
                            <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Từ chối</Text>
                        </TouchableOpacity>
                    </>
                )}
                {(appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#FFF0F0', borderColor: '#EF4444' }]}
                        onPress={(e) => { e.stopPropagation(); onCancel?.(); }}
                    >
                        <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Hủy lịch</Text>
                    </TouchableOpacity>
                )}
                {appt.status === 'CONFIRMED' && (
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#E8F0FF', borderColor: '#0066FF' }]}
                        onPress={(e) => { e.stopPropagation(); onPress(); }}
                    >
                        <Ionicons name="navigate-outline" size={16} color="#0066FF" />
                        <Text style={[styles.actionBtnText, { color: '#0066FF' }]}>Chỉ đường</Text>
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    );
}

export default function AppointmentsScreen() {
    return (
        <AuthGuardScreen
            message="Đăng nhập để xem lịch hẹn xem phòng"
            icon="calendar-outline"
        >
            <AppointmentsContent />
        </AuthGuardScreen>
    );
}

function AppointmentsContent() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { appointments, isLoading, fetchAppointments, cancelAppointment } = useAppointmentStore();
    const [activeTab, setActiveTab] = useState('upcoming');
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchAppointments(true);
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchAppointments(true);
        setRefreshing(false);
    };

    const handleCancel = (id: number) => {
        Alert.alert('Hủy lịch hẹn', 'Bạn có chắc muốn hủy lịch hẹn này?', [
            { text: 'Không', style: 'cancel' },
            {
                text: 'Hủy lịch', style: 'destructive',
                onPress: async () => {
                    try {
                        await cancelAppointment(id);
                    } catch (e: any) {
                        Alert.alert('Lỗi', e.message || 'Hủy lịch hẹn thất bại. Vui lòng thử lại.');
                    }
                },
            },
        ]);
    };

    const activeStatuses = TABS.find((t) => t.key === activeTab)?.statuses || [];
    const filtered = appointments.filter((a) => activeStatuses.includes(a.status));

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Lịch hẹn của tôi</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Development Banner */}
            <View style={styles.devBanner}>
                <Ionicons name="construct-outline" size={18} color="#E65100" />
                <Text style={styles.devBannerText}>
                    🚧 Tính năng đang phát triển — Dữ liệu sẽ được cập nhật khi backend hoàn thiện
                </Text>
            </View>

            {/* Tabs */}
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

            {isLoading && appointments.length === 0 ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#0066FF" />
                </View>
            ) : filtered.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="calendar-outline" size={56} color="#CCC" />
                    <Text style={styles.emptyTitle}>Không có lịch hẹn</Text>
                    <Text style={styles.emptySub}>
                        {activeTab === 'upcoming'
                            ? 'Đặt lịch xem phòng từ màn hình chi tiết BĐS'
                            : 'Chưa có lịch hẹn trong mục này'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <AppointmentCard
                            appt={item}
                            onPress={() => router.push(`/appointments/${item.id}` as any)}
                            onCancel={() => handleCancel(item.id)}
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
    tabText: { fontSize: 14, color: '#888', fontWeight: '500' },
    tabTextActive: { color: '#0066FF', fontWeight: '700' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 17, fontWeight: '600', color: '#333' },
    emptySub: { fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 20 },
    card: {
        backgroundColor: 'white', borderRadius: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
        overflow: 'hidden',
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
    cardBody: { paddingHorizontal: 14, paddingBottom: 12, gap: 7 },
    roomInfo: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    roomTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', flex: 1 },
    rescheduleBlock: { gap: 4 },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    timeText: { fontSize: 13, color: '#555' },
    oldTime: { fontSize: 13, color: '#EF4444', textDecorationLine: 'line-through' },
    newTime: { fontSize: 13, color: '#22C55E', fontWeight: '600' },
    personRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    personText: { fontSize: 13, color: '#888' },
    cardActions: {
        flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 12,
    },
    actionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    },
    actionBtnText: { fontSize: 13, fontWeight: '600' },
});
