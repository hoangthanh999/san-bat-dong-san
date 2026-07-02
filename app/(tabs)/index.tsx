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
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePropertyStore } from '../../store/propertyStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useProjectStore } from '../../store/projectStore';
import { useAuthStore } from '../../store/authStore';
import FeedPropertyCard from '../../components/property/FeedPropertyCard';
import { Skeleton } from '../../components/ui/Skeleton';
import { MarketInsight, RecommendedProperty, RegionTransactionStat, Room } from '../../types';
import { useSafeRouter } from '../../hooks/useSafeRouter';
import { recommendApi } from '../../services/api/recommend';
import { analyticsService } from '../../services/api/analytics';
import { formatCompactVND } from '../../utils/formatPrice';
import { sortFeaturedFirst } from '../../utils/promotion';

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

const RECOMMEND_REASON_LABELS: Record<string, string> = {
    BANDIT_BEHAVIOR: 'Dựa trên tin bạn đã xem, lưu và liên hệ',
    BEHAVIOR: 'Dựa trên tin bạn đã xem, lưu và liên hệ',
    BANDIT_COLLABORATIVE: 'Người có hành vi tương tự cũng quan tâm',
    COLLABORATIVE: 'Người có hành vi tương tự cũng quan tâm',
    BANDIT_TRENDING: 'Tin nổi bật có thể phù hợp',
    TRENDING: 'Tin nổi bật có thể phù hợp',
    PROMOTED: 'Tin nổi bật có thể phù hợp',
    DISTRICT_MATCH: 'Dựa trên khu vực bạn quan tâm',
    LOCATION_MATCH: 'Dựa trên khu vực bạn quan tâm',
    BUDGET_MATCH: 'Gần với mức giá bạn thường quan tâm',
    BUDGET_STRONG_MATCH: 'Gần với mức giá bạn thường quan tâm',
    FAVORITE_PROPERTY: 'Dựa trên loại tin bạn thường quan tâm',
    FOLLOWING_OWNER: 'Từ chủ nhà bạn đang theo dõi',
    LIKED_OWNER: 'Từ chủ nhà bạn từng quan tâm',
    TRUSTED_OWNER: 'Chủ nhà có độ tin cậy cao',
    FRESH_ITEM: 'Tin mới có thể phù hợp',
    EXPLORE: 'Gợi ý để bạn khám phá thêm',
};

const getRecommendationReason = (item: RecommendedProperty) => {
    const source = item.primarySource || item.reasons?.[0];
    if (source && RECOMMEND_REASON_LABELS[source]) return RECOMMEND_REASON_LABELS[source];

    const matchedReason = item.reasons?.find(reason => RECOMMEND_REASON_LABELS[reason]);
    if (matchedReason) return RECOMMEND_REASON_LABELS[matchedReason];

    return 'Dựa trên tin bạn đã xem, lưu và liên hệ';
};

const getRecommendationScoreLabel = (score?: number) => {
    if (typeof score !== 'number' || !Number.isFinite(score) || score <= 0 || score > 1) {
        return null;
    }

    return `Phù hợp ${Math.round(score * 100)}%`;
};

const MARKET_ANALYTICS_PROVINCE = 'Thành phố Hồ Chí Minh';

const formatPercentLabel = (value?: number) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '0%';
    return `${Math.abs(value).toFixed(value % 1 === 0 ? 0 : 1)}%`;
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
    const { user, isAuthenticated } = useAuthStore();
    const insets = useSafeAreaInsets();
    const { height } = useWindowDimensions();
    const flatListRef = useRef<FlatList<Room>>(null);

    const [refreshing, setRefreshing] = useState(false);
    const [activeCategory, setActiveCategory] = useState('all');
    const [recommendedProperties, setRecommendedProperties] = useState<RecommendedProperty[]>([]);
    const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
    const [marketInsight, setMarketInsight] = useState<MarketInsight | null>(null);
    const [marketRegions, setMarketRegions] = useState<RegionTransactionStat[]>([]);
    const [isLoadingMarketInsights, setIsLoadingMarketInsights] = useState(false);

    const userId = Number(user?.id);
    const canLoadRecommendations = isAuthenticated && Number.isFinite(userId) && userId > 0;

    const fetchRecommendations = useCallback(async () => {
        if (!canLoadRecommendations) {
            setRecommendedProperties([]);
            setIsLoadingRecommendations(false);
            return;
        }

        setIsLoadingRecommendations(true);
        const items = await recommendApi.getFinalPropertyRecommendations(userId, 5);
        setRecommendedProperties(items);
        setIsLoadingRecommendations(false);
    }, [canLoadRecommendations, userId]);

    const fetchMarketInsights = useCallback(async () => {
        setIsLoadingMarketInsights(true);
        try {
            const [trendResult, regionResult] = await Promise.allSettled([
                analyticsService.getPriceTrends({
                    transactionType: 'FOR_RENT',
                    province: MARKET_ANALYTICS_PROVINCE,
                }),
                analyticsService.getTopRegions({ limit: 3, regionField: 'province.keyword' }),
            ]);

            setMarketInsight(
                trendResult.status === 'fulfilled'
                    ? trendResult.value.marketInsights ?? null
                    : null
            );
            setMarketRegions(
                regionResult.status === 'fulfilled' && Array.isArray(regionResult.value)
                    ? regionResult.value.slice(0, 3)
                    : []
            );
        } catch {
            setMarketInsight(null);
            setMarketRegions([]);
        } finally {
            setIsLoadingMarketInsights(false);
        }
    }, []);

    useEffect(() => {
        fetchRooms();
        fetchProjects(true);
        fetchMarketInsights();
    }, [fetchRooms, fetchProjects, fetchMarketInsights]);

    useEffect(() => {
        fetchRecommendations();
    }, [fetchRecommendations]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([fetchRooms(), fetchProjects(true), fetchRecommendations(), fetchMarketInsights()]);
        setRefreshing(false);
    }, [fetchRooms, fetchProjects, fetchRecommendations, fetchMarketInsights]);

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

        return sortFeaturedFirst(result, filters.sortBy);
    }, [sourceRooms, filters, activeCategory, isSearchMode]);

    const filterSummary = useMemo(
        () => getFilterSummary(filters as unknown as Record<string, unknown>, isSearchMode),
        [filters, isSearchMode],
    );

    const renderRecommendationCard = useCallback((item: RecommendedProperty) => {
        const imageUri = item.images?.[0];
        const scoreLabel = getRecommendationScoreLabel(item.score);

        return (
            <TouchableOpacity
                key={item.id}
                style={styles.recommendationCard}
                activeOpacity={0.9}
                onPress={() => safePush(`/property/${item.id}` as any)}
            >
                <View style={styles.recommendationImageWrap}>
                    {imageUri ? (
                        <Image
                            source={{ uri: imageUri }}
                            style={styles.recommendationImage}
                            contentFit="cover"
                            transition={160}
                        />
                    ) : (
                        <View style={styles.recommendationImageFallback}>
                            <Ionicons name="home-outline" size={28} color="#94A3B8" />
                        </View>
                    )}
                    <View style={styles.aiBadge}>
                        <Ionicons name="sparkles-outline" size={11} color="#FFFFFF" />
                        <Text style={styles.aiBadgeText}>Cá nhân hóa</Text>
                    </View>
                    {scoreLabel && (
                        <View style={styles.scoreBadge}>
                            <Text style={styles.scoreBadgeText}>{scoreLabel}</Text>
                        </View>
                    )}
                    {item.videoUrl && (
                        <View style={styles.recommendationVideoBadge}>
                            <Ionicons name="play" size={10} color="#FFFFFF" />
                        </View>
                    )}
                </View>

                <View style={styles.recommendationBody}>
                    <Text style={styles.recommendationPrice}>{formatCompactVND(Number(item.price || 0))}</Text>
                    <Text style={styles.recommendationTitle} numberOfLines={2}>{item.title}</Text>
                    <View style={styles.recommendationAddressRow}>
                        <Ionicons name="location-outline" size={13} color="#64748B" />
                        <Text style={styles.recommendationAddress} numberOfLines={1}>
                            {[item.district, item.address].filter(Boolean).join(' - ') || 'Chưa cập nhật địa chỉ'}
                        </Text>
                    </View>
                    <Text style={styles.recommendationReason} numberOfLines={2}>
                        {getRecommendationReason(item)}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    }, [safePush]);

    const renderRecommendationsSection = () => {
        if (!canLoadRecommendations) return null;
        if (!isLoadingRecommendations && recommendedProperties.length === 0) return null;

        return (
            <View style={styles.recommendationsSection}>
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleGroup}>
                        <Text style={styles.sectionTitle}>Gợi ý dành riêng cho bạn</Text>
                        <Text style={styles.sectionSubtitleText}>
                            Dựa trên hành vi xem, lưu và liên hệ của bạn
                        </Text>
                    </View>
                </View>

                {isLoadingRecommendations ? (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.recommendationScroll}
                    >
                        {[0, 1, 2].map(index => (
                            <View key={index} style={styles.recommendationSkeletonCard}>
                                <Skeleton width="100%" height={128} borderRadius={16} />
                                <View style={styles.recommendationSkeletonBody}>
                                    <Skeleton width="62%" height={18} borderRadius={8} />
                                    <Skeleton width="88%" height={14} borderRadius={8} />
                                    <Skeleton width="72%" height={14} borderRadius={8} />
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                ) : (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.recommendationScroll}
                    >
                        {recommendedProperties.slice(0, 5).map(renderRecommendationCard)}
                    </ScrollView>
                )}
            </View>
        );
    };

    const renderMarketInsightsSection = () => {
        const hasData = !!marketInsight || marketRegions.length > 0;
        if (!isLoadingMarketInsights && !hasData) return null;

        const growthUp = marketInsight?.yearlyGrowthTrend !== 'DOWN';
        const growthColor = growthUp ? '#16A34A' : '#DC2626';

        return (
            <View style={styles.marketSection}>
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleGroup}>
                        <Text style={styles.sectionTitle}>Góc nhìn thị trường</Text>
                        <Text style={styles.sectionSubtitleText}>
                            Cập nhật tin tức và xu hướng bất động sản
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => safePush('/analytics' as any)}>
                        <Text style={styles.sectionLink}>Xem táº¥t cáº£</Text>
                    </TouchableOpacity>
                </View>

                {isLoadingMarketInsights ? (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.marketScroll}
                    >
                        {[0, 1, 2].map(index => (
                            <View key={index} style={styles.marketCard}>
                                <Skeleton width={36} height={36} borderRadius={12} />
                                <Skeleton width="72%" height={16} borderRadius={8} />
                                <Skeleton width="88%" height={13} borderRadius={8} />
                            </View>
                        ))}
                    </ScrollView>
                ) : (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.marketScroll}
                    >
                        {marketInsight && (
                            <TouchableOpacity
                                style={styles.marketCard}
                                activeOpacity={0.88}
                                onPress={() => safePush('/analytics' as any)}
                            >
                                <View style={styles.marketIcon}>
                                    <Ionicons name="analytics-outline" size={18} color="#f96302" />
                                </View>
                                <Text style={styles.marketCardTitle} numberOfLines={2}>
                                    {marketInsight.popularPriceLabel || 'Phân khúc phổ biến'}
                                </Text>
                                <Text style={styles.marketCardValue} numberOfLines={1}>
                                    {marketInsight.popularPriceText || 'Đang cập nhật'}
                                </Text>
                                {!!marketInsight.popularPriceUnit && (
                                    <Text style={styles.marketCardMeta} numberOfLines={1}>
                                        {marketInsight.popularPriceUnit}
                                    </Text>
                                )}
                                <View style={styles.readMoreRow}>
                                    <Text style={styles.readMoreText}>Xem phân tích</Text>
                                    <Ionicons name="arrow-forward" size={13} color="#f96302" />
                                </View>
                            </TouchableOpacity>
                        )}

                        {marketInsight && (
                            <TouchableOpacity
                                style={styles.marketCard}
                                activeOpacity={0.88}
                                onPress={() => safePush('/analytics' as any)}
                            >
                                <View style={[styles.marketIcon, { backgroundColor: growthUp ? '#ECFDF5' : '#FEF2F2' }]}>
                                    <Ionicons name={growthUp ? 'trending-up' : 'trending-down'} size={18} color={growthColor} />
                                </View>
                                <Text style={styles.marketCardTitle} numberOfLines={2}>
                                    {marketInsight.yearlyGrowthLabel || 'Tăng trưởng cùng kỳ'}
                                </Text>
                                <Text style={[styles.marketCardValue, { color: growthColor }]} numberOfLines={1}>
                                    {formatPercentLabel(marketInsight.yearlyGrowthPercent)}
                                </Text>
                                <Text style={styles.marketCardMeta} numberOfLines={2}>
                                    {growthUp ? 'Xu hướng tăng' : 'Xu hướng giảm'} theo dữ liệu tin đăng
                                </Text>
                                <View style={styles.readMoreRow}>
                                    <Text style={styles.readMoreText}>Đọc tiếp</Text>
                                    <Ionicons name="arrow-forward" size={13} color="#f96302" />
                                </View>
                            </TouchableOpacity>
                        )}

                        {marketRegions.map(region => (
                            <TouchableOpacity
                                key={region.regionName}
                                style={styles.marketCard}
                                activeOpacity={0.88}
                                onPress={() => safePush('/analytics' as any)}
                            >
                                <View style={styles.marketIcon}>
                                    <Ionicons name="location-outline" size={18} color="#f96302" />
                                </View>
                                <Text style={styles.marketCardTitle} numberOfLines={2}>
                                    {region.regionName || 'Khu vực nổi bật'}
                                </Text>
                                <Text style={styles.marketCardValue} numberOfLines={1}>
                                    {Number(region.totalPosts || 0).toLocaleString('vi-VN')} tin
                                </Text>
                                <Text style={styles.marketCardMeta} numberOfLines={2}>
                                    Mua bán {Number(region.forSaleCount || 0).toLocaleString('vi-VN')} - Cho thuê {Number(region.forRentCount || 0).toLocaleString('vi-VN')}
                                </Text>
                                <View style={styles.readMoreRow}>
                                    <Text style={styles.readMoreText}>Xem khu vực</Text>
                                    <Ionicons name="arrow-forward" size={13} color="#f96302" />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}
            </View>
        );
    };

    const renderMarketCtaSection = () => {
        const hasData = !!marketInsight || marketRegions.length > 0;
        if (!isLoadingMarketInsights && !hasData) return null;

        const growthUp = marketInsight?.yearlyGrowthTrend !== 'DOWN';
        const growthColor = growthUp ? '#16A34A' : '#DC2626';
        const topRegion = marketRegions[0];

        return (
            <TouchableOpacity
                style={styles.marketCta}
                activeOpacity={0.88}
                onPress={() => safePush('/analytics' as any)}
            >
                {isLoadingMarketInsights ? (
                    <>
                        <Skeleton width={38} height={38} borderRadius={14} />
                        <View style={styles.marketCtaBody}>
                            <Skeleton width="58%" height={16} borderRadius={8} />
                            <Skeleton width="86%" height={13} borderRadius={8} />
                        </View>
                    </>
                ) : (
                    <>
                        <View style={[styles.marketIcon, { backgroundColor: growthUp ? '#ECFDF5' : '#FFF7ED' }]}>
                            <Ionicons name={growthUp ? 'trending-up' : 'analytics-outline'} size={18} color={growthUp ? growthColor : '#f96302'} />
                        </View>
                        <View style={styles.marketCtaBody}>
                            <Text style={styles.marketCtaTitle}>Góc nhìn thị trường</Text>
                            <Text style={styles.marketCtaText} numberOfLines={2}>
                                {marketInsight
                                    ? `${marketInsight.popularPriceLabel || 'Giá phổ biến'}: ${marketInsight.popularPriceText || 'đang cập nhật'} ${marketInsight.popularPriceUnit || ''}`
                                    : `Khu vực nổi bật: ${topRegion?.regionName || 'đang cập nhật'}`
                                }
                            </Text>
                            {!!marketInsight?.yearlyGrowthPercent && (
                                <Text style={[styles.marketCtaMeta, { color: growthColor }]}>
                                    {growthUp ? 'Tăng' : 'Giảm'} {formatPercentLabel(marketInsight.yearlyGrowthPercent)}
                                </Text>
                            )}
                        </View>
                        <Ionicons name="arrow-forward" size={18} color="#f96302" />
                    </>
                )}
            </TouchableOpacity>
        );
    };

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
                        <Ionicons name="home" size={18} color="#f96302" />
                    </View>
                    <View>
                        <Text style={styles.brandName}>HomeVerse</Text>
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
                    <Ionicons name="options-outline" size={17} color="#f96302" />
                </View>
            </TouchableOpacity>

            <View style={styles.quickActions}>
                <TouchableOpacity style={styles.quickAction} onPress={() => safePush('/map' as any)}>
                    <Ionicons name="map-outline" size={18} color="#f96302" />
                    <Text style={styles.quickActionText}>Bản đồ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickAction} onPress={() => safePush('/filter' as any)}>
                    <Ionicons name="filter-outline" size={18} color="#f96302" />
                    <Text style={styles.quickActionText}>Bộ lọc</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickAction} onPress={() => safePush('/analytics' as any)}>
                    <Ionicons name="bar-chart-outline" size={18} color="#f96302" />
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

            {renderRecommendationsSection()}

            {renderMarketCtaSection()}

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
                                    <MaterialCommunityIcons name="office-building-marker-outline" size={19} color="#f96302" />
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
                <Ionicons name={error ? 'cloud-offline-outline' : 'search-outline'} size={34} color="#f96302" />
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

    const renderFooter = () => (
        <View style={styles.footerContent}>
            {isLoadingMore && (
                <View style={styles.footerLoading}>
                    <Skeleton width={160} height={16} borderRadius={8} />
                    <Text style={styles.footerText}>Đang tải thêm...</Text>
                </View>
            )}
            <View style={styles.footerSpacer} />
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F5F6F8" />
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
                            tintColor="#f96302"
                            colors={['#f96302']}
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
        backgroundColor: '#F5F6F8',
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
        backgroundColor: '#FFF3E8',
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
        backgroundColor: '#FFF3E8',
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
        backgroundColor: '#f96302',
        borderColor: '#f96302',
    },
    categoryText: {
        color: '#475569',
        fontSize: 13,
        fontWeight: '800',
    },
    categoryTextActive: {
        color: '#FFFFFF',
    },
    recommendationsSection: {
        gap: 10,
    },
    sectionTitleGroup: {
        flex: 1,
        paddingRight: 12,
    },
    sectionSubtitleText: {
        color: '#64748B',
        fontSize: 12,
        fontWeight: '700',
        lineHeight: 17,
        marginTop: 3,
    },
    recommendationScroll: {
        gap: 12,
        paddingRight: 16,
    },
    recommendationCard: {
        width: 224,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.07,
        shadowRadius: 14,
        elevation: 3,
    },
    recommendationImageWrap: {
        height: 128,
        backgroundColor: '#E2E8F0',
    },
    recommendationImage: {
        width: '100%',
        height: '100%',
    },
    recommendationImageFallback: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
    },
    aiBadge: {
        position: 'absolute',
        top: 9,
        left: 9,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(249,99,2,0.92)',
        borderRadius: 13,
        paddingHorizontal: 8,
        paddingVertical: 5,
    },
    aiBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '900',
    },
    scoreBadge: {
        position: 'absolute',
        left: 9,
        bottom: 9,
        backgroundColor: 'rgba(15,23,42,0.74)',
        borderRadius: 13,
        paddingHorizontal: 8,
        paddingVertical: 5,
    },
    scoreBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '900',
    },
    recommendationVideoBadge: {
        position: 'absolute',
        right: 9,
        bottom: 9,
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: 'rgba(15,23,42,0.74)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    recommendationBody: {
        padding: 11,
        gap: 6,
    },
    recommendationPrice: {
        color: '#F97316',
        fontSize: 17,
        fontWeight: '900',
    },
    recommendationTitle: {
        color: '#0F172A',
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '900',
    },
    recommendationAddressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    recommendationAddress: {
        flex: 1,
        color: '#64748B',
        fontSize: 11,
        fontWeight: '700',
    },
    recommendationReason: {
        color: '#ea580c',
        fontSize: 11,
        lineHeight: 16,
        fontWeight: '800',
    },
    recommendationSkeletonCard: {
        width: 224,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    recommendationSkeletonBody: {
        padding: 11,
        gap: 8,
    },
    marketSection: {
        gap: 10,
    },
    marketCta: {
        marginHorizontal: 16,
        minHeight: 92,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 13,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 14,
        elevation: 2,
    },
    marketCtaBody: {
        flex: 1,
        gap: 4,
    },
    marketCtaTitle: {
        color: '#0F172A',
        fontSize: 14,
        fontWeight: '900',
    },
    marketCtaText: {
        color: '#64748B',
        fontSize: 12,
        lineHeight: 17,
        fontWeight: '700',
    },
    marketCtaMeta: {
        fontSize: 11,
        fontWeight: '900',
    },
    marketScroll: {
        gap: 12,
        paddingRight: 16,
    },
    marketCard: {
        width: 214,
        minHeight: 158,
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 7,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 14,
        elevation: 2,
    },
    marketIcon: {
        width: 38,
        height: 38,
        borderRadius: 14,
        backgroundColor: '#FFF7ED',
        justifyContent: 'center',
        alignItems: 'center',
    },
    marketCardTitle: {
        color: '#111827',
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '900',
    },
    marketCardValue: {
        color: '#f96302',
        fontSize: 18,
        fontWeight: '900',
    },
    marketCardMeta: {
        color: '#6B7280',
        fontSize: 11,
        lineHeight: 16,
        fontWeight: '700',
    },
    readMoreRow: {
        marginTop: 'auto',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    readMoreText: {
        color: '#f96302',
        fontSize: 12,
        fontWeight: '900',
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
        color: '#f96302',
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
        backgroundColor: '#FFF3E8',
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
        backgroundColor: '#FFF3E8',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    countText: {
        color: '#f96302',
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
        backgroundColor: '#FFF3E8',
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
        backgroundColor: '#f96302',
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
    footerContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 16,
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

