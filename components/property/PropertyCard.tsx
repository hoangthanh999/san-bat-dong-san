import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, Pressable,
    TouchableOpacity, Linking, Share, Alert,
    useWindowDimensions, FlatList,
} from 'react-native';
import { VideoView, useVideoPlayer, VideoPlayer } from 'expo-video';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useInteractionStore } from '../../store/interactionStore';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Room } from '../../types';
import { usePropertyStore } from '../../store/propertyStore';
import { useAuthStore } from '../../store/authStore';

interface PropertyCardProps {
    item: Room;
    isActive: boolean;
    cardHeight: number; // chiều cao do parent truyền vào (đã tính chính xác)
    tagsTop?: number;
}

function getSmartTags(item: Room): { label: string; color: string; bg: string }[] {
    const tags: { label: string; color: string; bg: string }[] = [];
    const now = Date.now();
    const createdMs = new Date(item.createdAt).getTime();
    const hoursSince = (now - createdMs) / 3600000;

    if (hoursSince < 24) tags.push({ label: 'Mới đăng', color: '#00C853', bg: 'rgba(0,200,83,0.2)' });
    if (item.price < 5000000) tags.push({ label: 'Giá tốt', color: '#FF6B35', bg: 'rgba(255,107,53,0.2)' });
    if (item.amenities?.includes('Pool') || item.amenities?.includes('Gym'))
        tags.push({ label: 'Tiện ích cao', color: '#00B0FF', bg: 'rgba(0,176,255,0.2)' });
    if (item.videoUrl) tags.push({ label: '▶ Video', color: '#E040FB', bg: 'rgba(224,64,251,0.2)' });
    return tags.slice(0, 3);
}

export default function PropertyCard({ item, isActive, cardHeight, tagsTop: tagsTopProp }: PropertyCardProps) {
    const router = useRouter();
   const [isMuted, setIsMuted] = useState(false);
    const { isAuthenticated } = useAuthStore();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();

    const [currentImgIdx, setCurrentImgIdx] = useState(0);

    const handleImageScroll = (event: any) => {
        const slideSize = event.nativeEvent.layoutMeasurement.width;
        if (!slideSize) return;
        const offset = event.nativeEvent.contentOffset.x;
        const activeIndex = Math.round(offset / slideSize);
        if (activeIndex !== currentImgIdx) {
            setCurrentImgIdx(activeIndex);
        }
    };
    const {
        isLiked: checkLiked,
        isSaved: checkSaved,
        toggleLike,
        toggleSave,
    } = useInteractionStore();

    const isLiked = checkLiked(item.id);
    const isSaved = checkSaved(item.id);

    // Chỉ tạo player khi có videoUrl thực sự
  const player = useVideoPlayer(item.videoUrl || null, (p: VideoPlayer) => {
    p.loop = true;
    p.muted = false;
});

    const heartScale = useSharedValue(1);
    const likeOpacity = useSharedValue(0);

    // ✅ Fix: Release player khi component unmount để tránh lỗi
    // "Cannot set prop 'player' on view ... Already Released"
    useEffect(() => {
        return () => {
            if (player && item.videoUrl) {
                try {
                    player.pause();
                    player.release();
                } catch (_) {
                    // Bỏ qua nếu player đã được release
                }
            }
        };
    }, []);

    useEffect(() => {
        if (!item.videoUrl || !player) return;
        try {
            if (isActive) {
                player.play();
            } else {
                player.pause();
                player.currentTime = 0;
            }
        } catch (e) {
            // Player có thể đã bị release khi component unmount/remount
            console.warn('[PropertyCard] Video player error:', e);
        }
    }, [isActive]);

    useEffect(() => {
        if (!player) return;
        try {
            player.muted = isMuted;
        } catch (e) {
            // Bỏ qua nếu player đã release
        }
    }, [isMuted]);



    // 3️⃣ Fix handleLike — dùng store
    const handleLike = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        heartScale.value = withSequence(
            withSpring(1.4, { damping: 5 }),
            withSpring(1, { damping: 8 })
        );
        likeOpacity.value = withSequence(
            withTiming(1, { duration: 150 }),
            withTiming(0, { duration: 700 })
        );
        await toggleLike(item.id);  // ✅ dùng store
    };

    // 4️⃣ Thêm handleSave
    const handleSave = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await toggleSave(item.id);
    };

    const handleCall = () => {
        if (!isAuthenticated) {
            router.push('/(auth)/login');
            return;
        }
        const ownerPhone = item.ownerPhoneSnapshot || item.ownerPhone;
        if (ownerPhone) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Linking.openURL(`tel:${ownerPhone}`);
        } else {
            Alert.alert('Thông báo', 'Số điện thoại chưa được cập nhật.');
        }
    };

    const getFullAddress = (r: Room) => {
        return r.address || '';
    };

    const handleShare = async () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await Share.share({
                message: `🏠 ${item.title}\n📍 ${getFullAddress(item)}\n💰 ${formatPrice(item.price)}/tháng\n\nXem thêm trên HomeSwipe`,
                title: item.title,
            });
        } catch (e) { }
    };

    const handleChat = () => {
        if (!isAuthenticated) { router.push('/(auth)/login'); return; }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/chat/${item.ownerId}`);
    };

    const handlePressDetails = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/property/${item.id}`);
    };

    const formatPrice = (price: number) => {
        if (price >= 1000000000) return `${(price / 1000000000).toFixed(1)} tỷ`;
        return `${(price / 1000000).toFixed(0)} tr`;
    };

    const heartAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: heartScale.value }],
    }));

    const overlayHeartStyle = useAnimatedStyle(() => ({
        opacity: likeOpacity.value,
        transform: [{ scale: 1.5 }],
    }));

    const tags = getSmartTags(item);

    // ---------- Responsive layout calculations ----------
    // Smart Tags: đặt dưới header floating (~insets.top + 56px header content)
    const tagsTop = tagsTopProp ?? insets.top + 64;
    // Mute indicator: dưới status bar 1 chút
    const muteTop = insets.top + 12;
    // Info overlay & right actions: cách bottom 16px
    // KHÔNG cần insets.bottom vì FlatList container đã kết thúc đúng tại đỉnh tab bar
    const infoBottom = 16;
    const actionsBottom = infoBottom + 108;

    return (
        <View style={[styles.container, { height: cardHeight, width }]}>
            {/* Media Layer */}
            {item.videoUrl && player ? (
                <Pressable
                    onPress={() => setIsMuted(!isMuted)}
                    onLongPress={handleLike}
                    style={styles.mediaContainer}
                >
                    <VideoView
                        style={styles.video}
                        player={player}
                        allowsPictureInPicture={false}
                        contentFit="cover"
                        nativeControls={false}
                    />
                    {/* Big Heart Animation Overlay */}
                    <Animated.View style={[styles.centerOverlay, overlayHeartStyle]} pointerEvents="none">
                        <Ionicons name="heart" size={100} color="white" />
                    </Animated.View>
                    {/* Mute indicator */}
                    <View style={[styles.muteIndicator, { top: muteTop }]}>
                        <Ionicons
                            name={isMuted ? 'volume-mute' : 'volume-high'}
                            size={14}
                            color="white"
                        />
                    </View>
                </Pressable>
            ) : item.images && item.images.length > 0 ? (
                <View style={styles.mediaContainer}>
                    <FlatList
                        data={item.images}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(img, index) => `${item.id}-img-${index}`}
                        onMomentumScrollEnd={handleImageScroll}
                        renderItem={({ item: imgUri }) => (
                            <Pressable
                                onPress={handlePressDetails}
                                onLongPress={handleLike}
                                style={{ width, height: '100%' }}
                            >
                                <Image
                                    source={{ uri: imgUri }}
                                    style={styles.image}
                                    contentFit="cover"
                                />
                            </Pressable>
                        )}
                        removeClippedSubviews={false}
                    />
                    {/* Big Heart Animation Overlay */}
                    <Animated.View style={[styles.centerOverlay, overlayHeartStyle]} pointerEvents="none">
                        <Ionicons name="heart" size={100} color="white" />
                    </Animated.View>
                    {/* Image Index Indicator */}
                    {item.images.length > 1 && (
                        <View style={[styles.imageIndexIndicator, { top: muteTop }]}>
                            <Text style={styles.imageIndexText}>
                                {currentImgIdx + 1}/{item.images.length}
                            </Text>
                        </View>
                    )}
                </View>
            ) : (
                <Pressable
                    onPress={handlePressDetails}
                    style={[styles.mediaContainer, {
                        backgroundColor: '#0d1b2a',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }]}
                >
                    <Ionicons name="home-outline" size={72} color="rgba(255,255,255,0.15)" />
                    <Text style={{ color: 'rgba(255,255,255,0.3)', marginTop: 10, fontSize: 13 }}>
                        Chưa có ảnh
                    </Text>
                    {/* Big Heart Animation Overlay */}
                    <Animated.View style={[styles.centerOverlay, overlayHeartStyle]} pointerEvents="none">
                        <Ionicons name="heart" size={100} color="white" />
                    </Animated.View>
                </Pressable>
            )}

            {/* Gradient Overlay */}
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.85)']}
                style={styles.gradientOverlay}
                pointerEvents="none"
            />

            {/* Smart Tags */}
            {tags.length > 0 && (
                <View style={[styles.tagsRow, { top: tagsTop }]} pointerEvents="none">
                    {tags.map((tag, i) => (
                        <View key={i} style={[styles.tag, { backgroundColor: tag.bg }]}>
                            <Text style={[styles.tagText, { color: tag.color }]}>{tag.label}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Boost Badge */}
            {item.isPromoted && (
                <View style={[styles.boostBadge, { top: tagsTop + (tags.length > 0 ? 34 : 0) }]} pointerEvents="none">
                    <Text style={styles.boostBadgeText}>🔥 Đang boost</Text>
                </View>
            )}

            {/* Info Overlay */}
            <Pressable style={[styles.infoOverlay, { bottom: infoBottom }]} onPress={handlePressDetails}>
                <View style={styles.priceRowContainer}>
                    <View style={[
                        styles.transactionBadge,
                        { backgroundColor: item.transactionType === 'FOR_RENT' ? '#0066FF' : '#FF9500' }
                    ]}>
                        <Text style={styles.transactionBadgeText}>
                            {item.transactionType === 'FOR_RENT' ? 'Cho thuê' : 'Bán'}
                        </Text>
                    </View>
                    <View style={styles.priceTag}>
                        <Text style={styles.priceText}>{formatPrice(item.price)}</Text>
                        {item.transactionType === 'FOR_RENT' && (
                            <Text style={styles.unitText}>/ tháng</Text>
                        )}
                    </View>
                </View>

                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>

                <View style={styles.row}>
                    <Feather name="map-pin" size={13} color="#ddd" />
                    <Text style={styles.addressText} numberOfLines={1}>{getFullAddress(item)}</Text>
                </View>

                <View style={styles.featuresRow}>
                    {item.bedrooms !== undefined && (
                        <View style={styles.featureBadge}>
                            <Ionicons name="bed-outline" size={11} color="white" />
                            <Text style={styles.featureText}>{item.bedrooms} PN</Text>
                        </View>
                    )}
                    {item.bathrooms !== undefined && (
                        <View style={styles.featureBadge}>
                            <Ionicons name="water-outline" size={11} color="white" />
                            <Text style={styles.featureText}>{item.bathrooms} PT</Text>
                        </View>
                    )}
                    <View style={[styles.featureBadge, styles.areaBadge]}>
                        <Ionicons name="resize-outline" size={11} color="#FFD700" />
                        <Text style={[styles.featureText, styles.areaText]}>{item.area}m²</Text>
                    </View>
                </View>
            </Pressable>

            {/* Right Action Buttons */}
            <View style={[styles.rightActions, { bottom: actionsBottom }]}>

                {/* Avatar */}
                <TouchableOpacity onPress={handleChat} style={styles.landlordContainer}>
                    <Image
                        source={{
                            uri: item.ownerAvatarSnapshot || item.ownerAvatarUrl ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(item.ownerNameSnapshot || item.ownerFullName || 'User')}&background=0066FF&color=fff&size=100`,
                        }}
                        style={styles.avatar}
                    />
                    <View style={styles.avatarBadge}>
                        <Ionicons name="checkmark" size={9} color="white" />
                    </View>
                </TouchableOpacity>

                {/* ✅ Like — icon tim, label "Thích" */}
                <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
                    <Animated.View style={heartAnimatedStyle}>
                        <View style={[styles.iconCircle, { backgroundColor: isLiked ? 'rgba(255, 71, 87, 0.2)' : 'rgba(0,0,0,0.45)' }]}>
                            <Ionicons
                                name={isLiked ? 'heart' : 'heart-outline'}
                                size={22}
                                color={isLiked ? '#FF4757' : 'white'}
                            />
                        </View>
                    </Animated.View>
                    <Text style={styles.actionText}>Thích</Text>
                </TouchableOpacity>

                {/* ✅ Save — icon bookmark, label "Lưu" */}
                <TouchableOpacity onPress={handleSave} style={styles.actionButton}>
                    <View style={[styles.iconCircle, { backgroundColor: isSaved ? 'rgba(255, 215, 0, 0.2)' : 'rgba(0,0,0,0.45)' }]}>
                        <Ionicons
                            name={isSaved ? 'bookmark' : 'bookmark-outline'}
                            size={22}
                            color={isSaved ? '#FFD700' : 'white'}
                        />
                    </View>
                    <Text style={styles.actionText}>Lưu</Text>
                </TouchableOpacity>

                {/* Chat */}
                <TouchableOpacity onPress={handleChat} style={styles.actionButton}>
                    <View style={[styles.iconCircle, { backgroundColor: '#0066FF' }]}>
                        <Ionicons name="chatbubble-ellipses" size={20} color="white" />
                    </View>
                    <Text style={styles.actionText}>Chat</Text>
                </TouchableOpacity>

                {/* Call */}
                <TouchableOpacity onPress={handleCall} style={styles.actionButton}>
                    <View style={[styles.iconCircle, { backgroundColor: '#2ECC71' }]}>
                        <Ionicons name="call" size={20} color="white" />
                    </View>
                    <Text style={styles.actionText}>Gọi</Text>
                </TouchableOpacity>

                {/* Share */}
                <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
                    <View style={[styles.iconCircle, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
                        <Ionicons name="share-social" size={20} color="white" />
                    </View>
                    <Text style={styles.actionText}>Chia sẻ</Text>
                </TouchableOpacity>

            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'black',
        position: 'relative',
    },
    mediaContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    video: { flex: 1, width: '100%', height: '100%' },
    image: { flex: 1, width: '100%', height: '100%' },
    centerOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    muteIndicator: {
        position: 'absolute',
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.45)',
        borderRadius: 12,
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gradientOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 320,
    },
    tagsRow: {
        position: 'absolute',
        left: 16,
        flexDirection: 'row',
        gap: 6,
    },
    tag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    tagText: {
        fontSize: 11,
        fontWeight: '700',
    },
    boostBadge: {
        position: 'absolute',
        left: 16,
        backgroundColor: 'rgba(255, 107, 53, 0.92)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    boostBadgeText: {
        color: 'white',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    infoOverlay: {
        position: 'absolute',
        left: 16,
        right: 90,
    },
    priceTag: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 6,
    },
    priceText: {
        color: '#FF6B35',
        fontSize: 28,
        fontWeight: '800',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    unitText: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 15,
        marginLeft: 4,
        fontWeight: '500',
    },
    title: {
        color: 'white',
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 6,
        lineHeight: 24,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 10,
    },
    addressText: {
        color: '#ddd',
        fontSize: 13,
        flex: 1,
    },
    featuresRow: {
        flexDirection: 'row',
        gap: 6,
    },
    featureBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.18)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    featureText: {
        color: 'white',
        fontSize: 11,
        fontWeight: '600',
    },
    rightActions: {
        position: 'absolute',
        right: 10,
        alignItems: 'center',
        gap: 18,
    },
    landlordContainer: {
        position: 'relative',
        marginBottom: 4,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: 'white',
        backgroundColor: '#E0E0E0',
    },
    avatarBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#0066FF',
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'white',
    },
    actionButton: {
        alignItems: 'center',
    },
    actionText: {
        color: 'white',
        fontSize: 11,
        fontWeight: '600',
        marginTop: 3,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    imageIndexIndicator: {
        position: 'absolute',
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.55)',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        zIndex: 10,
    },
    imageIndexText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    priceRowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    transactionBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    transactionBadgeText: {
        color: 'white',
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    areaBadge: {
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        borderColor: 'rgba(255, 215, 0, 0.3)',
        borderWidth: 1,
    },
    areaText: {
        color: '#FFD700',
        fontWeight: '700',
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
    },
});
