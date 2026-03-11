import React, { useEffect, useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    RefreshControl, StatusBar, Platform, TextInput, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { Conversation } from '../../types';
import { Skeleton } from '../../components/ui/Skeleton';

function formatTime(dateStr?: string) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHrs = diffMs / (1000 * 60 * 60);
    if (diffHrs < 1) return `${Math.floor(diffMs / 60000)} phút`;
    if (diffHrs < 24) return `${Math.floor(diffHrs)} giờ`;
    if (diffHrs < 48) return 'Hôm qua';
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function ConversationItem({ item, onPress, onDelete }: {
    item: Conversation;
    onPress: () => void;
    onDelete: () => void;
}) {
    const avatarUri = item.partnerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.partnerName)}&background=0066FF&color=fff&size=100`;
    return (
        <TouchableOpacity style={styles.convItem} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.avatarWrapper}>
                <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
                {item.isOnline && <View style={styles.onlineDot} />}
            </View>
            <View style={styles.convInfo}>
                <View style={styles.convHeader}>
                    <Text style={[styles.convName, item.unreadCount > 0 && styles.convNameBold]} numberOfLines={1}>{item.partnerName}</Text>
                    <Text style={styles.convTime}>{formatTime(item.lastMessageAt)}</Text>
                </View>
                <View style={styles.convFooter}>
                    <Text style={[styles.lastMsg, item.unreadCount > 0 && styles.lastMsgBold]} numberOfLines={1}>
                        {item.lastMessage || 'Bắt đầu cuộc trò chuyện...'}
                    </Text>
                    {item.unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}

export default function ChatListScreen() {
    const router = useRouter();
    const { conversations, fetchConversations, isLoading, deleteConversation } = useChatStore();
    const { isAuthenticated } = useAuthStore();
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            fetchConversations();
        }
    }, [isAuthenticated]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchConversations();
        setRefreshing(false);
    };

    if (!isAuthenticated) {
        return (
            <View style={styles.authRequired}>
                <StatusBar barStyle="dark-content" />
                <Ionicons name="chatbubbles-outline" size={64} color="#CCC" />
                <Text style={styles.authTitle}>Đăng nhập để chat</Text>
                <Text style={styles.authSub}>Kết nối với chủ nhà và người thuê để trao đổi trực tiếp</Text>
                <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/(auth)/login')}>
                    <Text style={styles.loginBtnText}>Đăng nhập ngay</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Tin nhắn</Text>
                <TouchableOpacity>
                    <Ionicons name="create-outline" size={24} color="#0066FF" />
                </TouchableOpacity>
            </View>

            {isLoading && conversations.length === 0 ? (
                <View style={{ padding: 16, gap: 12 }}>
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} width="100%" height={72} borderRadius={12} />)}
                </View>
            ) : conversations.length === 0 ? (
                <View style={styles.empty}>
                    <Ionicons name="chatbubbles-outline" size={64} color="#CCC" />
                    <Text style={styles.emptyTitle}>Chưa có cuộc trò chuyện nào</Text>
                    <Text style={styles.emptySub}>Nhấn chat với chủ nhà từ tin đăng để bắt đầu</Text>
                </View>
            ) : (
                <FlatList
                    data={conversations}
                    keyExtractor={item => item.id.toString()}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0066FF" />}
                    renderItem={({ item }) => (
                        <ConversationItem
                            item={item}
                            onPress={() => router.push(`/chat/${item.partnerId}`)}
                            onDelete={() => {
                                Alert.alert('Xoá cuộc trò chuyện', 'Bạn có chắc muốn xoá?', [
                                    { text: 'Huỷ', style: 'cancel' },
                                    { text: 'Xoá', style: 'destructive', onPress: () => deleteConversation(item.partnerId) },
                                ]);
                            }}
                        />
                    )}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingBottom: 12,
        backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    },
    headerTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
    convItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: 'white' },
    avatarWrapper: { position: 'relative' },
    avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#E0E0E0' },
    onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 13, height: 13, borderRadius: 6.5, backgroundColor: '#22C55E', borderWidth: 2, borderColor: 'white' },
    convInfo: { flex: 1, marginLeft: 12 },
    convHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    convName: { fontSize: 15, color: '#1A1A1A', flex: 1, marginRight: 8 },
    convNameBold: { fontWeight: '700' },
    convTime: { fontSize: 12, color: '#999' },
    convFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    lastMsg: { fontSize: 13, color: '#888', flex: 1, marginRight: 8 },
    lastMsgBold: { color: '#333', fontWeight: '600' },
    unreadBadge: { backgroundColor: '#0066FF', minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
    unreadText: { color: 'white', fontSize: 11, fontWeight: '700' },
    separator: { height: 1, backgroundColor: '#F5F5F5', marginLeft: 80 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333', textAlign: 'center' },
    emptySub: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20 },
    authRequired: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 40, backgroundColor: 'white' },
    authTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
    authSub: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
    loginBtn: { marginTop: 8, backgroundColor: '#0066FF', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
    loginBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
