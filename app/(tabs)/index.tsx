import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
    View, FlatList, StatusBar, ViewToken,
    TouchableOpacity, Text, StyleSheet, RefreshControl,
    useWindowDimensions, LayoutChangeEvent, ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePropertyStore } from '../../store/propertyStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useProjectStore } from '../../store/projectStore';
import PropertyCard from '../../components/property/PropertyCard';
import { Skeleton } from '../../components/ui/Skeleton';
import { useIsFocused } from '@react-navigation/native';
import { AppState } from 'react-native';
import { Room } from '../../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Category config ──────────────────────────────────────
const CATEGORIES = [
    { key: 'all', label: '✨ Tất cả', icon: null },
    { key: 'FOR_RENT', label: '🔑 Cho thuê', icon: null },
    { key: 'FOR_SALE', label: '🏷️ Bán', icon: null },
    { key: 'APARTMENT', label: '🏢 Căn hộ', icon: null },
    { key: 'HOUSE', label: '🏠 Nhà phố', icon: null },
    { key: 'LAND', label: '🌿 Đất nền', icon: null },
];

export default function FeedScreen() {
    const router = useRouter();
    const {
        rooms, fetchRooms, isLoading, isLoadingMore,
        loadMoreRooms, filters, error,
    } = usePropertyStore();
    const { unreadCount } = useNotificationStore();
    const { projects, fetchProjects } = useProjectStore();

    const [activeId, setActiveId] = useState<number | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [activeCategory, setActiveCategory] = useState('all'); // ← NEW
    const flatListRef = useRef<FlatList>(null);
    const insets = useSafeAreaInsets();
    const { height } = useWindowDimensions();
     const isFocused = useIsFocused();

    const [feedHeight, setFeedHeight] = useState(0);
    const onFeedLayout = useCallback((e: LayoutChangeEvent) => {
        const h = e.nativeEvent.layout.height;
        if (h > 0) setFeedHeight(h);
    }, []);
    const CARD_HEIGHT = feedHeight > 0 ? feedHeight : height;

    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

    const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0) {
            setActiveId((viewableItems[0].item as Room).id);
        }
    }, []);
    const [appActive, setAppActive] = useState(true);

useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
        setAppActive(state === 'active');
    });

    return () => sub.remove();
}, []);

    useEffect(() => {
        fetchRooms();
        fetchProjects(true);
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchRooms();
        setRefreshing(false);
    }, []);

    const { searchResults } = usePropertyStore();
    const sourceRooms = searchResults ?? rooms;

    const displayRooms = useMemo(() => {
        let result = [...sourceRooms];

        // ── Category filter ──────────────────────────────
        if (activeCategory !== 'all') {
            if (activeCategory === 'FOR_RENT' || activeCategory === 'FOR_SALE') {
                result = result.filter(r => r.transactionType === activeCategory);
            } else {
                // propertyType: APARTMENT, HOUSE, LAND ...
                result = result.filter(r => r.propertyType === activeCategory);
            }
        }

        // ── Existing filters ─────────────────────────────
        if (filters.propertyType)
            result = result.filter(r => r.propertyType === filters.propertyType);
        if (filters.minPrice !== undefined)
            result = result.filter(r => r.price >= filters.minPrice!);
        if (filters.maxPrice !== undefined)
            result = result.filter(r => r.price <= filters.maxPrice!);
        if (filters.minArea !== undefined)
            result = result.filter(r => r.area >= filters.minArea!);
        if (filters.maxArea !== undefined)
            result = result.filter(r => r.area <= filters.maxArea!);
        if (filters.bedroomList?.length)
            result = result.filter(r => r.bedrooms !== undefined && filters.bedroomList!.includes(r.bedrooms));
        if (filters.sortBy === 'price_asc') result.sort((a, b) => a.price - b.price);
        else if (filters.sortBy === 'price_desc') result.sort((a, b) => b.price - a.price);
        else if (filters.sortBy === 'newest')
            result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return result;
    }, [sourceRooms, filters, activeCategory]); // ← thêm activeCategory

    // ── Loading / Error / Empty states ───────────────────
    if (isLoading && rooms.length === 0 && !error) {
        return (
            <View style={{ flex: 1, backgroundColor: 'black' }}>
                <StatusBar barStyle="light-content" />
                <Skeleton width="100%" height={height} />
            </View>
        );
    }

    if (error && rooms.length === 0) {
        return (
            <View style={styles.errorContainer}>
                <StatusBar barStyle="light-content" />
                <Text style={styles.errorIcon}>😕</Text>
                <Text style={styles.errorTitle}>Không tải được dữ liệu</Text>
                <Text style={styles.errorMsg}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={fetchRooms}>
                    <Ionicons name="refresh" size={16} color="#fff" />
                    <Text style={styles.retryText}>Thử lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!isLoading && rooms.length === 0 && !error) {
        return (
            <View style={styles.errorContainer}>
                <StatusBar barStyle="light-content" />
                <Text style={styles.errorIcon}>🏠</Text>
                <Text style={styles.errorTitle}>Chưa có bài đăng nào</Text>
                <Text style={styles.errorMsg}>Hãy quay lại sau nhé!</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
                    <Ionicons name="refresh" size={16} color="#fff" />
                    <Text style={styles.retryText}>Làm mới</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ── Layout constants ──────────────────────────────────
    // Header height:   insets.top + 8 (paddingTop) + ~44 (content) + 12 (paddingBottom) ≈ insets.top + 64
    // Category bar:    insets.top + 64  → height 40
    // Projects strip:  insets.top + 108 (nếu có)
    const HEADER_BOTTOM = insets.top + 64;
    const CATEGORY_TOP = HEADER_BOTTOM;          // ngay dưới header
    const PROJECTS_TOP = CATEGORY_TOP + 44;      // ngay dưới category bar
   

    return (
        <View style={{ flex: 1, backgroundColor: 'black' }}>
            <StatusBar barStyle="light-content" translucent />

            {/* ════ Feed ════ */}
            <View style={{ flex: 1 }} onLayout={onFeedLayout}>
                {CARD_HEIGHT > 0 && (
                    <FlatList
                        ref={flatListRef}
                        data={displayRooms}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                          <PropertyCard
    item={item}
  isActive={isFocused && appActive && item.id === activeId}
    cardHeight={CARD_HEIGHT}
/>
                        )}
                        pagingEnabled
                        snapToInterval={CARD_HEIGHT}
                        snapToAlignment="start"
                        decelerationRate="fast"
                        showsVerticalScrollIndicator={false}
                        onViewableItemsChanged={onViewableItemsChanged}
                        viewabilityConfig={viewabilityConfig}
                        onEndReached={() => loadMoreRooms()}
                        onEndReachedThreshold={0.5}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor="white"
                                progressBackgroundColor="rgba(0,0,0,0.5)"
                            />
                        }
                        ListFooterComponent={
                            isLoadingMore ? (
                                <View style={styles.footerLoading}>
                                    <Text style={styles.footerLoadingText}>Đang tải thêm...</Text>
                                </View>
                            ) : null
                        }
                        ListEmptyComponent={
                            <View style={[styles.errorContainer, { height }]}>
                                <Text style={styles.errorIcon}>🔍</Text>
                                <Text style={styles.errorTitle}>Không có kết quả</Text>
                                <Text style={styles.errorMsg}>Thử chọn danh mục khác nhé!</Text>
                                <TouchableOpacity
                                    style={styles.retryBtn}
                                    onPress={() => setActiveCategory('all')}
                                >
                                    <Text style={styles.retryText}>Xem tất cả</Text>
                                </TouchableOpacity>
                            </View>
                        }
                        removeClippedSubviews={false}
                        windowSize={3}
                        initialNumToRender={1}
                        maxToRenderPerBatch={1}
                    />
                )}
            </View>

            {/* ════ Floating Header ════ */}
            <View
                style={[styles.header, { paddingTop: insets.top + 8 }]}
                pointerEvents="box-none"
            >
                <View style={styles.logoContainer}>
                    <Text style={styles.logoText}>🏠</Text>
                    <Text style={styles.logoName}>HomeSwipe</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={() => router.push('/analytics' as any)}
                    >
                        <Ionicons name="bar-chart-outline" size={22} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={() => router.push('/filter' as any)}
                    >
                        <Ionicons name="search-outline" size={22} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={() => router.push('/notifications' as any)}
                    >
                        <Ionicons name="notifications-outline" size={22} color="white" />
                        {unreadCount > 0 && (
                            <View style={styles.notifBadge}>
                                <Text style={styles.notifBadgeText}>
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* ════ Category Bar ════ */}
            <View
                style={[styles.categoryBar, { top: CATEGORY_TOP }]}
                pointerEvents="box-none"
            >
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
                    pointerEvents="auto"
                >
                    {CATEGORIES.map(cat => (
                        <TouchableOpacity
                            key={cat.key}
                            style={[
                                styles.catChip,
                                activeCategory === cat.key && styles.catChipActive,
                            ]}
                            onPress={() => setActiveCategory(cat.key)}
                            activeOpacity={0.8}
                        >
                            <Text style={[
                                styles.catText,
                                activeCategory === cat.key && styles.catTextActive,
                            ]}>
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* ════ Projects Strip ════ */}
            {projects.length > 0 && (
                <View
                    style={[styles.projectsStrip, { top: PROJECTS_TOP }]}
                    pointerEvents="box-none"
                >
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
                        pointerEvents="auto"
                    >
                        <TouchableOpacity
                            style={styles.projectChip}
                            onPress={() => router.push('/projects' as any)}
                        >
                            <MaterialCommunityIcons name="domain" size={13} color="white" />
                            <Text style={styles.projectChipText}>Dự án BĐS</Text>
                            <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.7)" />
                        </TouchableOpacity>
                        {projects.slice(0, 3).map((proj) => (
                            <TouchableOpacity
                                key={proj.id}
                                style={styles.projectChip}
                                onPress={() => router.push(`/projects/${proj.id}` as any)}
                            >
                                <Text style={styles.projectChipText} numberOfLines={1}>
                                    {proj.name.length > 18 ? proj.name.slice(0, 16) + '…' : proj.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    // ── Error / Empty ──
    errorContainer: {
        flex: 1,
        backgroundColor: '#0d1b2a',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 32,
    },
    errorIcon: { fontSize: 56 },
    errorTitle: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
    errorMsg: { color: 'rgba(255,255,255,0.55)', fontSize: 13, textAlign: 'center', lineHeight: 20 },
    retryBtn: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#0066FF',
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderRadius: 24,
    },
    retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    // ── Header ──
    header: {
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingBottom: 12,
        backgroundColor: 'rgba(0,0,0,0.3)',   // ← subtle bg để phân biệt với content
    },
    logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    logoText: { fontSize: 22 },
    logoName: {
        color: 'white', fontSize: 18, fontWeight: '800', letterSpacing: 0.5,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    headerActions: { flexDirection: 'row', gap: 8 },
    headerBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'center', alignItems: 'center',
        position: 'relative',
    },
    notifBadge: {
        position: 'absolute', top: 4, right: 4,
        width: 16, height: 16, borderRadius: 8,
        backgroundColor: '#EF4444',
        justifyContent: 'center', alignItems: 'center',
    },
    notifBadgeText: { color: 'white', fontSize: 9, fontWeight: '800' },

    // ── Category Bar ── NEW ──
    categoryBar: {
        position: 'absolute', left: 0, right: 0, zIndex: 99,
        paddingVertical: 6,
        backgroundColor: 'rgba(0,0,0,0.25)', // subtle separator
    },
    catChip: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    catChipActive: {
        backgroundColor: '#0066FF',
        borderColor: '#0066FF',
    },
    catText: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 12,
        fontWeight: '600',
    },
    catTextActive: {
        color: '#fff',
        fontWeight: '700',
    },

    // ── Projects strip ──
    projectsStrip: {
        position: 'absolute', left: 0, right: 0, zIndex: 98,
        paddingVertical: 4,
    },
    projectChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 5,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    },
    projectChipText: { color: 'white', fontSize: 11, fontWeight: '700' },

    // ── Footer loading ──
    footerLoading: {
        height: 60, justifyContent: 'center', alignItems: 'center',
    },
    footerLoadingText: {
        color: 'rgba(255,255,255,0.5)', fontSize: 13,
    },
});