import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUserStore } from '../../store/userStore';

// ─── Constants ────────────────────────────────────────────────────────────────

const PURPOSE_OPTIONS = [
    { value: 'RENT_TO_LIVE', label: 'Thuê để ở', icon: 'home-outline' },
    { value: 'BUY_TO_LIVE', label: 'Mua để ở', icon: 'key-outline' },
    { value: 'INVEST', label: 'Đầu tư', icon: 'trending-up-outline' },
] as const;

const PROPERTY_TYPE_OPTIONS = [
    { value: 'APARTMENT', label: 'Chung cư', icon: 'business-outline' },
    { value: 'HOUSE', label: 'Nhà phố', icon: 'home-outline' },
    { value: 'VILLA', label: 'Biệt thự', icon: 'diamond-outline' },
    { value: 'LAND', label: 'Đất nền', icon: 'map-outline' },
    { value: 'OFFICE', label: 'Văn phòng', icon: 'briefcase-outline' },
    { value: 'SHOPHOUSE', label: 'Shophouse', icon: 'storefront-outline' },
] as const;

// 5 mức ngân sách (map sang cleanlinessLevel 1-5)
const BUDGET_OPTIONS = [
    { value: 1, label: 'Dưới 5 triệu', sublabel: '/tháng' },
    { value: 2, label: '5 - 10 triệu', sublabel: '/tháng' },
    { value: 3, label: '10 - 20 triệu', sublabel: '/tháng' },
    { value: 4, label: '20 - 50 triệu', sublabel: '/tháng' },
    { value: 5, label: 'Trên 50 triệu', sublabel: '/tháng' },
] as const;

const AREA_OPTIONS = [
    { value: 'SMALL', label: 'Nhỏ gọn', sublabel: '< 30m²', icon: 'resize-outline' },
    { value: 'MEDIUM', label: 'Vừa phải', sublabel: '30 - 60m²', icon: 'expand-outline' },
    { value: 'LARGE', label: 'Rộng rãi', sublabel: '> 60m²', icon: 'maximize-outline' },
] as const;

// 10 tiêu chí — hasPet & smoking map trực tiếp sang backend field
const CRITERIA_OPTIONS = [
    { value: 'PET_FRIENDLY', label: 'Nuôi thú cưng', icon: 'paw-outline', backendField: 'hasPet' },
    { value: 'NEAR_SCHOOL', label: 'Gần trường học', icon: 'school-outline', backendField: null },
    { value: 'SWIMMING_POOL', label: 'Hồ bơi', icon: 'water-outline', backendField: null },
    { value: 'GYM', label: 'Phòng gym', icon: 'fitness-outline', backendField: null },
    { value: 'PARKING', label: 'Chỗ đậu xe', icon: 'car-outline', backendField: null },
    { value: 'SECURITY', label: 'Bảo vệ 24/7', icon: 'shield-checkmark-outline', backendField: null },
    { value: 'NEAR_MARKET', label: 'Gần chợ/siêu thị', icon: 'cart-outline', backendField: null },
    { value: 'NEAR_HOSPITAL', label: 'Gần bệnh viện', icon: 'medical-outline', backendField: null },
    { value: 'ELEVATOR', label: 'Có thang máy', icon: 'arrow-up-circle-outline', backendField: null },
    { value: 'BALCONY', label: 'Ban công/sân vườn', icon: 'leaf-outline', backendField: null },
] as const;

type PurposeValue = typeof PURPOSE_OPTIONS[number]['value'];
type PropertyTypeValue = typeof PROPERTY_TYPE_OPTIONS[number]['value'];
type AreaValue = typeof AREA_OPTIONS[number]['value'];
type CriteriaValue = typeof CRITERIA_OPTIONS[number]['value'];

interface LifestyleForm {
    purpose: PurposeValue | null;
    preferredPropertyTypes: PropertyTypeValue[];
    budgetLevel: number | null; // 1-5 → map sang cleanlinessLevel
    preferredArea: AreaValue | null; // → lưu trong sleepTime
    hasPet: boolean;             // → map trực tiếp backend hasPet
    criteria: CriteriaValue[];   // → serialize vào personality JSON
}

// ─── Serialize/Deserialize personality JSON ───────────────────────────────────
// personality field lưu JSON: { purpose, propertyTypes, area, criteria }

interface PersonalityData {
    purpose?: string | null;
    propertyTypes?: string[];
    area?: string | null;
    criteria?: string[];
}

function serializePersonality(form: LifestyleForm): string {
    const data: PersonalityData = {
        purpose: form.purpose,
        propertyTypes: form.preferredPropertyTypes,
        area: form.preferredArea,
        criteria: form.criteria.filter(c => c !== 'PET_FRIENDLY'),
    };
    return JSON.stringify(data);
}

function deserializePersonality(raw: string | null | undefined): Partial<LifestyleForm> {
    if (!raw) return {};
    try {
        const data: PersonalityData = JSON.parse(raw);
        return {
            purpose: (data.purpose as PurposeValue) ?? null,
            preferredPropertyTypes: (data.propertyTypes as PropertyTypeValue[]) ?? [],
            preferredArea: (data.area as AreaValue) ?? null,
            criteria: (data.criteria as CriteriaValue[]) ?? [],
        };
    } catch {
        return {};
    }
}

// ─── Summary builder ──────────────────────────────────────────────────────────

function buildSummary(form: LifestyleForm): string {
    const parts: string[] = [];
    if (form.purpose) {
        const p = PURPOSE_OPTIONS.find(o => o.value === form.purpose);
        if (p) parts.push(p.label.toLowerCase());
    }
    if (form.preferredPropertyTypes.length > 0) {
        const names = form.preferredPropertyTypes
            .map(v => PROPERTY_TYPE_OPTIONS.find(o => o.value === v)?.label ?? '')
            .filter(Boolean);
        parts.push(names.join(', ').toLowerCase());
    }
    if (form.budgetLevel) {
        const b = BUDGET_OPTIONS.find(o => o.value === form.budgetLevel);
        if (b) parts.push(`ngân sách ${b.label.toLowerCase()}${b.sublabel}`);
    }
    if (form.preferredArea) {
        const a = AREA_OPTIONS.find(o => o.value === form.preferredArea);
        if (a) parts.push(`diện tích ${a.label.toLowerCase()} (${a.sublabel})`);
    }
    const allCriteria = [...form.criteria];
    if (form.hasPet && !allCriteria.includes('PET_FRIENDLY')) allCriteria.push('PET_FRIENDLY');
    if (allCriteria.length > 0) {
        const names = allCriteria
            .map(v => CRITERIA_OPTIONS.find(o => o.value === v)?.label ?? '')
            .filter(Boolean);
        parts.push(`ưu tiên: ${names.join(', ').toLowerCase()}`);
    }
    if (parts.length === 0)
        return 'Chưa có thông tin sở thích. AI sẽ gợi ý BĐS phù hợp sau khi bạn điền đầy đủ.';
    return `Bạn đang tìm ${parts.join(' • ')}.`;
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function SectionTitle({ icon, title }: { icon: string; title: string }) {
    return (
        <View style={styles.sectionHeader}>
            <Ionicons name={icon as any} size={18} color="#E53E3E" />
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
    );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function LifestyleScreen() {
    const router = useRouter();
    const { profile, isUpdating, fetchProfile, updateProfile } = useUserStore();

    const [form, setForm] = useState<LifestyleForm>({
        purpose: null,
        preferredPropertyTypes: [],
        budgetLevel: null,
        preferredArea: null,
        hasPet: false,
        criteria: [],
    });

    // Load dữ liệu từ backend fields hiện có
    useEffect(() => {
        if (!profile) {
            fetchProfile();
            return;
        }
        const lp = (profile as any).lifestyleProfile;
        if (!lp) return;

        // Deserialize personality JSON
        const parsed = deserializePersonality(lp.personality);

        // Merge hasPet từ criteria nếu có
        const criteriaWithoutPet = (parsed.criteria ?? []).filter(c => c !== 'PET_FRIENDLY');

        setForm({
            purpose: parsed.purpose ?? null,
            preferredPropertyTypes: parsed.preferredPropertyTypes ?? [],
            // cleanlinessLevel (1-5) → budgetLevel
            budgetLevel: lp.cleanlinessLevel > 0 ? lp.cleanlinessLevel : null,
            // sleepTime → preferredArea
            preferredArea: (lp.sleepTime as AreaValue) ?? parsed.preferredArea ?? null,
            // hasPet từ backend field
            hasPet: lp.hasPet ?? false,
            criteria: criteriaWithoutPet as CriteriaValue[],
        });
    }, [profile]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const togglePropertyType = (value: PropertyTypeValue) => {
        setForm(prev => ({
            ...prev,
            preferredPropertyTypes: prev.preferredPropertyTypes.includes(value)
                ? prev.preferredPropertyTypes.filter(v => v !== value)
                : [...prev.preferredPropertyTypes, value],
        }));
    };

    const toggleCriteria = (value: CriteriaValue) => {
        if (value === 'PET_FRIENDLY') {
            setForm(prev => ({ ...prev, hasPet: !prev.hasPet }));
            return;
        }
        setForm(prev => ({
            ...prev,
            criteria: prev.criteria.includes(value)
                ? prev.criteria.filter(v => v !== value)
                : [...prev.criteria, value],
        }));
    };

    const isCriteriaSelected = (value: CriteriaValue): boolean => {
        if (value === 'PET_FRIENDLY') return form.hasPet;
        return form.criteria.includes(value);
    };

    const handleSave = async () => {
        try {
            // Map form → backend LifestyleProfile fields
            await updateProfile({
                lifestyleProfile: {
                    // hasPet → boolean field
                    hasPet: form.hasPet,
                    // smoking giữ nguyên (không thay đổi)
                    smoking: (profile as any)?.lifestyleProfile?.smoking ?? false,
                    // cleanlinessLevel (1-5) ← budgetLevel
                    cleanlinessLevel: form.budgetLevel ?? 0,
                    // sleepTime ← preferredArea string
                    sleepTime: form.preferredArea ?? '',
                    // personality ← JSON chứa purpose + propertyTypes + criteria
                    personality: serializePersonality(form),
                } as any,
            });
            Alert.alert(
                '✅ Đã lưu',
                'Sở thích của bạn đã được cập nhật!\nAI sẽ gợi ý BĐS phù hợp hơn.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch {
            Alert.alert('Lỗi', 'Không thể lưu sở thích. Vui lòng thử lại.');
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    const summary = buildSummary(form);
    const hasData =
        form.purpose !== null ||
        form.preferredPropertyTypes.length > 0 ||
        form.budgetLevel !== null ||
        form.preferredArea !== null ||
        form.hasPet ||
        form.criteria.length > 0;

    const totalCriteriaSelected = form.criteria.length + (form.hasPet ? 1 : 0);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#E53E3E" />

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Sở thích của tôi</Text>
                    <Text style={styles.headerSub}>AI dùng data này để gợi ý BĐS</Text>
                </View>
                <TouchableOpacity onPress={handleSave} disabled={isUpdating} style={styles.saveBtn}>
                    {isUpdating
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={styles.saveBtnText}>Lưu</Text>
                    }
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ── AI Banner ── */}
                <View style={styles.aiBanner}>
                    <View style={styles.aiBannerIcon}>
                        <Ionicons name="sparkles" size={22} color="#E53E3E" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.aiBannerTitle}>Gợi ý thông minh từ AI</Text>
                        <Text style={styles.aiBannerDesc}>
                            Điền sở thích để AI tìm BĐS phù hợp nhất với bạn
                        </Text>
                    </View>
                </View>

                {/* ── Section 1: Mục đích ── */}
                <View style={styles.section}>
                    <SectionTitle icon="flag-outline" title="Mục đích tìm kiếm" />
                    <View style={styles.optionRow}>
                        {PURPOSE_OPTIONS.map(opt => {
                            const selected = form.purpose === opt.value;
                            return (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[styles.optionCard, selected && styles.optionCardSelected]}
                                    onPress={() => setForm(prev => ({ ...prev, purpose: opt.value }))}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={opt.icon as any}
                                        size={22}
                                        color={selected ? '#E53E3E' : '#718096'}
                                    />
                                    <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                                        {opt.label}
                                    </Text>
                                    {selected && (
                                        <View style={styles.checkBadge}>
                                            <Ionicons name="checkmark" size={10} color="#fff" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* ── Section 2: Loại BĐS ── */}
                <View style={styles.section}>
                    <SectionTitle icon="business-outline" title="Loại BĐS ưa thích" />
                    <Text style={styles.sectionHint}>Có thể chọn nhiều loại</Text>
                    <View style={styles.chipGrid}>
                        {PROPERTY_TYPE_OPTIONS.map(opt => {
                            const selected = form.preferredPropertyTypes.includes(opt.value);
                            return (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[styles.chip, selected && styles.chipSelected]}
                                    onPress={() => togglePropertyType(opt.value)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={opt.icon as any}
                                        size={16}
                                        color={selected ? '#fff' : '#4A5568'}
                                    />
                                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* ── Section 3: Ngân sách ── */}
                <View style={styles.section}>
                    <SectionTitle icon="wallet-outline" title="Ngân sách" />
                    <View style={styles.budgetList}>
                        {BUDGET_OPTIONS.map((opt, idx) => {
                            const selected = form.budgetLevel === opt.value;
                            return (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[
                                        styles.budgetItem,
                                        selected && styles.budgetItemSelected,
                                        idx === BUDGET_OPTIONS.length - 1 && { borderBottomWidth: 0 },
                                    ]}
                                    onPress={() => setForm(prev => ({ ...prev, budgetLevel: opt.value }))}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.budgetRadio, selected && styles.budgetRadioSelected]}>
                                        {selected && <View style={styles.budgetRadioDot} />}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.budgetLabel, selected && styles.budgetLabelSelected]}>
                                            {opt.label}
                                        </Text>
                                        <Text style={styles.budgetSublabel}>{opt.sublabel}</Text>
                                    </View>
                                    {opt.value === 2 && (
                                        <View style={styles.popularBadge}>
                                            <Text style={styles.popularBadgeText}>Phổ biến</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* ── Section 4: Diện tích ── */}
                <View style={styles.section}>
                    <SectionTitle icon="resize-outline" title="Diện tích mong muốn" />
                    <View style={styles.areaRow}>
                        {AREA_OPTIONS.map(opt => {
                            const selected = form.preferredArea === opt.value;
                            return (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[styles.areaCard, selected && styles.areaCardSelected]}
                                    onPress={() => setForm(prev => ({ ...prev, preferredArea: opt.value }))}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={opt.icon as any}
                                        size={24}
                                        color={selected ? '#E53E3E' : '#A0AEC0'}
                                    />
                                    <Text style={[styles.areaLabel, selected && styles.areaLabelSelected]}>
                                        {opt.label}
                                    </Text>
                                    <Text style={[styles.areaSublabel, selected && styles.areaSublabelSelected]}>
                                        {opt.sublabel}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* ── Section 5: Tiêu chí ── */}
                <View style={styles.section}>
                    <SectionTitle icon="options-outline" title="Tiêu chí quan trọng" />
                    <Text style={styles.sectionHint}>
                        Đã chọn {totalCriteriaSelected}/10 tiêu chí
                    </Text>
                    <View style={styles.criteriaGrid}>
                        {CRITERIA_OPTIONS.map(opt => {
                            const selected = isCriteriaSelected(opt.value);
                            return (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[styles.criteriaItem, selected && styles.criteriaItemSelected]}
                                    onPress={() => toggleCriteria(opt.value)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.criteriaIcon, selected && styles.criteriaIconSelected]}>
                                        <Ionicons
                                            name={opt.icon as any}
                                            size={18}
                                            color={selected ? '#fff' : '#718096'}
                                        />
                                    </View>
                                    <Text style={[styles.criteriaLabel, selected && styles.criteriaLabelSelected]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* ── Section 6: Tóm tắt AI ── */}
                <View style={[styles.section, styles.summarySection]}>
                    <View style={styles.summaryHeader}>
                        <Ionicons name="sparkles" size={18} color="#E53E3E" />
                        <Text style={styles.summaryTitle}>Tóm tắt sở thích</Text>
                    </View>
                    <Text style={[styles.summaryText, !hasData && styles.summaryTextEmpty]}>
                        {summary}
                    </Text>
                    {hasData && (
                        <View style={styles.summaryTags}>
                            {form.purpose && (
                                <View style={styles.summaryTag}>
                                    <Text style={styles.summaryTagText}>
                                        {PURPOSE_OPTIONS.find(o => o.value === form.purpose)?.label}
                                    </Text>
                                </View>
                            )}
                            {form.preferredPropertyTypes.map(v => (
                                <View key={v} style={styles.summaryTag}>
                                    <Text style={styles.summaryTagText}>
                                        {PROPERTY_TYPE_OPTIONS.find(o => o.value === v)?.label}
                                    </Text>
                                </View>
                            ))}
                            {form.budgetLevel && (
                                <View style={styles.summaryTag}>
                                    <Text style={styles.summaryTagText}>
                                        {BUDGET_OPTIONS.find(o => o.value === form.budgetLevel)?.label}
                                    </Text>
                                </View>
                            )}
                            {form.preferredArea && (
                                <View style={styles.summaryTag}>
                                    <Text style={styles.summaryTagText}>
                                        {AREA_OPTIONS.find(o => o.value === form.preferredArea)?.label}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {/* ── Save Button ── */}
                <TouchableOpacity
                    style={[styles.saveButton, isUpdating && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={isUpdating}
                    activeOpacity={0.8}
                >
                    {isUpdating ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                            <Text style={styles.saveButtonText}>Lưu sở thích</Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={{ height: 32 }} />
            </ScrollView>
        </View>
    );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7FAFC' },

    // Header
    header: {
        backgroundColor: '#E53E3E',
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 48,
        paddingBottom: 16,
        paddingHorizontal: 16,
        gap: 12,
    },
    backBtn: { padding: 4 },
    headerCenter: { flex: 1 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
    headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
    saveBtn: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 56,
        alignItems: 'center',
    },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    // Scroll
    scroll: { flex: 1 },
    scrollContent: { padding: 16, gap: 16 },

    // AI Banner
    aiBanner: {
        backgroundColor: '#FFF5F5',
        borderRadius: 12,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: '#FED7D7',
    },
    aiBannerIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#E53E3E',
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    aiBannerTitle: { fontSize: 14, fontWeight: '700', color: '#2D3748' },
    aiBannerDesc: { fontSize: 12, color: '#718096', marginTop: 2 },

    // Section
    section: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#2D3748' },
    sectionHint: { fontSize: 12, color: '#A0AEC0', marginBottom: 12, marginTop: -8 },

    // Purpose cards (3 cols)
    optionRow: { flexDirection: 'row', gap: 10 },
    optionCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        backgroundColor: '#F7FAFC',
        gap: 6,
        position: 'relative',
    },
    optionCardSelected: { borderColor: '#E53E3E', backgroundColor: '#FFF5F5' },
    optionLabel: { fontSize: 11, color: '#718096', fontWeight: '500', textAlign: 'center' },
    optionLabelSelected: { color: '#E53E3E', fontWeight: '700' },
    checkBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#E53E3E',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Chips (property type)
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        backgroundColor: '#F7FAFC',
    },
    chipSelected: { backgroundColor: '#E53E3E', borderColor: '#E53E3E' },
    chipText: { fontSize: 13, color: '#4A5568', fontWeight: '500' },
    chipTextSelected: { color: '#fff', fontWeight: '700' },

    // Budget list
    budgetList: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        overflow: 'hidden',
    },
    budgetItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        backgroundColor: '#fff',
    },
    budgetItemSelected: { backgroundColor: '#FFF5F5' },
    budgetRadio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#CBD5E0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    budgetRadioSelected: { borderColor: '#E53E3E' },
    budgetRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E53E3E' },
    budgetLabel: { fontSize: 14, color: '#2D3748', fontWeight: '500' },
    budgetLabelSelected: { color: '#E53E3E', fontWeight: '700' },
    budgetSublabel: { fontSize: 11, color: '#A0AEC0', marginTop: 1 },
    popularBadge: {
        backgroundColor: '#FED7D7',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    popularBadgeText: { fontSize: 10, color: '#E53E3E', fontWeight: '700' },

    // Area cards
    areaRow: { flexDirection: 'row', gap: 10 },
    areaCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        backgroundColor: '#F7FAFC',
        gap: 6,
    },
    areaCardSelected: { borderColor: '#E53E3E', backgroundColor: '#FFF5F5' },
    areaLabel: { fontSize: 13, fontWeight: '600', color: '#4A5568' },
    areaLabelSelected: { color: '#E53E3E' },
    areaSublabel: { fontSize: 11, color: '#A0AEC0' },
    areaSublabelSelected: { color: '#FC8181' },

    // Criteria grid (2 cols)
    criteriaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    criteriaItem: {
        width: '47%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        backgroundColor: '#F7FAFC',
    },
    criteriaItemSelected: { borderColor: '#E53E3E', backgroundColor: '#FFF5F5' },
    criteriaIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#EDF2F7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    criteriaIconSelected: { backgroundColor: '#E53E3E' },
    criteriaLabel: { fontSize: 12, color: '#4A5568', fontWeight: '500', flex: 1 },
    criteriaLabelSelected: { color: '#E53E3E', fontWeight: '700' },

    // Summary
    summarySection: { borderWidth: 1.5, borderColor: '#FED7D7', backgroundColor: '#FFF5F5' },
    summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    summaryTitle: { fontSize: 15, fontWeight: '700', color: '#E53E3E' },
    summaryText: { fontSize: 13, color: '#4A5568', lineHeight: 20 },
    summaryTextEmpty: { color: '#A0AEC0', fontStyle: 'italic' },
    summaryTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    summaryTag: {
        backgroundColor: '#FED7D7',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    summaryTagText: { fontSize: 11, color: '#C53030', fontWeight: '600' },

    // Save button
    saveButton: {
        backgroundColor: '#E53E3E',
        borderRadius: 14,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#E53E3E',
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 4,
        marginTop: 4,
    },
    saveButtonDisabled: { opacity: 0.6 },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});