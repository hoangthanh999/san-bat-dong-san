import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    KeyboardAvoidingView, Platform, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authService } from '../../services/api/auth';

export default function ResetPasswordScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { token } = useLocalSearchParams<{ token: string }>();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isDone, setIsDone] = useState(false);

    const handleReset = async () => {
        if (!token) {
            Alert.alert('Lỗi', 'Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng gửi lại email.');
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Lỗi', 'Xác nhận mật khẩu không khớp');
            return;
        }

        setIsLoading(true);
        try {
            await authService.resetPassword(token, newPassword);
            setIsDone(true);
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || 'Đặt lại mật khẩu thất bại. Token có thể đã hết hạn.';
            Alert.alert('Lỗi', msg);
        } finally {
            setIsLoading(false);
        }
    };

    // === SUCCESS STATE ===
    if (isDone) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" />
                <View style={styles.successContainer}>
                    <View style={styles.successIconWrap}>
                        <Ionicons name="checkmark-circle" size={72} color="#22C55E" />
                    </View>
                    <Text style={styles.successTitle}>Đặt lại thành công!</Text>
                    <Text style={styles.successSubtitle}>
                        Mật khẩu của bạn đã được cập nhật.{'\n'}
                        Vui lòng đăng nhập lại bằng mật khẩu mới.
                    </Text>

                    <TouchableOpacity
                        style={styles.primaryBtn}
                        onPress={() => router.replace('/(auth)/login')}
                    >
                        <Text style={styles.primaryBtnText}>Đăng nhập ngay</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <View style={styles.iconWrap}>
                    <Ionicons name="lock-open-outline" size={56} color="#0066FF" />
                </View>

                <Text style={styles.title}>Đặt mật khẩu mới</Text>
                <Text style={styles.subtitle}>
                    Nhập mật khẩu mới của bạn bên dưới. Mật khẩu phải có ít nhất 6 ký tự.
                </Text>

                {/* No token warning */}
                {!token && (
                    <View style={styles.warningBox}>
                        <Ionicons name="warning-outline" size={18} color="#E65100" />
                        <Text style={styles.warningText}>
                            Liên kết không hợp lệ. Vui lòng kiểm tra email và thử lại.
                        </Text>
                    </View>
                )}

                {/* New Password */}
                <View style={styles.fieldLabel}>
                    <Text style={styles.label}>Mật khẩu mới</Text>
                </View>
                <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Ít nhất 6 ký tự"
                        placeholderTextColor="#BBB"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showNew}
                        autoFocus
                    />
                    <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeBtn}>
                        <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" />
                    </TouchableOpacity>
                </View>

                {/* Confirm Password */}
                <View style={styles.fieldLabel}>
                    <Text style={styles.label}>Xác nhận mật khẩu</Text>
                </View>
                <View style={[
                    styles.inputContainer,
                    confirmPassword.length > 0 && confirmPassword !== newPassword && styles.inputError,
                ]}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#999" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Nhập lại mật khẩu mới"
                        placeholderTextColor="#BBB"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirm}
                    />
                    <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                        <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" />
                    </TouchableOpacity>
                </View>

                {/* Password strength hint */}
                {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                    <Text style={styles.errorHint}>⚠ Mật khẩu xác nhận chưa khớp</Text>
                )}
                {confirmPassword.length > 0 && confirmPassword === newPassword && (
                    <Text style={styles.successHint}>✓ Mật khẩu khớp</Text>
                )}

                <TouchableOpacity
                    style={[
                        styles.primaryBtn,
                        (isLoading || !token) && styles.primaryBtnDisabled,
                    ]}
                    onPress={handleReset}
                    disabled={isLoading || !token}
                >
                    {isLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.primaryBtnText}>Đặt lại mật khẩu</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.replace('/(auth)/forgot-password' as any)}>
                    <Text style={styles.backToForgot}>← Gửi lại email khôi phục</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    header: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'center',
        marginTop: -40,
    },
    iconWrap: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: '#E8F0FF',
        justifyContent: 'center', alignItems: 'center',
        alignSelf: 'center', marginBottom: 24,
    },
    title: {
        fontSize: 26, fontWeight: '800', color: '#1A1A1A',
        textAlign: 'center', marginBottom: 8,
    },
    subtitle: {
        fontSize: 15, color: '#888', textAlign: 'center',
        lineHeight: 22, marginBottom: 28, paddingHorizontal: 10,
    },
    warningBox: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#FFF3E0', borderRadius: 10,
        padding: 12, marginBottom: 16,
    },
    warningText: { flex: 1, fontSize: 13, color: '#B37400', lineHeight: 18 },
    fieldLabel: { marginBottom: 6 },
    label: { fontSize: 14, fontWeight: '600', color: '#555' },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F8F9FA', borderWidth: 1.5,
        borderColor: '#E0E0E0', borderRadius: 12,
        paddingHorizontal: 14, marginBottom: 16,
    },
    inputError: { borderColor: '#EF4444', backgroundColor: '#FFF5F5' },
    inputIcon: { marginRight: 10 },
    input: {
        flex: 1, paddingVertical: 14, fontSize: 16, color: '#1A1A1A',
    },
    eyeBtn: { padding: 4 },
    errorHint: { fontSize: 12, color: '#EF4444', marginTop: -12, marginBottom: 12, marginLeft: 4 },
    successHint: { fontSize: 12, color: '#22C55E', marginTop: -12, marginBottom: 12, marginLeft: 4 },
    primaryBtn: {
        backgroundColor: '#0066FF', borderRadius: 12,
        paddingVertical: 16, alignItems: 'center', marginBottom: 16, marginTop: 4,
    },
    primaryBtnDisabled: { backgroundColor: '#AAC8FF' },
    primaryBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
    backToForgot: {
        color: '#0066FF', fontSize: 14, fontWeight: '600',
        textAlign: 'center',
    },
    // Success
    successContainer: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: 32,
    },
    successIconWrap: {
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: '#F0FDF4',
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 24,
    },
    successTitle: {
        fontSize: 26, fontWeight: '800', color: '#1A1A1A', marginBottom: 12,
    },
    successSubtitle: {
        fontSize: 15, color: '#666', textAlign: 'center',
        lineHeight: 22, marginBottom: 32,
    },
});
