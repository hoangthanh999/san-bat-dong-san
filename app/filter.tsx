import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Platform, Modal, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePropertyStore } from '../store/propertyStore';
import { RoomFilters } from '../types';

interface FilterSheetProps {
    visible: boolean;
    onClose: () => void;
}

const PRICE_RANGES = [
    { label: 'Dưới 3 triệu', min: 0, max: 3000000 },
    { label: '3 - 5 triệu', min: 3000000, max: 5000000 },
    { label: '5 - 10 triệu', min: 5000000, max: 10000000 },
    { label: '10 - 20 triệu', min: 10000000, max: 20000000 },
    { label: 'Trên 20 triệu', min: 20000000, max: undefined },
];

const AREA_RANGES = [
    { label: 'Dưới 20 m²', min: 0, max: 20 },
    { label: '20 - 40 m²', min: 20, max: 40 },
    { label: '40 - 70 m²', min: 40, max: 70 },
    { label: '70 - 100 m²', min: 70, max: 100 },
    { label: 'Trên 100 m²', min: 100, max: undefined },
];

const BEDROOM_OPTIONS = [0, 1, 2, 3, 4];
const SORT_OPTIONS = [
    { val: 'newest', label: 'Mới nhất' },
    { val: 'price_asc', label: 'Giá thấp → cao' },
    { val: 'price_desc', label: 'Giá cao → thấp' },
    { val: 'nearest', label: 'Gần nhất' },
];

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
    return (
        <TouchableOpacity style={[styles.chip, selected && styles.chipSelected]} onPress={onPress}>
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
        </TouchableOpacity>
    );
}

export default function FilterScreen({ visible, onClose }: FilterSheetProps) {
    const { filters, setFilters, resetFilters, fetchRooms } = usePropertyStore();
    const [local, setLocal] = useState<RoomFilters & { priceIndex?: number; areaIndex?: number }>({
        ...filters,
    });

    const updateLocal = (key: keyof typeof local, value: any) => setLocal(p => ({ ...p, [key]: value }));

    const handleApply = () => {
        setFilters(local);
        fetchRooms();
        onClose();
    };

    const handleReset = () => {
        setLocal({});
        resetFilters();
        fetchRooms();
        onClose();
    };

    const setBedroom = (num: number) => {
        const cur = local.bedroomList || [];
        updateLocal('bedroomList', cur.includes(num) ? cur.filter(b => b !== num) : [...cur, num]);
    };

    const setPriceRange = (index: number) => {
        const range = PRICE_RANGES[index];
        setLocal(p => ({
            ...p,
            priceIndex: p.priceIndex === index ? undefined : index,
            minPrice: p.priceIndex === index ? undefined : range.min,
            maxPrice: p.priceIndex === index ? undefined : range.max,
        }));
    };

    const setAreaRange = (index: number) => {
        const range = AREA_RANGES[index];
        setLocal(p => ({
            ...p,
            areaIndex: p.areaIndex === index ? undefined : index,
            minArea: p.areaIndex === index ? undefined : range.min,
            maxArea: p.areaIndex === index ? undefined : range.max,
        }));
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} color="#1A1A1A" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Bộ lọc</Text>
                    <TouchableOpacity onPress={handleReset}>
                        <Text style={styles.resetBtn}>Đặt lại</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    {/* Loại bất động sản */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Loại bất động sản</Text>
                        <View style={styles.chipRow}>
                            {[
                                { val: undefined, label: 'Tất cả' },
                                { val: 'ROOM', label: 'Phòng trọ' },
                                { val: 'APARTMENT', label: 'Căn hộ' },
                                { val: 'HOUSE', label: 'Nhà' },
                            ].map(opt => (
                                <Chip
                                    key={opt.label}
                                    label={opt.label}
                                    selected={local.propertyType === opt.val}
                                    onPress={() => updateLocal('propertyType', opt.val)}
                                />
                            ))}
                        </View>
                    </View>

                    {/* Khoảng giá */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Khoảng giá thuê</Text>
                        <View style={styles.chipRow}>
                            {PRICE_RANGES.map((r, i) => (
                                <Chip
                                    key={r.label}
                                    label={r.label}
                                    selected={local.priceIndex === i}
                                    onPress={() => setPriceRange(i)}
                                />
                            ))}
                        </View>
                    </View>

                    {/* Diện tích */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Diện tích</Text>
                        <View style={styles.chipRow}>
                            {AREA_RANGES.map((r, i) => (
                                <Chip
                                    key={r.label}
                                    label={r.label}
                                    selected={local.areaIndex === i}
                                    onPress={() => setAreaRange(i)}
                                />
                            ))}
                        </View>
                    </View>

                    {/* Số phòng ngủ */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Số phòng ngủ</Text>
                        <View style={styles.chipRow}>
                            <Chip
                                label="Tất cả"
                                selected={!local.bedroomList || local.bedroomList.length === 0}
                                onPress={() => updateLocal('bedroomList', [])}
                            />
                            {BEDROOM_OPTIONS.map(n => (
                                <Chip
                                    key={n}
                                    label={n === 0 ? 'Studio' : `${n} PN`}
                                    selected={(local.bedroomList || []).includes(n)}
                                    onPress={() => setBedroom(n)}
                                />
                            ))}
                        </View>
                    </View>

                    {/* Sắp xếp */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Sắp xếp theo</Text>
                        <View style={styles.chipRow}>
                            {SORT_OPTIONS.map(opt => (
                                <Chip
                                    key={opt.val}
                                    label={opt.label}
                                    selected={local.sortBy === opt.val}
                                    onPress={() => updateLocal('sortBy', local.sortBy === opt.val ? undefined : opt.val)}
                                />
                            ))}
                        </View>
                    </View>

                    <View style={{ height: 30 }} />
                </ScrollView>

                <View style={styles.bottomBar}>
                    <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
                        <Text style={styles.applyBtnText}>Áp dụng</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 20 : 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
    resetBtn: { color: '#888', fontSize: 15, fontWeight: '600' },
    scrollView: { flex: 1 },
    section: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 },
    sectionLabel: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 20 },
    chipSelected: { borderColor: '#0066FF', backgroundColor: '#E8F0FF' },
    chipText: { fontSize: 13, color: '#666' },
    chipTextSelected: { color: '#0066FF', fontWeight: '600' },
    bottomBar: { padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
    applyBtn: { backgroundColor: '#0066FF', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
    applyBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
