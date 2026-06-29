import React, {
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    ActivityIndicator,
    Animated,
    AppState,
    FlatList,
    Image,
    Platform,
    Share,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
    ViewToken,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as Haptics from 'expo-haptics';

import { useSafeRouter } from '../../hooks/useSafeRouter';
import { useReelsStore } from '../../store/reelsStore';
import { useInteractionStore } from '../../store/interactionStore';
import { PropertyReel } from '../../services/api/reels';

const ACCENT = '#7C3AED';
const ACCENT_2 = '#FF3B5C';
const GOLD = '#FBBF24';
const GLASS_BG = 'rgba(15,23,42,0.54)';
const TEXT_SHADOW = {
    textShadowColor: 'rgba(0,0,0,0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
} as const;

function formatPrice(price: number): string {
    if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)} tỷ`;
    if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(0)} tr`;
    return price.toLocaleString('vi-VN');
}

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const d = Math.floor(diff / 86_400_000);
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor(diff / 60_000);
    if (d > 0) return `${d} ngày`;
    if (h > 0) return `${h} giờ`;
    if (m > 0) return `${m} phút`;
    return 'Vừa đăng';
}

function formatCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
}

const isRentListing = (type: PropertyReel['listingType']) => (
    type === 'FOR_RENT' || type === 'RENT'
);

interface VideoLayerProps {
    uri: string;
    isActive: boolean;
    isMuted: boolean;
    shouldTogglePlay: boolean;
    onToggleHandled: () => void;
    onProgress: (progress: number) => void;
    onPlayingChange: (playing: boolean) => void;
}

const VideoLayer = memo(({
    uri,
    isActive,
    isMuted,
    shouldTogglePlay,
    onToggleHandled,
    onProgress,
    onPlayingChange,
}: VideoLayerProps) => {
    const releasedRef = useRef(false);
    const lastProgressAtRef = useRef(0);

    const player = useVideoPlayer(uri, p => {
        p.loop = true;
        p.playbackRate = 1;
        p.muted = true;
        try { (p as any).volume = 0; } catch (_) { }
    });

    const safeCall = useCallback((fn: () => void) => {
        if (releasedRef.current) return;
        try { fn(); } catch (e) {
            if (__DEV__) console.warn('[Reels] video safe call failed:', e);
        }
    }, []);

    useEffect(() => {
        safeCall(() => {
            if (isActive) {
                player.muted = isMuted;
                try { (player as any).volume = isMuted ? 0 : 1; } catch (_) { }
                player.play();
            } else {
                player.muted = true;
                try { (player as any).volume = 0; } catch (_) { }
                player.pause();
                try {
                    if (player.duration > 0 && player.currentTime > 0) {
                        player.seekBy(-player.currentTime);
                    }
                } catch (_) { }
            }
        });
    }, [isActive, isMuted, player, safeCall]);

    useEffect(() => {
        if (!isActive) return;
        safeCall(() => {
            player.muted = isMuted;
            try { (player as any).volume = isMuted ? 0 : 1; } catch (_) { }
        });
    }, [isActive, isMuted, player, safeCall]);

    useEffect(() => {
        if (!shouldTogglePlay) return;
        safeCall(() => {
            if (player.playing) {
                player.muted = true;
                player.pause();
            } else {
                player.muted = isMuted;
                try { (player as any).volume = isMuted ? 0 : 1; } catch (_) { }
                player.play();
            }
        });
        onToggleHandled();
    }, [isMuted, onToggleHandled, player, safeCall, shouldTogglePlay]);

    useEffect(() => {
        let sub: any;
        try {
            sub = player.addListener('timeUpdate', ({ currentTime }) => {
                if (releasedRef.current || !isActive) return;

                const now = Date.now();
                onPlayingChange(player.playing);
                if (player.duration > 0 && now - lastProgressAtRef.current > 220) {
                    lastProgressAtRef.current = now;
                    onProgress(Math.max(0, Math.min(1, currentTime / player.duration)));
                }
            });
        } catch (_) { }

        return () => { try { sub?.remove(); } catch (_) { } };
    }, [isActive, onPlayingChange, onProgress, player]);

    useEffect(() => () => {
        releasedRef.current = true;
        try { player.muted = true; } catch (_) { }
        try { player.pause(); } catch (_) { }
        try { player.release(); } catch (_) { }
    }, [player]);

    return (
        <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
            fullscreenOptions={{ enable: false }}
        />
    );
});

interface ReelItemProps {
    item: PropertyReel;
    index: number;
    activeIndex: number;
    isActive: boolean;
    isExpanded: boolean;
    itemHeight: number;
    itemWidth: number;
    insetTop: number;
    insetBottom: number;
    isMuted: boolean;
    onMuteChange: (muted: boolean) => void;
    onToggleExpanded: () => void;
}

const ReelItem = memo(({
    item,
    index,
    activeIndex,
    isActive,
    isExpanded,
    itemHeight,
    itemWidth,
    insetTop,
    insetBottom,
    isMuted,
    onMuteChange,
    onToggleExpanded,
}: ReelItemProps) => {
    const { safePush } = useSafeRouter();
    const { toggleLike, toggleSave, isLiked, isSaved } = useInteractionStore();

    const [progress, setProgress] = useState(0);
    const [toggleSignal, setToggleSignal] = useState(false);
    const [showHeart, setShowHeart] = useState(false);
    const tapRef = useRef(0);
    const heartScale = useRef(new Animated.Value(0)).current;

    const liked = isLiked(item.id);
    const saved = isSaved(item.id);
    const distanceFromActive = Math.abs(index - activeIndex);
    const shouldMountVideo = !!item.videoUrl && distanceFromActive <= 2;

    const listingLabel = isRentListing(item.listingType) ? 'Cho thuê' : 'Bán';
    const displayLikeCount = liked && !item.liked
        ? item.likeCount + 1
        : !liked && item.liked
            ? Math.max(0, item.likeCount - 1)
            : item.likeCount;

    const animateHeart = useCallback(() => {
        setShowHeart(true);
        heartScale.setValue(0);
        Animated.sequence([
            Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, friction: 5 }),
            Animated.delay(260),
            Animated.timing(heartScale, { toValue: 0, duration: 180, useNativeDriver: true }),
        ]).start(() => setShowHeart(false));
    }, [heartScale]);

    const handleLike = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (!liked) animateHeart();
        await toggleLike(item.id);
    }, [animateHeart, item.id, liked, toggleLike]);

    const handleSave = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await toggleSave(item.id);
    }, [item.id, toggleSave]);

    const handleTapVideo = useCallback(() => {
        const now = Date.now();
        if (now - tapRef.current < 280) {
            tapRef.current = 0;
            if (!liked) {
                animateHeart();
                toggleLike(item.id);
            }
            return;
        }

        tapRef.current = now;
        setTimeout(() => {
            if (Date.now() - tapRef.current >= 260) {
                setToggleSignal(true);
                tapRef.current = 0;
            }
        }, 270);
    }, [animateHeart, item.id, liked, toggleLike]);

    const handleMute = useCallback(() => {
        Haptics.selectionAsync();
        onMuteChange(!isMuted);
    }, [isMuted, onMuteChange]);

    const handleShare = useCallback(async () => {
        try {
            Haptics.selectionAsync();
            await Share.share({
                title: item.title,
                message: `${item.title}\nGiá: ${formatPrice(item.price)}\nĐịa chỉ: ${item.address}`,
            });
        } catch (_) { }
    }, [item]);

    const goToDetail = useCallback(() => {
        safePush(`/property/${item.id}` as any);
    }, [item.id, safePush]);

    const goToOwner = useCallback(() => {
        if (!item.ownerSlug) return;
        safePush(`/landlord-profile?slug=${item.ownerSlug}` as any);
    }, [item.ownerSlug, safePush]);

    const handleProgress = useCallback((value: number) => {
        setProgress(value);
    }, []);

    const handlePlayingChange = useCallback((_playing: boolean) => {}, []);

    useEffect(() => {
        if (!isActive) {
            setProgress(0);
        }
    }, [isActive]);

    return (
        <View style={[styles.reel, { height: itemHeight, width: itemWidth }]}>
            {shouldMountVideo ? (
                <VideoLayer
                    uri={item.videoUrl!}
                    isActive={isActive}
                    isMuted={isMuted}
                    shouldTogglePlay={toggleSignal}
                    onToggleHandled={() => setToggleSignal(false)}
                    onProgress={handleProgress}
                    onPlayingChange={handlePlayingChange}
                />
            ) : item.thumbnailUrl ? (
                <Image source={{ uri: item.thumbnailUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
                <View style={styles.noMediaBg}>
                    <MaterialCommunityIcons name="home-city-outline" size={74} color="rgba(255,255,255,0.2)" />
                </View>
            )}

            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleTapVideo} />

            <LinearGradient
                colors={['rgba(0,0,0,0.55)', 'transparent']}
                style={styles.gradientTop}
                pointerEvents="none"
            />
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.38)']}
                style={styles.gradientBottom}
                pointerEvents="none"
            />

            {showHeart && (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.centerHeart,
                        {
                            opacity: heartScale,
                            transform: [{ scale: heartScale.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.4, 1.15],
                            }) }],
                        },
                    ]}
                >
                    <Ionicons name="heart" size={104} color="white" />
                </Animated.View>
            )}

            <View style={[styles.topBar, { top: insetTop + 8 }]} pointerEvents="box-none">
                <View style={styles.topTitleCard} pointerEvents="none">
                    <Text style={styles.topTitle}>Reels</Text>
                </View>
                <View style={styles.topRight} pointerEvents="auto">
                    {!!item.videoUrl && (
                        <TouchableOpacity onPress={handleMute} style={styles.topIconButton} activeOpacity={0.85}>
                            <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={18} color="white" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {!!item.videoUrl && (
                <View style={[styles.progressWrap, { top: insetTop + 54 }]} pointerEvents="none">
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                    </View>
                </View>
            )}

            <View style={[styles.rightActions, { bottom: insetBottom + (isExpanded ? 238 : 132) }]}>
                <TouchableOpacity style={styles.avatarWrap} onPress={goToOwner} activeOpacity={0.85}>
                    {item.ownerAvatarSnapshot ? (
                        <Image source={{ uri: item.ownerAvatarSnapshot }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarFallback]}>
                            <Text style={styles.avatarInitial}>
                                {(item.ownerNameSnapshot ?? '?')[0].toUpperCase()}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>

                <ActionButton
                    icon={liked ? 'heart' : 'heart-outline'}
                    label="Thích"
                    count={formatCount(displayLikeCount)}
                    active={liked}
                    activeColor={ACCENT_2}
                    onPress={handleLike}
                />
                <ActionButton
                    icon={saved ? 'bookmark' : 'bookmark-outline'}
                    label="Lưu"
                    active={saved}
                    activeColor={GOLD}
                    onPress={handleSave}
                />
                <ActionButton
                    featherIcon="share-2"
                    label="Chia sẻ"
                    onPress={handleShare}
                />
                <ActionButton
                    featherIcon="more-horizontal"
                    label="Chi tiết"
                    onPress={goToDetail}
                />
            </View>

            <View style={[styles.bottomInfoWrap, { paddingBottom: insetBottom + 18 }]} pointerEvents="box-none">
                <View style={[styles.propertyPanel, isExpanded && [styles.propertyPanelExpanded, { maxHeight: itemHeight * 0.35 }]]}>
                    <View style={styles.badgeRow}>
                        <View style={[styles.infoBadge, isRentListing(item.listingType) ? styles.rentBadge : styles.saleBadge]}>
                            <Text style={styles.infoBadgeText}>{listingLabel}</Text>
                        </View>
                        {item.isPromoted && (
                            <View style={styles.promotedBadge}>
                                <Ionicons name="flash" size={11} color={GOLD} />
                                <Text style={styles.promotedText}>Nổi bật</Text>
                            </View>
                        )}
                    </View>

                    <Text style={styles.priceText}>{formatPrice(item.price)}</Text>

                    <TouchableOpacity activeOpacity={0.86} onPress={onToggleExpanded}>
                        <Text style={styles.reelTitle} numberOfLines={isExpanded ? 3 : 2}>
                            {item.title}
                            {!isExpanded && <Text style={styles.readMoreText}>  Xem thêm</Text>}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.addressRow}>
                        <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.76)" />
                        <Text style={styles.addressText} numberOfLines={1}>{item.address}</Text>
                    </View>

                    {isExpanded ? (
                        <>
                            <TouchableOpacity style={styles.ownerRow} onPress={goToOwner} activeOpacity={0.82}>
                                <Text style={styles.ownerName} numberOfLines={1}>{item.ownerNameSnapshot ?? 'Chủ nhà'}</Text>
                                <Text style={styles.dot}>·</Text>
                                <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
                            </TouchableOpacity>

                            <View style={styles.featureRow}>
                                {item.area > 0 && (
                                    <View style={styles.featureChip}>
                                        <Ionicons name="resize-outline" size={13} color="white" />
                                        <Text style={styles.featureText}>{item.area} m²</Text>
                                    </View>
                                )}
                                <View style={styles.featureChip}>
                                    <MaterialCommunityIcons name="home-city-outline" size={13} color="white" />
                                    <Text style={styles.featureText}>{listingLabel}</Text>
                                </View>
                            </View>

                            <View style={styles.expandedActions}>
                                <TouchableOpacity style={styles.ctaBtn} onPress={goToDetail} activeOpacity={0.86}>
                                    <MaterialCommunityIcons name="home-search-outline" size={15} color="white" />
                                    <Text style={styles.ctaText}>Xem chi tiết</Text>
                                    <Ionicons name="arrow-forward" size={14} color="white" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.collapseBtn} onPress={onToggleExpanded} activeOpacity={0.82}>
                                    <Text style={styles.collapseText}>Thu gọn</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <TouchableOpacity style={styles.compactDetailLink} onPress={goToDetail} activeOpacity={0.82}>
                            <Text style={styles.compactDetailText}>Xem chi tiết</Text>
                            <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.86)" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
});

interface ActionButtonProps {
    icon?: React.ComponentProps<typeof Ionicons>['name'];
    featherIcon?: React.ComponentProps<typeof Feather>['name'];
    label: string;
    count?: string;
    active?: boolean;
    activeColor?: string;
    onPress: () => void;
}

const ActionButton = memo(({
    icon,
    featherIcon,
    label,
    count,
    active,
    activeColor = ACCENT,
    onPress,
}: ActionButtonProps) => {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePress = useCallback(() => {
        Animated.sequence([
            Animated.timing(scale, { toValue: 0.88, duration: 70, useNativeDriver: true }),
            Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }),
        ]).start();
        onPress();
    }, [onPress, scale]);

    return (
        <TouchableOpacity style={styles.actionItem} onPress={handlePress} activeOpacity={0.86}>
            <Animated.View style={[styles.actionCircle, { transform: [{ scale }] }]}>
                {featherIcon ? (
                    <Feather name={featherIcon} size={23} color="white" />
                ) : (
                    <Ionicons name={icon!} size={25} color={active ? activeColor : 'white'} />
                )}
            </Animated.View>
            {count ? <Text style={styles.actionCount}>{count}</Text> : null}
            <Text style={styles.actionLabel}>{label}</Text>
        </TouchableOpacity>
    );
});

export default function ReelsScreen() {
    const {
        reels,
        loading,
        refreshing,
        error,
        fetchReels,
        loadMore,
        refresh,
        setActiveIndex,
    } = useReelsStore();
    const { height, width } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const isFocused = useIsFocused();

    const [isMuted, setIsMuted] = useState(false);
    const [activeIdx, setActiveIdx] = useState(0);
    const [expandedReelId, setExpandedReelId] = useState<number | null>(null);
    const [appActive, setAppActive] = useState(true);
    const flatListRef = useRef<FlatList<PropertyReel>>(null);

    const itemHeight = height;
    const itemWidth = width;

    useEffect(() => {
        const sub = AppState.addEventListener('change', state => {
            setAppActive(state === 'active');
        });

        return () => sub.remove();
    }, []);

    useEffect(() => {
        fetchReels();
    }, [fetchReels]);

    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 72 }).current;
    const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        const nextIndex = viewableItems[0]?.index ?? 0;
        setActiveIdx(nextIndex);
        setActiveIndex(nextIndex);
        setExpandedReelId(null);
    }, [setActiveIndex]);

    const handleMuteChange = useCallback((value: boolean) => {
        setIsMuted(value);
    }, []);

    const handleToggleExpanded = useCallback((id: number) => {
        setExpandedReelId(current => current === id ? null : id);
    }, []);

    const renderItem = useCallback(({ item, index }: { item: PropertyReel; index: number }) => (
        <ReelItem
            item={item}
            index={index}
            activeIndex={activeIdx}
            isActive={isFocused && appActive && index === activeIdx}
            isExpanded={expandedReelId === item.id}
            itemHeight={itemHeight}
            itemWidth={itemWidth}
            insetBottom={insets.bottom}
            insetTop={insets.top}
            isMuted={isMuted}
            onMuteChange={handleMuteChange}
            onToggleExpanded={() => handleToggleExpanded(item.id)}
        />
    ), [
        activeIdx,
        appActive,
        expandedReelId,
        handleMuteChange,
        handleToggleExpanded,
        insets.bottom,
        insets.top,
        isFocused,
        isMuted,
        itemHeight,
        itemWidth,
    ]);

    const keyExtractor = useCallback((item: PropertyReel) => item.id.toString(), []);
    const getItemLayout = useCallback(
        (_: ArrayLike<PropertyReel> | null | undefined, index: number) => ({
            length: itemHeight,
            offset: itemHeight * index,
            index,
        }),
        [itemHeight],
    );

    const dots = useMemo(() => reels.slice(0, Math.min(reels.length, 8)), [reels]);

    if (loading && reels.length === 0) {
        return (
            <View style={[styles.centered, { width: itemWidth }]}>
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
                <View style={styles.loadingOrb}>
                    <ActivityIndicator size="large" color="white" />
                </View>
                <Text style={styles.loadingText}>Đang tải video bất động sản...</Text>
            </View>
        );
    }

    if (error && reels.length === 0) {
        return (
            <View style={[styles.centered, { width: itemWidth, paddingHorizontal: 28 }]}>
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
                <Ionicons name="cloud-offline-outline" size={54} color="rgba(255,255,255,0.72)" />
                <Text style={styles.emptyTitle}>Không tải được Reels</Text>
                <Text style={styles.emptySubtitle}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={fetchReels}>
                    <Text style={styles.retryText}>Tải lại</Text>
                </TouchableOpacity>
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
                snapToInterval={itemHeight}
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
                updateCellsBatchingPeriod={80}
                ListFooterComponent={
                    loading && reels.length > 0 ? (
                        <View style={[styles.centered, { height: itemHeight, width: itemWidth }]}>
                            <ActivityIndicator color={ACCENT} size="large" />
                            <Text style={styles.loadingText}>Đang tải thêm...</Text>
                        </View>
                    ) : null
                }
                ListEmptyComponent={
                    <View style={[styles.centered, { height: itemHeight, width: itemWidth, paddingHorizontal: 28 }]}>
                        <MaterialCommunityIcons name="movie-open-outline" size={58} color="rgba(255,255,255,0.72)" />
                        <Text style={styles.emptyTitle}>Chưa có Reels nào</Text>
                        <Text style={styles.emptySubtitle}>Các video bất động sản mới sẽ xuất hiện tại đây</Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={fetchReels}>
                            <Text style={styles.retryText}>Tải lại</Text>
                        </TouchableOpacity>
                    </View>
                }
            />

            {dots.length > 1 && (
                <View style={[styles.dotIndicator, { top: itemHeight * 0.44 }]}>
                    {dots.map((_, i) => (
                        <View
                            key={i}
                            style={[styles.dotItem, i === activeIdx && styles.dotItemActive]}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    centered: {
        flex: 1,
        backgroundColor: '#020617',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingOrb: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: GLASS_BG,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.16)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: { color: 'rgba(255,255,255,0.72)', fontSize: 14, marginTop: 8, fontWeight: '700' },
    emptyTitle: { color: '#fff', fontSize: 19, fontWeight: '800', marginTop: 8, textAlign: 'center' },
    emptySubtitle: { color: 'rgba(255,255,255,0.58)', fontSize: 14, textAlign: 'center', lineHeight: 20 },
    retryBtn: {
        marginTop: 12,
        paddingHorizontal: 28,
        paddingVertical: 12,
        backgroundColor: ACCENT,
        borderRadius: 24,
    },
    retryText: { color: '#fff', fontWeight: '800', fontSize: 14 },

    reel: { backgroundColor: '#000', overflow: 'hidden' },
    noMediaBg: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#0F172A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    gradientTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 168,
    },
    gradientBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 260,
    },
    centerHeart: {
        position: 'absolute',
        alignSelf: 'center',
        top: '42%',
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 18,
    },

    topBar: {
        position: 'absolute',
        left: 14,
        right: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    topTitleCard: {
        paddingHorizontal: 2,
        paddingVertical: 4,
    },
    topTitle: {
        color: '#fff',
        fontSize: 21,
        fontWeight: '900',
        letterSpacing: 0,
        textShadowColor: 'rgba(0,0,0,0.72)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6,
    },
    topRight: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    topIconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.32)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    progressWrap: { position: 'absolute', left: 16, right: 16 },
    progressTrack: {
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: 'white', borderRadius: 2 },

    rightActions: {
        position: 'absolute',
        right: 12,
        alignItems: 'center',
        gap: 12,
    },
    avatarWrap: { alignItems: 'center', marginBottom: 2 },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#fff',
    },
    avatarFallback: { backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },
    avatarInitial: { color: '#fff', fontSize: 18, fontWeight: '900' },
    actionItem: { alignItems: 'center', gap: 3 },
    actionCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.34)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.13)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionCount: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '800',
        textShadowColor: 'rgba(0,0,0,0.55)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    actionLabel: {
        color: 'rgba(255,255,255,0.82)',
        fontSize: 10,
        fontWeight: '700',
        textShadowColor: 'rgba(0,0,0,0.55)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },

    bottomInfoWrap: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 74,
        paddingHorizontal: 14,
    },
    propertyPanel: {
        backgroundColor: 'transparent',
        paddingHorizontal: 2,
        paddingVertical: 4,
        gap: 5,
    },
    propertyPanelExpanded: {
        backgroundColor: 'transparent',
        paddingVertical: 8,
        gap: 8,
    },
    ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    ownerName: { color: '#fff', fontSize: 13, fontWeight: '800', maxWidth: 180, ...TEXT_SHADOW },
    dot: { color: 'rgba(255,255,255,0.7)', fontSize: 13, ...TEXT_SHADOW },
    timeText: { color: 'rgba(255,255,255,0.78)', fontSize: 12, fontWeight: '700', ...TEXT_SHADOW },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoBadge: {
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    rentBadge: { backgroundColor: 'rgba(0,102,255,0.9)' },
    saleBadge: { backgroundColor: 'rgba(249,115,22,0.92)' },
    infoBadgeText: { color: 'white', fontSize: 11, fontWeight: '900' },
    promotedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(251,191,36,0.16)',
        borderRadius: 11,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    promotedText: { color: GOLD, fontSize: 11, fontWeight: '900' },
    priceText: {
        color: GOLD,
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: 0,
        ...TEXT_SHADOW,
    },
    reelTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800',
        lineHeight: 19,
        ...TEXT_SHADOW,
    },
    readMoreText: { color: '#DDD6FE', fontSize: 13, fontWeight: '900', ...TEXT_SHADOW },
    addressRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    addressText: { color: 'rgba(255,255,255,0.84)', fontSize: 12, flex: 1, fontWeight: '700', ...TEXT_SHADOW },
    featureRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    featureChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(0,0,0,0.25)',
        borderRadius: 11,
        paddingHorizontal: 9,
        paddingVertical: 6,
    },
    featureText: { color: 'white', fontSize: 11, fontWeight: '800' },
    expandedActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
    ctaBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        alignSelf: 'flex-start',
        backgroundColor: ACCENT,
        borderRadius: 16,
        paddingVertical: 9,
        paddingHorizontal: 14,
    },
    ctaText: { color: '#fff', fontSize: 12, fontWeight: '900' },
    collapseBtn: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 14,
        backgroundColor: 'rgba(0,0,0,0.25)',
    },
    collapseText: { color: 'rgba(255,255,255,0.94)', fontSize: 12, fontWeight: '900', ...TEXT_SHADOW },
    compactDetailLink: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 2,
        marginTop: 1,
    },
    compactDetailText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '900', ...TEXT_SHADOW },

    dotIndicator: { position: 'absolute', right: 5, alignItems: 'center', gap: 4 },
    dotItem: {
        width: 3,
        height: 14,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    dotItemActive: { backgroundColor: ACCENT, height: 22 },
});
