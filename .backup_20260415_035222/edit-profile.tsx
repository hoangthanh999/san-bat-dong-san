import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, StatusBar, Platform, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../store/authStore';
import { useUserStore } from '../store/userStore';
import { LifestyleProfile } from '../types';

const PERSONALITY_OPTIONS = ['Hướng ngoại', 'Hướng nội', 'Linh hoạt'];
const SLEEP_OPTIONS = ['Trước 22h', '22h - 23h', '23h - 0h', 'Sau 0h'];

export default function EditProfileScreen() {
    const router = useRouter();
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
        `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser?.fullName || 'User')}&background=0066FF&color=fff&size=200`;
    const currentBanner = bannerUri || (displayUser as any)?.bannerUrl ||
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800';

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chỉnh sửa hồ sơ</Text>
                <TouchableOpacity onPress={handleSave} disabled={isUpdating}>
                    {isUpdating ? <ActivityIndicator size="small" color="#0066FF" /> : (
                        <Text style={styles.saveBtn}>Lưu</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Banner */}
                <TouchableOpacity onPress={handlePickBanner} activeOpacity={0.8}>
                    <Image source={{ uri: currentBanner }} style={styles.bannerImage} contentFit="cover" />
                    <View style={styles.bannerOverlay}>
                        <Ionicons name="camera-outline" size={20} color="white" />
                        <Text style={styles.bannerOverlayText}>Đổi ảnh bìa</Text>
                    </View>
                </TouchableOpacity>

                {/* Avatar */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatarWrapper}>
                        <Image source={{ uri: currentAvatar }} style={styles.avatar} contentFit="cover" />
                        <TouchableOpacity style={styles.cameraBtn} onPress={handlePickAvatar}>
                            <Ionicons name="camera" size={16} color="white" />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={handlePickAvatar}>
                        <Text style={styles.changeAvatarText}>Thay đổi ảnh đại diện</Text>
                    </TouchableOpacity>
                </View>

                {/* Basic Info */}
                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>

                    <FormField label="Họ và tên">
                        <TextInput
                            style={styles.input}
                            value={form.fullName}
                            onChangeText={v => setForm(p => ({ ...p, fullName: v }))}
                            placeholder="Nhập họ và tên"
                        />
                    </FormField>

                    <FormField label="Email">
                        <TextInput
                            style={[styles.input, styles.inputDisabled]}
                            value={displayUser?.email}
                            editable={false}
                        />
                        <Text style={styles.hintText}>Đổi email trong Bảo mật & Mật khẩu</Text>
                    </FormField>

                    <FormField label="Số điện thoại">
                        <TextInput
                            style={styles.input}
                            value={form.phone}
                            onChangeText={v => setForm(p => ({ ...p, phone: v }))}
                            placeholder="Nhập số điện thoại"
                            keyboardType="phone-pad"
                        />
                    </FormField>
                </View>

                {/* Lifestyle Profile */}
                <View style={styles.formSection}>
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

                    <FormField label="Mức độ sạch sẽ">
                        <View style={styles.cleanRow}>
                            {[1, 2, 3, 4, 5].map(level => (
                                <TouchableOpacity
                                    key={level}
                                    onPress={() => setLifestyle(p => ({ ...p, cleanlinessLevel: level }))}
                                >
                                    <Ionicons
                                        name={level <= (lifestyle.cleanlinessLevel || 0) ? 'star' : 'star-outline'}
                                        size={28}
                                        color={level <= (lifestyle.cleanlinessLevel || 0) ? '#FFB800' : '#DDD'}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </FormField>

                    <View style={styles.switchRow}>
                        <View style={styles.switchInfo}>
                            <Text style={styles.switchLabel}>Có nuôi thú cưng</Text>
                            <Text style={styles.switchHint}>Chó, mèo, hamster...</Text>
                        </View>
                        <Switch
                            value={lifestyle.hasPet}
                            onValueChange={v => setLifestyle(p => ({ ...p, hasPet: v }))}
                            trackColor={{ false: '#E0E0E0', true: '#BDD7FF' }}
                            thumbColor={lifestyle.hasPet ? '#0066FF' : '#999'}
                        />
                    </View>

                    <View style={styles.switchRow}>
                        <View style={styles.switchInfo}>
                            <Text style={styles.switchLabel}>Hút thuốc</Text>
                        </View>
                        <Switch
                            value={lifestyle.smoking}
                            onValueChange={v => setLifestyle(p => ({ ...p, smoking: v }))}
                            trackColor={{ false: '#E0E0E0', true: '#FBBBB5' }}
                            thumbColor={lifestyle.smoking ? '#EF4444' : '#999'}
                        />
                    </View>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                    style={[styles.saveFullBtn, isUpdating && styles.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={isUpdating}
                >
                    {isUpdating ? <ActivityIndicator color="white" /> : (
                        <Text style={styles.saveFullBtnText}>Lưu thay đổi</Text>
                    )}
                </TouchableOpacity>

                <View style={{ height: 60 }} />
            </ScrollView>
        </View>
    );
}

function FormField({ label, children }: { label: string; children?: React.ReactNode }) {
    return (
        <View style={styles.formField}>
            <Text style={styles.fieldLabel}>{label}</Text>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight ?? 24) + 8,
        paddingBottom: 12, backgroundColor: 'white',
        borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
    saveBtn: { color: '#0066FF', fontSize: 16, fontWeight: '700' },
    scrollView: { flex: 1 },
    // Banner
    bannerImage: { width: '100%', height: 140, backgroundColor: '#E0E0E0' },
    bannerOverlay: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 8,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    bannerOverlayText: { color: 'white', fontSize: 13, fontWeight: '600' },
    // Avatar
    avatarSection: { alignItems: 'center', paddingVertical: 20, backgroundColor: 'white' },
    avatarWrapper: { position: 'relative', marginBottom: 10 },
    avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#E0E0E0' },
    cameraBtn: {
        position: 'absolute', bottom: 0, right: 0,
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: '#0066FF', justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: 'white',
    },
    changeAvatarText: { color: '#0066FF', fontWeight: '600', fontSize: 14 },
    // Form
    formSection: { backgroundColor: 'white', marginTop: 12, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },
    sectionHeaderRow: { marginBottom: 12 },
    sectionSubtitle: { fontSize: 13, color: '#999', marginTop: 2 },
    formField: { marginBottom: 16 },
    fieldLabel: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8 },
    input: {
        backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E0E0E0',
        borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
        fontSize: 15, color: '#1A1A1A',
    },
    inputDisabled: { color: '#AAA', backgroundColor: '#F0F0F0' },
    hintText: { fontSize: 12, color: '#999', marginTop: 4 },
    // Chips
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        paddingHorizontal: 14, paddingVertical: 9,
        borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 20,
        backgroundColor: 'white',
    },
    chipSelected: { borderColor: '#0066FF', backgroundColor: '#E8F0FF' },
    chipText: { fontSize: 13, color: '#666' },
    chipTextSelected: { color: '#0066FF', fontWeight: '600' },
    // Cleanliness
    cleanRow: { flexDirection: 'row', gap: 8 },
    // Switch rows
    switchRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
    },
    switchInfo: { flex: 1 },
    switchLabel: { fontSize: 15, fontWeight: '500', color: '#333' },
    switchHint: { fontSize: 12, color: '#999', marginTop: 2 },
    // Save
    saveFullBtn: {
        backgroundColor: '#0066FF', borderRadius: 12,
        paddingVertical: 16, alignItems: 'center',
        marginHorizontal: 16, marginTop: 20,
    },
    saveBtnDisabled: { backgroundColor: '#AAC8FF' },
    saveFullBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
