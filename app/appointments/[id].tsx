import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppointmentStore } from '../../store/appointmentStore';
import { appointmentService } from '../../services/api/appointments';
import { Appointment } from '../../types';
import { AuthGuardScreen } from '../../components/auth/AuthGuardScreen';

const STATUS_COLORS: Record<string, string> = {
    PENDING: '#FF9500',
    ACCEPTED: '#22C55E',
    REJECTED: '#EF4444',
    CANCELLED: '#EF4444',
    COMPLETED: '#0066FF',
    SUGGESTED: '#8B5CF6',
};

const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Cho xac nhan',
    ACCEPTED: 'Da chap nhan',
    REJECTED: 'Da tu choi',
    CANCELLED: 'Da huy',
    COMPLETED: 'Hoan thanh',
    SUGGESTED: 'De xuat gio moi',
};

function formatDT(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value || 'Chua co thoi gian';

    return date.toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }) + '\n' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function AppointmentDetailScreen() {
    return (
        <AuthGuardScreen
            message="Dang nhap de xem chi tiet lich hen"
            icon="calendar-outline"
        >
            <AppointmentDetailContent />
        </AuthGuardScreen>
    );
}

function AppointmentDetailContent() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { appointments, cancelAppointment } = useAppointmentStore();
    const [appt, setAppt] = useState<Appointment | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadDetail();
    }, [id, appointments]);

    const loadDetail = async () => {
        const appointmentId = Number(id);
        if (!appointmentId) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const found = appointments.find((item) => item.id === appointmentId);
            if (found) {
                setAppt(found);
                return;
            }

            const data = await appointmentService.getAppointmentById(appointmentId);
            setAppt(data);
        } catch {
            setAppt(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        if (!appt) return;

        Alert.alert('Huy lich hen', 'Ban chac muon huy lich hen nay?', [
            { text: 'Khong', style: 'cancel' },
            {
                text: 'Huy lich',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await cancelAppointment(appt.id);
                        await loadDetail();
                    } catch (e: any) {
                        Alert.alert('Loi', e.message || 'Huy lich hen that bai. Vui long thu lai.');
                    }
                },
            },
        ]);
    };

    if (isLoading) {
        return (
            <View style={styles.center}>
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator size="large" color="#0066FF" />
            </View>
        );
    }

    if (!appt) {
        return (
            <View style={styles.center}>
                <Stack.Screen options={{ headerShown: false }} />
                <Text style={styles.errorText}>Khong tim thay lich hen</Text>
            </View>
        );
    }

    const statusColor = STATUS_COLORS[appt.status] || STATUS_COLORS.PENDING;
    const canCancel = appt.status === 'PENDING' || appt.status === 'ACCEPTED' || appt.status === 'SUGGESTED';

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chi tiet lich hen</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={[styles.statusBanner, { backgroundColor: `${statusColor}15` }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                        {STATUS_LABELS[appt.status] || appt.status}
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Bat dong san</Text>
                    <Text style={styles.infoValue}>
                        {appt.roomTitle || appt.propertyTitle || `BDS #${appt.propertyId || appt.roomId}`}
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Thoi gian</Text>
                    <Text style={styles.infoValue}>{formatDT(appt.scheduledAt || appt.appointmentTime)}</Text>
                </View>

                {appt.status === 'SUGGESTED' && appt.suggestedMeetTime && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Gio moi duoc de xuat</Text>
                        <Text style={styles.infoValue}>{formatDT(appt.suggestedMeetTime)}</Text>
                    </View>
                )}

                {appt.note && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Ghi chu</Text>
                        <View style={styles.messageBox}>
                            <Text style={styles.messageText}>{appt.note}</Text>
                        </View>
                    </View>
                )}

                {canCancel && (
                    <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                            <Text style={styles.cancelBtnText}>Huy lich hen</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
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
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { fontSize: 16, color: '#999' },
    scroll: { flex: 1 },
    statusBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 16, paddingVertical: 14,
    },
    statusDot: { width: 10, height: 10, borderRadius: 5 },
    statusText: { fontSize: 15, fontWeight: '700' },
    section: { backgroundColor: 'white', marginHorizontal: 16, marginBottom: 10, borderRadius: 14, padding: 16 },
    sectionTitle: { fontSize: 13, color: '#888', fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
    infoValue: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', lineHeight: 24 },
    messageBox: {
        backgroundColor: '#F8F9FA', borderRadius: 10, padding: 12,
        borderLeftWidth: 3, borderLeftColor: '#0066FF',
    },
    messageText: { fontSize: 14, color: '#333', lineHeight: 22 },
    cancelBtn: {
        borderWidth: 1.5, borderColor: '#EF4444', borderRadius: 12, paddingVertical: 13, alignItems: 'center',
    },
    cancelBtnText: { color: '#EF4444', fontWeight: '600', fontSize: 15 },
});
