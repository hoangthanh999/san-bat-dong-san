import React, { useCallback, useEffect } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
    ALL_HCM_WARDS_LABEL,
    DEFAULT_ANALYTICS_PROVINCE,
    useAnalyticsStore,
} from '../../store/analyticsStore';
import { PriceTrendItem, RegionTransactionStat, WardPriceDTO } from '../../types';

const ORANGE = '#f96302';
const GREEN = '#16A34A';
const RED = '#DC2626';
const INK = '#0F172A';
const MUTED = '#64748B';

const toNumber = (value: unknown) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
};

const formatPrice = (value: unknown) => {
    const price = toNumber(value);
    if (!price) return '—';
    if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(price % 1_000_000_000 === 0 ? 0 : 1)} tỷ`;
    if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(price % 1_000_000 === 0 ? 0 : 1)} tr`;
    if (price >= 1_000) return `${Math.round(price / 1_000)}k`;
    return price.toLocaleString('vi-VN');
};

const formatPercent = (value?: number) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '0%';
    return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
};

const formatMonth = (value?: string) => {
    const raw = String(value || '').trim();
    const monthYear = raw.match(/^(\d{1,2})\/(\d{4})$/);
    if (monthYear) return `T${monthYear[1].padStart(2, '0')}/${monthYear[2]}`;

    const yearMonth = raw.match(/^(\d{4})-(\d{1,2})$/);
    if (yearMonth) return `T${yearMonth[2].padStart(2, '0')}/${yearMonth[1]}`;

    return raw || '—';
};

const formatWardPrice = (item: WardPriceDTO) => {
    const price = String(item.averagePrice ?? '').trim();
    const unit = item.unit?.trim();
    if (!price) return '—';
    if (!unit || price.includes(unit)) return price;
    return `${price} ${unit}`;
};

const normalizeRegionName = (name?: string) => {
    const raw = String(name || '').trim();
    if (!raw) return 'Chưa cập nhật';
    return raw
        .split(/\s+/)
        .map(part => part ? part.charAt(0).toLocaleUpperCase('vi-VN') + part.slice(1) : part)
        .join(' ');
};

function InsightCard({
    icon,
    label,
    value,
    note,
    color = ORANGE,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    note?: string;
    color?: string;
}) {
    return (
        <View style={styles.insightCard}>
            <View style={[styles.insightIcon, { backgroundColor: `${color}16` }]}>
                <Ionicons name={icon} size={18} color={color} />
            </View>
            <Text style={styles.insightValue} numberOfLines={1}>{value}</Text>
            <Text style={styles.insightLabel} numberOfLines={2}>{label}</Text>
            {!!note && <Text style={[styles.insightNote, { color }]} numberOfLines={2}>{note}</Text>}
        </View>
    );
}

function EmptyState({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
    return (
        <View style={styles.emptyState}>
            <Ionicons name={icon} size={30} color="#CBD5E1" />
            <Text style={styles.emptyText}>{text}</Text>
        </View>
    );
}

function TrendChart({
    data,
    unit,
}: {
    data: PriceTrendItem[];
    unit: string;
}) {
    if (data.length === 0) {
        return <EmptyState icon="analytics-outline" text="Chưa có dữ liệu xu hướng cho bộ lọc hiện tại." />;
    }

    if (data.length === 1) {
        const item = data[0];
        return (
            <View style={styles.insufficientTrend}>
                <View style={styles.insufficientIcon}>
                    <Ionicons name="radio-button-on-outline" size={20} color={ORANGE} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.insufficientTitle}>Chưa đủ dữ liệu xu hướng</Text>
                    <Text style={styles.insufficientText}>
                        Backend hiện chỉ trả 1 tháng ({formatMonth(item.month)}). Hiển thị như mốc tham chiếu thay vì vẽ biểu đồ xu hướng.
                    </Text>
                    <Text style={styles.insufficientValue}>
                        {formatPrice(item.averagePrice)} {unit} · {Number(item.totalPosts || 0).toLocaleString('vi-VN')} tin
                    </Text>
                </View>
            </View>
        );
    }

    const chartHeight = 180;
    const chartBodyHeight = 118;
    const step = 74;
    const chartWidth = Math.max(300, (data.length - 1) * step + 32);
    const prices = data.map(item => toNumber(item.averagePrice));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const span = Math.max(1, maxPrice - minPrice);
    const points = data.map((item, index) => {
        const ratio = (toNumber(item.averagePrice) - minPrice) / span;
        return {
            item,
            x: 16 + index * step,
            y: 18 + (chartBodyHeight - ratio * chartBodyHeight),
        };
    });

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={[styles.trendCanvas, { width: chartWidth, height: chartHeight }]}>
                <View style={styles.trendBaseline} />
                {points.slice(0, -1).map((point, index) => {
                    const next = points[index + 1];
                    const dx = next.x - point.x;
                    const dy = next.y - point.y;
                    const length = Math.sqrt(dx * dx + dy * dy);
                    const angle = `${Math.atan2(dy, dx)}rad`;

                    return (
                        <View
                            key={`${point.item.month}-${next.item.month}`}
                            style={[
                                styles.trendSegment,
                                {
                                    left: point.x,
                                    top: point.y,
                                    width: length,
                                    transform: [{ rotate: angle }],
                                },
                            ]}
                        />
                    );
                })}
                {points.map((point, index) => (
                    <View key={`${point.item.month}-${index}`} style={[styles.trendPointWrap, { left: point.x - 24, top: point.y - 20 }]}>
                        <Text style={styles.trendValue}>{formatPrice(point.item.averagePrice)}</Text>
                        <View style={[styles.trendPoint, index === points.length - 1 && styles.trendPointActive]} />
                    </View>
                ))}
                {points.map((point, index) => (
                    <View key={`label-${point.item.month}-${index}`} style={[styles.trendMonthWrap, { left: point.x - 26 }]}>
                        <Text style={styles.trendMonth}>{formatMonth(point.item.month)}</Text>
                        <Text style={styles.trendPosts}>{Number(point.item.totalPosts || 0).toLocaleString('vi-VN')} tin</Text>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

function RegionRow({ item, rank, maxTotal }: { item: RegionTransactionStat; rank: number; maxTotal: number }) {
    const total = Math.max(0, Number(item.totalPosts || 0));
    const sale = Math.max(0, Number(item.forSaleCount || 0));
    const rent = Math.max(0, Number(item.forRentCount || 0));
    const totalForSegments = Math.max(1, sale + rent);
    const totalRatio = maxTotal > 0 ? total / maxTotal : 0;

    return (
        <View style={styles.regionRow}>
            <View style={styles.rankBadge}>
                <Text style={styles.rankText}>{rank}</Text>
            </View>
            <View style={styles.regionBody}>
                <View style={styles.regionTopRow}>
                    <Text style={styles.regionName} numberOfLines={1}>{normalizeRegionName(item.regionName)}</Text>
                    <Text style={styles.regionTotal}>{total.toLocaleString('vi-VN')} tin</Text>
                </View>
                <View style={styles.regionScaleTrack}>
                    <View style={[styles.regionScaleFill, { width: `${Math.max(6, totalRatio * 100)}%` }]} />
                </View>
                <View style={styles.segmentBar}>
                    <View style={[styles.saleSegment, { flex: sale / totalForSegments }]} />
                    <View style={[styles.rentSegment, { flex: rent / totalForSegments }]} />
                </View>
                <View style={styles.legendRow}>
                    <Text style={styles.legendSale}>Mua bán {sale.toLocaleString('vi-VN')}</Text>
                    <Text style={styles.legendRent}>Cho thuê {rent.toLocaleString('vi-VN')}</Text>
                </View>
            </View>
        </View>
    );
}

function WardRow({ item, maxPrice }: { item: WardPriceDTO; maxPrice: number }) {
    const numericPrice = toNumber(String(item.averagePrice).replace(/[^0-9.]/g, ''));
    const ratio = maxPrice > 0 ? numericPrice / maxPrice : 0;

    return (
        <View style={styles.wardRow}>
            <View style={styles.wardBody}>
                <Text style={styles.wardName} numberOfLines={1}>{normalizeRegionName(item.wardName)}</Text>
                <View style={styles.wardTrack}>
                    <View style={[styles.wardFill, { width: `${Math.max(4, ratio * 100)}%` }]} />
                </View>
            </View>
            <View style={styles.wardValueWrap}>
                <Text style={styles.wardValue}>{formatWardPrice(item)}</Text>
                <Text style={styles.wardPosts}>{Number(item.totalPosts || 0).toLocaleString('vi-VN')} tin</Text>
            </View>
        </View>
    );
}

export default function AnalyticsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const {
        transactionType,
        priceTrends,
        marketInsights,
        topRegions,
        wardPrices,
        error,
        isLoadingTrends,
        isLoadingRegions,
        isLoadingWards,
        setTransactionType,
        fetchAll,
        fetchPriceTrends,
        fetchTopRegions,
        fetchWardPrices,
    } = useAnalyticsStore();

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const handleTransactionTypeChange = useCallback((nextType: 'FOR_RENT' | 'FOR_SALE') => {
        setTransactionType(nextType);
        setTimeout(() => {
            const store = useAnalyticsStore.getState();
            store.fetchPriceTrends();
            store.fetchWardPrices();
        }, 0);
    }, [setTransactionType]);

    const refresh = useCallback(() => {
        fetchPriceTrends();
        fetchTopRegions();
        fetchWardPrices();
    }, [fetchPriceTrends, fetchTopRegions, fetchWardPrices]);

    const isRent = transactionType === 'FOR_RENT';
    const unit = marketInsights?.popularPriceUnit || (isRent ? 'tr/tháng' : 'tr/m²');
    const growthDown = marketInsights?.yearlyGrowthTrend === 'DOWN';
    const maxRegionTotal = topRegions.reduce((max, item) => Math.max(max, Number(item.totalPosts || 0)), 0);
    const maxWardPrice = wardPrices.reduce((max, item) => {
        const value = toNumber(String(item.averagePrice).replace(/[^0-9.]/g, ''));
        return Math.max(max, value);
    }, 0);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" backgroundColor="#F5F6F8" />

            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity style={styles.iconButton} onPress={() => router.back()} accessibilityRole="button">
                    <Ionicons name="arrow-back" size={22} color={INK} />
                </TouchableOpacity>
                <View style={styles.headerTextGroup}>
                    <Text style={styles.headerTitle}>Góc nhìn thị trường</Text>
                    <Text style={styles.headerSubtitle}>Dữ liệu giá và khu vực nổi bật</Text>
                </View>
                <TouchableOpacity style={styles.iconButton} onPress={refresh} accessibilityRole="button">
                    <Ionicons name="refresh" size={20} color={ORANGE} />
                </TouchableOpacity>
            </View>

            <View style={styles.segmented}>
                <TouchableOpacity
                    style={[styles.segment, isRent && styles.segmentActive]}
                    onPress={() => handleTransactionTypeChange('FOR_RENT')}
                    activeOpacity={0.86}
                >
                    <Ionicons name="key-outline" size={15} color={isRent ? ORANGE : MUTED} />
                    <Text style={[styles.segmentText, isRent && styles.segmentTextActive]}>Cho thuê</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.segment, !isRent && styles.segmentActive]}
                    onPress={() => handleTransactionTypeChange('FOR_SALE')}
                    activeOpacity={0.86}
                >
                    <Ionicons name="pricetag-outline" size={15} color={!isRent ? ORANGE : MUTED} />
                    <Text style={[styles.segmentText, !isRent && styles.segmentTextActive]}>Mua bán</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
                showsVerticalScrollIndicator={false}
            >
                {error && (
                    <View style={styles.errorBanner}>
                        <Ionicons name="warning-outline" size={16} color="#B45309" />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View>
                            <Text style={styles.sectionTitle}>Tổng quan</Text>
                            <Text style={styles.sectionSubtitle}>Khu vực mặc định: {DEFAULT_ANALYTICS_PROVINCE}</Text>
                        </View>
                    </View>

                    {isLoadingTrends ? (
                        <View style={styles.loading}><ActivityIndicator color={ORANGE} /></View>
                    ) : marketInsights ? (
                        <View style={styles.insightGrid}>
                            <InsightCard
                                icon="cash-outline"
                                label="Giá phổ biến"
                                value={`${marketInsights.popularPriceText ?? '—'} ${marketInsights.popularPriceUnit ?? unit}`}
                                note={marketInsights.popularPriceLabel}
                            />
                            <InsightCard
                                icon={growthDown ? 'trending-down' : 'trending-up'}
                                label="Tăng trưởng"
                                value={formatPercent(marketInsights.yearlyGrowthPercent)}
                                note={marketInsights.yearlyGrowthLabel}
                                color={growthDown ? RED : GREEN}
                            />
                            <InsightCard
                                icon="analytics-outline"
                                label="So với đỉnh"
                                value={formatPercent(marketInsights.diffFromPeakPercent)}
                                note={marketInsights.diffFromPeakLabel}
                                color="#F59E0B"
                            />
                        </View>
                    ) : (
                        <EmptyState icon="stats-chart-outline" text="Không có dữ liệu tổng quan cho bộ lọc hiện tại." />
                    )}
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View>
                            <Text style={styles.sectionTitle}>Xu hướng giá theo tháng</Text>
                            <Text style={styles.sectionSubtitle}>
                                {isRent ? 'Giá thuê trung vị' : 'Giá bán trung vị theo m²'} · {unit}
                            </Text>
                        </View>
                    </View>
                    {isLoadingTrends ? (
                        <View style={styles.loading}><ActivityIndicator color={ORANGE} /></View>
                    ) : (
                        <TrendChart data={priceTrends} unit={unit} />
                    )}
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View>
                            <Text style={styles.sectionTitle}>Top khu vực sôi động</Text>
                            <Text style={styles.sectionSubtitle}>Xếp hạng theo số tin đang hoạt động</Text>
                        </View>
                    </View>
                    {isLoadingRegions ? (
                        <View style={styles.loading}><ActivityIndicator color={ORANGE} /></View>
                    ) : topRegions.length === 0 ? (
                        <EmptyState icon="location-outline" text="Chưa có dữ liệu khu vực." />
                    ) : (
                        topRegions.slice(0, 5).map((item, index) => (
                            <RegionRow key={`${item.regionName}-${index}`} item={item} rank={index + 1} maxTotal={maxRegionTotal} />
                        ))
                    )}
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View>
                            <Text style={styles.sectionTitle}>Giá theo phường/xã</Text>
                            <Text style={styles.sectionSubtitle}>{ALL_HCM_WARDS_LABEL} · {unit}</Text>
                        </View>
                        <TouchableOpacity style={styles.smallButton} onPress={fetchWardPrices} activeOpacity={0.86}>
                            <Ionicons name="refresh-outline" size={14} color={ORANGE} />
                        </TouchableOpacity>
                    </View>
                    {isLoadingWards ? (
                        <View style={styles.loading}><ActivityIndicator color={ORANGE} /></View>
                    ) : wardPrices.length === 0 ? (
                        <EmptyState icon="map-outline" text="Không có dữ liệu giá phường/xã cho bộ lọc hiện tại." />
                    ) : (
                        wardPrices.slice(0, 8).map((item, index) => (
                            <WardRow key={`${item.wardName}-${index}`} item={item} maxPrice={maxWardPrice} />
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F6F8',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: '#F5F6F8',
    },
    iconButton: {
        width: 42,
        height: 42,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    headerTextGroup: {
        flex: 1,
    },
    headerTitle: {
        color: INK,
        fontSize: 22,
        fontWeight: '900',
    },
    headerSubtitle: {
        color: MUTED,
        fontSize: 12,
        fontWeight: '700',
        marginTop: 2,
    },
    segmented: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 10,
        padding: 4,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    segment: {
        flex: 1,
        minHeight: 38,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    segmentActive: {
        backgroundColor: '#FFF3E8',
    },
    segmentText: {
        color: MUTED,
        fontSize: 13,
        fontWeight: '800',
    },
    segmentTextActive: {
        color: ORANGE,
    },
    scroll: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 16,
        gap: 14,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#FFFBEB',
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    errorText: {
        flex: 1,
        color: '#92400E',
        fontSize: 12,
        fontWeight: '700',
    },
    section: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 14,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        gap: 12,
    },
    sectionTitle: {
        color: INK,
        fontSize: 16,
        fontWeight: '900',
    },
    sectionSubtitle: {
        color: MUTED,
        fontSize: 12,
        lineHeight: 17,
        fontWeight: '700',
        marginTop: 2,
    },
    loading: {
        minHeight: 96,
        alignItems: 'center',
        justifyContent: 'center',
    },
    insightGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    insightCard: {
        flexGrow: 1,
        flexBasis: '47%',
        minHeight: 142,
        borderRadius: 16,
        padding: 12,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#EEF2F7',
        gap: 6,
    },
    insightIcon: {
        width: 34,
        height: 34,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    insightValue: {
        color: INK,
        fontSize: 17,
        fontWeight: '900',
    },
    insightLabel: {
        color: MUTED,
        fontSize: 12,
        fontWeight: '800',
        lineHeight: 17,
    },
    insightNote: {
        marginTop: 'auto',
        fontSize: 11,
        fontWeight: '700',
        lineHeight: 15,
    },
    emptyState: {
        minHeight: 112,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 18,
    },
    emptyText: {
        color: MUTED,
        fontSize: 13,
        lineHeight: 19,
        fontWeight: '700',
        textAlign: 'center',
    },
    insufficientTrend: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        padding: 13,
        borderRadius: 16,
        backgroundColor: '#FFF7ED',
        borderWidth: 1,
        borderColor: '#FED7AA',
    },
    insufficientIcon: {
        width: 38,
        height: 38,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    insufficientTitle: {
        color: INK,
        fontSize: 14,
        fontWeight: '900',
    },
    insufficientText: {
        color: MUTED,
        fontSize: 12,
        lineHeight: 18,
        fontWeight: '700',
        marginTop: 3,
    },
    insufficientValue: {
        color: ORANGE,
        fontSize: 13,
        fontWeight: '900',
        marginTop: 8,
    },
    trendCanvas: {
        position: 'relative',
        marginTop: 4,
    },
    trendBaseline: {
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 36,
        height: 1,
        backgroundColor: '#E2E8F0',
    },
    trendSegment: {
        position: 'absolute',
        height: 3,
        borderRadius: 2,
        backgroundColor: ORANGE,
        transformOrigin: 'left center',
    },
    trendPointWrap: {
        position: 'absolute',
        width: 48,
        alignItems: 'center',
        gap: 4,
    },
    trendValue: {
        color: INK,
        fontSize: 10,
        fontWeight: '900',
    },
    trendPoint: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FDBA74',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    trendPointActive: {
        width: 13,
        height: 13,
        borderRadius: 7,
        backgroundColor: ORANGE,
    },
    trendMonthWrap: {
        position: 'absolute',
        bottom: 0,
        width: 52,
        alignItems: 'center',
    },
    trendMonth: {
        color: INK,
        fontSize: 10,
        fontWeight: '900',
    },
    trendPosts: {
        color: MUTED,
        fontSize: 9,
        fontWeight: '700',
        marginTop: 2,
    },
    regionRow: {
        flexDirection: 'row',
        gap: 11,
        paddingVertical: 11,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    rankBadge: {
        width: 32,
        height: 32,
        borderRadius: 12,
        backgroundColor: '#FFF3E8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankText: {
        color: ORANGE,
        fontSize: 14,
        fontWeight: '900',
    },
    regionBody: {
        flex: 1,
        gap: 7,
    },
    regionTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
    },
    regionName: {
        flex: 1,
        color: INK,
        fontSize: 14,
        fontWeight: '900',
    },
    regionTotal: {
        color: MUTED,
        fontSize: 12,
        fontWeight: '800',
    },
    regionScaleTrack: {
        height: 5,
        borderRadius: 3,
        backgroundColor: '#F1F5F9',
        overflow: 'hidden',
    },
    regionScaleFill: {
        height: '100%',
        borderRadius: 3,
        backgroundColor: '#FDBA74',
    },
    segmentBar: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        backgroundColor: '#F1F5F9',
        flexDirection: 'row',
    },
    saleSegment: {
        backgroundColor: ORANGE,
    },
    rentSegment: {
        backgroundColor: '#22C55E',
    },
    legendRow: {
        flexDirection: 'row',
        gap: 12,
        flexWrap: 'wrap',
    },
    legendSale: {
        color: ORANGE,
        fontSize: 11,
        fontWeight: '800',
    },
    legendRent: {
        color: '#16A34A',
        fontSize: 11,
        fontWeight: '800',
    },
    smallButton: {
        width: 34,
        height: 34,
        borderRadius: 12,
        backgroundColor: '#FFF3E8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    wardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 11,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    wardBody: {
        flex: 1,
        gap: 7,
    },
    wardName: {
        color: INK,
        fontSize: 13,
        fontWeight: '900',
    },
    wardTrack: {
        height: 6,
        borderRadius: 3,
        backgroundColor: '#F1F5F9',
        overflow: 'hidden',
    },
    wardFill: {
        height: '100%',
        borderRadius: 3,
        backgroundColor: ORANGE,
    },
    wardValueWrap: {
        alignItems: 'flex-end',
        minWidth: 82,
    },
    wardValue: {
        color: ORANGE,
        fontSize: 13,
        fontWeight: '900',
    },
    wardPosts: {
        color: MUTED,
        fontSize: 10,
        fontWeight: '700',
        marginTop: 2,
    },
});
