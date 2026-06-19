import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar,
    ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppointmentStore } from '../../store/appointmentStore';
import { Appointment } from '../../types';
import { AuthGuardScreen } from '../../components/auth/AuthGuardScreen';
import { useSafeRouter } from '../../hooks/useSafeRouter';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    PENDING: { label: 'Cho xac nhan', color: '#FF9500', bg: '#FFF3E0' },
    ACCEPTED: { label: 'Da chap nhan', color: '#22C55E', bg: '#F0FDF4' },
    REJECTED: { label: 'Da tu choi', color: '#EF4444', bg: '#FFF0F0' },
    CANCELLED: { label: 'Da huy', color: '#EF4444', bg: '#FFF0F0' },
    COMPLETED: { label: 'Hoan thanh', color: '#0066FF', bg: '#E8F0FF' },
    SUGGESTED: { label: 'De xuat gio moi', color: '#8B5CF6', bg: '#F3EEFF' },
};

const TABS = [
    { key: 'upcoming', label: 'Sap toi', statuses: ['PENDING', 'ACCEPTED', 'SUGGESTED'] },
    { key: 'past', label: 'Da qua', statuses: ['COMPLETED'] },
    { key: 'cancelled', label: 'Da huy', statuses: ['REJECTED', 'CANCELLED'] },
];

function formatDT(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value || 'Chua co thoi gian';

    return date.toLocaleDateString('vi-VN', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }) + ' - ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function AppointmentCard({ appt, onPress, onCancel }: {
    appt: Appointment;
    onPress: () => void;
    onCancel: () => void;
}) {
    const config = STATUS_CONFIG[appt.status] || STATUS_CONFIG.PENDING;
    const canCancel = appt.status === 'PENDING' || appt.status === 'ACCEPTED' || appt.status === 'SUGGESTED';

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
                        {appt.roomTitle || appt.propertyTitle || `BDS #${appt.propertyId || appt.roomId}`}
                    </Text>
                </View>

                <View style={styles.timeRow}>
                    <Ionicons name="calendar-outline" size={15} color="#555" />
                    <Text style={styles.timeText}>{formatDT(appt.scheduledAt || appt.appointmentTime)}</Text>
                </View>

                {appt.status === 'SUGGESTED' && appt.suggestedMeetTime && (
                    <View style={styles.timeRow}>
                        <Ionicons name="time-outline" size={15} color="#8B5CF6" />
                        <Text style={styles.suggestText}>Gio moi: {formatDT(appt.suggestedMeetTime)}</Text>
                    </View>
                )}
            </View>

            {canCancel && (
                <View style={styles.cardActions}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#FFF0F0', borderColor: '#EF4444' }]}
                        onPress={(e) => { e.stopPropagation(); onCancel(); }}
                    >
                        <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Huy lich</Text>
                    </TouchableOpacity>
                </View>
            )}
        </TouchableOpacity>
    );
}

export default function AppointmentsScreen() {
    return (
        <AuthGuardScreen
            message="Dang nhap de xem lich hen xem phong"
            icon="calendar-outline"
        >
            <AppointmentsContent />
        </AuthGuardScreen>
    );
}

function AppointmentsContent() {
    const { router, safePush } = useSafeRouter();
    const insets = useSafeAreaInsets();
    const { appointments, isLoading, fetchAppointments, cancelAppointment } = useAppointmentStore();
    const [activeTab, setActiveTab] = useState('upcoming');
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchAppointments(true).catch(() => undefined);
    }, [fetchAppointments]);

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await fetchAppointments(true);
        } finally {
            setRefreshing(false);
        }
    };

    const handleCancel = (id: number) => {
        Alert.alert('Huy lich hen', 'Ban co chac muon huy lich hen nay?', [
            { text: 'Khong', style: 'cancel' },
            {
                text: 'Huy lich',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await cancelAppointment(id);
                    } catch (e: any) {
                        Alert.alert('Loi', e.message || 'Huy lich hen that bai. Vui long thu lai.');
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
                <Text style={styles.headerTitle}>Lich hen cua toi</Text>
                <View style={{ width: 40 }} />
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

            {isLoading && appointments.length === 0 ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#0066FF" />
                </View>
            ) : filtered.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="calendar-outline" size={56} color="#CCC" />
                    <Text style={styles.emptyTitle}>Khong co lich hen</Text>
                    <Text style={styles.emptySub}>
                        Dat lich xem phong tu man hinh chi tiet bat dong san
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <AppointmentCard
                            appt={item}
                            onPress={() => safePush(`/appointments/${item.id}` as any)}
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
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingBottom: 12,
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
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    timeText: { fontSize: 13, color: '#555' },
    suggestText: { fontSize: 13, color: '#8B5CF6', fontWeight: '600' },
    cardActions: {
        flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 12,
    },
    actionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    },
    actionBtnText: { fontSize: 13, fontWeight: '600' },
});
