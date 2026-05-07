import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, Platform, Alert, TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppointmentStore } from '../../store/appointmentStore';
import { useAuthStore } from '../../store/authStore';
import { appointmentService } from '../../services/api/appointments';
import { Appointment } from '../../types';
import { AuthGuardScreen } from '../../components/auth/AuthGuardScreen';

export default function AppointmentDetailScreen() {
    return (
        <AuthGuardScreen
            message="Đăng nhập để xem chi tiết lịch hẹn"
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
    const { user } = useAuthStore();
    const { appointments, confirmAppointment, cancelAppointment } = useAppointmentStore();
    const [appt, setAppt] = useState<Appointment | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showReschedule, setShowReschedule] = useState(false);
    const [suggestedTime, setSuggestedTime] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadDetail();
    }, [id]);

    const loadDetail = async () => {
        setIsLoading(true);
        try {
            const data = await appointmentService.getAppointmentById(parseInt(id!, 10));
            setAppt(data);
        } catch {
            const found = appointments.find((a) => a.id === parseInt(id!, 10));
            if (found) setAppt(found);
        } finally {
            setIsLoading(false);
        }
    };

    const isLandlord = user?.id === appt?.landlordId;

    const formatDT = (d: string) => new Date(d).toLocaleDateString('vi-VN', {
        weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
    }) + '\n' + new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const handleConfirm = async () => {
        if (!appt) return;
        Alert.alert('Xác nhận', 'Xác nhận lịch hẹn này?', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xác nhận', onPress: async () => {
                    try {
                        await confirmAppointment(appt.id);
                        await loadDetail();
                    } catch (e: any) {
                        Alert.alert('Lỗi', e.message);
                    }
                }
            }
        ]);
    };

    const handleReschedule = async () => {
        if (!suggestedTime.trim()) {
            Alert.alert('Thiếu thông tin', 'Vui lòng nhập giờ đề xuất (ISO 8601, VD: 2026-02-14T14:00:00)');
            return;
        }
        setIsSubmitting(true);
        try {
            await appointmentService.rescheduleAppointment(appt!.id, suggestedTime);
            setShowReschedule(false);
            await loadDetail();
        } catch (e: any) {
            Alert.alert('Lỗi', e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAcceptReschedule = async () => {
        if (!appt) return;
        Alert.alert('Đồng ý giờ mới', 'Xác nhận giờ mới do chủ nhà đề xuất?', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Đồng ý', onPress: async () => {
                    try {
                        await appointmentService.acceptReschedule(appt.id);
                        await loadDetail();
                    } catch (e: any) {
                        Alert.alert('Lỗi', e.message);
                    }
                }
            }
        ]);
    };

    const handleCancel = () => {
        if (!appt) return;
        Alert.alert('Hủy lịch hẹn', 'Bạn chắc muốn hủy lịch hẹn này?', [
            { text: 'Không', style: 'cancel' },
            {
                text: 'Hủy lịch', style: 'destructive',
                onPress: async () => {
                    try {
                        await cancelAppointment(appt.id);
                        router.back();
                    } catch (e: any) {
                        Alert.alert('Lỗi', e.message || 'Hủy lịch hẹn thất bại. Vui lòng thử lại.');
                    }
                }
            }
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
                <Text style={styles.errorText}>Không tìm thấy lịch hẹn</Text>
            </View>
        );
    }

    const STATUS_COLORS: Record<string, string> = {
        PENDING: '#FF9500', CONFIRMED: '#22C55E', CANCELLED: '#EF4444',
        COMPLETED: '#0066FF', RESCHEDULED: '#8B5CF6',
    };
    const STATUS_LABELS: Record<string, string> = {
        PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', CANCELLED: 'Đã hủy',
        COMPLETED: 'Hoàn thành', RESCHEDULED: 'Đề xuất giờ mới',
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chi tiết lịch hẹn</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Status */}
                <View style={[styles.statusBanner, { backgroundColor: `${STATUS_COLORS[appt.status]}15` }]}>
                    <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[appt.status] }]} />
                    <Text style={[styles.statusText, { color: STATUS_COLORS[appt.status] }]}>
                        {STATUS_LABELS[appt.status]}
                    </Text>
                </View>

                {/* Requester (Landlord view) */}
                {isLandlord && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>👤 Người yêu cầu</Text>
                        <View style={styles.personCard}>
                            <View style={styles.personAvatar}>
                                <Ionicons name="person" size={24} color="#0066FF" />
                            </View>
                            <View>
                                <Text style={styles.personName}>{appt.tenantName || `Khách #${appt.tenantId}`}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Room info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🏠 Phòng</Text>
                    <Text style={styles.infoValue}>{appt.roomTitle || `Phòng #${appt.roomId}`}</Text>
                </View>

                {/* Time */}
                <View style={styles.section}>
                    {appt.status === 'RESCHEDULED' && appt.suggestedMeetTime ? (
                        <>
                            <Text style={styles.sectionTitle}>📅 Giờ đề xuất của chủ nhà</Text>
                            <View style={styles.rescheduleCard}>
                                <View style={styles.timeCompare}>
                                    <View style={styles.timeBox}>
                                        <Text style={styles.timeBoxLabel}>Giờ cũ</Text>
                                        <Text style={styles.timeBoxOld}>{formatDT(appt.scheduledAt)}</Text>
                                    </View>
                                    <Ionicons name="arrow-forward" size={20} color="#666" />
                                    <View style={styles.timeBox}>
                                        <Text style={styles.timeBoxLabel}>Giờ mới</Text>
                                        <Text style={styles.timeBoxNew}>{formatDT(appt.suggestedMeetTime)}</Text>
                                    </View>
                                </View>
                            </View>
                        </>
                    ) : (
                        <>
                            <Text style={styles.sectionTitle}>📅 Thời gian</Text>
                            <Text style={styles.infoValue}>{formatDT(appt.scheduledAt)}</Text>
                        </>
                    )}
                </View>

                {/* Note */}
                {(appt.note || appt.message) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>💬 Lời nhắn</Text>
                        <View style={styles.messageBox}>
                            <Text style={styles.messageText}>{appt.note || appt.message}</Text>
                        </View>
                    </View>
                )}

                {/* Actions for Landlord */}
                {isLandlord && appt.status === 'PENDING' && (
                    <View style={styles.actionsSection}>
                        <Text style={styles.sectionTitle}>── Phản hồi của bạn ──</Text>
                        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                            <Ionicons name="checkmark-circle" size={20} color="white" />
                            <Text style={styles.confirmBtnText}>Xác nhận giờ này</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.rescheduleBtn} onPress={() => setShowReschedule(true)}>
                            <Ionicons name="calendar" size={20} color="#0066FF" />
                            <Text style={styles.rescheduleBtnText}>Đề xuất giờ khác</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.rejectBtn} onPress={handleCancel}>
                            <Ionicons name="close-circle" size={20} color="#EF4444" />
                            <Text style={styles.rejectBtnText}>Từ chối</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Tenant accepting reschedule */}
                {!isLandlord && appt.status === 'RESCHEDULED' && (
                    <View style={styles.actionsSection}>
                        <TouchableOpacity style={styles.confirmBtn} onPress={handleAcceptReschedule}>
                            <Ionicons name="checkmark-circle" size={20} color="white" />
                            <Text style={styles.confirmBtnText}>Đồng ý giờ mới</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.rejectBtn} onPress={handleCancel}>
                            <Ionicons name="close-circle" size={20} color="#EF4444" />
                            <Text style={styles.rejectBtnText}>Từ chối & Hủy lịch</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Cancel for non-completed */}
                {!isLandlord && (appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
                    <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                            <Text style={styles.cancelBtnText}>Hủy lịch hẹn</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Reschedule Modal */}
            <Modal visible={showReschedule} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Đề xuất giờ khác</Text>
                        <Text style={styles.modalSub}>Nhập thời gian đề xuất (YYYY-MM-DDTHH:MM:SS)</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="2026-02-14T14:00:00"
                            value={suggestedTime}
                            onChangeText={setSuggestedTime}
                            placeholderTextColor="#AAA"
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => setShowReschedule(false)}
                            >
                                <Text style={styles.modalCancelText}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalConfirmBtn}
                                onPress={handleReschedule}
                                disabled={isSubmitting}
                            >
                                <Text style={styles.modalConfirmText}>
                                    {isSubmitting ? 'Đang gửi...' : 'Gửi đề xuất'}
                                </Text>
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
    personCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    personAvatar: {
        width: 48, height: 48, borderRadius: 24, backgroundColor: '#E8F0FF',
        justifyContent: 'center', alignItems: 'center',
    },
    personName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
    rescheduleCard: { marginTop: 4 },
    timeCompare: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    timeBox: { flex: 1 },
    timeBoxLabel: { fontSize: 11, color: '#888', marginBottom: 4, fontWeight: '600' },
    timeBoxOld: { fontSize: 13, color: '#EF4444', textDecorationLine: 'line-through', lineHeight: 20 },
    timeBoxNew: { fontSize: 14, color: '#22C55E', fontWeight: '700', lineHeight: 20 },
    messageBox: {
        backgroundColor: '#F8F9FA', borderRadius: 10, padding: 12,
        borderLeftWidth: 3, borderLeftColor: '#0066FF',
    },
    messageText: { fontSize: 14, color: '#333', lineHeight: 22 },
    actionsSection: {
        backgroundColor: 'white', marginHorizontal: 16, marginBottom: 10,
        borderRadius: 14, padding: 16, gap: 10,
    },
    confirmBtn: {
        backgroundColor: '#22C55E', borderRadius: 12, paddingVertical: 14,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    confirmBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
    rescheduleBtn: {
        borderWidth: 1.5, borderColor: '#0066FF', borderRadius: 12, paddingVertical: 13,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    rescheduleBtnText: { color: '#0066FF', fontWeight: '600', fontSize: 15 },
    rejectBtn: {
        borderWidth: 1.5, borderColor: '#EF4444', borderRadius: 12, paddingVertical: 13,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    rejectBtnText: { color: '#EF4444', fontWeight: '600', fontSize: 15 },
    cancelBtn: {
        borderWidth: 1.5, borderColor: '#EF4444', borderRadius: 12, paddingVertical: 13, alignItems: 'center',
    },
    cancelBtnText: { color: '#EF4444', fontWeight: '600', fontSize: 15 },
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, paddingBottom: 24, // add insets.bottom inline if needed
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 },
    modalSub: { fontSize: 13, color: '#888', marginBottom: 16 },
    modalInput: {
        borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#1A1A1A', marginBottom: 16,
    },
    modalActions: { flexDirection: 'row', gap: 10 },
    modalCancelBtn: {
        flex: 1, borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12,
        paddingVertical: 13, alignItems: 'center',
    },
    modalCancelText: { fontSize: 15, color: '#666', fontWeight: '600' },
    modalConfirmBtn: {
        flex: 1, backgroundColor: '#0066FF', borderRadius: 12, paddingVertical: 13, alignItems: 'center',
    },
    modalConfirmText: { fontSize: 15, color: 'white', fontWeight: '700' },
});
