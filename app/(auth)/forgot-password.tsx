import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    KeyboardAvoidingView, Platform, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authService } from '../../services/api/auth';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const handleSubmit = async () => {
        if (!email.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập email');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Alert.alert('Lỗi', 'Email không đúng định dạng');
            return;
        }

        setIsLoading(true);
        try {
            await authService.forgotPassword(email.trim());
            setIsSent(true);
        } catch (error: any) {
            Alert.alert('Lỗi', error?.response?.data?.message || 'Không thể gửi email khôi phục. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isSent) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" />
                <View style={styles.successContainer}>
                    <View style={styles.successIconWrap}>
                        <Ionicons name="mail-open-outline" size={64} color="#0066FF" />
                    </View>
                    <Text style={styles.successTitle}>Đã gửi email!</Text>
                    <Text style={styles.successSubtitle}>
                        Link khôi phục mật khẩu đã được gửi đến{'\n'}
                        <Text style={styles.emailHighlight}>{email}</Text>
                    </Text>
                    <Text style={styles.successNote}>
                        Vui lòng kiểm tra hộp thư (bao gồm thư rác) và làm theo hướng dẫn trong email.
                    </Text>

                    <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(auth)/login')}>
                        <Text style={styles.primaryBtnText}>Quay lại đăng nhập</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.resendBtn} onPress={() => { setIsSent(false); }}>
                        <Text style={styles.resendBtnText}>Gửi lại email</Text>
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
                    <Ionicons name="lock-closed-outline" size={56} color="#0066FF" />
                </View>

                <Text style={styles.title}>Quên mật khẩu?</Text>
                <Text style={styles.subtitle}>
                    Nhập email đã đăng ký, chúng tôi sẽ gửi link khôi phục mật khẩu cho bạn.
                </Text>

                <View style={styles.inputContainer}>
                    <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Nhập email của bạn"
                        placeholderTextColor="#BBB"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoFocus
                    />
                </View>

                <TouchableOpacity
                    style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.primaryBtnText}>Gửi link khôi phục</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backToLogin}>← Quay lại đăng nhập</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    header: {
        paddingHorizontal: 16,
        paddingTop: 0 /* paddingTop set via inline style using useSafeAreaInsets */,
        paddingBottom: 8,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'center',
        marginTop: -60,
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
        lineHeight: 22, marginBottom: 32, paddingHorizontal: 10,
    },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F8F9FA', borderWidth: 1.5,
        borderColor: '#E0E0E0', borderRadius: 12,
        paddingHorizontal: 14, marginBottom: 20,
    },
    inputIcon: { marginRight: 10 },
    input: {
        flex: 1, paddingVertical: 14, fontSize: 16, color: '#1A1A1A',
    },
    primaryBtn: {
        backgroundColor: '#0066FF', borderRadius: 12,
        paddingVertical: 16, alignItems: 'center', marginBottom: 16,
    },
    primaryBtnDisabled: { backgroundColor: '#AAC8FF' },
    primaryBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
    backToLogin: {
        color: '#0066FF', fontSize: 14, fontWeight: '600',
        textAlign: 'center',
    },
    // Success state
    successContainer: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: 32,
    },
    successIconWrap: {
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: '#E8F0FF',
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 24,
    },
    successTitle: {
        fontSize: 24, fontWeight: '800', color: '#1A1A1A', marginBottom: 12,
    },
    successSubtitle: {
        fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22,
    },
    emailHighlight: { fontWeight: '700', color: '#0066FF' },
    successNote: {
        fontSize: 13, color: '#999', textAlign: 'center',
        marginTop: 12, lineHeight: 20, paddingHorizontal: 10,
    },
    resendBtn: {
        paddingVertical: 12, paddingHorizontal: 20,
    },
    resendBtnText: { color: '#0066FF', fontSize: 14, fontWeight: '600' },
});
