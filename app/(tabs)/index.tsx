import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    FlatList,
    StatusBar,
    TouchableOpacity,
    Text,
    StyleSheet,
    RefreshControl,
    ScrollView,
    useWindowDimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePropertyStore } from '../../store/propertyStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useProjectStore } from '../../store/projectStore';
import FeedPropertyCard from '../../components/property/FeedPropertyCard';
import { Skeleton } from '../../components/ui/Skeleton';
import { Room } from '../../types';
import { useSafeRouter } from '../../hooks/useSafeRouter';

const CATEGORIES = [
    { key: 'all', label: 'Tất cả' },
    { key: 'FOR_RENT', label: 'Cho thuê' },
    { key: 'FOR_SALE', label: 'Bán' },
    { key: 'APARTMENT', label: 'Căn hộ' },
    { key: 'HOUSE', label: 'Nhà phố' },
    { key: 'LAND', label: 'Đất nền' },
];

const getFilterSummary = (filters: Record<string, unknown>, isSearchMode: boolean) => {
    if (isSearchMode) return 'Kết quả từ bộ lọc nâng cao';

    const activeCount = Object.values(filters).filter(value => {
        if (Array.isArray(value)) return value.length > 0;
        return value !== undefined && value !== null && value !== '';
    }).length;

    if (activeCount === 0) return 'Tin mới và phù hợp nhất hôm nay';
    return `${activeCount} bộ lọc đang áp dụng`;
};

export default function FeedScreen() {
    const { safePush } = useSafeRouter();
    const {
        rooms,
        fetchRooms,
        isLoading,
        isLoadingMore,
        loadMoreRooms,
        filters,
        error,
        searchResults,
    } = usePropertyStore();
    const { unreadCount } = useNotificationStore();
    const { projects, fetchProjects } = useProjectStore();
    const insets = useSafeAreaInsets();
    const { height } = useWindowDimensions();
    const flatListRef = useRef<FlatList<Room>>(null);

    const [refreshing, setRefreshing] = useState(false);
    const [activeCategory, setActiveCategory] = useState('all');

    useEffect(() => {
        fetchRooms();
        fetchProjects(true);
    }, [fetchRooms, fetchProjects]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([fetchRooms(), fetchProjects(true)]);
        setRefreshing(false);
    }, [fetchRooms, fetchProjects]);

    const sourceRooms = searchResults ?? rooms;
    const isSearchMode = searchResults !== null;

    const displayRooms = useMemo(() => {
        let result = [...sourceRooms];

        if (!isSearchMode && activeCategory !== 'all') {
            if (activeCategory === 'FOR_RENT' || activeCategory === 'FOR_SALE') {
                result = result.filter(room => room.transactionType === activeCategory);
            } else {
                result = result.filter(room => room.propertyType === activeCategory);
            }
        }

        if (filters.propertyType) {
            result = result.filter(room => room.propertyType === filters.propertyType);
        }
        if (filters.transactionType) {
            result = result.filter(room => room.transactionType === filters.transactionType);
        }
        if (filters.minPrice !== undefined) {
            result = result.filter(room => room.price >= filters.minPrice!);
        }
        if (filters.maxPrice !== undefined) {
            result = result.filter(room => room.price <= filters.maxPrice!);
        }
        if (filters.minArea !== undefined) {
            result = result.filter(room => room.area >= filters.minArea!);
        }
        if (filters.maxArea !== undefined) {
            result = result.filter(room => room.area <= filters.maxArea!);
        }
        const selectedBedroomValue = filters.bedroomValue ?? filters.bedroomList?.[0];
        if (selectedBedroomValue != null) {
            const bedroomMode = filters.bedroomMode ?? 'min';
            result = result.filter(room => {
                const bedrooms = Number(room.bedrooms ?? -1);
                return bedroomMode === 'exact' || selectedBedroomValue === 0
                    ? bedrooms === selectedBedroomValue
                    : bedrooms >= selectedBedroomValue;
            });
        }

        const selectedBathroomValue = filters.bathroomValue ?? filters.minBathrooms;
        if (selectedBathroomValue != null) {
            const bathroomMode = filters.bathroomMode ?? 'min';
            result = result.filter(room => {
                const bathrooms = Number(room.bathrooms ?? -1);
                return bathroomMode === 'exact'
                    ? bathrooms === selectedBathroomValue
                    : bathrooms >= selectedBathroomValue;
            });
        }

        if (filters.sortBy === 'price_asc') {
            result.sort((a, b) => a.price - b.price);
        } else if (filters.sortBy === 'price_desc') {
            result.sort((a, b) => b.price - a.price);
        } else if (filters.sortBy === 'newest') {
            result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        return result;
    }, [sourceRooms, filters, activeCategory, isSearchMode]);

    const filterSummary = useMemo(
        () => getFilterSummary(filters as unknown as Record<string, unknown>, isSearchMode),
        [filters, isSearchMode],
    );

    const renderProperty = useCallback(({ item }: { item: Room }) => (
        <FeedPropertyCard item={item} />
    ), []);

    const renderSkeleton = () => (
        <View style={styles.skeletonWrap}>
            {[0, 1, 2].map(index => (
                <View key={index} style={styles.skeletonCard}>
                    <Skeleton width="100%" height={220} borderRadius={20} />
                    <View style={styles.skeletonContent}>
                        <Skeleton width="48%" height={24} borderRadius={8} />
                        <Skeleton width="86%" height={18} borderRadius={8} />
                        <Skeleton width="68%" height={14} borderRadius={8} />
                    </View>
                </View>
            ))}
        </View>
    );

    const renderHeader = () => (
        <View style={[styles.headerWrap, { paddingTop: insets.top + 12 }]}>
            <View style={styles.topBar}>
                <View style={styles.brandRow}>
                    <View style={styles.brandIcon}>
                        <Ionicons name="home" size={18} color="#0066FF" />
                    </View>
                    <View>
                        <Text style={styles.brandName}>HomeSwipe</Text>
                        <Text style={styles.brandSubtitle}>Khám phá bất động sản phù hợp</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.notificationBtn}
                    onPress={() => safePush('/notifications' as any)}
                    accessibilityRole="button"
                    accessibilityLabel="Thông báo"
                >
                    <Ionicons name="notifications-outline" size={21} color="#0F172A" />
                    {unreadCount > 0 && (
                        <View style={styles.notifBadge}>
                            <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={styles.searchBar}
                onPress={() => safePush('/filter' as any)}
                activeOpacity={0.86}
                accessibilityRole="button"
                accessibilityLabel="Tìm kiếm bất động sản"
            >
                <Ionicons name="search-outline" size={19} color="#64748B" />
                <Text style={styles.searchPlaceholder}>Tìm căn hộ, nhà, đất...</Text>
                <View style={styles.searchFilterIcon}>
                    <Ionicons name="options-outline" size={17} color="#0066FF" />
                </View>
            </TouchableOpacity>

            <View style={styles.quickActions}>
                <TouchableOpacity style={styles.quickAction} onPress={() => safePush('/map' as any)}>
                    <Ionicons name="map-outline" size={18} color="#0066FF" />
                    <Text style={styles.quickActionText}>Bản đồ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickAction} onPress={() => safePush('/filter' as any)}>
                    <Ionicons name="filter-outline" size={18} color="#0066FF" />
                    <Text style={styles.quickActionText}>Bộ lọc</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickAction} onPress={() => safePush('/analytics' as any)}>
                    <Ionicons name="bar-chart-outline" size={18} color="#0066FF" />
                    <Text style={styles.quickActionText}>Thị trường</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScroll}
            >
                {CATEGORIES.map(category => (
                    <TouchableOpacity
                        key={category.key}
                        style={[styles.categoryChip, activeCategory === category.key && styles.categoryChipActive]}
                        onPress={() => setActiveCategory(category.key)}
                        activeOpacity={0.85}
                    >
                        <Text style={[styles.categoryText, activeCategory === category.key && styles.categoryTextActive]}>
                            {category.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {projects.length > 0 && (
                <View style={styles.projectsSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Dự án nổi bật</Text>
                        <TouchableOpacity onPress={() => safePush('/projects' as any)}>
                            <Text style={styles.sectionLink}>Xem tất cả</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.projectScroll}
                    >
                        {projects.slice(0, 5).map(project => (
                            <TouchableOpacity
                                key={project.id}
                                style={styles.projectCard}
                                onPress={() => safePush(`/projects/${project.id}` as any)}
                                activeOpacity={0.88}
                            >
                                <View style={styles.projectIcon}>
                                    <MaterialCommunityIcons name="office-building-marker-outline" size={19} color="#0066FF" />
                                </View>
                                <Text style={styles.projectName} numberOfLines={1}>{project.name}</Text>
                                <Text style={styles.projectAddress} numberOfLines={1}>
                                    {[project.district, project.province].filter(Boolean).join(', ') || project.address}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            <View style={styles.resultsHeader}>
                <View>
                    <Text style={styles.resultsTitle}>Bất động sản đề xuất</Text>
                    <Text style={styles.resultsSubtitle}>{filterSummary}</Text>
                </View>
                <View style={styles.countPill}>
                    <Text style={styles.countText}>{displayRooms.length}</Text>
                </View>
            </View>
        </View>
    );

    const renderEmpty = () => (
        <View style={[styles.emptyState, { minHeight: Math.max(320, height * 0.45) }]}>
            <View style={styles.emptyIcon}>
                <Ionicons name={error ? 'cloud-offline-outline' : 'search-outline'} size={34} color="#0066FF" />
            </View>
            <Text style={styles.emptyTitle}>{error ? 'Không tải được dữ liệu' : 'Không có kết quả phù hợp'}</Text>
            <Text style={styles.emptyText}>
                {error || 'Thử đổi danh mục, mở bộ lọc hoặc làm mới danh sách.'}
            </Text>
            <TouchableOpacity
                style={styles.retryButton}
                onPress={error ? fetchRooms : () => setActiveCategory('all')}
                activeOpacity={0.86}
            >
                <Ionicons name={error ? 'refresh' : 'home-outline'} size={16} color="white" />
                <Text style={styles.retryText}>{error ? 'Thử lại' : 'Xem tất cả'}</Text>
            </TouchableOpacity>
        </View>
    );

    const renderFooter = () => {
        if (!isLoadingMore) return <View style={styles.footerSpacer} />;

        return (
            <View style={styles.footerLoading}>
                <Skeleton width={160} height={16} borderRadius={8} />
                <Text style={styles.footerText}>Đang tải thêm...</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F6F8FB" />
            {isLoading && rooms.length === 0 && !error ? (
                <ScrollView
                    style={styles.container}
                    contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }}
                    showsVerticalScrollIndicator={false}
                >
                    {renderHeader()}
                    {renderSkeleton()}
                </ScrollView>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={displayRooms}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderProperty}
                    ListHeaderComponent={renderHeader}
                    ListEmptyComponent={renderEmpty}
                    ListFooterComponent={renderFooter}
                    contentContainerStyle={[
                        styles.listContent,
                        { paddingBottom: insets.bottom + 28 },
                        displayRooms.length === 0 && styles.listContentEmpty,
                    ]}
                    ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
                    showsVerticalScrollIndicator={false}
                    onEndReached={() => {
                        if (!isSearchMode) loadMoreRooms();
                    }}
                    onEndReachedThreshold={0.55}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#0066FF"
                            colors={['#0066FF']}
                            progressBackgroundColor="#FFFFFF"
                        />
                    }
                    removeClippedSubviews
                    initialNumToRender={5}
                    maxToRenderPerBatch={6}
                    windowSize={8}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F6F8FB',
    },
    listContent: {
        paddingBottom: 24,
    },
    listContentEmpty: {
        flexGrow: 1,
    },
    itemSeparator: {
        height: 16,
    },
    headerWrap: {
        paddingHorizontal: 16,
        paddingBottom: 18,
        gap: 16,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    brandIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EAF2FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    brandName: {
        color: '#0F172A',
        fontSize: 22,
        fontWeight: '900',
    },
    brandSubtitle: {
        color: '#64748B',
        fontSize: 12,
        fontWeight: '700',
        marginTop: 1,
    },
    notificationBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        position: 'relative',
    },
    notifBadge: {
        position: 'absolute',
        top: 5,
        right: 5,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 3,
    },
    notifBadgeText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '900',
    },
    searchBar: {
        minHeight: 52,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 14,
        elevation: 2,
    },
    searchPlaceholder: {
        flex: 1,
        color: '#64748B',
        fontSize: 14,
        fontWeight: '700',
    },
    searchFilterIcon: {
        width: 32,
        height: 32,
        borderRadius: 12,
        backgroundColor: '#EAF2FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    quickActions: {
        flexDirection: 'row',
        gap: 10,
    },
    quickAction: {
        flex: 1,
        minHeight: 44,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    quickActionText: {
        color: '#0F172A',
        fontSize: 13,
        fontWeight: '800',
    },
    categoryScroll: {
        gap: 8,
        paddingRight: 16,
    },
    categoryChip: {
        paddingHorizontal: 15,
        paddingVertical: 9,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#DCE6F3',
    },
    categoryChipActive: {
        backgroundColor: '#0066FF',
        borderColor: '#0066FF',
    },
    categoryText: {
        color: '#475569',
        fontSize: 13,
        fontWeight: '800',
    },
    categoryTextActive: {
        color: '#FFFFFF',
    },
    projectsSection: {
        gap: 10,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sectionTitle: {
        color: '#0F172A',
        fontSize: 17,
        fontWeight: '900',
    },
    sectionLink: {
        color: '#0066FF',
        fontSize: 13,
        fontWeight: '800',
    },
    projectScroll: {
        gap: 10,
        paddingRight: 16,
    },
    projectCard: {
        width: 178,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 7,
    },
    projectIcon: {
        width: 34,
        height: 34,
        borderRadius: 13,
        backgroundColor: '#EAF2FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    projectName: {
        color: '#0F172A',
        fontSize: 13,
        fontWeight: '900',
    },
    projectAddress: {
        color: '#64748B',
        fontSize: 12,
        fontWeight: '600',
    },
    resultsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 2,
    },
    resultsTitle: {
        color: '#0F172A',
        fontSize: 18,
        fontWeight: '900',
    },
    resultsSubtitle: {
        marginTop: 3,
        color: '#64748B',
        fontSize: 13,
        fontWeight: '700',
    },
    countPill: {
        minWidth: 38,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#EAF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    countText: {
        color: '#0066FF',
        fontSize: 13,
        fontWeight: '900',
    },
    skeletonWrap: {
        gap: 16,
        paddingBottom: 20,
    },
    skeletonCard: {
        marginHorizontal: 16,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    skeletonContent: {
        padding: 14,
        gap: 10,
    },
    emptyState: {
        marginHorizontal: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        paddingHorizontal: 24,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    emptyIcon: {
        width: 64,
        height: 64,
        borderRadius: 24,
        backgroundColor: '#EAF2FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyTitle: {
        color: '#0F172A',
        fontSize: 17,
        fontWeight: '900',
        textAlign: 'center',
    },
    emptyText: {
        color: '#64748B',
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 19,
    },
    retryButton: {
        marginTop: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#0066FF',
        paddingHorizontal: 18,
        paddingVertical: 11,
        borderRadius: 16,
    },
    retryText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '900',
    },
    footerSpacer: {
        height: 8,
    },
    footerLoading: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 18,
    },
    footerText: {
        color: '#64748B',
        fontSize: 12,
        fontWeight: '700',
    },
});
