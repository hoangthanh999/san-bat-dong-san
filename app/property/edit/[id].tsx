import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { roomService } from '../../../services/api/rooms';
import { mediaService } from '../../../services/api/media';
import { amenityService } from '../../../services/api/amenities';
import { PropertyRequestDTO, Room, Amenity } from '../../../types';

const FURNITURE_OPTIONS = ['Không có', 'Cơ bản', 'Đầy đủ', 'Cao cấp'];
const FURNITURE_MAP: Record<string, string> = {
    'Không có': 'UNFURNISHED', 'Cơ bản': 'PARTIALLY_FURNISHED',
    'Đầy đủ': 'FULLY_FURNISHED', 'Cao cấp': 'FULLY_FURNISHED',
};
const FURNITURE_REVERSE_MAP: Record<string, string> = {
    'UNFURNISHED': 'Không có', 'PARTIALLY_FURNISHED': 'Cơ bản', 'FULLY_FURNISHED': 'Đầy đủ',
};
const UTILITY_PRICE_OPTIONS = [
    { val: 'FREE', label: 'Miễn phí' },
    { val: 'STATE_PRICE', label: 'Theo giá nhà nước' },
    { val: 'LANDLORD_PRICE', label: 'Chủ nhà quy định' },
    { val: 'SHARED', label: 'Chia đều' },
    { val: 'NEGOTIABLE', label: 'Thỏa thuận' },
] as const;
type UtilityPriceValue = typeof UTILITY_PRICE_OPTIONS[number]['val'];
const UTILITY_PRICE_VALUES = new Set<string>(UTILITY_PRICE_OPTIONS.map(opt => opt.val));
const isValidUtilityPrice = (value: string) => UTILITY_PRICE_VALUES.has(value);
const normalizeUtilityPrice = (value?: string | null): UtilityPriceValue =>
    isValidUtilityPrice(value || '') ? value as UtilityPriceValue : 'NEGOTIABLE';

export default function EditPropertyScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();
    const propertyId = Number(id);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [amenityList, setAmenityList] = useState<Amenity[]>([]);
    const [amenityLoading, setAmenityLoading] = useState(false);
    const [amenityError, setAmenityError] = useState<string | null>(null);
    const [images, setImages] = useState<string[]>([]);
    const [originalRoom, setOriginalRoom] = useState<Room | null>(null);

    const [form, setForm] = useState({
        title: '',
        price: '',
        area: '',
        description: '',
        bedrooms: '1',
        bathrooms: '1',
        furnishingStatus: 'PARTIALLY_FURNISHED',
        amenities: [] as string[],
        transactionType: 'FOR_RENT' as 'FOR_RENT' | 'FOR_SALE',
        propertyType: 'ROOM' as string,
        province: '', district: '', ward: '', addressDetail: '',
        capacity: '',
        hasBalcony: false,
        availabilityStatus: 'IMMEDIATELY',
        electricityPrice: 'NEGOTIABLE',
        waterPrice: 'NEGOTIABLE',
        internetPrice: 'NEGOTIABLE',
        latitude: '10.762622',
        longitude: '106.660172',
    });

    useEffect(() => {
        Promise.all([loadProperty(), loadAmenities()]);
    }, []);

    const loadProperty = async () => {
        try {
            const room = await roomService.getRoomDetail(propertyId);
            setOriginalRoom(room);
            setImages(room.images || []);
            setForm({
                title: room.title || '',
                price: String(room.price || ''),
                area: String(room.area || ''),
                description: room.description || '',
                bedrooms: String(room.bedrooms || '1'),
                bathrooms: String(room.bathrooms || '1'),
                furnishingStatus: room.furnishingStatus || 'PARTIALLY_FURNISHED',
                amenities: (room.amenities || []).map((a: any) => typeof a === 'string' ? a : a.name),
                transactionType: (room.transactionType as any) || 'FOR_RENT',
                propertyType: room.propertyType || 'ROOM',
                province: room.province || '',
                district: room.district || '',
                ward: room.ward || '',
                addressDetail: room.street || '',
                capacity: String(room.capacity || ''),
                hasBalcony: room.hasBalcony || false,
                availabilityStatus: room.availabilityStatus || 'IMMEDIATELY',
                electricityPrice: normalizeUtilityPrice(room.electricityPrice),
                waterPrice: normalizeUtilityPrice(room.waterPrice),
                internetPrice: normalizeUtilityPrice(room.internetPrice),
                latitude: String(room.latitude || '10.762622'),
                longitude: String(room.longitude || '106.660172'),
            });
        } catch (err: any) {
            Alert.alert('Lỗi', 'Không thể tải thông tin bài đăng', [
                { text: 'Quay lại', onPress: () => router.back() }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const loadAmenities = async () => {
        setAmenityLoading(true);
        setAmenityError(null);
        try {
            const data = await amenityService.getAll();
            if (__DEV__) {
                console.log('[EditProperty] amenities loaded:', data);
            }
            setAmenityList(data);
        } catch (err) {
            console.warn('[EditProperty] Failed to fetch amenities:', err);
            setAmenityError('Không tải được danh sách tiện ích');
            setAmenityList([]);
        } finally {
            setAmenityLoading(false);
        }
    };

    const updateForm = (key: keyof typeof form, value: any) =>
        setForm(prev => ({ ...prev, [key]: value }));

    const toggleAmenity = (name: string) => {
        updateForm('amenities',
            form.amenities.includes(name)
                ? form.amenities.filter(a => a !== name)
                : [...form.amenities, name]
        );
    };

    const pickImages = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true, quality: 0.8, selectionLimit: 10,
        });
        if (!result.canceled) {
            setImages(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, 10));
        }
    };

    const removeImage = (index: number) => setImages(prev => prev.filter((_, i) => i !== index));

    const handleSave = async () => {
        if (!form.title.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề'); return; }
        const priceValue = Number(form.price);
        const areaValue = Number(form.area);
        if (!form.price || Number.isNaN(priceValue) || priceValue < 0) { Alert.alert('Lỗi', 'Vui lòng nhập giá hợp lệ'); return; }
        if (!form.area || Number.isNaN(areaValue) || areaValue <= 0) { Alert.alert('Lỗi', 'Vui lòng nhập diện tích lớn hơn 0'); return; }
        const isRent = form.transactionType === 'FOR_RENT';
        const isLand = form.propertyType === 'LAND';
        if (
            isRent && !isLand &&
            (!isValidUtilityPrice(form.electricityPrice) || !isValidUtilityPrice(form.waterPrice) || !isValidUtilityPrice(form.internetPrice))
        ) {
            Alert.alert('Lỗi', 'Vui lòng chọn giá điện/nước/internet theo danh sách hợp lệ');
            return;
        }
        if (images.length === 0) { Alert.alert('Lỗi', 'Vui lòng chọn ít nhất 1 ảnh'); return; }

        setIsSaving(true);
        try {
            // Upload các ảnh mới (URI local), giữ nguyên ảnh cũ (URL https)
            const newLocalImages = images.filter(u => u.startsWith('file://') || u.startsWith('content://'));
            const existingUrls = images.filter(u => u.startsWith('http'));
            let uploadedUrls: string[] = [];
            if (newLocalImages.length > 0) {
                const files = newLocalImages.map((uri, i) => ({
                    uri, name: `edit_${Date.now()}_${i}.jpg`, type: 'image/jpeg',
                }));
                try {
                    uploadedUrls = await mediaService.uploadMultiple(files, 'properties');
                    if (
                        !Array.isArray(uploadedUrls) ||
                        uploadedUrls.length !== newLocalImages.length ||
                        uploadedUrls.some(url => typeof url !== 'string' || !url.startsWith('http'))
                    ) {
                        throw new Error('Upload ảnh không trả về URL hợp lệ');
                    }
                } catch (uploadErr) {
                    console.warn('[EditProperty] Media upload failed:', uploadErr);
                    throw new Error('Upload ảnh thất bại. Vui lòng thử lại trước khi lưu tin.');
                }
            }
            const finalImages = [...existingUrls, ...uploadedUrls];

            const address = [form.addressDetail, form.ward, form.district, form.province].filter(Boolean).join(', ');
            const validAmenityNames = new Set(amenityList.map(a => a.name));
            const selectedAmenities = amenityList.length > 0
                ? form.amenities.filter(name => validAmenityNames.has(name))
                : form.amenities;
            const body: PropertyRequestDTO = {
                transactionType: form.transactionType,
                title: form.title,
                description: form.description,
                price: Number(form.price),
                area: Number(form.area),
                address,
                province: form.province,
                district: form.district,
                ward: form.ward || '',
                street: form.addressDetail || '',
                latitude: Number(form.latitude),
                longitude: Number(form.longitude),
                propertyType: form.propertyType,
                capacity: isRent && !isLand && form.capacity ? Number(form.capacity) : undefined,
                images: finalImages,
                amenities: selectedAmenities,
                bedrooms: isLand ? undefined : Number(form.bedrooms),
                bathrooms: isLand ? undefined : Number(form.bathrooms),
                hasBalcony: isLand ? undefined : form.hasBalcony,
                furnishingStatus: isLand ? undefined : form.furnishingStatus,
                availabilityStatus: form.availabilityStatus,
                electricityPrice: isRent && !isLand ? form.electricityPrice : undefined,
                waterPrice: isRent && !isLand ? form.waterPrice : undefined,
                internetPrice: isRent && !isLand ? form.internetPrice : undefined,
            };

            if (__DEV__) {
                console.log('[EditProperty] selected amenities:', selectedAmenities);
                console.log('[EditProperty] final update property payload:', body);
            }
            await roomService.updateRoom(propertyId, body);
            Alert.alert('Thành công', 'Cập nhật bài đăng thành công!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error: any) {
            Alert.alert('Lỗi', error?.message || 'Cập nhật thất bại. Vui lòng thử lại.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingScreen}>
                <ActivityIndicator size="large" color="#0066FF" />
                <Text style={styles.loadingText}>Đang tải bài đăng...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chỉnh sửa tin đăng</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.formContent}>

                    {/* Title */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
                        <FormField label="Tiêu đề *">
                            <TextInput style={styles.input} value={form.title} onChangeText={v => updateForm('title', v)} placeholder="Tiêu đề bài đăng" />
                        </FormField>
                        <FormField label="Giá (đồng)">
                            <TextInput style={styles.input} value={form.price} onChangeText={v => updateForm('price', v)} keyboardType="numeric" placeholder="VD: 5000000" />
                        </FormField>
                        <FormField label="Diện tích (m²)">
                            <TextInput style={styles.input} value={form.area} onChangeText={v => updateForm('area', v)} keyboardType="numeric" placeholder="VD: 30" />
                        </FormField>
                        <FormField label="Mô tả">
                            <TextInput style={[styles.input, styles.textarea]} value={form.description} onChangeText={v => updateForm('description', v)} multiline numberOfLines={4} placeholder="Mô tả chi tiết..." />
                        </FormField>
                    </View>

                    {/* Details */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Chi tiết</Text>
                        <View style={styles.row2}>
                            <View style={{ flex: 1 }}>
                                <FormField label="Phòng ngủ">
                                    <NumberStepper value={Number(form.bedrooms)} onChange={v => updateForm('bedrooms', v.toString())} min={0} max={10} />
                                </FormField>
                            </View>
                            <View style={{ flex: 1 }}>
                                <FormField label="Phòng tắm">
                                    <NumberStepper value={Number(form.bathrooms)} onChange={v => updateForm('bathrooms', v.toString())} min={1} max={10} />
                                </FormField>
                            </View>
                        </View>

                        <FormField label="Nội thất">
                            <View style={styles.chipRow}>
                                {FURNITURE_OPTIONS.map(opt => {
                                    const isActive = FURNITURE_REVERSE_MAP[form.furnishingStatus] === opt;
                                    return (
                                        <TouchableOpacity key={opt}
                                            style={[styles.chip, isActive && styles.chipSelected]}
                                            onPress={() => updateForm('furnishingStatus', FURNITURE_MAP[opt] || opt)}>
                                            <Text style={[styles.chipText, isActive && styles.chipTextSelected]}>{opt}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </FormField>

                        {form.transactionType === 'FOR_RENT' && form.propertyType !== 'LAND' && (
                            <>
                                <UtilityPriceField
                                    label="Giá điện"
                                    value={form.electricityPrice}
                                    onChange={v => updateForm('electricityPrice', v)}
                                />
                                <UtilityPriceField
                                    label="Giá nước"
                                    value={form.waterPrice}
                                    onChange={v => updateForm('waterPrice', v)}
                                />
                                <UtilityPriceField
                                    label="Internet"
                                    value={form.internetPrice}
                                    onChange={v => updateForm('internetPrice', v)}
                                />
                            </>
                        )}

                        <FormField label="Tiện ích">
                            {amenityLoading ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
                                    <ActivityIndicator size="small" color="#0066FF" />
                                    <Text style={{ color: '#999', fontSize: 13 }}>Đang tải tiện ích...</Text>
                                </View>
                            ) : amenityError ? (
                                <Text style={{ color: '#999', fontSize: 13, paddingVertical: 8 }}>{amenityError}</Text>
                            ) : amenityList.length === 0 ? (
                                <Text style={{ color: '#999', fontSize: 13, paddingVertical: 8 }}>Chưa có tiện ích</Text>
                            ) : (
                                <View style={styles.chipRow}>
                                    {amenityList.map(a => {
                                        const isActive = form.amenities.includes(a.name);
                                        return (
                                            <TouchableOpacity key={a.id}
                                                style={[styles.chip, isActive && styles.chipSelected]}
                                                onPress={() => toggleAmenity(a.name)}>
                                                <Text style={[styles.chipText, isActive && styles.chipTextSelected]}>{a.name}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}
                        </FormField>
                    </View>

                    {/* Images */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Ảnh ({images.length}/10)</Text>
                        <TouchableOpacity style={styles.addImageBtn} onPress={pickImages}>
                            <Ionicons name="images-outline" size={20} color="#0066FF" />
                            <Text style={styles.addImageText}>Thêm ảnh</Text>
                        </TouchableOpacity>
                        {images.length > 0 && (
                            <View style={styles.imageGrid}>
                                {images.map((uri, index) => (
                                    <View key={index} style={styles.imageWrapper}>
                                        <Image source={{ uri }} style={styles.imageThumb} contentFit="cover" />
                                        {index === 0 && <View style={styles.mainBadge}><Text style={styles.mainBadgeText}>Ảnh bìa</Text></View>}
                                        <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(index)}>
                                            <Ionicons name="close-circle" size={22} color="white" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Bottom Save Button */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity
                    style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle-outline" size={20} color="white" />
                            <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <View style={styles.formField}>
            <Text style={styles.fieldLabel}>{label}</Text>
            {children}
        </View>
    );
}

function UtilityPriceField({ label, value, onChange }: {
    label: string;
    value: string;
    onChange: (value: UtilityPriceValue) => void;
}) {
    return (
        <FormField label={label}>
            <View style={styles.utilityChipRow}>
                {UTILITY_PRICE_OPTIONS.map(opt => {
                    const isActive = value === opt.val;
                    return (
                        <TouchableOpacity
                            key={opt.val}
                            style={[styles.utilityChip, isActive && styles.utilityChipSelected]}
                            onPress={() => onChange(opt.val)}
                        >
                            <Text style={[styles.utilityChipText, isActive && styles.utilityChipTextSelected]}>
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </FormField>
    );
}

function NumberStepper({ value, onChange, min = 0, max = 20 }: {
    value: number; onChange: (v: number) => void; min?: number; max?: number;
}) {
    return (
        <View style={styles.stepper}>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => value > min && onChange(value - 1)}>
                <Ionicons name="remove" size={20} color={value === min ? '#CCC' : '#0066FF'} />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{value}</Text>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => value < max && onChange(value + 1)}>
                <Ionicons name="add" size={20} color={value === max ? '#CCC' : '#0066FF'} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: 'white' },
    loadingText: { fontSize: 15, color: '#666' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingBottom: 12, backgroundColor: 'white',
        borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
    scrollView: { flex: 1 },
    formContent: { padding: 16, gap: 12 },
    section: { backgroundColor: 'white', borderRadius: 16, padding: 16, gap: 4 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
    formField: { marginBottom: 14 },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 7 },
    input: { backgroundColor: '#F8F9FA', borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1A1A' },
    textarea: { height: 90, textAlignVertical: 'top' },
    row2: { flexDirection: 'row', gap: 12 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 20, backgroundColor: 'white' },
    chipSelected: { borderColor: '#0066FF', backgroundColor: '#E8F0FF' },
    chipText: { fontSize: 13, color: '#666' },
    chipTextSelected: { color: '#0066FF', fontWeight: '600' },
    utilityChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    utilityChip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12, backgroundColor: '#F8F9FA' },
    utilityChipSelected: { borderColor: '#0066FF', backgroundColor: '#E8F0FF' },
    utilityChipText: { fontSize: 13, color: '#666', fontWeight: '500' },
    utilityChipTextSelected: { color: '#0066FF', fontWeight: '700' },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#F8F9FA', borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12 },
    stepperBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
    stepperValue: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', minWidth: 30, textAlign: 'center' },
    addImageBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1.5, borderColor: '#0066FF', borderRadius: 10, borderStyle: 'dashed', alignSelf: 'flex-start', marginBottom: 12 },
    addImageText: { color: '#0066FF', fontWeight: '600', fontSize: 14 },
    imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    imageWrapper: { width: '30%', aspectRatio: 1, position: 'relative' },
    imageThumb: { width: '100%', height: '100%', borderRadius: 10 },
    mainBadge: { position: 'absolute', bottom: 4, left: 4, backgroundColor: '#0066FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    mainBadgeText: { color: 'white', fontSize: 10, fontWeight: '700' },
    removeImageBtn: { position: 'absolute', top: -4, right: -4 },
    bottomBar: { padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
    saveBtn: { backgroundColor: '#0066FF', borderRadius: 12, paddingVertical: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    saveBtnDisabled: { backgroundColor: '#AAC8FF' },
    saveBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
