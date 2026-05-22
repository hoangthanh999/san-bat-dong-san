import React, {
    useEffect, useRef, useCallback, useState,
} from 'react';
import {
    View, Text, FlatList, Dimensions, TouchableOpacity,
    StyleSheet, StatusBar, ActivityIndicator, Image,
    ViewToken, Share, Platform,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { AppState } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';   // ✅ expo-video 3.x
import { useReelsStore } from '../../store/reelsStore';
import { useInteractionStore } from '../../store/interactionStore';
import { PropertyReel } from '../../services/api/reels';

const { width: W, height: H } = Dimensions.get('window');

const ACCENT = '#E040FB';
const ACCENT2 = '#FF3B5C';

// ─── Helpers ─────────────────────────────────────────────
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

// ════════════════════════════════════════════════════════════
// VideoReelItem — tách riêng để useVideoPlayer gọi đúng rules of hooks
// ════════════════════════════════════════════════════════════
interface VideoReelProps {
    uri: string;
    isActive: boolean;
    onProgress: (progress: number) => void;
    onPlayingChange: (playing: boolean) => void;
    isMuted: boolean;           // ← prop cũ, không còn dùng
    shouldTogglePlay: boolean;
    onToggleHandled: () => void;
}
const VideoReel = React.memo(({
    uri, isActive, onProgress, onPlayingChange, isMutedRef, shouldTogglePlay, onToggleHandled,
}: {
    uri: string;
    isActive: boolean;
    onProgress: (progress: number) => void;
    onPlayingChange: (playing: boolean) => void;
    isMutedRef: React.MutableRefObject<boolean>;
    shouldTogglePlay: boolean;
    onToggleHandled: () => void;
}) => {
    const isReleasedRef = useRef(false);

    const player = useVideoPlayer(uri, p => {
        p.loop = true;
        p.playbackRate = 1;
        p.muted = true; // ← luôn bắt đầu muted, tránh flash audio
    });

    const safeCall = useCallback((fn: () => void) => {
        if (isReleasedRef.current) return;
        try { fn(); } catch (e) {
            console.warn('[VideoReel] safe call error:', e);
        }
    }, []);

    // ✅ Effect duy nhất quản lý play/pause — không conflict
    useEffect(() => {
        if (isActive) {
            safeCall(() => {
                player.muted = isMutedRef.current;
                player.play();
            });
        } else {
            safeCall(() => {
                player.muted = true;
                player.pause();
                try {
                    if (player.duration > 0 && player.currentTime > 0) {
                        player.seekBy(-player.currentTime);
                    }
                } catch (_) { }
            });
        }
    }, [isActive, player, safeCall]);
    // ⚠️ isMutedRef KHÔNG vào deps — đọc .current trực tiếp, không trigger re-render

    // ✅ Effect mute riêng — chỉ chạy khi user nhấn mute button (signal từ ngoài)
    // isMutedRef.current đã được update trước khi effect này chạy
    // Dùng một signal boolean để trigger, không dùng isMuted state
    useEffect(() => {
        if (!isActive) return; // inactive thì luôn muted, không cần làm gì
        safeCall(() => { player.muted = isMutedRef.current; });
    }, [isActive, player, safeCall]);
    // ^ Effect này sẽ được trigger bởi forceUpdate từ ngoài — xem giải thích bên dưới

    // ✅ Toggle play/pause khi tap
    useEffect(() => {
        if (!shouldTogglePlay) return;
        safeCall(() => {
            if (player.playing) {
                player.muted = true;
                player.pause();
            } else {
                player.muted = isMutedRef.current;
                player.play();
            }
        });
        onToggleHandled();
    }, [shouldTogglePlay, player, safeCall, onToggleHandled]);

    // ✅ Progress listener
    useEffect(() => {
        if (isReleasedRef.current) return;
        let sub: any;
        try {
            sub = player.addListener('timeUpdate', ({ currentTime }) => {
                if (isReleasedRef.current) return;
                onPlayingChange(player.playing);
                const dur = player.duration;
                if (dur && dur > 0) onProgress(currentTime / dur);
            });
        } catch (_) { }
        return () => { try { sub?.remove(); } catch (_) { } };
    }, [player]);

    // ✅ Cleanup
    useEffect(() => {
        return () => {
            isReleasedRef.current = true;
            try { player.muted = true; } catch (_) { }
            try { player.pause(); } catch (_) { }
            try { player.release(); } catch (_) { }
        };
    }, [player]);

    return (
        <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
            allowsFullscreen={false}
        />
    );
});


// ════════════════════════════════════════════════════════════
// ReelItem
// ════════════════════════════════════════════════════════════
interface ReelItemProps {
    item: PropertyReel;
    isActive: boolean;
    insetBottom: number;
    insetTop: number;
    isMutedRef: React.MutableRefObject<boolean>;
    mutedDisplay: boolean;         // ← chỉ dùng để render icon
    onMuteChange: (v: boolean) => void;
}

const ReelItem = React.memo(({
    item, isActive, insetBottom, insetTop, isMutedRef, mutedDisplay, onMuteChange,
}: ReelItemProps) => {
    const router = useRouter();
    const { toggleLike, toggleSave, isLiked, isSaved } = useInteractionStore();

    const [progress, setProgress] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [toggleSignal, setToggleSignal] = useState(false);

    const liked = isLiked(item.id);
    const saved = isSaved(item.id);

    const handleLike = useCallback(() => toggleLike(item.id), [item.id]);
    const handleSave = useCallback(() => toggleSave(item.id), [item.id]);

    // ✅ toggleMute: đọc ref hiện tại, không cần isMuted state trong closure
    const toggleMute = useCallback(() => {
        onMuteChange(!isMutedRef.current);
    }, [isMutedRef, onMuteChange]);

    const togglePlay = useCallback(() => setToggleSignal(true), []);

    const handleShare = useCallback(async () => {
        try {
            await Share.share({
                message: `🏠 ${item.title}\n💰 ${formatPrice(item.price)}\n📍 ${item.address}`,
                title: item.title,
            });
        } catch (_) { }
    }, [item]);
    const goToDetail = useCallback(() => router.push(`/property/${item.id}` as any), [item.id]);
    const goToOwner = useCallback(() => router.push(`/landlord-profile?slug=${item.ownerSlug}` as any), [item.ownerSlug]);

    const displayLikeCount = liked && !item.liked
        ? item.likeCount + 1
        : !liked && item.liked
            ? Math.max(0, item.likeCount - 1)
            : item.likeCount;

    return (
        <View style={[styles.reel, { height: H }]}>
            {item.videoUrl ? (
                <VideoReel
                    uri={item.videoUrl}
                    isActive={isActive}
                    onProgress={setProgress}
                    onPlayingChange={setIsPlaying}
                    isMutedRef={isMutedRef}       // ← ref, không gây re-render
                    shouldTogglePlay={toggleSignal}
                    onToggleHandled={() => setToggleSignal(false)}
                />
            ) : item.thumbnailUrl ? (
                <Image source={{ uri: item.thumbnailUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
                <View style={styles.noMediaBg}>
                    <Text style={styles.noMediaIcon}>🏠</Text>
                </View>
            )}

            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={togglePlay} activeOpacity={1} />
         <LinearGradient
    colors={['rgba(0,0,0,0.5)', 'transparent']}
    style={styles.gradientTop}
    pointerEvents="none"
/>
<LinearGradient
    colors={['transparent', 'rgba(0,0,0,0.75)']}
    style={styles.gradientBottom}
    pointerEvents="none"
/>

            <View style={[styles.topBar, { top: insetTop + 8 }]} pointerEvents="box-none">
                <View style={styles.topLeft}>
                    <MaterialCommunityIcons name="play-circle" size={18} color={ACCENT} />
                    <Text style={styles.topTitle}>Reels BĐS</Text>
                </View>
                <View style={[styles.listingBadgeTop, {
                    backgroundColor: item.listingType === 'FOR_RENT' || item.listingType === 'RENT'
                        ? 'rgba(0,102,255,0.85)' : 'rgba(255,107,53,0.85)',
                }]}>
                    <Text style={styles.listingBadgeTopText}>
                        {item.listingType === 'FOR_RENT' || item.listingType === 'RENT' ? '🔑 Cho thuê' : '🏷️ Bán'}
                    </Text>
                </View>
                <View style={styles.topRight} pointerEvents="auto">
                    {item.videoUrl && (
                        <TouchableOpacity onPress={toggleMute} style={styles.muteBtn}>
                            <Ionicons
                                name={mutedDisplay ? 'volume-mute' : 'volume-high'} // ← dùng mutedDisplay
                                size={16} color="#fff"
                            />
                        </TouchableOpacity>
                    )}
                    {item.isPromoted && (
                        <View style={styles.promotedBadge}>
                            <Ionicons name="flash" size={11} color="#fff" />
                            <Text style={styles.promotedText}>Nổi bật</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* ════ PROGRESS BAR ════ */}
         {item.videoUrl && (
                <View style={[styles.progressWrap, { top: insetTop + 48 }]} pointerEvents="none">
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                    </View>
                </View>
            )}

            {/* ════ RIGHT ACTIONS ════ */}
            <View style={[styles.rightActions, { bottom: insetBottom + 120 }]}>

                {/* Avatar */}
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
                    <View style={styles.followDot}>
                        <Ionicons name="add" size={10} color="#fff" />
                    </View>
                </TouchableOpacity>

                {/* Like */}
                <TouchableOpacity style={styles.actionBtn} onPress={handleLike} activeOpacity={0.8}>
                    <Ionicons
                        name={liked ? 'heart' : 'heart-outline'}
                        size={32}
                        color={liked ? ACCENT2 : '#fff'}
                    />
                    <Text style={styles.actionCount}>{formatCount(displayLikeCount)}</Text>
                    <Text style={styles.actionLabel}>Thích</Text>
                </TouchableOpacity>

                {/* Save */}
                <TouchableOpacity style={styles.actionBtn} onPress={handleSave} activeOpacity={0.8}>
                    <Ionicons
                        name={saved ? 'bookmark' : 'bookmark-outline'}
                        size={30}
                        color={saved ? '#FFD700' : '#fff'}
                    />
                    <Text style={styles.actionLabel}>Lưu</Text>
                </TouchableOpacity>

                {/* Share */}
                <TouchableOpacity style={styles.actionBtn} onPress={handleShare} activeOpacity={0.8}>
                    <Feather name="share-2" size={26} color="#fff" />
                    <Text style={styles.actionLabel}>Chia sẻ</Text>
                </TouchableOpacity>

                {/* Chi tiết */}
                <TouchableOpacity style={styles.actionBtn} onPress={goToDetail} activeOpacity={0.8}>
                    <Feather name="more-horizontal" size={26} color="#fff" />
                    <Text style={styles.actionLabel}>Chi tiết</Text>
                </TouchableOpacity>
            </View>

            {/* ════ BOTTOM INFO ════ */}
            <View style={[styles.bottomInfo, { paddingBottom: insetBottom + 20 }]} pointerEvents="box-none">

                <TouchableOpacity style={styles.ownerRow} onPress={goToOwner} activeOpacity={0.8}>
                    <Text style={styles.ownerName}>@{item.ownerNameSnapshot ?? 'Chủ nhà'}</Text>
                    <Text style={styles.dot}>·</Text>
                    <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
                </TouchableOpacity>

                <Text style={styles.reelTitle} numberOfLines={2}>{item.title}</Text>

                <View style={styles.addressRow}>
                    <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.75)" />
                    <Text style={styles.addressText} numberOfLines={1}>{item.address}</Text>
                </View>

                <View style={styles.priceRow}>
                    <Text style={styles.priceText}>💰 {formatPrice(item.price)}</Text>
                    {item.area > 0 && (
                        <Text style={styles.areaText}>📐 {item.area} m²</Text>
                    )}
                </View>

                <TouchableOpacity style={styles.ctaBtn} onPress={goToDetail} activeOpacity={0.85}>
                    <MaterialCommunityIcons name="home-search" size={14} color="#fff" />
                    <Text style={styles.ctaText}>Xem chi tiết</Text>
                    <Ionicons name="arrow-forward" size={13} color="#fff" />
                </TouchableOpacity>
            </View>

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
const isMutedRef = useRef(false);
const [mutedDisplay, setMutedDisplay] = useState(false);
const [activeIdx, setActiveIdx] = useState(0);
const [appActive, setAppActive] = useState(true);

useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
        setAppActive(state === 'active');
    });

    return () => sub.remove();
}, []);

    useEffect(() => { fetchReels(); }, []);

    const onViewableItemsChanged = useCallback(
        ({ viewableItems }: { viewableItems: ViewToken[] }) => {
            const idx = viewableItems[0]?.index ?? 0;
            setActiveIdx(idx);
            setActiveIndex(idx);
        },
        [setActiveIndex],
    );

    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 70 }).current;
    const handleMuteChange = useCallback((value: boolean) => {
        isMutedRef.current = value;
        setMutedDisplay(value);
    }, []);
    const isFocused = useIsFocused();

  const renderItem = useCallback(
        ({ item, index }: { item: PropertyReel; index: number }) => (
        <ReelItem
    item={item}
  isActive={isFocused && appActive && index === activeIdx}
                insetBottom={insets.bottom}
                insetTop={insets.top}
                isMutedRef={isMutedRef}        // ← ref ổn định, không re-render
                mutedDisplay={mutedDisplay}    // ← state, nhưng chỉ active item dùng icon này
                onMuteChange={handleMuteChange}
            />
        ),
       [
  activeIdx,
  appActive,
  isFocused,
  handleMuteChange,
  insets.bottom,
  insets.top,
  mutedDisplay
]
        // mutedDisplay vẫn trong deps nhưng chỉ icon re-render, không có VideoReel re-render
    );
    const keyExtractor = useCallback((item: PropertyReel) => item.id.toString(), []);
    const getItemLayout = useCallback(
        (_: any, index: number) => ({ length: H, offset: H * index, index }),
        [],
    );

    if (loading && reels.length === 0) {
        return (
            <View style={styles.centered}>
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
                <ActivityIndicator size="large" color={ACCENT} />
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
                removeClippedSubviews={false}
                maxToRenderPerBatch={2}
                windowSize={3}
                initialNumToRender={1}
                ListFooterComponent={
                    loading && reels.length > 0 ? (
                        <View style={[styles.centered, { height: H }]}>
                            <ActivityIndicator color={ACCENT} size="large" />
                            <Text style={styles.loadingText}>Đang tải thêm...</Text>
                        </View>
                    ) : null
                }
                ListEmptyComponent={
                    <View style={[styles.centered, { height: H }]}>
                        <Text style={styles.emptyIcon}>🎬</Text>
                        <Text style={styles.emptyTitle}>Chưa có Reels nào</Text>
                        <Text style={styles.emptySubtitle}>Hãy quay lại sau nhé!</Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={fetchReels}>
                            <Text style={styles.retryText}>Thử lại</Text>
                        </TouchableOpacity>
                    </View>
                }
            />

            {reels.length > 1 && (
                <View style={[styles.dotIndicator, { top: H * 0.45 }]}>
                    {reels.slice(0, Math.min(reels.length, 8)).map((_, i) => (
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

// ════════════════════════════════════════════════════════════
// Styles
// ════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    centered: {
        flex: 1, width: W, backgroundColor: '#000',
        justifyContent: 'center', alignItems: 'center', gap: 12,
    },
    loadingText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 8 },
    emptyIcon: { fontSize: 64 },
    emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 8 },
    emptySubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
    retryBtn: {
        marginTop: 12, paddingHorizontal: 28, paddingVertical: 12,
        backgroundColor: ACCENT, borderRadius: 24,
    },
    retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    reel: { width: W, backgroundColor: '#000', overflow: 'hidden' },
    noMediaBg: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#0d1b2a',
        justifyContent: 'center', alignItems: 'center',
    },
    noMediaIcon: { fontSize: 80, opacity: 0.3 },

gradientTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 160,
},
gradientBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 320,
},

    topBar: {
        position: 'absolute', left: 0, right: 0,
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingHorizontal: 14,
    },
    topLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    topTitle: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
    topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    muteBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center', alignItems: 'center',
    },
    listingBadgeTop: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    listingBadgeTopText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    promotedBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        backgroundColor: '#FF6B35', borderRadius: 12,
        paddingHorizontal: 8, paddingVertical: 3,
    },
    promotedText: { color: '#fff', fontSize: 10, fontWeight: '700' },

    progressWrap: { position: 'absolute', left: 14, right: 14 },
    progressTrack: {
        height: 2.5, backgroundColor: 'rgba(255,255,255,0.25)',
        borderRadius: 2, overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: ACCENT, borderRadius: 2 },

    rightActions: { position: 'absolute', right: 12, alignItems: 'center', gap: 22 },
    avatarWrap: { alignItems: 'center', marginBottom: 4 },
    avatar: {
        width: 46, height: 46, borderRadius: 23,
        borderWidth: 2, borderColor: '#fff',
    },
    avatarFallback: { backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },
    avatarInitial: { color: '#fff', fontSize: 18, fontWeight: '800' },
    followDot: {
        position: 'absolute', bottom: -6,
        width: 18, height: 18, borderRadius: 9,
        backgroundColor: ACCENT,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1.5, borderColor: '#fff',
    },
    actionBtn: { alignItems: 'center', gap: 1 },
    actionCount: {
        color: '#fff', fontSize: 13, fontWeight: '700',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
    },
    actionLabel: {
        color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
    },

    bottomInfo: {
        position: 'absolute', bottom: 0,
        left: 0, right: 76,
        paddingHorizontal: 16, gap: 5,
    },
    ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
    ownerName: { color: '#fff', fontSize: 14, fontWeight: '700' },
    dot: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
    timeText: { color: 'rgba(255,255,255,0.55)', fontSize: 12 },
    reelTitle: {
        color: '#fff', fontSize: 15, fontWeight: '700', lineHeight: 21,
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
    },
    addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    addressText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, flex: 1 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    priceText: {
        color: '#FFD700', fontSize: 16, fontWeight: '800',
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
    },
    areaText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
    ctaBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        alignSelf: 'flex-start',
        backgroundColor: ACCENT, borderRadius: 20,
        paddingVertical: 8, paddingHorizontal: 16, marginTop: 4,
    },
    ctaText: { color: '#fff', fontSize: 12, fontWeight: '700' },

    dotIndicator: { position: 'absolute', right: 5, alignItems: 'center', gap: 4 },
    dotItem: {
        width: 3, height: 14, borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    dotItemActive: { backgroundColor: ACCENT, height: 22 },
});
