import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Platform, Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { authService } from '../../services/api/auth';
import { useAuthStore } from '../../store/authStore';

export default function SecuritySettingsScreen() {
    const router = useRouter();
    const { logout } = useAuthStore();

    // ========== Change Password ==========
    const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [pwLoading, setPwLoading] = useState(false);
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);

    const handleChangePassword = async () => {
        if (!pwForm.oldPassword.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu hiện tại');
            return;
        }
        if (pwForm.newPassword.length < 6) {
            Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự');
            return;
        }
        if (pwForm.newPassword !== pwForm.confirmPassword) {
            Alert.alert('Lỗi', 'Xác nhận mật khẩu không khớp');
            return;
        }
        setPwLoading(true);
        try {
            const msg = await authService.changePassword(pwForm.oldPassword, pwForm.newPassword);
            Alert.alert('Thành công', msg || 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.', [
                { text: 'OK', onPress: () => { logout(); router.replace('/(auth)/login'); } },
            ]);
        } catch (error: any) {
            Alert.alert('Lỗi', error?.response?.data?.message || 'Đổi mật khẩu thất bại');
        } finally {
            setPwLoading(false);
        }
    };

    // ========== Change Email ==========
    const [emailForm, setEmailForm] = useState({ password: '', newEmail: '' });
    const [emailLoading, setEmailLoading] = useState(false);

    const handleChangeEmail = async () => {
        if (!emailForm.password.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu xác nhận');
            return;
        }
        const reg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!reg.test(emailForm.newEmail)) {
            Alert.alert('Lỗi', 'Email không đúng định dạng');
            return;
        }
        setEmailLoading(true);
        try {
            const msg = await authService.changeEmail(emailForm.password, emailForm.newEmail);
            Alert.alert('Thành công', msg || 'Đổi email thành công! Vui lòng đăng nhập lại.', [
                { text: 'OK', onPress: () => { logout(); router.replace('/(auth)/login'); } },
            ]);
        } catch (error: any) {
            Alert.alert('Lỗi', error?.response?.data?.message || 'Đổi email thất bại');
        } finally {
            setEmailLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Bảo mật & Mật khẩu</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Change Password Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="key-outline" size={20} color="#0066FF" />
                        <Text style={styles.sectionTitle}>Đổi mật khẩu</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Mật khẩu hiện tại</Text>
                        <View style={styles.inputWrap}>
                            <TextInput
                                style={styles.input}
                                value={pwForm.oldPassword}
                                onChangeText={v => setPwForm(p => ({ ...p, oldPassword: v }))}
                                placeholder="Nhập mật khẩu hiện tại"
                                secureTextEntry={!showOld}
                            />
                            <TouchableOpacity onPress={() => setShowOld(!showOld)}>
                                <Ionicons name={showOld ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Mật khẩu mới</Text>
                        <View style={styles.inputWrap}>
                            <TextInput
                                style={styles.input}
                                value={pwForm.newPassword}
                                onChangeText={v => setPwForm(p => ({ ...p, newPassword: v }))}
                                placeholder="Ít nhất 6 ký tự"
                                secureTextEntry={!showNew}
                            />
                            <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                                <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
                        <TextInput
                            style={[styles.input, styles.inputFull]}
                            value={pwForm.confirmPassword}
                            onChangeText={v => setPwForm(p => ({ ...p, confirmPassword: v }))}
                            placeholder="Nhập lại mật khẩu mới"
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.actionBtn, pwLoading && styles.actionBtnDisabled]}
                        onPress={handleChangePassword}
                        disabled={pwLoading}
                    >
                        {pwLoading ? <ActivityIndicator color="white" /> : (
                            <>
                                <Ionicons name="checkmark-circle-outline" size={18} color="white" />
                                <Text style={styles.actionBtnText}>Đổi mật khẩu</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Change Email Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="mail-outline" size={20} color="#8B5CF6" />
                        <Text style={styles.sectionTitle}>Đổi email</Text>
                    </View>

                    <View style={styles.warningBox}>
                        <Ionicons name="information-circle-outline" size={18} color="#FF9500" />
                        <Text style={styles.warningText}>
                            Sau khi đổi email, bạn sẽ cần đăng nhập lại bằng email mới.
                        </Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email mới</Text>
                        <TextInput
                            style={[styles.input, styles.inputFull]}
                            value={emailForm.newEmail}
                            onChangeText={v => setEmailForm(p => ({ ...p, newEmail: v }))}
                            placeholder="nhap@email-moi.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Mật khẩu xác nhận</Text>
                        <TextInput
                            style={[styles.input, styles.inputFull]}
                            value={emailForm.password}
                            onChangeText={v => setEmailForm(p => ({ ...p, password: v }))}
                            placeholder="Nhập mật khẩu hiện tại để xác nhận"
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnPurple, emailLoading && styles.actionBtnDisabled]}
                        onPress={handleChangeEmail}
                        disabled={emailLoading}
                    >
                        {emailLoading ? <ActivityIndicator color="white" /> : (
                            <>
                                <Ionicons name="checkmark-circle-outline" size={18} color="white" />
                                <Text style={styles.actionBtnText}>Đổi email</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={{ height: 80 }} />
            </ScrollView>
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
    scrollView: { flex: 1 },
    section: { backgroundColor: 'white', padding: 20, marginTop: 12 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8 },
    inputWrap: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F8F9FA', borderWidth: 1.5, borderColor: '#E0E0E0',
        borderRadius: 12, paddingHorizontal: 14,
    },
    input: { flex: 1, paddingVertical: 13, fontSize: 15, color: '#1A1A1A' },
    inputFull: {
        backgroundColor: '#F8F9FA', borderWidth: 1.5, borderColor: '#E0E0E0',
        borderRadius: 12, paddingHorizontal: 14,
    },
    actionBtn: {
        flexDirection: 'row', backgroundColor: '#0066FF', borderRadius: 12,
        paddingVertical: 14, justifyContent: 'center', alignItems: 'center',
        gap: 8, marginTop: 4,
    },
    actionBtnPurple: { backgroundColor: '#8B5CF6' },
    actionBtnDisabled: { opacity: 0.6 },
    actionBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
    divider: { height: 1, backgroundColor: '#E8E8E8', marginHorizontal: 20 },
    warningBox: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#FFF8E8', borderRadius: 10,
        padding: 12, marginBottom: 16,
    },
    warningText: { flex: 1, fontSize: 13, color: '#B37400', lineHeight: 18 },
});
