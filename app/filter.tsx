import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Switch, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePropertyStore } from '../store/propertyStore';
import { searchService } from '../services/api/search';
import { amenityService } from '../services/api/amenities';
import { RoomFilters, Amenity } from '../types';

// ─── Constants ────────────────────────────────────────────────
const PRICE_RANGES_RENT = [
    { label: 'Dưới 3 triệu', min: 0, max: 3000000 },
    { label: '3 – 5 triệu', min: 3000000, max: 5000000 },
    { label: '5 – 10 triệu', min: 5000000, max: 10000000 },
    { label: '10 – 20 triệu', min: 10000000, max: 20000000 },
    { label: 'Trên 20 triệu', min: 20000000, max: undefined },
];

const PRICE_RANGES_SALE = [
    { label: 'Dưới 500 triệu', min: 0, max: 500000000 },
    { label: '500tr – 1 tỷ', min: 500000000, max: 1000000000 },
    { label: '1 – 3 tỷ', min: 1000000000, max: 3000000000 },
    { label: '3 – 10 tỷ', min: 3000000000, max: 10000000000 },
    { label: 'Trên 10 tỷ', min: 10000000000, max: undefined },
];

const AREA_RANGES = [
    { label: 'Dưới 30 m²', min: 0, max: 30 },
    { label: '30 – 60 m²', min: 30, max: 60 },
    { label: '60 – 100 m²', min: 60, max: 100 },
    { label: '100 – 200 m²', min: 100, max: 200 },
    { label: 'Trên 200 m²', min: 200, max: undefined },
];

const BEDROOM_OPTIONS = [0, 1, 2, 3, 4];

const FURNISHING_OPTIONS = [
    { val: 'UNFURNISHED', label: 'Không có' },
    { val: 'PARTIALLY_FURNISHED', label: 'Cơ bản' },
    { val: 'FULLY_FURNISHED', label: 'Đầy đủ' },
];

const AVAILABILITY_OPTIONS = [
    { val: 'IMMEDIATELY', label: 'Vào ngay' },
    { val: 'THIS_MONTH', label: 'Tháng này' },
    { val: 'NEXT_MONTH', label: 'Tháng sau' },
    { val: 'NEGOTIABLE', label: 'Thương lượng' },
];

const SORT_OPTIONS = [
    { val: 'newest', label: 'Mới nhất' },
    { val: 'price_asc', label: 'Giá thấp → cao' },
    { val: 'price_desc', label: 'Giá cao → thấp' },
];

// ─── Sub-component: Chip ──────────────────────────────────────
function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
    return (
        <TouchableOpacity style={[styles.chip, selected && styles.chipSelected]} onPress={onPress}>
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
        </TouchableOpacity>
    );
}

function SectionHeader({ title }: { title: string }) {
    return <Text style={styles.sectionLabel}>{title}</Text>;
}

// ─── Extended local filter type ───────────────────────────────
interface LocalFilters extends RoomFilters {
    priceIndex?: number;
    areaIndex?: number;
    transactionType?: string;      // 'FOR_RENT' | 'FOR_SALE'
    propertyTypes?: string[];      // multi-select
    furnishingStatuses?: string[];
    availabilityStatuses?: string[];
    amenities?: string[];
    hasBalcony?: boolean;
    minBedrooms?: number;
}

/**
 * FilterScreen — Full-page route screen.
 * Điều hướng đến bằng router.push('/filter').
 * Khi Apply: gọi searchService.searchProperties với full params backend.
 */
export default function FilterScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { filters, setFilters, setSearchResults, resetFilters } = usePropertyStore();

    const [local, setLocal] = useState<LocalFilters>({ ...filters });
    const [amenityList, setAmenityList] = useState<Amenity[]>([]);
    const [isApplying, setIsApplying] = useState(false);

    const isSale = local.transactionType === 'FOR_SALE';
    const priceRanges = isSale ? PRICE_RANGES_SALE : PRICE_RANGES_RENT;

    useEffect(() => {
        amenityService.getAll()
            .then(data => setAmenityList(data || []))
            .catch(() => {});
    }, []);

    const updateLocal = (key: keyof LocalFilters, value: any) =>
        setLocal(p => ({ ...p, [key]: value }));

    const togglePriceRange = (index: number) => {
        const range = priceRanges[index];
        setLocal(p => ({
            ...p,
            priceIndex: p.priceIndex === index ? undefined : index,
            minPrice: p.priceIndex === index ? undefined : range.min,
            maxPrice: p.priceIndex === index ? undefined : range.max,
        }));
    };

    const toggleAreaRange = (index: number) => {
        const range = AREA_RANGES[index];
        setLocal(p => ({
            ...p,
            areaIndex: p.areaIndex === index ? undefined : index,
            minArea: p.areaIndex === index ? undefined : range.min,
            maxArea: p.areaIndex === index ? undefined : range.max,
        }));
    };

    const toggleMulti = (key: 'propertyTypes' | 'furnishingStatuses' | 'availabilityStatuses' | 'amenities', val: string) => {
        const cur: string[] = (local[key] as string[]) || [];
        updateLocal(key, cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val]);
    };

    const handleApply = async () => {
        // Persist basic filters to store (for backward compat with non-search screens)
        setFilters({
            transactionType: local.transactionType,
            propertyType: local.propertyTypes?.[0], // simple compat
            minPrice: local.minPrice,
            maxPrice: local.maxPrice,
            minArea: local.minArea,
            maxArea: local.maxArea,
            sortBy: local.sortBy,
            bedroomList: local.minBedrooms != null ? [local.minBedrooms] : [],
        });

        // Build backend search request
        const hasAdvancedFilters =
            local.transactionType ||
            (local.propertyTypes?.length ?? 0) > 0 ||
            local.minPrice != null || local.maxPrice != null ||
            local.minArea != null || local.maxArea != null ||
            local.minBedrooms != null ||
            (local.furnishingStatuses?.length ?? 0) > 0 ||
            (local.availabilityStatuses?.length ?? 0) > 0 ||
            (local.amenities?.length ?? 0) > 0 ||
            local.hasBalcony;

        if (hasAdvancedFilters) {
            setIsApplying(true);
            try {
                // Map sortBy frontend → backend sortBy/sortDir
                let sortBy = 'createdAt';
                let sortDir = 'desc';
                if (local.sortBy === 'price_asc') { sortBy = 'price'; sortDir = 'asc'; }
                else if (local.sortBy === 'price_desc') { sortBy = 'price'; sortDir = 'desc'; }

                const results = await searchService.searchProperties({
                    transactionTypes: local.transactionType ? [local.transactionType] : undefined,
                    propertyTypes: local.propertyTypes?.length ? local.propertyTypes : undefined,
                    minPrice: local.minPrice,
                    maxPrice: local.maxPrice,
                    minArea: local.minArea,
                    maxArea: local.maxArea,
                    minBedrooms: local.minBedrooms,
                    furnishingStatuses: local.furnishingStatuses?.length ? local.furnishingStatuses : undefined,
                    availabilityStatuses: local.availabilityStatuses?.length ? local.availabilityStatuses : undefined,
                    amenities: local.amenities?.length ? local.amenities : undefined,
                    hasBalcony: local.hasBalcony || undefined,
                    sortBy,
                    sortDir,
                    page: 0,
                    size: 20,
                });
                setSearchResults(results);
            } catch (err) {
                console.warn('[Filter] Backend search failed:', err);
            } finally {
                setIsApplying(false);
            }
        }

        router.back();
    };

    const handleReset = () => {
        setLocal({});
        resetFilters();
        router.back();
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Bộ lọc nâng cao</Text>
                <TouchableOpacity onPress={handleReset}>
                    <Text style={styles.resetBtn}>Đặt lại</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

                {/* Hình thức giao dịch */}
                <View style={styles.section}>
                    <SectionHeader title="Hình thức giao dịch" />
                    <View style={styles.chipRow}>
                        {[
                            { val: undefined, label: 'Tất cả' },
                            { val: 'FOR_RENT', label: '🏠 Cho thuê' },
                            { val: 'FOR_SALE', label: '💰 Mua bán' },
                        ].map(opt => (
                            <Chip
                                key={opt.label}
                                label={opt.label}
                                selected={local.transactionType === opt.val}
                                onPress={() => setLocal(p => ({ ...p, transactionType: opt.val, priceIndex: undefined, minPrice: undefined, maxPrice: undefined }))}
                            />
                        ))}
                    </View>
                </View>

                {/* Loại BĐS (multi-select) */}
                <View style={styles.section}>
                    <SectionHeader title="Loại bất động sản" />
                    <View style={styles.chipRow}>
                        {[
                            { val: 'ROOM', label: 'Phòng trọ' },
                            { val: 'APARTMENT', label: 'Căn hộ' },
                            { val: 'HOUSE', label: 'Nhà' },
                            { val: 'LAND', label: 'Đất' },
                        ].map(opt => (
                            <Chip
                                key={opt.val}
                                label={opt.label}
                                selected={(local.propertyTypes || []).includes(opt.val)}
                                onPress={() => toggleMulti('propertyTypes', opt.val)}
                            />
                        ))}
                    </View>
                </View>

                {/* Khoảng giá */}
                <View style={styles.section}>
                    <SectionHeader title={isSale ? 'Khoảng giá bán' : 'Khoảng giá thuê'} />
                    <View style={styles.chipRow}>
                        {priceRanges.map((r, i) => (
                            <Chip
                                key={r.label}
                                label={r.label}
                                selected={local.priceIndex === i}
                                onPress={() => togglePriceRange(i)}
                            />
                        ))}
                    </View>
                </View>

                {/* Diện tích */}
                <View style={styles.section}>
                    <SectionHeader title="Diện tích" />
                    <View style={styles.chipRow}>
                        {AREA_RANGES.map((r, i) => (
                            <Chip
                                key={r.label}
                                label={r.label}
                                selected={local.areaIndex === i}
                                onPress={() => toggleAreaRange(i)}
                            />
                        ))}
                    </View>
                </View>

                {/* Số phòng ngủ tối thiểu */}
                <View style={styles.section}>
                    <SectionHeader title="Số phòng ngủ tối thiểu" />
                    <View style={styles.chipRow}>
                        <Chip
                            label="Tất cả"
                            selected={local.minBedrooms == null}
                            onPress={() => updateLocal('minBedrooms', undefined)}
                        />
                        {BEDROOM_OPTIONS.map(n => (
                            <Chip
                                key={n}
                                label={n === 0 ? 'Studio' : `${n}+ PN`}
                                selected={local.minBedrooms === n}
                                onPress={() => updateLocal('minBedrooms', n)}
                            />
                        ))}
                    </View>
                </View>

                {/* Nội thất */}
                <View style={styles.section}>
                    <SectionHeader title="Nội thất" />
                    <View style={styles.chipRow}>
                        {FURNISHING_OPTIONS.map(opt => (
                            <Chip
                                key={opt.val}
                                label={opt.label}
                                selected={(local.furnishingStatuses || []).includes(opt.val)}
                                onPress={() => toggleMulti('furnishingStatuses', opt.val)}
                            />
                        ))}
                    </View>
                </View>

                {/* Tình trạng phòng (chỉ cho thuê) */}
                {!isSale && (
                    <View style={styles.section}>
                        <SectionHeader title="Có thể vào ở" />
                        <View style={styles.chipRow}>
                            {AVAILABILITY_OPTIONS.map(opt => (
                                <Chip
                                    key={opt.val}
                                    label={opt.label}
                                    selected={(local.availabilityStatuses || []).includes(opt.val)}
                                    onPress={() => toggleMulti('availabilityStatuses', opt.val)}
                                />
                            ))}
                        </View>
                    </View>
                )}

                {/* Ban công */}
                <View style={styles.section}>
                    <View style={styles.switchRow}>
                        <Text style={styles.sectionLabel}>Có ban công</Text>
                        <Switch
                            value={!!local.hasBalcony}
                            onValueChange={v => updateLocal('hasBalcony', v || undefined)}
                            trackColor={{ false: '#DDD', true: '#AAC8FF' }}
                            thumbColor={local.hasBalcony ? '#0066FF' : '#F4F4F4'}
                        />
                    </View>
                </View>

                {/* Tiện ích */}
                {amenityList.length > 0 && (
                    <View style={styles.section}>
                        <SectionHeader title="Tiện ích" />
                        <View style={styles.chipRow}>
                            {amenityList.map(a => (
                                <Chip
                                    key={a.id}
                                    label={a.name}
                                    selected={(local.amenities || []).includes(a.name)}
                                    onPress={() => toggleMulti('amenities', a.name)}
                                />
                            ))}
                        </View>
                    </View>
                )}

                {/* Sắp xếp */}
                <View style={styles.section}>
                    <SectionHeader title="Sắp xếp theo" />
                    <View style={styles.chipRow}>
                        {SORT_OPTIONS.map(opt => (
                            <Chip
                                key={opt.val}
                                label={opt.label}
                                selected={local.sortBy === opt.val}
                                onPress={() =>
                                    updateLocal('sortBy', local.sortBy === opt.val ? undefined : opt.val as any)
                                }
                            />
                        ))}
                    </View>
                </View>

                <View style={{ height: 30 }} />
            </ScrollView>

            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity
                    style={[styles.applyBtn, isApplying && styles.applyBtnDisabled]}
                    onPress={handleApply}
                    disabled={isApplying}
                >
                    {isApplying
                        ? <ActivityIndicator color="white" size="small" />
                        : <Text style={styles.applyBtnText}>Áp dụng bộ lọc</Text>
                    }
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        backgroundColor: 'white',
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
    resetBtn: { color: '#888', fontSize: 15, fontWeight: '600' },
    scrollView: { flex: 1 },
    section: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 },
    sectionLabel: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderWidth: 1.5,
        borderColor: '#E0E0E0',
        borderRadius: 20,
    },
    chipSelected: { borderColor: '#0066FF', backgroundColor: '#E8F0FF' },
    chipText: { fontSize: 13, color: '#666' },
    chipTextSelected: { color: '#0066FF', fontWeight: '600' },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    bottomBar: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        backgroundColor: 'white',
    },
    applyBtn: {
        backgroundColor: '#0066FF',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    applyBtnDisabled: { backgroundColor: '#AAC8FF' },
    applyBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
