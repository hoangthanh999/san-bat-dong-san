import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Switch, ActivityIndicator, TextInput, Alert, PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePropertyStore } from '../store/propertyStore';
import { useProjectStore } from '../store/projectStore';
import { searchService } from '../services/api/search';
import { amenityService } from '../services/api/amenities';
import { RoomFilters, Amenity } from '../types';
import { formatCompactVND } from '../utils/formatPrice';

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

const BEDROOM_OPTIONS = [0, 1, 2, 3, 4, 5];
const BATHROOM_OPTIONS = [1, 2, 3, 4, 5];

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

type CountMode = 'exact' | 'min';

const RENT_PRICE_STEP = 500_000;
const SALE_PRICE_STEP = 100_000_000;

const getPriceStep = (transactionType?: string) => (
    transactionType === 'FOR_RENT' ? RENT_PRICE_STEP : SALE_PRICE_STEP
);

const getFallbackMaxPrice = (transactionType?: string) => (
    transactionType === 'FOR_RENT' ? 100_000_000 : 10_000_000_000
);

const clampNumber = (value: number, min: number, max: number) => {
    if (!Number.isFinite(value)) return min;
    return Math.min(Math.max(value, min), max);
};

const snapPriceToStep = (value: number, step: number) => Math.round(value / step) * step;

const niceCeilPrice = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return 0;

    if (value <= 100_000_000) {
        return Math.ceil(value / 10_000_000) * 10_000_000;
    }

    if (value <= 1_000_000_000) {
        return Math.ceil(value / 100_000_000) * 100_000_000;
    }

    if (value <= 5_000_000_000) {
        return Math.ceil(value / 1_000_000_000) * 1_000_000_000;
    }

    if (value <= 10_000_000_000) {
        return 10_000_000_000;
    }

    if (value <= 50_000_000_000) {
        return Math.ceil(value / 5_000_000_000) * 5_000_000_000;
    }

    return Math.ceil(value / 10_000_000_000) * 10_000_000_000;
};

const parsePriceInput = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return undefined;
    if (trimmed.startsWith('-')) return 0;

    const digits = trimmed.replace(/[^\d]/g, '');
    if (!digits) return undefined;

    const value = Number(digits);
    return Number.isFinite(value) ? Math.max(0, value) : undefined;
};

const sanitizePrice = (value?: number) => {
    if (value == null || !Number.isFinite(value)) return undefined;
    return Math.max(0, value);
};

const getCountLabel = (value: number | undefined, unit: 'PN' | 'WC', mode: CountMode = 'min') => {
    if (value == null) return 'Tất cả';
    if (unit === 'PN' && value === 0) return 'Studio';
    return mode === 'exact'
        ? `Chính xác ${value} ${unit}`
        : `Từ ${value} ${unit} trở lên`;
};

function PriceRangeSlider({
    min,
    max,
    ceiling,
    step,
    onChange,
}: {
    min: number;
    max: number;
    ceiling: number;
    step: number;
    onChange: (min: number, max: number) => void;
}) {
    const [trackWidth, setTrackWidth] = useState(0);
    const valuesRef = useRef({ min, max });
    const dragStartRef = useRef({ min, max });

    useEffect(() => {
        valuesRef.current = { min, max };
    }, [min, max]);

    const valueToPercent = useCallback((value: number) => {
        if (ceiling <= 0) return 0;
        return clampNumber(value / ceiling, 0, 1) * 100;
    }, [ceiling]);

    const moveThumb = useCallback((thumb: 'min' | 'max', dx: number) => {
        if (trackWidth <= 0 || ceiling <= 0) return;

        const delta = (dx / trackWidth) * ceiling;
        const start = dragStartRef.current;

        if (thumb === 'min') {
            const nextMin = clampNumber(snapPriceToStep(start.min + delta, step), 0, valuesRef.current.max);
            onChange(nextMin, valuesRef.current.max);
            return;
        }

        const nextMax = clampNumber(snapPriceToStep(start.max + delta, step), valuesRef.current.min, ceiling);
        onChange(valuesRef.current.min, nextMax);
    }, [ceiling, onChange, step, trackWidth]);

    const minResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
            dragStartRef.current = valuesRef.current;
        },
        onPanResponderMove: (_, gestureState) => moveThumb('min', gestureState.dx),
    }), [moveThumb]);

    const maxResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
            dragStartRef.current = valuesRef.current;
        },
        onPanResponderMove: (_, gestureState) => moveThumb('max', gestureState.dx),
    }), [moveThumb]);

    const minPercent = valueToPercent(min);
    const maxPercent = valueToPercent(max);

    return (
        <View style={styles.rangeSlider}>
            <View style={styles.rangeValueRow}>
                <Text style={styles.rangeValueText}>{formatCompactVND(min)}</Text>
                <Text style={styles.rangeValueText}>{formatCompactVND(max)}</Text>
            </View>
            <View style={styles.rangeTrackWrap} onLayout={event => setTrackWidth(event.nativeEvent.layout.width)}>
                <View style={styles.rangeTrack} />
                <View
                    style={[
                        styles.rangeTrackActive,
                        { left: `${minPercent}%`, right: `${100 - maxPercent}%` },
                    ]}
                />
                <View
                    style={[styles.rangeThumb, styles.rangeThumbMin, { left: `${minPercent}%` }]}
                    {...minResponder.panHandlers}
                />
                <View
                    style={[styles.rangeThumb, styles.rangeThumbMax, { left: `${maxPercent}%` }]}
                    {...maxResponder.panHandlers}
                />
            </View>
            <View style={styles.rangeLimitRow}>
                <Text style={styles.rangeLimitText}>0</Text>
                <Text style={styles.rangeLimitText}>{formatCompactVND(ceiling)}</Text>
            </View>
        </View>
    );
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
    minBathrooms?: number;
    projectId?: number;
}

/**
 * FilterScreen — Full-page route screen.
 * Điều hướng đến bằng router.push('/filter').
 * Khi Apply: gọi searchService.searchProperties với full params backend.
 */
export default function FilterScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { filters, rooms, searchResults, setFilters, setSearchResults, resetFilters, clearSearchResults } = usePropertyStore();
    const { projects, fetchProjects } = useProjectStore();

    const [local, setLocal] = useState<LocalFilters>(() => ({
        ...filters,
        bedroomMode: filters.bedroomMode ?? 'min',
        bedroomValue: filters.bedroomValue ?? filters.bedroomList?.[0],
        minBedrooms: filters.bedroomValue ?? filters.bedroomList?.[0],
        bathroomMode: filters.bathroomMode ?? 'min',
        bathroomValue: filters.bathroomValue ?? filters.minBathrooms,
        minBathrooms: filters.bathroomValue ?? filters.minBathrooms,
    }));
    const [amenityList, setAmenityList] = useState<Amenity[]>([]);
    const [isApplying, setIsApplying] = useState(false);

    const isSale = local.transactionType === 'FOR_SALE';
    const priceRanges = isSale ? PRICE_RANGES_SALE : PRICE_RANGES_RENT;
    const priceStep = getPriceStep(local.transactionType);
    const priceSourceRooms = searchResults ?? rooms;
    const dynamicMaxPrice = useMemo(() => (
        priceSourceRooms.reduce((max, room) => Math.max(max, Number(room.price ?? 0)), 0)
    ), [priceSourceRooms]);
    const currentMinPrice = sanitizePrice(local.minPrice);
    const currentMaxPrice = sanitizePrice(local.maxPrice);
    const fallbackMaxPrice = getFallbackMaxPrice(local.transactionType);
    const rawPriceCeiling = Math.max(
        dynamicMaxPrice,
        currentMinPrice ?? 0,
        currentMaxPrice ?? 0,
        fallbackMaxPrice
    );
    const priceCeiling = Math.max(priceStep, niceCeilPrice(rawPriceCeiling));
    const minPriceForSlider = Math.min(currentMinPrice ?? 0, priceCeiling);
    const maxPriceForSlider = Math.max(
        minPriceForSlider,
        Math.min(currentMaxPrice ?? priceCeiling, priceCeiling)
    );
    const priceError = local.minPrice != null && local.maxPrice != null && local.minPrice > local.maxPrice
        ? 'Giá tối thiểu không được lớn hơn giá tối đa.'
        : undefined;

    useEffect(() => {
        amenityService.getAll()
            .then(data => setAmenityList(data || []))
            .catch(() => {});
        fetchProjects(true);
    }, []);

    const updateLocal = (key: keyof LocalFilters, value: any) =>
        setLocal(p => ({ ...p, [key]: value }));

    const togglePriceRange = (index: number) => {
        const range = priceRanges[index];
        setLocal(p => ({
            ...p,
            priceIndex: p.priceIndex === index ? undefined : index,
            minPrice: p.priceIndex === index ? undefined : Math.min(range.min, priceCeiling),
            maxPrice: p.priceIndex === index || range.max == null ? undefined : Math.min(range.max, priceCeiling),
        }));
    };

    const updatePriceInput = (key: 'minPrice' | 'maxPrice', text: string) => {
        const value = parsePriceInput(text);
        setLocal(p => ({
            ...p,
            priceIndex: undefined,
            [key]: value,
        }));
    };

    const normalizePriceInputs = useCallback(() => {
        setLocal(p => ({
            ...p,
            minPrice: sanitizePrice(p.minPrice) != null ? Math.min(sanitizePrice(p.minPrice)!, priceCeiling) : undefined,
            maxPrice: sanitizePrice(p.maxPrice) != null ? Math.min(sanitizePrice(p.maxPrice)!, priceCeiling) : undefined,
        }));
    }, [priceCeiling]);

    const updatePriceSlider = useCallback((minPrice: number, maxPrice: number) => {
        setLocal(p => ({
            ...p,
            priceIndex: undefined,
            minPrice,
            maxPrice,
        }));
    }, []);

    const updateBedroomMode = (mode: CountMode) => {
        setLocal(p => ({ ...p, bedroomMode: mode }));
    };

    const updateBedroomValue = (value?: number) => {
        setLocal(p => ({
            ...p,
            bedroomValue: value,
            minBedrooms: value,
            bedroomList: value != null ? [value] : [],
        }));
    };

    const updateBathroomMode = (mode: CountMode) => {
        setLocal(p => ({ ...p, bathroomMode: mode }));
    };

    const updateBathroomValue = (value?: number) => {
        setLocal(p => ({
            ...p,
            bathroomValue: value,
            minBathrooms: value,
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
        const keyword = local.keyword?.trim() || undefined;
        const province = local.province?.trim() || undefined;
        const ward = local.ward?.trim() || undefined;
        const sanitizedMinPrice = sanitizePrice(local.minPrice);
        const sanitizedMaxPrice = sanitizePrice(local.maxPrice);
        const minPrice = sanitizedMinPrice != null ? Math.min(sanitizedMinPrice, priceCeiling) : undefined;
        const maxPrice = sanitizedMaxPrice != null ? Math.min(sanitizedMaxPrice, priceCeiling) : undefined;
        const bedroomMode = local.bedroomMode ?? 'min';
        const bedroomValue = local.bedroomValue ?? local.minBedrooms;
        const bathroomMode = local.bathroomMode ?? 'min';
        const bathroomValue = local.bathroomValue ?? local.minBathrooms;

        if (sanitizedMinPrice != null && sanitizedMaxPrice != null && sanitizedMinPrice > sanitizedMaxPrice) {
            Alert.alert('Khoảng giá chưa hợp lệ', 'Giá tối thiểu không được lớn hơn giá tối đa.');
            return;
        }

        // Persist basic filters to store (for backward compat with non-search screens)
        setFilters({
            keyword,
            transactionType: local.transactionType,
            propertyType: local.propertyTypes?.[0], // simple compat
            province,
            ward,
            minPrice,
            maxPrice,
            minArea: local.minArea,
            maxArea: local.maxArea,
            sortBy: local.sortBy,
            bedroomMode: bedroomValue != null ? bedroomMode : undefined,
            bedroomValue,
            bedroomList: bedroomValue != null ? [bedroomValue] : [],
            bathroomMode: bathroomValue != null ? bathroomMode : undefined,
            bathroomValue,
            minBathrooms: bathroomValue,
            projectId: local.projectId,
        });

        // Build backend search request
        const hasAdvancedFilters =
            keyword ||
            province ||
            ward ||
            local.transactionType ||
            (local.propertyTypes?.length ?? 0) > 0 ||
            minPrice != null || maxPrice != null ||
            local.minArea != null || local.maxArea != null ||
            bedroomValue != null ||
            bathroomValue != null ||
            local.projectId != null ||
            (local.furnishingStatuses?.length ?? 0) > 0 ||
            (local.availabilityStatuses?.length ?? 0) > 0 ||
            (local.amenities?.length ?? 0) > 0 ||
            local.hasBalcony;

        if (!hasAdvancedFilters) {
            clearSearchResults();
        } else {
            setIsApplying(true);
            try {
                // Map sortBy frontend → backend sortBy/sortDir
                let sortBy = 'createdAt';
                let sortDir = 'desc';
                if (local.sortBy === 'price_asc') { sortBy = 'price'; sortDir = 'asc'; }
                else if (local.sortBy === 'price_desc') { sortBy = 'price'; sortDir = 'desc'; }

                const results = await searchService.searchProperties({
                    keyword,
                    province,
                    ward,
                    transactionTypes: local.transactionType ? [local.transactionType] : undefined,
                    propertyTypes: local.propertyTypes?.length ? local.propertyTypes : undefined,
                    minPrice,
                    maxPrice,
                    minArea: local.minArea,
                    maxArea: local.maxArea,
                    minBedrooms: bedroomValue,
                    minBathrooms: bathroomValue,
                    projectId: local.projectId,
                    furnishingStatuses: local.furnishingStatuses?.length ? local.furnishingStatuses : undefined,
                    availabilityStatuses: local.availabilityStatuses?.length ? local.availabilityStatuses : undefined,
                    amenities: local.amenities?.length ? local.amenities : undefined,
                    hasBalcony: local.hasBalcony || undefined,
                    sortBy,
                    sortDir,
                    page: 0,
                    size: bedroomMode === 'exact' || bathroomMode === 'exact' ? 100 : 20,
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
        clearSearchResults();
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
                <View style={styles.section}>
                    <SectionHeader title="Từ khóa" />
                    <TextInput
                        style={styles.input}
                        value={local.keyword || ''}
                        onChangeText={text => updateLocal('keyword', text)}
                        placeholder="Nhập tên, địa chỉ, mô tả..."
                        placeholderTextColor="#999"
                        returnKeyType="search"
                    />
                </View>

                <View style={styles.section}>
                    <SectionHeader title="Khu vực" />
                    <TextInput
                        style={styles.input}
                        value={local.province || ''}
                        onChangeText={text => updateLocal('province', text)}
                        placeholder="Tỉnh/Thành phố, ví dụ: Thành phố Hồ Chí Minh"
                        placeholderTextColor="#999"
                    />
                    <TextInput
                        style={[styles.input, styles.inputSpacing]}
                        value={local.ward || ''}
                        onChangeText={text => updateLocal('ward', text)}
                        placeholder="Phường/Xã, ví dụ: Phường Bến Nghé"
                        placeholderTextColor="#999"
                    />
                </View>

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

                {projects.length > 0 && (
                    <View style={styles.section}>
                        <SectionHeader title="Dự án" />
                        <View style={styles.chipRow}>
                            <Chip
                                label="Tất cả"
                                selected={local.projectId == null}
                                onPress={() => updateLocal('projectId', undefined)}
                            />
                            {projects.slice(0, 10).map(project => (
                                <Chip
                                    key={project.id}
                                    label={project.name}
                                    selected={local.projectId === project.id}
                                    onPress={() => updateLocal('projectId', local.projectId === project.id ? undefined : project.id)}
                                />
                            ))}
                        </View>
                    </View>
                )}

                {/* Khoảng giá */}
                <View style={styles.section}>
                    <SectionHeader title={isSale ? 'Khoảng giá bán' : 'Khoảng giá thuê'} />
                    <Text style={styles.helperText}>
                        Mức giá tối đa có thể chọn: {formatCompactVND(priceCeiling)}
                    </Text>
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
                    <View style={styles.priceInputsRow}>
                        <View style={styles.priceInputGroup}>
                            <Text style={styles.inputLabel}>Giá tối thiểu</Text>
                            <TextInput
                                style={styles.priceInput}
                                value={local.minPrice != null ? String(local.minPrice) : ''}
                                onChangeText={text => updatePriceInput('minPrice', text)}
                                onBlur={normalizePriceInputs}
                                placeholder="0"
                                placeholderTextColor="#999"
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={styles.priceInputGroup}>
                            <Text style={styles.inputLabel}>Giá tối đa</Text>
                            <TextInput
                                style={styles.priceInput}
                                value={local.maxPrice != null ? String(local.maxPrice) : ''}
                                onChangeText={text => updatePriceInput('maxPrice', text)}
                                onBlur={normalizePriceInputs}
                                placeholder={String(priceCeiling)}
                                placeholderTextColor="#999"
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                    {priceError && (
                        <Text style={styles.priceErrorText}>{priceError}</Text>
                    )}
                    <PriceRangeSlider
                        min={minPriceForSlider}
                        max={maxPriceForSlider}
                        ceiling={priceCeiling}
                        step={priceStep}
                        onChange={updatePriceSlider}
                    />
                    {(local.minPrice != null || local.maxPrice != null) && (
                        <Text style={styles.helperText}>
                            Đang chọn: {local.minPrice != null ? formatCompactVND(Math.max(0, local.minPrice)) : '0'} - {local.maxPrice != null ? formatCompactVND(Math.max(0, local.maxPrice)) : 'không giới hạn'}
                        </Text>
                    )}
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

                {/* Phòng ngủ */}
                <View style={styles.section}>
                    <SectionHeader title="Phòng ngủ" />
                    <View style={styles.modeToggle}>
                        <TouchableOpacity
                            style={[styles.modeOption, (local.bedroomMode ?? 'min') === 'exact' && styles.modeOptionActive]}
                            onPress={() => updateBedroomMode('exact')}
                        >
                            <Text style={[styles.modeText, (local.bedroomMode ?? 'min') === 'exact' && styles.modeTextActive]}>Chính xác</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modeOption, (local.bedroomMode ?? 'min') === 'min' && styles.modeOptionActive]}
                            onPress={() => updateBedroomMode('min')}
                        >
                            <Text style={[styles.modeText, (local.bedroomMode ?? 'min') === 'min' && styles.modeTextActive]}>Tối thiểu</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.helperText}>
                        {getCountLabel(local.bedroomValue ?? local.minBedrooms, 'PN', local.bedroomMode ?? 'min')}
                    </Text>
                    <View style={styles.chipRow}>
                        <Chip
                            label="Tất cả"
                            selected={(local.bedroomValue ?? local.minBedrooms) == null}
                            onPress={() => updateBedroomValue(undefined)}
                        />
                        {BEDROOM_OPTIONS.map(n => (
                            <Chip
                                key={n}
                                label={n === 0 ? 'Studio' : `${n} PN`}
                                selected={(local.bedroomValue ?? local.minBedrooms) === n}
                                onPress={() => updateBedroomValue((local.bedroomValue ?? local.minBedrooms) === n ? undefined : n)}
                            />
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <SectionHeader title="Nhà vệ sinh" />
                    <View style={styles.modeToggle}>
                        <TouchableOpacity
                            style={[styles.modeOption, (local.bathroomMode ?? 'min') === 'exact' && styles.modeOptionActive]}
                            onPress={() => updateBathroomMode('exact')}
                        >
                            <Text style={[styles.modeText, (local.bathroomMode ?? 'min') === 'exact' && styles.modeTextActive]}>Chính xác</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modeOption, (local.bathroomMode ?? 'min') === 'min' && styles.modeOptionActive]}
                            onPress={() => updateBathroomMode('min')}
                        >
                            <Text style={[styles.modeText, (local.bathroomMode ?? 'min') === 'min' && styles.modeTextActive]}>Tối thiểu</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.helperText}>
                        {getCountLabel(local.bathroomValue ?? local.minBathrooms, 'WC', local.bathroomMode ?? 'min')}
                    </Text>
                    <View style={styles.chipRow}>
                        <Chip
                            label="Tất cả"
                            selected={(local.bathroomValue ?? local.minBathrooms) == null}
                            onPress={() => updateBathroomValue(undefined)}
                        />
                        {BATHROOM_OPTIONS.map(n => (
                            <Chip
                                key={n}
                                label={`${n} WC`}
                                selected={(local.bathroomValue ?? local.minBathrooms) === n}
                                onPress={() => updateBathroomValue((local.bathroomValue ?? local.minBathrooms) === n ? undefined : n)}
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
    helperText: { fontSize: 12, color: '#777', marginBottom: 10, lineHeight: 17 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    input: {
        borderWidth: 1.5,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: '#1A1A1A',
        backgroundColor: '#FAFAFA',
    },
    inputSpacing: { marginTop: 10 },
    inputLabel: { fontSize: 12, fontWeight: '700', color: '#555', marginBottom: 6 },
    priceInputsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    priceInputGroup: { flex: 1 },
    priceInput: {
        borderWidth: 1.5,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 11,
        fontSize: 13,
        color: '#1A1A1A',
        backgroundColor: '#FAFAFA',
    },
    priceErrorText: {
        color: '#DC2626',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 8,
        marginBottom: 2,
    },
    rangeSlider: {
        marginTop: 16,
        marginBottom: 12,
    },
    rangeValueRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    rangeValueText: {
        color: '#0066FF',
        fontSize: 12,
        fontWeight: '700',
    },
    rangeTrackWrap: {
        height: 34,
        justifyContent: 'center',
        marginHorizontal: 14,
    },
    rangeTrack: {
        height: 6,
        borderRadius: 3,
        backgroundColor: '#E5E7EB',
    },
    rangeTrackActive: {
        position: 'absolute',
        height: 6,
        borderRadius: 3,
        backgroundColor: '#0066FF',
    },
    rangeThumb: {
        position: 'absolute',
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 3,
        borderColor: '#0066FF',
        backgroundColor: 'white',
        transform: [{ translateX: -14 }],
        shadowColor: '#000',
        shadowOpacity: 0.14,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
    },
    rangeThumbMin: { zIndex: 2 },
    rangeThumbMax: { zIndex: 3 },
    rangeLimitRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    rangeLimitText: {
        color: '#777',
        fontSize: 11,
    },
    modeToggle: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 14,
        padding: 4,
        marginBottom: 8,
    },
    modeOption: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 11,
        paddingVertical: 9,
    },
    modeOptionActive: { backgroundColor: '#0066FF' },
    modeText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
    modeTextActive: { color: 'white' },
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
