import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, Dimensions, Pressable,
    TouchableOpacity, Linking, Share, Alert,
} from 'react-native';
import { VideoView, useVideoPlayer, VideoPlayer } from 'expo-video';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

import { Room } from '../../types';
import { usePropertyStore } from '../../store/propertyStore';
import { useAuthStore } from '../../store/authStore';

const { width, height } = Dimensions.get('window');
const BOTTOM_TAB_HEIGHT = 80;

interface PropertyCardProps {
    item: Room;
    isActive: boolean;
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

export default function PropertyCard({ item, isActive }: PropertyCardProps) {
    const router = useRouter();
    const [isMuted, setIsMuted] = useState(true);
    const [isLiked, setIsLiked] = useState(false);
    const { toggleFavorite } = usePropertyStore();
    const { isAuthenticated } = useAuthStore();

    const player = useVideoPlayer(item.videoUrl ?? null, (p: VideoPlayer) => {
        p.loop = true;
        p.muted = isMuted;
    });

    const heartScale = useSharedValue(1);
    const likeOpacity = useSharedValue(0);

    useEffect(() => {
        if (!item.videoUrl) return;
        if (isActive) {
            player.play();
        } else {
            player.pause();
            player.currentTime = 0;
        }
    }, [isActive]);

    useEffect(() => {
        player.muted = isMuted;
    }, [isMuted]);

    const handleLike = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsLiked(prev => !prev);

        heartScale.value = withSequence(
            withSpring(1.4, { damping: 5 }),
            withSpring(1, { damping: 8 })
        );

        likeOpacity.value = withSequence(
            withTiming(1, { duration: 150 }),
            withTiming(0, { duration: 700 })
        );

        await toggleFavorite(item.id);
    };

    const handleCall = () => {
        if (!isAuthenticated) {
            router.push('/(auth)/login');
            return;
        }
        if (item.landlord?.phone) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Linking.openURL(`tel:${item.landlord.phone}`);
        } else {
            Alert.alert('Thông báo', 'Số điện thoại chưa được cập nhật.');
        }
    };

    const handleShare = async () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await Share.share({
                message: `🏠 ${item.title}\n📍 ${item.address}\n💰 ${formatPrice(item.price)}/tháng\n\nXem thêm trên HomeSwipe`,
                title: item.title,
            });
        } catch (e) { }
    };

    const handleChat = () => {
        if (!isAuthenticated) { router.push('/(auth)/login'); return; }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/chat/${item.landlord.id}`);
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

    return (
        <View style={[styles.container, { height: height - BOTTOM_TAB_HEIGHT }]}>
            {/* Media Layer */}
            <Pressable
                onPress={() => setIsMuted(!isMuted)}
                onLongPress={handleLike}
                style={styles.mediaContainer}
            >
                {item.videoUrl ? (
                    <VideoView
                        style={styles.video}
                        player={player}
                        allowsFullscreen={false}
                        allowsPictureInPicture={false}
                        contentFit="cover"
                        nativeControls={false}
                    />
                ) : (
                    <Image
                        source={{ uri: item.images[0] }}
                        style={styles.image}
                        contentFit="cover"
                    />
                )}

                {/* Big Heart Animation Overlay */}
                <Animated.View style={[styles.centerOverlay, overlayHeartStyle]} pointerEvents="none">
                    <Ionicons name="heart" size={100} color="white" />
                </Animated.View>

                {/* Mute indicator */}
                {item.videoUrl && (
                    <View style={styles.muteIndicator}>
                        <Ionicons
                            name={isMuted ? 'volume-mute' : 'volume-high'}
                            size={14}
                            color="white"
                        />
                    </View>
                )}
            </Pressable>

            {/* Gradient Overlay */}
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.85)']}
                style={styles.gradientOverlay}
                pointerEvents="none"
            />

            {/* Smart Tags */}
            {tags.length > 0 && (
                <View style={styles.tagsRow} pointerEvents="none">
                    {tags.map((tag, i) => (
                        <View key={i} style={[styles.tag, { backgroundColor: tag.bg }]}>
                            <Text style={[styles.tagText, { color: tag.color }]}>{tag.label}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Info Overlay */}
            <Pressable style={styles.infoOverlay} onPress={handlePressDetails}>
                <View style={styles.priceTag}>
                    <Text style={styles.priceText}>{formatPrice(item.price)}</Text>
                    <Text style={styles.unitText}>/ tháng</Text>
                </View>

                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>

                <View style={styles.row}>
                    <Feather name="map-pin" size={13} color="#ddd" />
                    <Text style={styles.addressText} numberOfLines={1}>{item.address}</Text>
                </View>

                <View style={styles.featuresRow}>
                    {item.numBedrooms !== undefined && (
                        <View style={styles.featureBadge}>
                            <Ionicons name="bed-outline" size={11} color="white" />
                            <Text style={styles.featureText}>{item.numBedrooms} PN</Text>
                        </View>
                    )}
                    {item.numBathrooms !== undefined && (
                        <View style={styles.featureBadge}>
                            <Ionicons name="water-outline" size={11} color="white" />
                            <Text style={styles.featureText}>{item.numBathrooms} PT</Text>
                        </View>
                    )}
                    <View style={styles.featureBadge}>
                        <Ionicons name="resize-outline" size={11} color="white" />
                        <Text style={styles.featureText}>{item.area}m²</Text>
                    </View>
                </View>
            </Pressable>

            {/* Right Action Buttons */}
            <View style={styles.rightActions}>
                {/* Avatar */}
                <TouchableOpacity onPress={handleChat} style={styles.landlordContainer}>
                    <Image
                        source={{
                            uri: item.landlord.avatarUrl ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(item.landlord.fullName)}&background=0066FF&color=fff&size=100`,
                        }}
                        style={styles.avatar}
                    />
                    <View style={styles.avatarBadge}>
                        <Ionicons name="checkmark" size={9} color="white" />
                    </View>
                </TouchableOpacity>

                {/* Like */}
                <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
                    <Animated.View style={heartAnimatedStyle}>
                        <Ionicons
                            name={isLiked ? 'heart' : 'heart-outline'}
                            size={32}
                            color={isLiked ? '#FF4757' : 'white'}
                        />
                    </Animated.View>
                    <Text style={styles.actionText}>Lưu</Text>
                </TouchableOpacity>

                {/* Chat */}
                <TouchableOpacity onPress={handleChat} style={styles.actionButton}>
                    <Ionicons name="chatbubble-ellipses-outline" size={32} color="white" />
                    <Text style={styles.actionText}>Chat</Text>
                </TouchableOpacity>

                {/* Call */}
                <TouchableOpacity onPress={handleCall} style={styles.actionButton}>
                    <Ionicons name="call-outline" size={32} color="white" />
                    <Text style={styles.actionText}>Gọi</Text>
                </TouchableOpacity>

                {/* Share */}
                <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
                    <Ionicons name="share-social-outline" size={32} color="white" />
                    <Text style={styles.actionText}>Chia sẻ</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width,
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
        top: 60,
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
        top: 110,
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
    infoOverlay: {
        position: 'absolute',
        bottom: 28,
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
        bottom: 120,
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
});
