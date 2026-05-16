import React, {
    useEffect, useRef, useCallback, useState,
} from 'react';
import {
    View, Text, FlatList, Dimensions, TouchableOpacity,
    StyleSheet, StatusBar, ActivityIndicator, Image,
    ViewToken, Share, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useReelsStore } from '../../store/reelsStore';
import { useInteractionStore } from '../../store/interactionStore';
import { PropertyReel } from '../../services/api/reels';

const { width: W, height: H } = Dimensions.get('window');

// ─── Helpers ─────────────────────────────────────────────────
function formatPrice(price: number): string {
    if (price >= 1_000_000_000)
        return `${(price / 1_000_000_000).toFixed(1)} tỷ`;
    if (price >= 1_000_000)
        return `${(price / 1_000_000).toFixed(0)} tr`;
    return price.toLocaleString('vi-VN');
}

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const d = Math.floor(diff / 86_400_000);
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor(diff / 60_000);
    if (d > 0) return `${d} ngày trước`;
    if (h > 0) return `${h} giờ trước`;
    if (m > 0) return `${m} phút trước`;
    return 'Vừa đăng';
}

function formatCount(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
}

// ════════════════════════════════════════════════════════════
// ReelItem
// ════════════════════════════════════════════════════════════
interface ReelItemProps {
    item: PropertyReel;
    isActive: boolean;
    insetBottom: number;
}

const ReelItem = React.memo(({ item, isActive, insetBottom }: ReelItemProps) => {
    const router = useRouter();
    const { toggleLike, toggleSave, isLiked, isSaved } = useInteractionStore();

    // ✅ videoRef nằm TRONG ReelItem
    const videoRef = useRef<Video>(null);

    // ✅ useEffect dùng isActive nằm TRONG ReelItem
    useEffect(() => {
        if (!videoRef.current) return;
        if (isActive) {
            videoRef.current.playAsync();
        } else {
            videoRef.current.pauseAsync();
        }
    }, [isActive]);

    const liked = isLiked(item.id) ?? item.isLiked;
    const saved = isSaved(item.id) ?? item.isSaved;

    const handleLike = useCallback(() => {
        toggleLike(item.id);
    }, [item.id, toggleLike]);

    const handleSave = useCallback(() => {
        toggleSave(item.id);
    }, [item.id, toggleSave]);

    const handleShare = useCallback(async () => {
        try {
            await Share.share({
                message: `🏠 ${item.title}\n💰 ${formatPrice(item.price)}\n📍 ${item.address}`,
                title: item.title,
            });
        } catch (_) { }
    }, [item]);

    const goToDetail = useCallback(() => {
        router.push(`/property/${item.id}`);
    }, [item.id]);

    const goToOwner = useCallback(() => {
        router.push(`/landlord-profile?slug=${item.ownerSlug}`);
    }, [item.ownerSlug]);

    return (
        <View style={[styles.reel, { height: H }]}>

            {/* ── Background: Video → Thumbnail → Fallback ── */}
            {item.videoUrl ? (
                <Video
                    ref={videoRef}
                    source={{ uri: item.videoUrl }}
                    style={StyleSheet.absoluteFill}
                    resizeMode={ResizeMode.COVER}
                    isLooping
                    isMuted={false}
                    shouldPlay={isActive}
                    usePoster
                    posterSource={
                        item.thumbnailUrl
                            ? { uri: item.thumbnailUrl }
                            : undefined
                    }
                    posterStyle={StyleSheet.absoluteFill}
                    onPlaybackStatusUpdate={(_: AVPlaybackStatus) => { }}
                />
            ) : item.thumbnailUrl ? (
                <Image
                    source={{ uri: item.thumbnailUrl }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                />
            ) : (
                <View style={styles.noMediaBg}>
                    <Text style={styles.noMediaIcon}>🏠</Text>
                </View>
            )}

            {/* ── Gradient overlays ── */}
            <View style={styles.gradientTop} pointerEvents="none" />
            <View style={styles.gradientBottom} pointerEvents="none" />

            {/* ════ TOP BAR ════ */}
            <View style={[styles.topBar, { top: Platform.OS === 'ios' ? 54 : 36 }]}>
                <Text style={styles.topTitle}>Reels BĐS</Text>
                {item.isPromoted && (
                    <View style={styles.promotedBadge}>
                        <Ionicons name="flash" size={11} color="#fff" />
                        <Text style={styles.promotedText}>Nổi bật</Text>
                    </View>
                )}
            </View>

            {/* ════ RIGHT ACTIONS ════ */}
            <View style={[styles.rightActions, { bottom: insetBottom + 110 }]}>

                {/* Avatar chủ nhà */}
                <TouchableOpacity
                    style={styles.avatarWrap}
                    onPress={goToOwner}
                    activeOpacity={0.85}
                >
                    {item.ownerAvatarSnapshot ? (
                        <Image
                            source={{ uri: item.ownerAvatarSnapshot }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={[styles.avatar, styles.avatarFallback]}>
                            <Text style={styles.avatarInitial}>
                                {(item.ownerNameSnapshot ?? '?')[0].toUpperCase()}
                            </Text>
                        </View>
                    )}
                    <View style={styles.followDot}>
                        <Ionicons name="add" size={10} color="#fff" />
                    </View>
                </TouchableOpacity>

                {/* Like */}
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={handleLike}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name={liked ? 'heart' : 'heart-outline'}
                        size={32}
                        color={liked ? '#FF3B5C' : '#fff'}
                    />
                    <Text style={styles.actionLabel}>
                        {formatCount(
                            liked && !item.isLiked
                                ? item.likeCount + 1
                                : !liked && item.isLiked
                                    ? Math.max(0, item.likeCount - 1)
                                    : item.likeCount
                        )}
                    </Text>
                </TouchableOpacity>

                {/* Save */}
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={handleSave}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name={saved ? 'bookmark' : 'bookmark-outline'}
                        size={28}
                        color={saved ? '#FFD700' : '#fff'}
                    />
                    <Text style={styles.actionLabel}>Lưu</Text>
                </TouchableOpacity>

                {/* Share */}
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={handleShare}
                    activeOpacity={0.8}
                >
                    <Feather name="share-2" size={26} color="#fff" />
                    <Text style={styles.actionLabel}>Chia sẻ</Text>
                </TouchableOpacity>

                {/* Chi tiết */}
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={goToDetail}
                    activeOpacity={0.8}
                >
                    <Feather name="more-horizontal" size={26} color="#fff" />
                    <Text style={styles.actionLabel}>Chi tiết</Text>
                </TouchableOpacity>
            </View>

            {/* ════ BOTTOM INFO ════ */}
            <TouchableOpacity
                style={[styles.bottomInfo, { paddingBottom: insetBottom + 16 }]}
                onPress={goToDetail}
                activeOpacity={0.9}
            >
                {/* Owner row */}
                <TouchableOpacity
                    style={styles.ownerRow}
                    onPress={goToOwner}
                    activeOpacity={0.8}
                >
                    <Text style={styles.ownerName}>
                        @{item.ownerNameSnapshot ?? 'Chủ nhà'}
                    </Text>
                    <Text style={styles.dot}>·</Text>
                    <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
                </TouchableOpacity>

                {/* Listing type badge */}
                <View style={[
                    styles.listingBadge,
                    {
                        backgroundColor:
                            item.listingType === 'RENT' || item.listingType === 'FOR_RENT'
                                ? '#0066FF'
                                : '#FF6B35',
                    },
                ]}>
                    <Text style={styles.listingBadgeText}>
                        {item.listingType === 'RENT' || item.listingType === 'FOR_RENT'
                            ? 'Cho thuê'
                            : 'Bán'}
                    </Text>
                </View>

                {/* Title */}
                <Text style={styles.reelTitle} numberOfLines={2}>
                    {item.title}
                </Text>

                {/* Address */}
                <View style={styles.addressRow}>
                    <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.75)" />
                    <Text style={styles.addressText} numberOfLines={1}>
                        {item.address}
                    </Text>
                </View>

                {/* Price + Area */}
                <View style={styles.priceRow}>
                    <Text style={styles.priceText}>
                        💰 {formatPrice(item.price)}
                    </Text>
                    {item.area > 0 && (
                        <Text style={styles.areaText}>
                            📐 {item.area} m²
                        </Text>
                    )}
                </View>

                {/* CTA */}
                <TouchableOpacity
                    style={styles.ctaBtn}
                    onPress={goToDetail}
                    activeOpacity={0.85}
                >
                    <Text style={styles.ctaText}>Xem chi tiết</Text>
                    <Ionicons name="arrow-forward" size={13} color="#fff" />
                </TouchableOpacity>
            </TouchableOpacity>

        </View>
    );
});

// ════════════════════════════════════════════════════════════
// ReelsScreen — Main
// ════════════════════════════════════════════════════════════
export default function ReelsScreen() {
    const {
        reels, loading, refreshing,
        fetchReels, loadMore, refresh, setActiveIndex,
    } = useReelsStore();

    const insets = useSafeAreaInsets();
    const flatListRef = useRef<FlatList>(null);
    const [activeIdx, setActiveIdx] = useState(0);

    useEffect(() => {
        fetchReels();
    }, []);

    const onViewableItemsChanged = useCallback(
        ({ viewableItems }: { viewableItems: ViewToken[] }) => {
            const idx = viewableItems[0]?.index ?? 0;
            setActiveIdx(idx);
            setActiveIndex(idx);
        },
        [setActiveIndex]
    );

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 70,
    }).current;

    const renderItem = useCallback(
        ({ item, index }: { item: PropertyReel; index: number }) => (
            <ReelItem
                item={item}
                isActive={index === activeIdx}
                insetBottom={insets.bottom}
            />
        ),
        [activeIdx, insets.bottom]
    );

    const keyExtractor = useCallback(
        (item: PropertyReel) => item.id.toString(),
        []
    );

    const getItemLayout = useCallback(
        (_: any, index: number) => ({
            length: H,
            offset: H * index,
            index,
        }),
        []
    );

    if (loading && reels.length === 0) {
        return (
            <View style={styles.centered}>
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
                <ActivityIndicator size="large" color="#0066FF" />
                <Text style={styles.loadingText}>Đang tải Reels...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <FlatList
                ref={flatListRef}
                data={reels}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                getItemLayout={getItemLayout}
                pagingEnabled
                snapToInterval={H}
                snapToAlignment="start"
                decelerationRate={Platform.OS === 'ios' ? 'fast' : 0.98}
                showsVerticalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                onRefresh={refresh}
                refreshing={refreshing}
                removeClippedSubviews
                maxToRenderPerBatch={3}
                windowSize={5}
                initialNumToRender={2}
                ListFooterComponent={
                    loading && reels.length > 0 ? (
                        <View style={[styles.centered, { height: H }]}>
                            <ActivityIndicator color="#0066FF" size="large" />
                            <Text style={styles.loadingText}>Đang tải thêm...</Text>
                        </View>
                    ) : null
                }
                ListEmptyComponent={
                    <View style={[styles.centered, { height: H }]}>
                        <Text style={styles.emptyIcon}>🎬</Text>
                        <Text style={styles.emptyTitle}>Chưa có Reels nào</Text>
                        <Text style={styles.emptySubtitle}>
                            Hãy quay lại sau nhé!
                        </Text>
                        <TouchableOpacity
                            style={styles.retryBtn}
                            onPress={fetchReels}
                        >
                            <Text style={styles.retryText}>Thử lại</Text>
                        </TouchableOpacity>
                    </View>
                }
            />

            {/* Dot indicator dọc bên phải */}
            {reels.length > 1 && (
                <View style={[styles.dotIndicator, { top: H * 0.45 }]}>
                    {reels.slice(0, Math.min(reels.length, 8)).map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dotItem,
                                i === activeIdx && styles.dotItemActive,
                            ]}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}

// ════════════════════════════════════════════════════════════
// Styles
// ════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    centered: {
        flex: 1,
        width: W,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        marginTop: 8,
    },
    emptyIcon: { fontSize: 64 },
    emptyTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginTop: 8,
    },
    emptySubtitle: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
    },
    retryBtn: {
        marginTop: 12,
        paddingHorizontal: 28,
        paddingVertical: 12,
        backgroundColor: '#0066FF',
        borderRadius: 24,
    },
    retryText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },

    // ── Reel card ──
    reel: {
        width: W,
        backgroundColor: '#000',
        overflow: 'hidden',
    },
    noMediaBg: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#0d1b2a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    noMediaIcon: {
        fontSize: 80,
        opacity: 0.3,
    },

    // ── Gradient overlays ──
    gradientTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 160,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    gradientBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 360,
        backgroundColor: 'rgba(0,0,0,0.65)',
    },

    // ── Top bar ──
    topBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    topTitle: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    promotedBadge: {
        position: 'absolute',
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#FF6B35',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    promotedText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },

    // ── Right actions ──
    rightActions: {
        position: 'absolute',
        right: 12,
        alignItems: 'center',
        gap: 20,
    },
    avatarWrap: {
        alignItems: 'center',
        marginBottom: 4,
    },
    avatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        borderWidth: 2,
        borderColor: '#fff',
    },
    avatarFallback: {
        backgroundColor: '#0066FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
    },
    followDot: {
        position: 'absolute',
        bottom: -6,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#0066FF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    actionBtn: {
        alignItems: 'center',
        gap: 3,
    },
    actionLabel: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },

    // ── Bottom info ──
    bottomInfo: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 72,
        paddingHorizontal: 16,
        gap: 6,
    },
    ownerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    ownerName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    dot: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
    },
    timeText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
    },
    listingBadge: {
        alignSelf: 'flex-start',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 3,
        marginBottom: 2,
    },
    listingBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    reelTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        lineHeight: 22,
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    addressText: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 13,
        flex: 1,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    priceText: {
        color: '#FFD700',
        fontSize: 17,
        fontWeight: '800',
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    areaText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
        fontWeight: '600',
    },
    ctaBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        backgroundColor: '#0066FF',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 18,
        marginTop: 4,
    },
    ctaText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },

    // ── Dot indicator ──
    dotIndicator: {
        position: 'absolute',
        right: 6,
        alignItems: 'center',
        gap: 4,
    },
    dotItem: {
        width: 3,
        height: 16,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    dotItemActive: {
        backgroundColor: '#fff',
        height: 24,
    },
});