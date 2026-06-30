import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, StatusBar, Platform, Alert, ActivityIndicator, Switch,
    KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../store/authStore';
import { useUserStore } from '../store/userStore';
import { LifestyleProfile } from '../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthGuardScreen } from '../components/auth/AuthGuardScreen';

const PERSONALITY_OPTIONS = ['Hướng ngoại', 'Hướng nội', 'Linh hoạt'];
const SLEEP_OPTIONS = ['Trước 22h', '22h - 23h', '23h - 0h', 'Sau 0h'];

const COLORS = {
    primary: '#2563EB',
    primarySoft: '#EFF4FF',
    bg: '#F8FAFC',
    card: '#FFFFFF',
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    danger: '#EF4444',
    dangerSoft: '#FEECEC',
    star: '#F59E0B',
};

export default function EditProfileScreen() {
    return (
        <AuthGuardScreen
            message="Đăng nhập để chỉnh sửa hồ sơ"
            icon="person-outline"
        >
            <EditProfileContent />
        </AuthGuardScreen>
    );
}

function EditProfileContent() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    const { profile, updateProfile, updateAvatar, updateBanner, isUpdating, fetchProfile } = useUserStore();

    const [form, setForm] = useState({
        fullName: '',
        phone: '',
    });
    const [lifestyle, setLifestyle] = useState<LifestyleProfile>({
        sleepTime: '',
        hasPet: false,
        smoking: false,
        cleanlinessLevel: 3,
        personality: '',
    });
    const [avatarUri, setAvatarUri] = useState<string | null>(null);
    const [bannerUri, setBannerUri] = useState<string | null>(null);

    useEffect(() => {
        const u = profile || user;
        if (u) {
            setForm({ fullName: u.fullName || '', phone: u.phone || '' });
            if ((u as any).lifestyleProfile) {
                setLifestyle(prev => ({ ...prev, ...(u as any).lifestyleProfile }));
            }
        }
    }, [profile, user]);

    const displayUser = profile || user;

    const handlePickAvatar = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, aspect: [1, 1], quality: 0.8,
        });
        if (!result.canceled) setAvatarUri(result.assets[0].uri);
    };

    const handlePickBanner = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, aspect: [16, 9], quality: 0.8,
        });
        if (!result.canceled) setBannerUri(result.assets[0].uri);
    };

    const handleSave = async () => {
        if (!form.fullName.trim()) {
            Alert.alert('Lỗi', 'Tên không được để trống');
            return;
        }

        try {
            // Update profile info + lifestyle
            await updateProfile({
                fullName: form.fullName,
                phone: form.phone,
                lifestyleProfile: lifestyle,
            });

            // Upload avatar if changed
            if (avatarUri) {
                const formData = new FormData();
                formData.append('file', { uri: avatarUri, name: 'avatar.jpg', type: 'image/jpeg' } as any);
                await updateAvatar(formData);
            }

            // Upload banner if changed
            if (bannerUri) {
                const formData = new FormData();
                formData.append('file', { uri: bannerUri, name: 'banner.jpg', type: 'image/jpeg' } as any);
                await updateBanner(formData);
            }

            await fetchProfile();
            Alert.alert('Thành công', 'Hồ sơ đã được cập nhật!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (e: any) {
            Alert.alert('Lỗi', e.message || 'Cập nhật thất bại');
        }
    };

    const currentAvatar = avatarUri || displayUser?.avatarUrl ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser?.fullName || 'User')}&background=2563EB&color=fff&size=200`;
    const currentBanner = bannerUri || (displayUser as any)?.bannerUrl ||
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800';

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.headerIconBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chỉnh sửa hồ sơ</Text>
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={isUpdating}
                    style={styles.headerSaveBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    {isUpdating ? <ActivityIndicator size="small" color={COLORS.primary} /> : (
                        <Text style={styles.saveBtn}>Lưu</Text>
                    )}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={insets.top}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Banner + Avatar block */}
                    <View style={styles.heroBlock}>
                        <TouchableOpacity onPress={handlePickBanner} activeOpacity={0.85}>
                            <Image source={{ uri: currentBanner }} style={styles.bannerImage} contentFit="cover" />
                            <View style={styles.bannerOverlay}>
                                <Ionicons name="camera-outline" size={16} color="white" />
                                <Text style={styles.bannerOverlayText}>Đổi ảnh bìa</Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.avatarSection}>
                            <View style={styles.avatarWrapper}>
                                <Image source={{ uri: currentAvatar }} style={styles.avatar} contentFit="cover" />
                                <TouchableOpacity
                                    style={styles.cameraBtn}
                                    onPress={handlePickAvatar}
                                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                >
                                    <Ionicons name="camera" size={16} color="white" />
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity onPress={handlePickAvatar} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Text style={styles.changeAvatarText}>Thay đổi ảnh đại diện</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Basic Info */}
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>

                        <FormField label="Họ và tên">
                            <TextInput
                                style={styles.input}
                                value={form.fullName}
                                onChangeText={v => setForm(p => ({ ...p, fullName: v }))}
                                placeholder="Nhập họ và tên"
                                placeholderTextColor={COLORS.textSecondary}
                            />
                        </FormField>

                        <FormField label="Email">
                            <TextInput
                                style={[styles.input, styles.inputDisabled]}
                                value={displayUser?.email}
                                editable={false}
                            />
                            <Text style={styles.hintText}>Đổi email trong Bảo mật &amp; Mật khẩu</Text>
                        </FormField>

                        <FormField label="Số điện thoại" last>
                            <TextInput
                                style={styles.input}
                                value={form.phone}
                                onChangeText={v => setForm(p => ({ ...p, phone: v }))}
                                placeholder="Nhập số điện thoại"
                                placeholderTextColor={COLORS.textSecondary}
                                keyboardType="phone-pad"
                            />
                        </FormField>
                    </View>

                    {/* Lifestyle Profile */}
                    <View style={styles.card}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionTitle}>Lối sống</Text>
                            <Text style={styles.sectionSubtitle}>Giúp tìm bạn ở ghép phù hợp</Text>
                        </View>

                        <FormField label="Thời gian ngủ">
                            <View style={styles.chipRow}>
                                {SLEEP_OPTIONS.map(opt => (
                                    <TouchableOpacity
                                        key={opt}
                                        style={[styles.chip, lifestyle.sleepTime === opt && styles.chipSelected]}
                                        onPress={() => setLifestyle(p => ({ ...p, sleepTime: opt }))}
                                    >
                                        <Text style={[styles.chipText, lifestyle.sleepTime === opt && styles.chipTextSelected]}>{opt}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </FormField>

                        <FormField label="Tính cách">
                            <View style={styles.chipRow}>
                                {PERSONALITY_OPTIONS.map(opt => (
                                    <TouchableOpacity
                                        key={opt}
                                        style={[styles.chip, lifestyle.personality === opt && styles.chipSelected]}
                                        onPress={() => setLifestyle(p => ({ ...p, personality: opt }))}
                                    >
                                        <Text style={[styles.chipText, lifestyle.personality === opt && styles.chipTextSelected]}>{opt}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </FormField>

                        <FormField label="Mức độ sạch sẽ" last>
                            <View style={styles.cleanRow}>
                                {[1, 2, 3, 4, 5].map(level => (
                                    <TouchableOpacity
                                        key={level}
                                        onPress={() => setLifestyle(p => ({ ...p, cleanlinessLevel: level }))}
                                        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                                    >
                                        <Ionicons
                                            name={level <= (lifestyle.cleanlinessLevel || 0) ? 'star' : 'star-outline'}
                                            size={28}
                                            color={level <= (lifestyle.cleanlinessLevel || 0) ? COLORS.star : COLORS.border}
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </FormField>

                        <View style={styles.switchRow}>
                            <View style={styles.switchIconWrap}>
                                <Ionicons name="paw-outline" size={18} color={COLORS.primary} />
                            </View>
                            <View style={styles.switchInfo}>
                                <Text style={styles.switchLabel}>Có nuôi thú cưng</Text>
                                <Text style={styles.switchHint}>Chó, mèo, hamster...</Text>
                            </View>
                            <Switch
                                value={lifestyle.hasPet}
                                onValueChange={v => setLifestyle(p => ({ ...p, hasPet: v }))}
                                trackColor={{ false: COLORS.border, true: '#BFD3FE' }}
                                thumbColor={lifestyle.hasPet ? COLORS.primary : '#FFFFFF'}
                            />
                        </View>

                        <View style={[styles.switchRow, styles.switchRowLast]}>
                            <View style={[styles.switchIconWrap, { backgroundColor: COLORS.dangerSoft }]}>
                                <Ionicons name="logo-no-smoking" size={18} color={COLORS.danger} />
                            </View>
                            <View style={styles.switchInfo}>
                                <Text style={styles.switchLabel}>Hút thuốc</Text>
                            </View>
                            <Switch
                                value={lifestyle.smoking}
                                onValueChange={v => setLifestyle(p => ({ ...p, smoking: v }))}
                                trackColor={{ false: COLORS.border, true: '#FBCFCB' }}
                                thumbColor={lifestyle.smoking ? COLORS.danger : '#FFFFFF'}
                            />
                        </View>
                    </View>
                </ScrollView>

                {/* Sticky Save Button */}
                <View style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, 14) }]}>
                    <TouchableOpacity
                        style={[styles.saveFullBtn, isUpdating && styles.saveBtnDisabled]}
                        onPress={handleSave}
                        disabled={isUpdating}
                        activeOpacity={0.85}
                    >
                        {isUpdating ? <ActivityIndicator color="white" /> : (
                            <Text style={styles.saveFullBtnText}>Lưu thay đổi</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

function FormField({ label, children, last }: { label: string; children?: React.ReactNode; last?: boolean }) {
    return (
        <View style={[styles.formField, last && { marginBottom: 0 }]}>
            <Text style={styles.fieldLabel}>{label}</Text>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingBottom: 14, backgroundColor: COLORS.card,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    headerIconBtn: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
    },
    headerSaveBtn: {
        minWidth: 44, height: 40, alignItems: 'flex-end', justifyContent: 'center',
        paddingHorizontal: 4,
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
    saveBtn: { color: COLORS.primary, fontSize: 16, fontWeight: '700' },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 24 },
    // Hero block (banner + avatar)
    heroBlock: { backgroundColor: COLORS.card, marginBottom: 12 },
    bannerImage: { width: '100%', height: 150, backgroundColor: COLORS.border },
    bannerOverlay: {
        position: 'absolute', bottom: 10, right: 12,
        flexDirection: 'row', alignItems: 'center',
        gap: 6, paddingVertical: 6, paddingHorizontal: 10,
        backgroundColor: 'rgba(15,23,42,0.55)', borderRadius: 20,
    },
    bannerOverlayText: { color: 'white', fontSize: 12, fontWeight: '600' },
    // Avatar
    avatarSection: { alignItems: 'center', paddingVertical: 18 },
    avatarWrapper: { position: 'relative', marginTop: -46, marginBottom: 10 },
    avatar: {
        width: 92, height: 92, borderRadius: 46, backgroundColor: COLORS.border,
        borderWidth: 3, borderColor: COLORS.card,
    },
    cameraBtn: {
        position: 'absolute', bottom: 2, right: 2,
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: COLORS.card,
    },
    changeAvatarText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
    // Card
    card: {
        backgroundColor: COLORS.card, marginHorizontal: 16, marginBottom: 12,
        borderRadius: 16, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 6,
        borderWidth: 1, borderColor: COLORS.border,
        shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
        elevation: 1,
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 16 },
    sectionHeaderRow: { marginBottom: 12 },
    sectionSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
    formField: { marginBottom: 18 },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
    input: {
        backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border,
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
        fontSize: 15, color: COLORS.textPrimary, minHeight: 48,
    },
    inputDisabled: { color: COLORS.textSecondary, backgroundColor: '#F1F5F9' },
    hintText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 6 },
    // Chips
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        paddingHorizontal: 14, paddingVertical: 10, minHeight: 40,
        justifyContent: 'center',
        borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 20,
        backgroundColor: COLORS.card,
    },
    chipSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
    chipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
    chipTextSelected: { color: COLORS.primary, fontWeight: '700' },
    // Cleanliness
    cleanRow: { flexDirection: 'row', gap: 10 },
    // Switch rows
    switchRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
        gap: 12,
    },
    switchRowLast: { borderBottomWidth: 0 },
    switchIconWrap: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: COLORS.primarySoft,
        alignItems: 'center', justifyContent: 'center',
    },
    switchInfo: { flex: 1 },
    switchLabel: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
    switchHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
    // Sticky footer / Save
    stickyFooter: {
        backgroundColor: COLORS.card, paddingHorizontal: 16, paddingTop: 12,
        borderTopWidth: 1, borderTopColor: COLORS.border,
    },
    saveFullBtn: {
        backgroundColor: COLORS.primary, borderRadius: 14,
        paddingVertical: 16, alignItems: 'center', minHeight: 50,
        justifyContent: 'center',
    },
    saveBtnDisabled: { backgroundColor: '#A8C2F8' },
    saveFullBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});