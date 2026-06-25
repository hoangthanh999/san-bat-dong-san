import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    TextInput, KeyboardAvoidingView, Platform, StatusBar,
    ActivityIndicator, Animated, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAiChatStore, AiChatMessage, PropertyCardDTO } from '../../store/aiChatStore';
import { useAuthStore } from '../../store/authStore';
import { AuthGuardScreen } from '../../components/auth/AuthGuardScreen';
import { useSafeRouter } from '../../hooks/useSafeRouter';

const AI_SUGGESTIONS = [
    'Tìm căn hộ 2 phòng ngủ tại Hà Nội dưới 10 triệu/tháng',
    'BĐS mua bán tại quận 1 TP HCM',
    'Nhà phố có gara ở Đà Nẵng',
    'Chung cư gần trung tâm dưới 5 tỷ',
];

function formatMsgTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatPrice(price: number): string {
    if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)} tỷ`;
    if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(0)} tr`;
    return `${price.toLocaleString('vi-VN')} đ`;
}

function PropertyCard({ item, onPress }: { item: PropertyCardDTO; onPress: () => void }) {
    return (
        <TouchableOpacity style={styles.propCard} onPress={onPress} activeOpacity={0.85}>
            <Image
                source={{ uri: item.imageUrl || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400' }}
                style={styles.propCardImg}
                contentFit="cover"
            />
            <View style={styles.propCardBody}>
                <Text style={styles.propCardTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.propCardPrice}>{formatPrice(item.price)}</Text>
                {item.district && (
                    <View style={styles.propCardLocRow}>
                        <Ionicons name="location-outline" size={11} color="#888" />
                        <Text style={styles.propCardLoc}>{item.district}</Text>
                    </View>
                )}
            </View>
            <Ionicons name="chevron-forward" size={16} color="#CCC" style={{ alignSelf: 'center', marginRight: 10 }} />
        </TouchableOpacity>
    );
}

function TypingIndicator() {
    const [dots] = useState([
        new Animated.Value(0),
        new Animated.Value(0),
        new Animated.Value(0),
    ]);

    useEffect(() => {
        const animations = dots.map((dot, i) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(i * 150),
                    Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
                    Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
                    Animated.delay((dots.length - i) * 150),
                ])
            )
        );
        Animated.parallel(animations).start();
        return () => animations.forEach(a => a.stop());
    }, []);

    return (
        <View style={styles.typingBubble}>
            <View style={styles.aiBotAvatar}>
                <Ionicons name="sparkles" size={14} color="white" />
            </View>
            <View style={styles.typingDots}>
                {dots.map((dot, i) => (
                    <Animated.View
                        key={i}
                        style={[styles.dot, { opacity: dot, transform: [{ scale: dot.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }]}
                    />
                ))}
            </View>
        </View>
    );
}

function AiChatContent() {
    const { router, safePush } = useSafeRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    const {
        messages, isConnected, connectionState, connectionError, isThinking,
        connectAiWebSocket, disconnectAiWebSocket, sendAiMessage, clearMessages,
    } = useAiChatStore();

    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const isConnecting = connectionState === 'idle' || connectionState === 'connecting';
    const isConnectionError = connectionState === 'error' || connectionState === 'disconnected';
    const isAiReady = connectionState === 'connected' && isConnected;
    const statusText = isAiReady
        ? 'Dang hoat dong'
        : isConnectionError
            ? 'Mat ket noi, thu lai'
            : 'Dang ket noi...';
    const statusColor = isAiReady ? '#22C55E' : isConnectionError ? '#EF4444' : '#FF9500';

    useEffect(() => {
        connectAiWebSocket().catch(() => undefined);
        return () => {
            disconnectAiWebSocket();
            // Không disconnect khi unmount để giữ kết nối giữa các lần quay lại
        };
    }, []);

    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages.length, isThinking]);

    const handleSend = async (text?: string) => {
        const msg = (text || inputText).trim();
        if (!msg || isSending) return;
        setInputText('');
        setIsSending(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await sendAiMessage(msg);
        } catch (e: any) {
            Alert.alert(
                'Không thể gửi',
                isConnected
                    ? 'Đã xảy ra lỗi. Vui lòng thử lại.'
                    : 'Đang kết nối lại với AI. Vui lòng đợi giây lát.',
            );
        } finally {
            setIsSending(false);
        }
    };

    const renderMessage = ({ item }: { item: AiChatMessage }) => {
        const isUser = item.role === 'user';

        return (
            <View style={styles.msgWrapper}>
                {/* Thời gian */}
                <Text style={[styles.msgTime, isUser ? styles.msgTimeRight : styles.msgTimeLeft]}>
                    {formatMsgTime(item.createdAt)}
                </Text>

                <View style={[styles.msgRow, isUser && styles.msgRowMe]}>
                    {!isUser && (
                        <View style={styles.aiBotAvatar}>
                            <Ionicons name="sparkles" size={14} color="white" />
                        </View>
                    )}

                    <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
                        <Text style={[styles.msgText, isUser && styles.msgTextUser]}>
                            {item.content}
                        </Text>

                        {/* BĐS được gợi ý */}
                        {item.items && item.items.length > 0 && (
                            <View style={styles.propList}>
                                <Text style={styles.propListTitle}>
                                    🏠 {item.items.length} bất động sản phù hợp:
                                </Text>
                                {item.items.map(prop => (
                                    <PropertyCard
                                        key={prop.propertyId}
                                        item={prop}
                                        onPress={() => safePush(`/property/${prop.propertyId}` as any)}
                                    />
                                ))}
                            </View>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <View style={styles.aiBotAvatarLg}>
                        <Ionicons name="sparkles" size={20} color="white" />
                    </View>
                    <View>
                        <Text style={styles.headerName}>HomeVerse AI</Text>
                        <View style={styles.headerStatusRow}>
                            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                            <Text style={styles.headerStatus}>
                                {isConnected ? 'Đang hoạt động' : 'Đang kết nối...'}
                            </Text>
                        </View>
                    </View>
                </View>
                {isConnectionError && (
                    <TouchableOpacity
                        onPress={() => connectAiWebSocket().catch(() => undefined)}
                        style={styles.retryIconBtn}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="refresh" size={20} color="#0066FF" />
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    onPress={() => {
                        Alert.alert('Làm mới cuộc trò chuyện', 'Xoá toàn bộ lịch sử chat AI?', [
                            { text: 'Huỷ', style: 'cancel' },
                            { text: 'Xoá', style: 'destructive', onPress: clearMessages },
                        ]);
                    }}
                >
                    <Ionicons name="trash-outline" size={22} color="#EF4444" />
                </TouchableOpacity>
            </View>

            {/* Messages */}
            {messages.length === 0 && !isThinking ? (
                <View style={styles.welcomeContainer}>
                    {/* Welcome */}
                    <View style={styles.welcomeHero}>
                        <View style={styles.welcomeIcon}>
                            <Ionicons name="sparkles" size={40} color="white" />
                        </View>
                        <Text style={styles.welcomeTitle}>Xin chào! Tôi là HomeVerse AI</Text>
                        <Text style={styles.welcomeSub}>
                            Trợ lý thông minh tìm kiếm bất động sản phù hợp với nhu cầu của bạn
                        </Text>
                    </View>

                    {/* Suggestions */}
                    <Text style={styles.suggestTitle}>Bạn có thể hỏi tôi:</Text>
                    {!isAiReady && (
                        <View style={styles.connectionNotice}>
                            {isConnecting ? (
                                <ActivityIndicator size="small" color="#0066FF" />
                            ) : (
                                <Ionicons name="cloud-offline-outline" size={18} color="#EF4444" />
                            )}
                            <Text style={styles.connectionNoticeText}>
                                {isConnecting ? 'Dang ket noi AI Chat...' : connectionError || 'Mat ket noi AI Chat.'}
                            </Text>
                            {isConnectionError && (
                                <TouchableOpacity
                                    style={styles.retryBtn}
                                    onPress={() => connectAiWebSocket().catch(() => undefined)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.retryBtnText}>Thu lai</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                    {AI_SUGGESTIONS.map((s, i) => (
                        <TouchableOpacity
                            key={i}
                            style={[styles.suggestChip, (!isAiReady || isSending) && styles.suggestChipDisabled]}
                            onPress={() => handleSend(s)}
                            disabled={!isAiReady || isSending}
                        >
                            <Ionicons name="search-outline" size={16} color="#0066FF" />
                            <Text style={styles.suggestText}>{s}</Text>
                            <Ionicons name="arrow-forward" size={14} color="#0066FF" />
                        </TouchableOpacity>
                    ))}
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.msgList}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    ListFooterComponent={isThinking ? <TypingIndicator /> : null}
                />
            )}

            {/* Input Bar */}
            <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
                <TextInput
                    style={styles.input}
                    placeholder="Mô tả BĐS bạn đang tìm..."
                    placeholderTextColor="#AAA"
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    maxLength={500}
                    onSubmitEditing={() => handleSend()}
                    returnKeyType="send"
                />
                <TouchableOpacity
                    style={[
                        styles.sendBtn,
                        (!inputText.trim() || isSending || !isAiReady) && styles.sendBtnDisabled,
                    ]}
                    onPress={() => handleSend()}
                    disabled={!inputText.trim() || isSending || !isAiReady}
                >
                    {isSending
                        ? <ActivityIndicator size="small" color="white" />
                        : <Ionicons name="send" size={18} color="white" />
                    }
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

export default function AiChatScreen() {
    return (
        <AuthGuardScreen
            message="Đăng nhập để sử dụng AI tìm kiếm BĐS"
            icon="sparkles-outline"
        >
            <AiChatContent />
        </AuthGuardScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
        paddingBottom: 12, backgroundColor: 'white',
        borderBottomWidth: 1, borderBottomColor: '#F0F0F0', gap: 8,
    },
    backBtn: { padding: 4 },
    headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    aiBotAvatarLg: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#0066FF', justifyContent: 'center', alignItems: 'center',
    },
    headerName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
    headerStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    headerStatus: { fontSize: 12, color: '#666' },
    retryIconBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#E8F0FF',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Welcome screen
    welcomeContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 24, gap: 12 },
    welcomeHero: { alignItems: 'center', paddingBottom: 24, gap: 12 },
    welcomeIcon: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: '#0066FF', justifyContent: 'center', alignItems: 'center',
        shadowColor: '#0066FF', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
    },
    welcomeTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', textAlign: 'center' },
    welcomeSub: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
    suggestTitle: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
    suggestChip: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: 'white', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    },
    suggestChipDisabled: { opacity: 0.55 },
    connectionNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'white',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#E8F0FF',
    },
    connectionNoticeText: { flex: 1, fontSize: 13, color: '#555', lineHeight: 18 },
    retryBtn: {
        backgroundColor: '#E8F0FF',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    retryBtnText: { color: '#0066FF', fontSize: 12, fontWeight: '700' },
    suggestText: { flex: 1, fontSize: 13, color: '#333', lineHeight: 18 },

    // Messages
    msgList: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 8 },
    msgWrapper: { marginBottom: 12 },
    msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    msgRowMe: { justifyContent: 'flex-end' },
    msgTime: { fontSize: 10, color: '#BBB', marginBottom: 4 },
    msgTimeLeft: { marginLeft: 44, textAlign: 'left' },
    msgTimeRight: { textAlign: 'right' },
    aiBotAvatar: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#0066FF', justifyContent: 'center', alignItems: 'center',
        flexShrink: 0,
    },
    bubble: {
        maxWidth: '80%', borderRadius: 18, padding: 12, paddingBottom: 10,
    },
    bubbleUser: {
        backgroundColor: '#0066FF', borderBottomRightRadius: 4,
    },
    bubbleAi: {
        backgroundColor: 'white', borderBottomLeftRadius: 4,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 2, elevation: 2,
    },
    msgText: { fontSize: 15, color: '#1A1A1A', lineHeight: 21 },
    msgTextUser: { color: 'white' },

    // BĐS gợi ý trong AI bubble
    propList: { marginTop: 10, gap: 8, minWidth: 250 },
    propListTitle: { fontSize: 12, fontWeight: '700', color: '#555', marginBottom: 4 },
    propCard: {
        flexDirection: 'row', backgroundColor: '#F8F9FA', borderRadius: 12,
        overflow: 'hidden', borderWidth: 1, borderColor: '#EAEAEA',
    },
    propCardImg: { width: 70, height: 70 },
    propCardBody: { flex: 1, padding: 8, gap: 2 },
    propCardTitle: { fontSize: 12, fontWeight: '600', color: '#1A1A1A', lineHeight: 16 },
    propCardPrice: { fontSize: 13, fontWeight: '800', color: '#0066FF' },
    propCardLocRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    propCardLoc: { fontSize: 11, color: '#888' },

    // Typing indicator
    typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12, marginBottom: 12 },
    typingDots: {
        flexDirection: 'row', gap: 5, backgroundColor: 'white',
        borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 2,
    },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#0066FF' },

    // Input
    inputBar: {
        flexDirection: 'row', alignItems: 'flex-end', gap: 8,
        paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10,
        backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F0F0F0',
    },
    input: {
        flex: 1, backgroundColor: '#F0F0F0', borderRadius: 20,
        paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
        fontSize: 15, maxHeight: 120, color: '#1A1A1A',
    },
    sendBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#0066FF', justifyContent: 'center', alignItems: 'center',
    },
    sendBtnDisabled: { backgroundColor: '#AAC8FF' },
});
