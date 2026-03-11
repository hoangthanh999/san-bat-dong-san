import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, StatusBar, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../store/authStore';
import { useUserStore } from '../store/userStore';

export default function EditProfileScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { profile, updateProfile, updateAvatar, isUpdating, fetchProfile } = useUserStore();
    const [form, setForm] = useState({
        fullName: '',
        phone: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [avatarUri, setAvatarUri] = useState<string | null>(null);

    useEffect(() => {
        const u = profile || user;
        if (u) {
            setForm(prev => ({
                ...prev,
                fullName: u.fullName || '',
                phone: u.phone || '',
            }));
        }
    }, [profile, user]);

    const displayUser = profile || user;

    const handlePickAvatar = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled) {
            setAvatarUri(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!form.fullName.trim()) {
            Alert.alert('Lỗi', 'Tên không được để trống');
            return;
        }
        if (form.newPassword && form.newPassword !== form.confirmPassword) {
            Alert.alert('Lỗi', 'Mật khẩu mới không khớp');
            return;
        }

        try {
            const updateData: any = { fullName: form.fullName, phone: form.phone };
            if (form.newPassword && form.currentPassword) {
                updateData.currentPassword = form.currentPassword;
                updateData.newPassword = form.newPassword;
            }
            await updateProfile(updateData);

            if (avatarUri) {
                const formData = new FormData();
                formData.append('avatar', { uri: avatarUri, name: 'avatar.jpg', type: 'image/jpeg' } as any);
                await updateAvatar(formData);
            }

            Alert.alert('Thành công', 'Hồ sơ đã được cập nhật!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (e: any) {
            Alert.alert('Lỗi', e.message || 'Cập nhật thất bại');
        }
    };

    const currentAvatar = avatarUri || displayUser?.avatarUrl ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser?.fullName || 'User')}&background=0066FF&color=fff&size=200`;

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

                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>Đổi mật khẩu</Text>

                    <FormField label="Mật khẩu hiện tại">
                        <TextInput
                            style={styles.input}
                            value={form.currentPassword}
                            onChangeText={v => setForm(p => ({ ...p, currentPassword: v }))}
                            placeholder="Nhập mật khẩu hiện tại"
                            secureTextEntry
                        />
                    </FormField>

                    <FormField label="Mật khẩu mới">
                        <TextInput
                            style={styles.input}
                            value={form.newPassword}
                            onChangeText={v => setForm(p => ({ ...p, newPassword: v }))}
                            placeholder="Nhập mật khẩu mới (ít nhất 8 ký tự)"
                            secureTextEntry
                        />
                    </FormField>

                    <FormField label="Xác nhận mật khẩu mới">
                        <TextInput
                            style={styles.input}
                            value={form.confirmPassword}
                            onChangeText={v => setForm(p => ({ ...p, confirmPassword: v }))}
                            placeholder="Nhập lại mật khẩu mới"
                            secureTextEntry
                        />
                    </FormField>
                </View>

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
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 54 : 16, paddingBottom: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
    saveBtn: { color: '#0066FF', fontSize: 16, fontWeight: '700' },
    scrollView: { flex: 1 },
    avatarSection: { alignItems: 'center', paddingVertical: 28, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    avatarWrapper: { position: 'relative', marginBottom: 10 },
    avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#E0E0E0' },
    cameraBtn: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: '#0066FF', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
    changeAvatarText: { color: '#0066FF', fontWeight: '600', fontSize: 14 },
    formSection: { backgroundColor: 'white', marginTop: 12, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },
    formField: { marginBottom: 16 },
    fieldLabel: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8 },
    input: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1A1A' },
    inputDisabled: { color: '#AAA', backgroundColor: '#F0F0F0' },
    saveFullBtn: { backgroundColor: '#0066FF', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginHorizontal: 16, marginTop: 20 },
    saveBtnDisabled: { backgroundColor: '#AAC8FF' },
    saveFullBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
