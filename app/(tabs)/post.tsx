import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, StatusBar, Platform, Alert, ActivityIndicator,
    Switch,
} from 'react-native';
import { VideoView, useVideoPlayer, VideoPlayer } from 'expo-video';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/authStore';
import { roomService } from '../../services/api/rooms';

const STEPS = ['Cơ bản', 'Chi tiết', 'Ảnh & Video', 'Hoàn thành'];

const AMENITY_OPTIONS = ['WiFi', 'Điều hoà', 'Bếp', 'Máy giặt', 'Tủ lạnh', 'Ban công', 'Chỗ để xe', 'Thang máy', 'Bảo vệ', 'Hồ bơi', 'Gym'];
const DIRECTION_OPTIONS = ['Đông', 'Tây', 'Nam', 'Bắc', 'Đông-Nam', 'Đông-Bắc', 'Tây-Nam', 'Tây-Bắc'];
const FURNITURE_OPTIONS = ['Không có', 'Cơ bản', 'Đầy đủ', 'Cao cấp'];

function StepIndicator({ currentStep }: { currentStep: number }) {
    return (
        <View style={styles.stepIndicator}>
            {STEPS.map((step, index) => (
                <React.Fragment key={step}>
                    <View style={styles.stepItem}>
                        <View style={[styles.stepCircle, index <= currentStep && styles.stepCircleActive]}>
                            {index < currentStep ? (
                                <Ionicons name="checkmark" size={14} color="white" />
                            ) : (
                                <Text style={[styles.stepNum, index === currentStep && styles.stepNumActive]}>{index + 1}</Text>
                            )}
                        </View>
                        <Text style={[styles.stepLabel, index === currentStep && styles.stepLabelActive]}>{step}</Text>
                    </View>
                    {index < STEPS.length - 1 && (
                        <View style={[styles.stepLine, index < currentStep && styles.stepLineActive]} />
                    )}
                </React.Fragment>
            ))}
        </View>
    );
}

function ChipSelector({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (val: string) => void }) {
    return (
        <View style={styles.chipRow}>
            {options.map(opt => (
                <TouchableOpacity
                    key={opt}
                    style={[styles.chip, selected.includes(opt) && styles.chipSelected]}
                    onPress={() => onToggle(opt)}
                >
                    <Text style={[styles.chipText, selected.includes(opt) && styles.chipTextSelected]}>{opt}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

function VideoPreviewPlayer({ uri, onRemove }: { uri: string; onRemove: () => void }) {
    const player = useVideoPlayer(uri, (p: VideoPlayer) => {
        p.loop = false;
        p.muted = true;
    });
    return (
        <View style={styles.videoPreviewContainer}>
            <VideoView
                style={styles.videoPreview}
                player={player}
                allowsFullscreen
                allowsPictureInPicture={false}
                contentFit="cover"
            />
            <TouchableOpacity style={styles.removeVideoBtn} onPress={onRemove}>
                <Ionicons name="close-circle" size={24} color="#EF4444" />
            </TouchableOpacity>
            <View style={styles.videoBadge}>
                <Ionicons name="videocam" size={12} color="white" />
                <Text style={styles.videoBadgeText}>Video</Text>
            </View>
        </View>
    );
}

export default function PostScreen() {
    const router = useRouter();
    const { isAuthenticated } = useAuthStore();
    const [step, setStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [images, setImages] = useState<string[]>([]);
    const [videoUri, setVideoUri] = useState<string | null>(null);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    // Form data
    const [form, setForm] = useState({
        title: '',
        address: '',
        price: '',
        deposit: '',
        area: '',
        rentalType: 'WHOLE' as 'WHOLE' | 'SHARED',
        description: '',
        numBedrooms: '1',
        numBathrooms: '1',
        capacity: '',
        furnitureStatus: 'Cơ bản',
        direction: '',
        genderConstraint: 'MIXED' as 'MALE_ONLY' | 'FEMALE_ONLY' | 'MIXED',
        amenities: [] as string[],
        latitude: '10.762622',
        longitude: '106.660172',
    });

    const updateForm = (key: keyof typeof form, value: any) => setForm(prev => ({ ...prev, [key]: value }));

    const toggleAmenity = (val: string) => {
        updateForm('amenities', form.amenities.includes(val) ? form.amenities.filter(a => a !== val) : [...form.amenities, val]);
    };

    const pickImages = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
            selectionLimit: 10,
        });
        if (!result.canceled) {
            setImages(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, 10));
        }
    };

    const pickVideo = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            quality: 0.8,
            videoMaxDuration: 120,
        });
        if (!result.canceled && result.assets[0]) {
            setVideoUri(result.assets[0].uri);
        }
    };

    const generateAIDescription = async () => {
        if (!form.title && !form.address) {
            Alert.alert('Gợi ý', 'Vui lòng nhập tiêu đề và địa chỉ trước để AI có thể tạo mô tả phù hợp.');
            return;
        }
        setIsGeneratingAI(true);
        // Simulate AI generation
        await new Promise(r => setTimeout(r, 1800));
        const aiText = `Căn phòng ${form.rentalType === 'WHOLE' ? 'nguyên căn' : 'chia sẻ'} tại ${form.address}, diện tích ${form.area || '...'}m², giá thuê chỉ ${form.price ? Number(form.price).toLocaleString('vi-VN') : '...'}đ/tháng.\n\nNội thất ${form.furnitureStatus || 'cơ bản'}, phù hợp cho ${form.genderConstraint === 'MALE_ONLY' ? 'nam giới' : form.genderConstraint === 'FEMALE_ONLY' ? 'nữ giới' : 'mọi đối tượng'}.${form.amenities.length > 0 ? '\n\nTiện ích: ' + form.amenities.join(', ') + '.' : ''}\n\nGiao thông thuận tiện, gần các tiện ích thiết yếu. Liên hệ ngay để được tư vấn!`;
        updateForm('description', aiText);
        setIsGeneratingAI(false);
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const validateStep = () => {
        if (step === 0) {
            if (!form.title.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề'); return false; }
            if (!form.address.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ'); return false; }
            if (!form.price || isNaN(Number(form.price))) { Alert.alert('Lỗi', 'Vui lòng nhập giá hợp lệ'); return false; }
            if (!form.area || isNaN(Number(form.area))) { Alert.alert('Lỗi', 'Vui lòng nhập diện tích hợp lệ'); return false; }
        }
        if (step === 2) {
            if (images.length === 0) { Alert.alert('Lỗi', 'Vui lòng chọn ít nhất 1 ảnh'); return false; }
        }
        return true;
    };

    const handleNext = () => {
        if (!validateStep()) return;
        if (step < STEPS.length - 1) setStep(s => s + 1);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('title', form.title);
            formData.append('address', form.address);
            formData.append('price', form.price);
            formData.append('deposit', form.deposit || '0');
            formData.append('area', form.area);
            formData.append('rentalType', form.rentalType);
            formData.append('description', form.description);
            formData.append('numBedrooms', form.numBedrooms);
            formData.append('numBathrooms', form.numBathrooms);
            formData.append('furnitureStatus', form.furnitureStatus);
            formData.append('direction', form.direction);
            formData.append('genderConstraint', form.genderConstraint);
            formData.append('latitude', form.latitude);
            formData.append('longitude', form.longitude);
            form.amenities.forEach(a => formData.append('amenities', a));

            images.forEach((uri, index) => {
                formData.append('images', {
                    uri,
                    name: `image_${index}.jpg`,
                    type: 'image/jpeg',
                } as any);
            });

            await roomService.createRoom(formData);
            setStep(3); // Success step
        } catch (error: any) {
            Alert.alert('Lỗi', error.message || 'Đăng bài thất bại. Vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <View style={styles.authRequired}>
                <StatusBar barStyle="dark-content" />
                <Ionicons name="home-outline" size={72} color="#CCC" />
                <Text style={styles.authTitle}>Đăng nhập để đăng tin</Text>
                <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/(auth)/login')}>
                    <Text style={styles.loginBtnText}>Đăng nhập ngay</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Success Screen
    if (step === 3) {
        return (
            <View style={styles.successScreen}>
                <View style={styles.successIcon}>
                    <Ionicons name="checkmark-circle" size={80} color="#22C55E" />
                </View>
                <Text style={styles.successTitle}>Đăng tin thành công!</Text>
                <Text style={styles.successSub}>Tin đăng của bạn đang chờ được duyệt. Chúng tôi sẽ thông báo khi tin được phê duyệt.</Text>
                <TouchableOpacity style={styles.homeBtn} onPress={() => { setStep(0); setImages([]); setForm({ title: '', address: '', price: '', deposit: '', area: '', rentalType: 'WHOLE', description: '', numBedrooms: '1', numBathrooms: '1', capacity: '', furnitureStatus: 'Cơ bản', direction: '', genderConstraint: 'MIXED', amenities: [], latitude: '10.762622', longitude: '106.660172' }); }}>
                    <Text style={styles.homeBtnText}>Đăng tin mới</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.viewBtn} onPress={() => router.push('/(tabs)/profile')}>
                    <Text style={styles.viewBtnText}>Xem tin đã đăng</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => step === 0 ? router.back() : setStep(s => s - 1)}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Đăng tin cho thuê</Text>
                <View style={{ width: 24 }} />
            </View>

            <StepIndicator currentStep={step} />

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.formContent}>
                    {/* Step 0: Basic Info */}
                    {step === 0 && (
                        <>
                            <FormField label="Tiêu đề tin đăng *" required>
                                <TextInput style={styles.input} placeholder="VD: Căn hộ 2PN view đẹp, full nội thất..." value={form.title} onChangeText={v => updateForm('title', v)} />
                            </FormField>

                            <FormField label="Địa chỉ *" required>
                                <TextInput style={styles.input} placeholder="Số nhà, đường, quận, thành phố..." value={form.address} onChangeText={v => updateForm('address', v)} />
                            </FormField>

                            <FormField label="Giá thuê (đồng/tháng) *">
                                <TextInput style={styles.input} placeholder="VD: 5000000" value={form.price} onChangeText={v => updateForm('price', v)} keyboardType="numeric" />
                            </FormField>

                            <View style={styles.row2}>
                                <View style={{ flex: 1 }}>
                                    <FormField label="Tiền cọc (đồng)">
                                        <TextInput style={styles.input} placeholder="0" value={form.deposit} onChangeText={v => updateForm('deposit', v)} keyboardType="numeric" />
                                    </FormField>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <FormField label="Diện tích (m²) *">
                                        <TextInput style={styles.input} placeholder="VD: 30" value={form.area} onChangeText={v => updateForm('area', v)} keyboardType="numeric" />
                                    </FormField>
                                </View>
                            </View>

                            <FormField label="Loại phòng">
                                <View style={styles.toggleRow}>
                                    {[{ val: 'WHOLE', label: 'Nguyên căn' }, { val: 'SHARED', label: 'Phòng chia sẻ' }].map(opt => (
                                        <TouchableOpacity
                                            key={opt.val}
                                            style={[styles.toggleBtn, form.rentalType === opt.val && styles.toggleBtnActive]}
                                            onPress={() => updateForm('rentalType', opt.val)}
                                        >
                                            <Text style={[styles.toggleText, form.rentalType === opt.val && styles.toggleTextActive]}>{opt.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </FormField>

                            <FormField label="Mô tả">
                                <TextInput style={[styles.input, styles.textarea]} placeholder="Mô tả chi tiết về phòng trọ, tiện ích xung quanh..." value={form.description} onChangeText={v => updateForm('description', v)} multiline numberOfLines={4} />
                                <TouchableOpacity
                                    style={styles.aiBtn}
                                    onPress={generateAIDescription}
                                    disabled={isGeneratingAI}
                                >
                                    {isGeneratingAI
                                        ? <ActivityIndicator size="small" color="#8B5CF6" />
                                        : <Text style={styles.aiBtnIcon}>✨</Text>
                                    }
                                    <Text style={styles.aiBtnText}>
                                        {isGeneratingAI ? 'AI đang viết...' : 'AI viết mô tả'}
                                    </Text>
                                </TouchableOpacity>
                            </FormField>
                        </>
                    )}

                    {/* Step 1: Details */}
                    {step === 1 && (
                        <>
                            <View style={styles.row2}>
                                <View style={{ flex: 1 }}>
                                    <FormField label="Phòng ngủ">
                                        <NumberStepper value={Number(form.numBedrooms)} onChange={v => updateForm('numBedrooms', v.toString())} min={0} max={10} />
                                    </FormField>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <FormField label="Phòng tắm">
                                        <NumberStepper value={Number(form.numBathrooms)} onChange={v => updateForm('numBathrooms', v.toString())} min={1} max={10} />
                                    </FormField>
                                </View>
                            </View>

                            <FormField label="Nội thất">
                                <ChipSelector options={FURNITURE_OPTIONS} selected={[form.furnitureStatus]} onToggle={v => updateForm('furnitureStatus', v)} />
                            </FormField>

                            <FormField label="Hướng nhà">
                                <ChipSelector options={DIRECTION_OPTIONS} selected={form.direction ? [form.direction] : []} onToggle={v => updateForm('direction', v)} />
                            </FormField>

                            <FormField label="Đối tượng cho thuê">
                                <View style={styles.toggleRow}>
                                    {[{ val: 'MIXED', label: 'Tất cả' }, { val: 'MALE_ONLY', label: 'Chỉ nam' }, { val: 'FEMALE_ONLY', label: 'Chỉ nữ' }].map(opt => (
                                        <TouchableOpacity
                                            key={opt.val}
                                            style={[styles.toggleBtn, form.genderConstraint === opt.val && styles.toggleBtnActive]}
                                            onPress={() => updateForm('genderConstraint', opt.val)}
                                        >
                                            <Text style={[styles.toggleText, form.genderConstraint === opt.val && styles.toggleTextActive]}>{opt.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </FormField>

                            <FormField label="Tiện ích">
                                <ChipSelector options={AMENITY_OPTIONS} selected={form.amenities} onToggle={toggleAmenity} />
                            </FormField>
                        </>
                    )}

                    {/* Step 2: Images & Video */}
                    {step === 2 && (
                        <>
                            <View style={styles.imagePickerSection}>
                                <Text style={styles.imageCount}>{images.length}/10 ảnh</Text>
                                <View style={styles.mediaButtons}>
                                    <TouchableOpacity style={styles.addImageBtn} onPress={pickImages}>
                                        <Ionicons name="images" size={20} color="#0066FF" />
                                        <Text style={styles.addImageText}>Thêm ảnh</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.addImageBtn, styles.addVideoBtn]} onPress={pickVideo}>
                                        <Ionicons name="videocam" size={20} color="#8B5CF6" />
                                        <Text style={[styles.addImageText, { color: '#8B5CF6' }]}>Thêm video</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Video Preview */}
                            {videoUri && (
                                <VideoPreviewPlayer uri={videoUri} onRemove={() => setVideoUri(null)} />
                            )}

                            {images.length === 0 ? (
                                <View style={styles.imagePlaceholder}>
                                    <Ionicons name="images-outline" size={56} color="#CCC" />
                                    <Text style={styles.imagePlaceholderText}>Chọn ít nhất 1 ảnh cho tin đăng</Text>
                                    <Text style={styles.imagePlaceholderSub}>Ảnh chất lượng cao giúp tăng khả năng cho thuê</Text>
                                </View>
                            ) : (
                                <View style={styles.imageGrid}>
                                    {images.map((uri, index) => (
                                        <View key={index} style={styles.imageWrapper}>
                                            <Image source={{ uri }} style={styles.imageThumb} contentFit="cover" />
                                            {index === 0 && (
                                                <View style={styles.mainBadge}>
                                                    <Text style={styles.mainBadgeText}>Ảnh bìa</Text>
                                                </View>
                                            )}
                                            <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(index)}>
                                                <Ionicons name="close-circle" size={22} color="white" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                    {images.length < 10 && (
                                        <TouchableOpacity style={styles.addMoreBtn} onPress={pickImages}>
                                            <Ionicons name="add" size={32} color="#0066FF" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </>
                    )}
                </View>

                <View style={{ height: 30 }} />
            </ScrollView>

            {/* Bottom Actions */}
            <View style={styles.bottomBar}>
                {step > 0 && (
                    <TouchableOpacity style={styles.backBtnBtn} onPress={() => setStep(s => s - 1)}>
                        <Text style={styles.backBtnText}>Quay lại</Text>
                    </TouchableOpacity>
                )}
                {step < 2 ? (
                    <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                        <Text style={styles.nextBtnText}>Tiếp theo</Text>
                        <Ionicons name="arrow-forward" size={18} color="white" />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.nextBtn, isSubmitting && styles.nextBtnDisabled]}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Ionicons name="cloud-upload-outline" size={18} color="white" />
                                <Text style={styles.nextBtnText}>Đăng tin</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

function FormField({ label, children, required }: { label: string; children?: React.ReactNode; required?: boolean }) {
    return (
        <View style={styles.formField}>
            <Text style={styles.fieldLabel}>{label}{required && <Text style={{ color: '#EF4444' }}> *</Text>}</Text>
            {children}
        </View>
    );
}

function NumberStepper({ value, onChange, min = 0, max = 20 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
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
    authRequired: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 40, backgroundColor: 'white' },
    authTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', textAlign: 'center' },
    loginBtn: { backgroundColor: '#0066FF', borderRadius: 12, paddingHorizontal: 36, paddingVertical: 14 },
    loginBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 54 : 16, paddingBottom: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
    stepIndicator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    stepItem: { alignItems: 'center', gap: 4 },
    stepCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
    stepCircleActive: { backgroundColor: '#0066FF' },
    stepNum: { fontSize: 12, fontWeight: '700', color: '#999' },
    stepNumActive: { color: 'white' },
    stepLabel: { fontSize: 10, color: '#999' },
    stepLabelActive: { color: '#0066FF', fontWeight: '600' },
    stepLine: { flex: 1, height: 2, backgroundColor: '#E0E0E0', marginBottom: 12 },
    stepLineActive: { backgroundColor: '#0066FF' },
    scrollView: { flex: 1 },
    formContent: { padding: 16, gap: 4 },
    formField: { marginBottom: 16 },
    fieldLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
    input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1A1A' },
    textarea: { height: 100, textAlignVertical: 'top' },
    row2: { flexDirection: 'row', gap: 12 },
    toggleRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    toggleBtn: { flex: 1, paddingVertical: 10, borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10, alignItems: 'center' },
    toggleBtnActive: { borderColor: '#0066FF', backgroundColor: '#E8F0FF' },
    toggleText: { fontSize: 14, color: '#888' },
    toggleTextActive: { color: '#0066FF', fontWeight: '600' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 20, backgroundColor: 'white' },
    chipSelected: { borderColor: '#0066FF', backgroundColor: '#E8F0FF' },
    chipText: { fontSize: 13, color: '#666' },
    chipTextSelected: { color: '#0066FF', fontWeight: '600' },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'white', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12 },
    stepperBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
    stepperValue: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', minWidth: 30, textAlign: 'center' },
    imagePickerSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    imageCount: { fontSize: 15, fontWeight: '600', color: '#333' },
    addImageBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    addImageText: { color: '#0066FF', fontWeight: '600', fontSize: 14 },
    imagePlaceholder: { alignItems: 'center', paddingVertical: 48, gap: 8, backgroundColor: 'white', borderRadius: 16, borderWidth: 2, borderColor: '#E0E0E0', borderStyle: 'dashed' },
    imagePlaceholderText: { fontSize: 15, fontWeight: '600', color: '#555' },
    imagePlaceholderSub: { fontSize: 13, color: '#999', textAlign: 'center' },
    imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    imageWrapper: { width: '30%', aspectRatio: 1, position: 'relative' },
    imageThumb: { width: '100%', height: '100%', borderRadius: 10 },
    mainBadge: { position: 'absolute', bottom: 4, left: 4, backgroundColor: '#0066FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    mainBadgeText: { color: 'white', fontSize: 10, fontWeight: '700' },
    removeImageBtn: { position: 'absolute', top: -4, right: -4 },
    addMoreBtn: { width: '30%', aspectRatio: 1, backgroundColor: '#F0F5FF', borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#0066FF', borderStyle: 'dashed' },
    aiBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F5F0FF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginTop: 8, alignSelf: 'flex-start' },
    aiBtnIcon: { fontSize: 16 },
    aiBtnText: { color: '#8B5CF6', fontWeight: '700', fontSize: 13 },
    mediaButtons: { flexDirection: 'row', gap: 12 },
    addVideoBtn: { borderRadius: 8, backgroundColor: '#F5F0FF', paddingHorizontal: 10, paddingVertical: 6 },
    videoPreviewContainer: { position: 'relative', borderRadius: 14, overflow: 'hidden', marginBottom: 14, height: 200 },
    videoPreview: { width: '100%', height: '100%', backgroundColor: 'black' },
    removeVideoBtn: { position: 'absolute', top: 8, right: 8 },
    videoBadge: { position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
    videoBadgeText: { color: 'white', fontSize: 11, fontWeight: '700' },
    bottomBar: { flexDirection: 'row', gap: 12, padding: 16, paddingBottom: Platform.OS === 'ios' ? 28 : 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F0F0F0' },
    backBtnBtn: { flex: 1, borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    backBtnText: { fontSize: 15, fontWeight: '600', color: '#555' },
    nextBtn: { flex: 2, backgroundColor: '#0066FF', borderRadius: 12, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
    nextBtnDisabled: { backgroundColor: '#AAC8FF' },
    nextBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
    successScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 40, backgroundColor: 'white' },
    successIcon: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    successTitle: { fontSize: 24, fontWeight: '800', color: '#1A1A1A' },
    successSub: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22 },
    homeBtn: { backgroundColor: '#0066FF', borderRadius: 12, paddingHorizontal: 36, paddingVertical: 14, marginTop: 8 },
    homeBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
    viewBtn: { borderWidth: 1.5, borderColor: '#0066FF', borderRadius: 12, paddingHorizontal: 36, paddingVertical: 14 },
    viewBtnText: { color: '#0066FF', fontWeight: '700', fontSize: 16 },
});
