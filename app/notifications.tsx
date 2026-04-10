import React, { useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, SectionList, TouchableOpacity,
    StatusBar, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useNotificationStore } from '../store/notificationStore';
import { Notification } from '../types';

function NotificationItem({ item, onPress }: { item: Notification; onPress: () => void }) {
    const icons: Record<string, { name: string; bg: string; color: string }> = {
        APPOINTMENT: { name: 'calendar', bg: '#E8F0FF', color: '#0066FF' },
        REVIEW: { name: 'star', bg: '#FFF8E1', color: '#FFB800' },
        CHAT: { name: 'chatbubble', bg: '#F0FDF4', color: '#22C55E' },
        SYSTEM: { name: 'megaphone', bg: '#FFF0F0', color: '#EF4444' },
        ROOM_APPROVED: { name: 'checkmark-circle', bg: '#F0FDF4', color: '#22C55E' },
        BILL: { name: 'wallet-outline', bg: '#FFF8E1', color: '#F59E0B' },
        CONTRACT: { name: 'document-text', bg: '#F3E8FF', color: '#8B5CF6' },
    };
    const iconConfig = icons[item.type] || icons['SYSTEM'];

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        const diffMs = Date.now() - d.getTime();
        const diffHrs = diffMs / 3600000;
        if (diffHrs < 1) return `${Math.max(1, Math.floor(diffMs / 60000))} phút trước`;
        if (diffHrs < 24) return `${Math.floor(diffHrs)} giờ trước`;
        return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <TouchableOpacity
            style={[styles.notifItem, !item.isRead && styles.notifItemUnread]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.iconWrapper, { backgroundColor: iconConfig.bg }]}>
                <Ionicons name={iconConfig.name as any} size={22} color={iconConfig.color} />
            </View>
            <View style={styles.notifContent}>
                <Text style={[styles.notifTitle, !item.isRead && styles.notifTitleUnread]} numberOfLines={1}>
                    {item.title}
                </Text>
                <Text style={styles.notifMsg} numberOfLines={2}>{item.content}</Text>
                <Text style={styles.notifTime}>{formatTime(item.createdAt)}</Text>
            </View>
            {!item.isRead && <View style={styles.unreadDot} />}
        </TouchableOpacity>
    );
}

function getSectionTitle(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const itemDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    if (itemDate.getTime() === today.getTime()) return 'Hôm nay';
    if (itemDate.getTime() === yesterday.getTime()) return 'Hôm qua';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function NotificationsScreen() {
    const router = useRouter();
    const { notifications, fetchNotifications, markAsRead, markAllAsRead, isLoading, unreadCount } = useNotificationStore();

    useEffect(() => {
        fetchNotifications(true);
    }, []);

    const sections = useMemo(() => {
        const groups: Record<string, Notification[]> = {};
        for (const notif of notifications) {
            const title = getSectionTitle(notif.createdAt);
            if (!groups[title]) groups[title] = [];
            groups[title].push(notif);
        }
        return Object.entries(groups).map(([title, data]) => ({ title, data }));
    }, [notifications]);

    const handleNotifPress = (notif: Notification) => {
        markAsRead(notif.id);
        // Navigate based on notification type (backend chỉ có type, không có data field)
        switch (notif.type) {
            case 'APPOINTMENT':
                router.push('/appointments' as any);
                break;
            case 'CONTRACT':
                router.push('/contracts' as any);
                break;
            case 'BILL':
                router.push('/wallet' as any);
                break;
            case 'ROOM_APPROVED':
                // Quay về danh sách BĐS của tôi
                router.push('/(tabs)/profile' as any);
                break;
            case 'CHAT':
                router.push('/(tabs)/chat' as any);
                break;
            default:
                break;
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Thông báo</Text>
                {unreadCount > 0 && (
                    <TouchableOpacity onPress={markAllAsRead}>
                        <Text style={styles.markAllBtn}>Đọc tất cả</Text>
                    </TouchableOpacity>
                )}
            </View>

            {isLoading && notifications.length === 0 ? (
                <View style={styles.center}>
                    <ActivityIndicator color="#0066FF" />
                </View>
            ) : notifications.length === 0 ? (
                <View style={styles.empty}>
                    <Ionicons name="notifications-off-outline" size={64} color="#CCC" />
                    <Text style={styles.emptyTitle}>Không có thông báo</Text>
                    <Text style={styles.emptySub}>Các thông báo từ hệ thống sẽ xuất hiện ở đây</Text>
                </View>
            ) : (
                <SectionList
                    sections={sections}
                    keyExtractor={item => item.id.toString()}
                    renderItem={({ item }) => (
                        <NotificationItem item={item} onPress={() => handleNotifPress(item)} />
                    )}
                    renderSectionHeader={({ section: { title } }) => (
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionHeaderText}>{title}</Text>
                        </View>
                    )}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                    onEndReached={() => fetchNotifications()}
                    onEndReachedThreshold={0.3}
                    stickySectionHeadersEnabled={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 54 : 16, paddingBottom: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
    markAllBtn: { color: '#0066FF', fontWeight: '600', fontSize: 14 },
    sectionHeader: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F8F9FA' },
    sectionHeaderText: { fontSize: 14, fontWeight: '700', color: '#888' },
    notifItem: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, backgroundColor: 'white', gap: 12 },
    notifItemUnread: { backgroundColor: '#F0F5FF' },
    iconWrapper: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    notifContent: { flex: 1 },
    notifTitle: { fontSize: 14, color: '#333', marginBottom: 3 },
    notifTitleUnread: { fontWeight: '700', color: '#1A1A1A' },
    notifMsg: { fontSize: 13, color: '#666', lineHeight: 19 },
    notifTime: { fontSize: 12, color: '#999', marginTop: 4 },
    unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0066FF', marginTop: 4 },
    separator: { height: 1, backgroundColor: '#F5F5F5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
    emptySub: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20 },
});
