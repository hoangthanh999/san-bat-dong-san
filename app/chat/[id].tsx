import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    TextInput, KeyboardAvoidingView, Platform, StatusBar,
    ActivityIndicator, Alert, Animated, Modal,
} from 'react-native';
import { Image } from 'expo-image';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { ChatMessage } from '../../types';

function formatMsgTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatMsgDate(dateStr: string) {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Hôm nay';
    const yesterday = new Date(today.getTime() - 86400000);
    if (d.toDateString() === yesterday.toDateString()) return 'Hôm qua';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ChatDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const partnerId = Number(id);
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    const { messages, conversations, fetchHistory, sendMessage, markAsRead, isLoading, connectWebSocket } = useChatStore();

    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showQuickActions, setShowQuickActions] = useState(false);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [bookingDate, setBookingDate] = useState('');
    const [bookingNote, setBookingNote] = useState('');
    const [quickActionsAnim] = useState(new Animated.Value(0));
    const flatListRef = useRef<FlatList>(null);

    const conversation = conversations.find(c => c.partnerId === partnerId);
    const chatMessages = messages[partnerId] || [];
    const partnerName = conversation?.partnerName || 'Người dùng';
    const partnerAvatar = conversation?.partnerAvatar;

    useEffect(() => {
        fetchHistory(partnerId);
        markAsRead(partnerId);
        connectWebSocket();
    }, [partnerId]);

    const scrollToBottom = () => {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    };

    useEffect(() => {
        if (chatMessages.length > 0) scrollToBottom();
    }, [chatMessages.length]);

    const toggleQuickActions = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const toValue = showQuickActions ? 0 : 1;
        Animated.spring(quickActionsAnim, { toValue, useNativeDriver: true, tension: 120, friction: 10 }).start();
        setShowQuickActions(prev => !prev);
    };

    const handleSend = async () => {
        if (!inputText.trim() || isSending) return;
        const text = inputText.trim();
        setInputText('');
        setIsSending(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await sendMessage(partnerId, text);
        } catch (e) {
            Alert.alert('Lỗi', 'Gửi tin nhắn thất bại');
        } finally {
            setIsSending(false);
        }
    };

    const handleImagePicker = async () => {
        setShowQuickActions(false);
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
            await sendMessage(partnerId, result.assets[0].uri, 'IMAGE');
        }
    };

    const handleSendLocation = async () => {
        setShowQuickActions(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Cần quyền', 'Vui lòng cấp quyền truy cập vị trí.');
            return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const locationJson = JSON.stringify({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
        });
        await sendMessage(partnerId, locationJson, 'LOCATION');
    };

    const handleSendAppointment = () => {
        setShowQuickActions(false);
        setShowBookingModal(true);
    };

    const handleConfirmBooking = async () => {
        if (!bookingDate.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập thời gian xem phòng');
            return;
        }
        const appointmentJson = JSON.stringify({ datetime: bookingDate, note: bookingNote });
        await sendMessage(partnerId, appointmentJson, 'APPOINTMENT');
        setShowBookingModal(false);
        setBookingDate('');
        setBookingNote('');
    };

    const renderLocationMessage = (content: string, isMe: boolean) => {
        try {
            const loc = JSON.parse(content);
            return (
                <View style={styles.locationCard}>
                    <View style={styles.locationMapContainer}>
                        <MapView
                            style={styles.locationMap}
                            provider={PROVIDER_GOOGLE}
                            initialRegion={{ ...loc, latitudeDelta: 0.005, longitudeDelta: 0.005 }}
                            scrollEnabled={false}
                            zoomEnabled={false}
                        >
                            <Marker coordinate={loc} />
                        </MapView>
                    </View>
                    <View style={styles.locationBottom}>
                        <Ionicons name="location" size={14} color="#0066FF" />
                        <Text style={styles.locationText}>Vị trí hiện tại</Text>
                    </View>
                </View>
            );
        } catch {
            return <Text style={{ color: isMe ? 'white' : '#333' }}>📍 Vị trí</Text>;
        }
    };

    const renderAppointmentMessage = (content: string, isMe: boolean) => {
        try {
            const appt = JSON.parse(content);
            return (
                <View style={styles.appointmentCard}>
                    <View style={styles.appointmentHeader}>
                        <Ionicons name="calendar" size={16} color="#0066FF" />
                        <Text style={styles.appointmentTitle}>Đặt lịch xem phòng</Text>
                    </View>
                    <Text style={styles.appointmentDate}>📅 {appt.datetime}</Text>
                    {appt.note && <Text style={styles.appointmentNote}>📝 {appt.note}</Text>}
                    <View style={styles.appointmentStatus}>
                        <Text style={styles.appointmentStatusText}>Chờ xác nhận</Text>
                    </View>
                </View>
            );
        } catch {
            return <Text style={{ color: isMe ? 'white' : '#333' }}>📅 Lịch hẹn</Text>;
        }
    };

    const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
        const isMe = item.senderId === user?.id;
        const prevMsg = chatMessages[index - 1];
        const showDate = !prevMsg || formatMsgDate(prevMsg.createdAt) !== formatMsgDate(item.createdAt);
        const showAvatar = !isMe && (!chatMessages[index + 1] || chatMessages[index + 1].senderId !== item.senderId);
        const avatarUri = partnerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(partnerName)}&background=0066FF&color=fff&size=80`;

        return (
            <View>
                {showDate && (
                    <View style={styles.dateSeparator}>
                        <Text style={styles.dateText}>{formatMsgDate(item.createdAt)}</Text>
                    </View>
                )}
                <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
                    {!isMe && (
                        <View style={styles.avatarSlot}>
                            {showAvatar ? (
                                <Image source={{ uri: avatarUri }} style={styles.msgAvatar} />
                            ) : null}
                        </View>
                    )}

                    <View style={[
                        styles.bubble,
                        isMe ? styles.bubbleMe : styles.bubbleThem,
                        (item.type === 'LOCATION' || item.type === 'APPOINTMENT') && styles.bubbleRich,
                    ]}>
                        {item.type === 'IMAGE' ? (
                            <Image source={{ uri: item.content }} style={styles.imageMsg} contentFit="cover" />
                        ) : item.type === 'LOCATION' ? (
                            renderLocationMessage(item.content || '', isMe)
                        ) : item.type === 'APPOINTMENT' ? (
                            renderAppointmentMessage(item.content || '', isMe)
                        ) : (
                            <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{item.content}</Text>
                        )}

                        {item.type !== 'LOCATION' && item.type !== 'APPOINTMENT' && (
                            <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>
                                {formatMsgTime(item.createdAt)}
                            </Text>
                        )}
                    </View>

                    {isMe && item.isRead && (
                        <Ionicons name="checkmark-done" size={14} color="#0066FF" style={{ alignSelf: 'flex-end', marginBottom: 4, marginLeft: 4 }} />
                    )}
                </View>
            </View>
        );
    };

    const quickActionsScale = quickActionsAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.7, 1],
    });
    const quickActionsOpacity = quickActionsAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    const QUICK_ACTIONS = [
        { icon: 'location', label: 'Gửi vị trí', color: '#0066FF', onPress: handleSendLocation },
        { icon: 'calendar', label: 'Đặt lịch', color: '#FF6B35', onPress: handleSendAppointment },
        { icon: 'image', label: 'Ảnh', color: '#8B5CF6', onPress: handleImagePicker },
    ];

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Image
                        source={{ uri: partnerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(partnerName)}&background=0066FF&color=fff&size=100` }}
                        style={styles.headerAvatar}
                    />
                    <View>
                        <Text style={styles.headerName}>{partnerName}</Text>
                        <Text style={styles.headerStatus}>
                            {conversation?.isOnline ? '🟢 Đang hoạt động' : 'Ngoại tuyến'}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => {
                    const phone = conversation?.partnerName; // ideally from landlord phone
                    Alert.alert('Gọi điện', `Gọi cho ${partnerName}?`, [
                        { text: 'Huỷ', style: 'cancel' },
                        { text: 'Gọi', onPress: () => { } },
                    ]);
                }}>
                    <Ionicons name="call-outline" size={22} color="#0066FF" />
                </TouchableOpacity>
            </View>

            {/* Messages */}
            {isLoading && chatMessages.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#0066FF" />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={chatMessages}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.msgList}
                    onContentSizeChange={scrollToBottom}
                    showsVerticalScrollIndicator={false}
                    onScrollBeginDrag={() => {
                        if (showQuickActions) {
                            setShowQuickActions(false);
                            quickActionsAnim.setValue(0);
                        }
                    }}
                    ListEmptyComponent={
                        <View style={styles.emptyChat}>
                            <Text style={styles.emptyChatEmoji}>💬</Text>
                            <Text style={styles.emptyChatText}>
                                Bắt đầu cuộc trò chuyện với {partnerName}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Quick Actions Panel */}
            {showQuickActions && (
                <Animated.View
                    style={[
                        styles.quickActionsPanel,
                        { opacity: quickActionsOpacity, transform: [{ scale: quickActionsScale }] },
                    ]}
                >
                    {QUICK_ACTIONS.map((action, i) => (
                        <TouchableOpacity
                            key={i}
                            style={[styles.quickActionItem]}
                            onPress={action.onPress}
                        >
                            <View style={[styles.quickActionIcon, { backgroundColor: action.color + '18' }]}>
                                <Ionicons name={action.icon as any} size={22} color={action.color} />
                            </View>
                            <Text style={styles.quickActionLabel}>{action.label}</Text>
                        </TouchableOpacity>
                    ))}
                </Animated.View>
            )}

            {/* Input Bar */}
            <View style={styles.inputBar}>
                <TouchableOpacity
                    style={[styles.plusBtn, showQuickActions && styles.plusBtnActive]}
                    onPress={toggleQuickActions}
                >
                    <Ionicons
                        name={showQuickActions ? 'close' : 'add'}
                        size={22}
                        color={showQuickActions ? '#FF6B35' : '#888'}
                    />
                </TouchableOpacity>
                <TextInput
                    style={styles.input}
                    placeholder="Nhập tin nhắn..."
                    placeholderTextColor="#AAA"
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    maxLength={1000}
                    onFocus={() => {
                        if (showQuickActions) {
                            setShowQuickActions(false);
                            quickActionsAnim.setValue(0);
                        }
                    }}
                />
                <TouchableOpacity
                    style={[styles.sendBtn, (!inputText.trim() || isSending) && styles.sendBtnDisabled]}
                    onPress={handleSend}
                    disabled={!inputText.trim() || isSending}
                >
                    {isSending
                        ? <ActivityIndicator size="small" color="white" />
                        : <Ionicons name="send" size={18} color="white" />
                    }
                </TouchableOpacity>
            </View>

            {/* Booking Modal */}
            <Modal visible={showBookingModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>📅 Đề xuất lịch xem phòng</Text>
                            <TouchableOpacity onPress={() => setShowBookingModal(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalLabel}>Thời gian muốn xem (DD/MM/YYYY HH:MM)</Text>
                        <TextInput
                            style={styles.inputModal}
                            placeholder="VD: 15/03/2026 10:00"
                            value={bookingDate}
                            onChangeText={setBookingDate}
                        />
                        <Text style={styles.modalLabel}>Ghi chú (tuỳ chọn)</Text>
                        <TextInput
                            style={[styles.inputModal, { height: 80, textAlignVertical: 'top' }]}
                            placeholder="Thêm ghi chú..."
                            multiline
                            value={bookingNote}
                            onChangeText={setBookingNote}
                        />
                        <TouchableOpacity style={styles.sendApptBtn} onPress={handleConfirmBooking}>
                            <Ionicons name="send" size={18} color="white" />
                            <Text style={styles.sendApptText}>Gửi đề xuất</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingTop: 0 /* paddingTop set via inline style using useSafeAreaInsets */,
        paddingBottom: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
        gap: 8,
    },
    backBtn: { padding: 4 },
    headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0E0E0' },
    headerName: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
    headerStatus: { fontSize: 12, color: '#888', marginTop: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    msgList: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 8 },
    dateSeparator: { alignItems: 'center', marginVertical: 12 },
    dateText: {
        fontSize: 12, color: '#999',
        backgroundColor: '#EEE', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
    },
    msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 2 },
    msgRowMe: { justifyContent: 'flex-end' },
    avatarSlot: { width: 32, marginRight: 6 },
    msgAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E0E0E0' },
    bubble: { maxWidth: '75%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, paddingBottom: 6 },
    bubbleMe: { backgroundColor: '#0066FF', borderBottomRightRadius: 4 },
    bubbleThem: { backgroundColor: 'white', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 2 },
    bubbleRich: { paddingHorizontal: 0, paddingVertical: 0, overflow: 'hidden', backgroundColor: 'transparent' },
    msgText: { fontSize: 15, color: '#1A1A1A', lineHeight: 20 },
    msgTextMe: { color: 'white' },
    msgTime: { fontSize: 10, color: '#AAA', marginTop: 3, textAlign: 'right' },
    msgTimeMe: { color: 'rgba(255,255,255,0.7)' },
    imageMsg: { width: 180, height: 180, borderRadius: 12 },
    // Location message
    locationCard: { width: 220, borderRadius: 12, overflow: 'hidden', backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    locationMapContainer: { height: 140 },
    locationMap: { width: '100%', height: '100%' },
    locationBottom: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10 },
    locationText: { color: '#0066FF', fontSize: 13, fontWeight: '600' },
    // Appointment message
    appointmentCard: { width: 230, backgroundColor: 'white', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    appointmentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EFF4FF', padding: 12 },
    appointmentTitle: { fontSize: 13, fontWeight: '700', color: '#0066FF' },
    appointmentDate: { fontSize: 14, color: '#1A1A1A', padding: 12, paddingBottom: 4, fontWeight: '500' },
    appointmentNote: { fontSize: 13, color: '#666', paddingHorizontal: 12, paddingBottom: 8 },
    appointmentStatus: { backgroundColor: '#FFF8E1', marginHorizontal: 12, marginBottom: 12, borderRadius: 8, padding: 8 },
    appointmentStatusText: { fontSize: 12, color: '#F59E0B', fontWeight: '600', textAlign: 'center' },
    // Empty
    emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, gap: 10 },
    emptyChatEmoji: { fontSize: 48 },
    emptyChatText: { color: '#AAA', fontSize: 14, textAlign: 'center' },
    // Quick Actions
    quickActionsPanel: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: 'white',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    quickActionItem: { alignItems: 'center', gap: 6 },
    quickActionIcon: {
        width: 52, height: 52, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center',
    },
    quickActionLabel: { fontSize: 12, color: '#444', fontWeight: '500' },
    // Input Bar
    inputBar: {
        flexDirection: 'row', alignItems: 'flex-end', gap: 8,
        paddingHorizontal: 12, paddingTop: 10,
        paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        backgroundColor: 'white',
        borderTopWidth: 1, borderTopColor: '#F0F0F0',
    },
    plusBtn: {
        width: 40, height: 40, justifyContent: 'center', alignItems: 'center',
        borderRadius: 20, backgroundColor: '#F5F5F5',
    },
    plusBtnActive: { backgroundColor: '#FFF0EC' },
    input: {
        flex: 1, backgroundColor: '#F0F0F0', borderRadius: 20,
        paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10,
        fontSize: 15, maxHeight: 120, color: '#1A1A1A',
    },
    sendBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#0066FF', justifyContent: 'center', alignItems: 'center',
    },
    sendBtnDisabled: { backgroundColor: '#AAC8FF' },
    // Booking Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContainer: {
        backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
    modalLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 10 },
    inputModal: {
        borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12,
        paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1A1A1A',
    },
    sendApptBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: '#0066FF', borderRadius: 14, paddingVertical: 14, marginTop: 20,
    },
    sendApptText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
