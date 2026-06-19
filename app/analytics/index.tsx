import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, ActivityIndicator, Animated, Modal, FlatList,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    useAnalyticsStore,
    HCM_DISTRICTS,
    ALL_HCM_WARDS_LABEL,
    DEFAULT_ANALYTICS_PROVINCE,
} from '../../store/analyticsStore';
import { PriceTrendItem, WardPriceDTO, RegionTransactionStat } from '../../types';

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────
const formatPrice = (price: number) => {
    if (!price || isNaN(price)) return '—';
    if (price >= 1000000000) return `${(price / 1000000000).toFixed(1)} tỷ`;
    if (price >= 1000000) return `${(price / 1000000).toFixed(1)} tr`;
    if (price >= 1000) return `${(price / 1000).toFixed(0)}k`;
    return price.toLocaleString('vi-VN');
};

const formatMonth = (month: string) => {
    // "2025-03" → "T3/25"
    const value = String(month || '').trim();
    if (!value) return '';

    const monthYearMatch = value.match(/^(\d{1,2})\/(\d{4})$/);
    if (monthYearMatch) {
        const [, m, y] = monthYearMatch;
        return `T${m.padStart(2, '0')}/${y}`;
    }

    const yearMonthMatch = value.match(/^(\d{4})-(\d{1,2})$/);
    if (yearMonthMatch) {
        const [, y, m] = yearMonthMatch;
        return `T${m.padStart(2, '0')}/${y}`;
    }

    return value;
};

// ──────────────────────────────────────────
// Bar Chart (tự vẽ, không dùng lib ngoài)
// ──────────────────────────────────────────
const formatWardPrice = (item: WardPriceDTO) => {
    const price = String(item.averagePrice ?? '').trim();
    const unit = item.unit?.trim();

    if (!price) return '—';
    if (!unit || price.includes(unit)) return price;

    return `${price} ${unit}`;
};

function BarChart({ data }: { data: PriceTrendItem[] }) {
    const barAnimations = useRef<Animated.Value[]>([]).current;

    // Khởi tạo animated values
    if (barAnimations.length !== data.length) {
        barAnimations.length = 0;
        data.forEach(() => barAnimations.push(new Animated.Value(0)));
    }

    useEffect(() => {
        if (data.length === 0) return;
        const animations = barAnimations.map((anim, i) =>
            Animated.timing(anim, {
                toValue: 1,
                duration: 600,
                delay: i * 80,
                useNativeDriver: false,
            })
        );
        Animated.stagger(60, animations).start();
    }, [data.length]);

    if (data.length === 0) {
        return (
            <View style={chartStyles.empty}>
                <Feather name="bar-chart-2" size={32} color="#CCC" />
                <Text style={chartStyles.emptyText}>Chưa có dữ liệu xu hướng</Text>
            </View>
        );
    }

    const maxPrice = Math.max(...data.map((d) => d.averagePrice));
    const chartHeight = 140;

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={[chartStyles.container, { height: chartHeight + 40 }]}>
                {data.map((item, i) => {
                    const ratio = maxPrice > 0 ? item.averagePrice / maxPrice : 0;
                    const barH = barAnimations[i]?.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, chartHeight * ratio],
                    }) ?? 0;

                    return (
                        <View key={i} style={chartStyles.barGroup}>
                            {/* Value label */}
                            <Text style={chartStyles.barLabel}>
                                {formatPrice(item.averagePrice)}
                            </Text>
                            {/* Bar */}
                            <View style={[chartStyles.barBg, { height: chartHeight }]}>
                                <Animated.View
                                    style={[
                                        chartStyles.bar,
                                        {
                                            height: barH,
                                            backgroundColor: i === data.length - 1 ? '#0066FF' : '#93C5FD',
                                        },
                                    ]}
                                />
                            </View>
                            {/* Month label */}
                            <Text style={chartStyles.monthLabel}>{formatMonth(item.month)}</Text>
                            {/* Posts count */}
                            <Text style={chartStyles.postLabel}>{item.totalPosts} tin</Text>
                        </View>
                    );
                })}
            </View>
        </ScrollView>
    );
}

const chartStyles = StyleSheet.create({
    container: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 4, paddingBottom: 4 },
    barGroup: { alignItems: 'center', marginHorizontal: 6, width: 52 },
    barLabel: { fontSize: 9, color: '#666', fontWeight: '600', marginBottom: 3, textAlign: 'center' },
    barBg: { width: 28, backgroundColor: '#F0F4FF', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
    bar: { width: '100%', borderRadius: 6, minHeight: 4 },
    monthLabel: { fontSize: 10, color: '#888', marginTop: 5, fontWeight: '600' },
    postLabel: { fontSize: 9, color: '#AAA', marginTop: 1 },
    empty: { alignItems: 'center', paddingVertical: 30, gap: 8 },
    emptyText: { fontSize: 13, color: '#AAA' },
});

// ──────────────────────────────────────────
// Insight Card (4 thẻ thống kê)
// ──────────────────────────────────────────
function InsightCard({
    icon, label, value, subValue, color, bg
}: {
    icon: any; label: string; value: string; subValue?: string; color: string; bg: string;
}) {
    return (
        <View style={[insightStyles.card, { backgroundColor: bg }]}>
            <View style={[insightStyles.iconWrap, { backgroundColor: color + '22' }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <Text style={insightStyles.value} numberOfLines={1}>{value}</Text>
            <Text style={insightStyles.label} numberOfLines={2}>{label}</Text>
            {subValue && <Text style={[insightStyles.sub, { color }]}>{subValue}</Text>}
        </View>
    );
}

const insightStyles = StyleSheet.create({
    card: {
        flex: 1, borderRadius: 14, padding: 14, gap: 6,
        minWidth: 130,
    },
    iconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    value: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
    label: { fontSize: 11, color: '#666', lineHeight: 15 },
    sub: { fontSize: 12, fontWeight: '700' },
});

// ──────────────────────────────────────────
// Region Row (top khu vực)
// ──────────────────────────────────────────
function RegionRow({ item, maxTotal, rank }: { item: RegionTransactionStat; maxTotal: number; rank: number }) {
    const ratio = maxTotal > 0 ? item.totalPosts / maxTotal : 0;
    const saleRatio = item.totalPosts > 0 ? item.forSaleCount / item.totalPosts : 0;
    const rentRatio = item.totalPosts > 0 ? item.forRentCount / item.totalPosts : 0;

    const rankColors = ['#F59E0B', '#9CA3AF', '#CD7C2F'];
    const rankColor = rank <= 3 ? rankColors[rank - 1] : '#CCC';

    return (
        <View style={regionStyles.row}>
            <View style={[regionStyles.rank, { backgroundColor: rankColor + '22' }]}>
                <Text style={[regionStyles.rankText, { color: rankColor }]}>{rank}</Text>
            </View>
            <View style={regionStyles.info}>
                <View style={regionStyles.topRow}>
                    <Text style={regionStyles.name}>{item.regionName}</Text>
                    <Text style={regionStyles.total}>{item.totalPosts.toLocaleString()} tin</Text>
                </View>
                {/* Progress bar: sale vs rent */}
                <View style={regionStyles.barWrap}>
                    <View style={[regionStyles.barSale, { flex: saleRatio }]} />
                    <View style={[regionStyles.barRent, { flex: rentRatio }]} />
                </View>
                <View style={regionStyles.legend}>
                    <View style={regionStyles.legendItem}>
                        <View style={[regionStyles.dot, { backgroundColor: '#0066FF' }]} />
                        <Text style={regionStyles.legendText}>Mua bán {item.forSaleCount.toLocaleString()}</Text>
                    </View>
                    <View style={regionStyles.legendItem}>
                        <View style={[regionStyles.dot, { backgroundColor: '#22C55E' }]} />
                        <Text style={regionStyles.legendText}>Cho thuê {item.forRentCount.toLocaleString()}</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const regionStyles = StyleSheet.create({
    row: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 12,
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
    },
    rank: {
        width: 32, height: 32, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center',
    },
    rankText: { fontSize: 14, fontWeight: '800' },
    info: { flex: 1, gap: 6 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    name: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
    total: { fontSize: 12, color: '#888', fontWeight: '500' },
    barWrap: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: '#F0F0F0' },
    barSale: { backgroundColor: '#0066FF', minWidth: 2 },
    barRent: { backgroundColor: '#22C55E', minWidth: 2 },
    legend: { flexDirection: 'row', gap: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    legendText: { fontSize: 11, color: '#666' },
});

// ──────────────────────────────────────────
// Ward Price Row
// ──────────────────────────────────────────
function WardRow({ item, maxPrice }: { item: WardPriceDTO; maxPrice: number }) {
    const numericPrice = parseFloat(String(item.averagePrice).replace(/[^0-9.]/g, '')) * 1_000_000 || 0;
    const ratio = maxPrice > 0 ? numericPrice / maxPrice : 0;

    return (
        <View style={wardStyles.row}>
            <View style={wardStyles.info}>
                <Text style={wardStyles.wardName}>{item.wardName}</Text>
                <View style={wardStyles.barWrap}>
                    <View style={[wardStyles.bar, { width: `${ratio * 100}%` }]} />
                </View>
            </View>
            <View style={wardStyles.priceWrap}>
                <Text style={wardStyles.price}>{formatWardPrice(item)}</Text>
                <Text style={wardStyles.posts}>{item.totalPosts} tin</Text>
            </View>
        </View>
    );
}

const wardStyles = StyleSheet.create({
    row: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
    },
    info: { flex: 1, gap: 5 },
    wardName: { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
    barWrap: { height: 5, backgroundColor: '#F0F0F0', borderRadius: 3, overflow: 'hidden' },
    bar: { height: '100%', backgroundColor: '#0066FF', borderRadius: 3, minWidth: 4 },
    priceWrap: { alignItems: 'flex-end', gap: 2 },
    price: { fontSize: 13, fontWeight: '700', color: '#0066FF' },
    posts: { fontSize: 10, color: '#AAA' },
});

// ──────────────────────────────────────────
// Main Screen
// ──────────────────────────────────────────
export default function AnalyticsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [showDistrictPicker, setShowDistrictPicker] = useState(false);

    const {
        transactionType, priceTrends, marketInsights,
        topRegions, wardPrices, selectedDistrict, error,
        isLoadingTrends, isLoadingRegions, isLoadingWards,
        setTransactionType, setSelectedDistrict,
        fetchPriceTrends, fetchTopRegions, fetchWardPrices,
    } = useAnalyticsStore();

    useEffect(() => {
        fetchPriceTrends();
        fetchTopRegions();
        fetchWardPrices();
    }, []);

    // Reload khi đổi loại giao dịch
    const handleTabChange = useCallback((type: 'FOR_RENT' | 'FOR_SALE') => {
        setTransactionType(type);
        // Trigger reload sau khi state đã cập nhật
        setTimeout(() => {
            useAnalyticsStore.getState().fetchPriceTrends();
            useAnalyticsStore.getState().fetchWardPrices();
        }, 0);
    }, []);

    const handleDistrictChange = useCallback((district: string) => {
        setSelectedDistrict(district === ALL_HCM_WARDS_LABEL ? '' : district);
        setShowDistrictPicker(false);
        setTimeout(() => useAnalyticsStore.getState().fetchWardPrices(), 0);
    }, []);

    // Tính maxPrice cho ward bars
    const maxWardPrice = wardPrices.reduce((max, w) => {
        const p = parseFloat(String(w.averagePrice).replace(/[^0-9.]/g, '')) * 1_000_000 || 0;
        return p > max ? p : max;
    }, 0);

    const maxRegionTotal = topRegions.reduce((max, r) => r.totalPosts > max ? r.totalPosts : max, 0);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <LinearGradient
                colors={['#0066FF', '#0044CC']}
                style={[styles.header, { paddingTop: insets.top + 8 }]}
            >
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Thị trường BĐS</Text>
                    <Text style={styles.headerSub}>Dữ liệu thống kê thời gian thực</Text>
                </View>
                <Ionicons name="analytics-outline" size={26} color="rgba(255,255,255,0.7)" />
            </LinearGradient>

            {/* Transaction Type Tab */}
            <View style={styles.txTypeBar}>
                <TouchableOpacity
                    style={[styles.txTab, transactionType === 'FOR_RENT' && styles.txTabActive]}
                    onPress={() => handleTabChange('FOR_RENT')}
                >
                    <Ionicons name="key-outline" size={15} color={transactionType === 'FOR_RENT' ? '#0066FF' : '#888'} />
                    <Text style={[styles.txTabText, transactionType === 'FOR_RENT' && styles.txTabTextActive]}>
                        Cho thuê
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.txTab, transactionType === 'FOR_SALE' && styles.txTabActive]}
                    onPress={() => handleTabChange('FOR_SALE')}
                >
                    <Ionicons name="pricetag-outline" size={15} color={transactionType === 'FOR_SALE' ? '#0066FF' : '#888'} />
                    <Text style={[styles.txTabText, transactionType === 'FOR_SALE' && styles.txTabTextActive]}>
                        Mua bán
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 16 }}
                showsVerticalScrollIndicator={false}
            >
                {error && (
                    <View style={styles.errorBanner}>
                        <Ionicons name="warning-outline" size={16} color="#B45309" />
                        <Text style={styles.errorBannerText}>{error}</Text>
                    </View>
                )}

                {/* ── Section 1: Market Insights ── */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="stats-chart" size={18} color="#0066FF" />
                        <Text style={styles.sectionTitle}>Tổng quan thị trường</Text>
                    </View>

                    {isLoadingTrends ? (
                        <View style={styles.loadingCenter}>
                            <ActivityIndicator color="#0066FF" />
                        </View>
                    ) : marketInsights ? (
                        <View style={styles.insightGrid}>
                            <InsightCard
                                icon="cash-outline"
                                label="Phân khúc phổ biến"
                                value={marketInsights.popularPriceText ?? '—'}
                                subValue={marketInsights.popularPriceUnit}
                                color="#0066FF"
                                bg="#F0F4FF"
                            />
                            <InsightCard
                                icon={marketInsights.yearlyGrowthTrend === 'UP' ? 'trending-up' : 'trending-down'}
                                label={marketInsights.yearlyGrowthLabel ?? 'Tăng trưởng năm'}
                                value={`${marketInsights.yearlyGrowthPercent ?? 0}%`}
                                subValue={marketInsights.yearlyGrowthTrend === 'UP' ? '▲ Tăng' : '▼ Giảm'}
                                color={marketInsights.yearlyGrowthTrend === 'UP' ? '#22C55E' : '#EF4444'}
                                bg={marketInsights.yearlyGrowthTrend === 'UP' ? '#F0FDF4' : '#FFF5F5'}
                            />
                            <InsightCard
                                icon="remove-circle-outline"
                                label={marketInsights.diffFromPeakLabel ?? 'Cách đỉnh'}
                                value={`${marketInsights.diffFromPeakPercent ?? 0}%`}
                                subValue={marketInsights.diffFromPeakTrend === 'DOWN' ? '▼ Dưới đỉnh' : '▲ Trên đỉnh'}
                                color="#F59E0B"
                                bg="#FEF3C7"
                            />
                        </View>
                    ) : (
                        <Text style={styles.noData}>Không có dữ liệu tổng quan</Text>
                    )}
                </View>

                {/* ── Section 2: Price Trend Chart ── */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="bar-chart-outline" size={18} color="#0066FF" />
                        <Text style={styles.sectionTitle}>Xu hướng giá theo tháng</Text>
                    </View>
                    <Text style={styles.sectionSub}>
                        {transactionType === 'FOR_RENT' ? 'Giá thuê trung bình (VND/tháng)' : 'Giá bán trung bình (VND)'}
                    </Text>
                    {isLoadingTrends ? (
                        <View style={styles.loadingCenter}><ActivityIndicator color="#0066FF" /></View>
                    ) : (
                        <BarChart data={priceTrends} />
                    )}
                </View>

                {/* ── Section 3: Top Regions ── */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="globe-outline" size={18} color="#0066FF" />
                        <Text style={styles.sectionTitle}>Top khu vực sôi động</Text>
                    </View>
                    {isLoadingRegions ? (
                        <View style={styles.loadingCenter}><ActivityIndicator color="#0066FF" /></View>
                    ) : topRegions.length === 0 ? (
                        <Text style={styles.noData}>Chưa có dữ liệu khu vực</Text>
                    ) : (
                        topRegions.map((item, i) => (
                            <RegionRow key={i} item={item} maxTotal={maxRegionTotal} rank={i + 1} />
                        ))
                    )}
                </View>

                {/* ── Section 4: Ward Prices ── */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="map-outline" size={18} color="#0066FF" />
                        <Text style={styles.sectionTitle}>Giá theo phường/xã</Text>
                    </View>
                    <Text style={styles.sectionSub}>
                        Khu vực mặc định: {DEFAULT_ANALYTICS_PROVINCE}
                    </Text>

                    {/* District picker trigger */}
                    <TouchableOpacity
                        style={styles.districtPicker}
                        onPress={() => setShowDistrictPicker(true)}
                    >
                        <Ionicons name="location-outline" size={16} color="#0066FF" />
                        <Text style={styles.districtPickerText}>
                            {selectedDistrict || ALL_HCM_WARDS_LABEL}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color="#888" style={{ marginLeft: 'auto' }} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.loadWardBtn}
                        onPress={fetchWardPrices}
                    >
                        <Ionicons name="refresh-outline" size={14} color="#0066FF" />
                        <Text style={styles.loadWardBtnText}>Tải dữ liệu phường</Text>
                    </TouchableOpacity>

                    {isLoadingWards ? (
                        <View style={styles.loadingCenter}><ActivityIndicator color="#0066FF" /></View>
                    ) : wardPrices.length === 0 ? (
                        <View style={styles.noDataWrap}>
                            <Ionicons name="map-outline" size={32} color="#DDD" />
                            <Text style={styles.noData}>
                                Không có dữ liệu giá phường/xã cho bộ lọc hiện tại
                            </Text>
                        </View>
                    ) : (
                        wardPrices.map((item, i) => (
                            <WardRow key={i} item={item} maxPrice={maxWardPrice} />
                        ))
                    )}
                </View>
            </ScrollView>

            {/* District Picker Modal */}
            <Modal visible={showDistrictPicker} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chọn quận/huyện</Text>
                            <TouchableOpacity onPress={() => setShowDistrictPicker(false)}>
                                <Ionicons name="close" size={22} color="#888" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={[ALL_HCM_WARDS_LABEL, ...HCM_DISTRICTS]}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.districtItem,
                                        (selectedDistrict || ALL_HCM_WARDS_LABEL) === item && styles.districtItemActive,
                                    ]}
                                    onPress={() => handleDistrictChange(item)}
                                >
                                    <Text style={[
                                        styles.districtItemText,
                                        (selectedDistrict || ALL_HCM_WARDS_LABEL) === item && styles.districtItemTextActive,
                                    ]}>
                                        {item}
                                    </Text>
                                    {(selectedDistrict || ALL_HCM_WARDS_LABEL) === item && (
                                        <Ionicons name="checkmark" size={18} color="#0066FF" />
                                    )}
                                </TouchableOpacity>
                            )}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingBottom: 16, gap: 12,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerCenter: { flex: 1 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: 'white' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 1 },

    txTypeBar: {
        flexDirection: 'row', backgroundColor: 'white',
        borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    },
    txTab: {
        flex: 1, flexDirection: 'row', justifyContent: 'center',
        alignItems: 'center', gap: 6, paddingVertical: 12,
    },
    txTabActive: { borderBottomWidth: 2, borderBottomColor: '#0066FF' },
    txTabText: { fontSize: 14, color: '#888', fontWeight: '500' },
    txTabTextActive: { color: '#0066FF', fontWeight: '700' },

    scroll: { flex: 1 },

    section: {
        backgroundColor: 'white', borderRadius: 16, padding: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
    sectionSub: { fontSize: 12, color: '#888', marginBottom: 12, marginTop: -8 },

    insightGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

    loadingCenter: { paddingVertical: 24, alignItems: 'center' },
    errorBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A',
        borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    },
    errorBannerText: { flex: 1, color: '#92400E', fontSize: 12, fontWeight: '600' },
    noData: { fontSize: 13, color: '#AAA', textAlign: 'center', paddingVertical: 16 },
    noDataWrap: { alignItems: 'center', paddingVertical: 24, gap: 8 },

    districtPicker: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#F0F4FF', borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8,
    },
    districtPickerText: { fontSize: 14, color: '#0066FF', fontWeight: '600' },
    loadWardBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        borderWidth: 1.5, borderColor: '#0066FF', borderRadius: 8,
        paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'flex-start', marginBottom: 12,
    },
    loadWardBtnText: { fontSize: 13, color: '#0066FF', fontWeight: '600' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: {
        backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingBottom: 32, maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    },
    modalTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
    districtItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: '#F8F8F8',
    },
    districtItemActive: { backgroundColor: '#F0F4FF' },
    districtItemText: { fontSize: 15, color: '#333' },
    districtItemTextActive: { color: '#0066FF', fontWeight: '700' },
});
