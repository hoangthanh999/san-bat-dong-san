import React, { useState } from 'react';
import {
    View,
    Text,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Alert,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RegisterScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { register, isLoading, error } = useAuthStore();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

    const validate = () => {
        let errors: { [key: string]: string } = {};

        if (!fullName.trim()) errors.fullName = 'Vui lòng nhập họ tên';

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim()) {
            errors.email = 'Vui lòng nhập email';
        } else if (!emailRegex.test(email.trim())) {
            errors.email = 'Email không đúng định dạng';
        }

        // Validate số điện thoại Việt Nam
        const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
        if (!phone.trim()) {
            errors.phone = 'Vui lòng nhập số điện thoại';
        } else if (!phoneRegex.test(phone.trim())) {
            errors.phone = 'Số điện thoại không hợp lệ (VD: 0901234567)';
        }

        // Validate độ mạnh mật khẩu
        if (!password) {
            errors.password = 'Vui lòng nhập mật khẩu';
        } else if (password.length < 8) {
            errors.password = 'Mật khẩu phải có ít nhất 8 ký tự';
        } else if (!/[A-Z]/.test(password)) {
            errors.password = 'Mật khẩu phải có ít nhất 1 chữ hoa';
        } else if (!/[0-9]/.test(password)) {
            errors.password = 'Mật khẩu phải có ít nhất 1 chữ số';
        } else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errors.password = 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt';
        }

        if (password && confirmPassword && password !== confirmPassword) {
            errors.confirmPassword = 'Mật khẩu không khớp';
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleRegister = async () => {
        if (!validate()) return;

        try {
            await register({ email: email.trim(), password, fullName: fullName.trim(), phone: phone.trim() });
            router.replace('/(auth)/login');
        } catch (err: any) {
            const status = err?.response?.status;
            const backendMsg = err?.response?.data?.message || err?.message;
            if (status === 409) {
                Alert.alert('Lỗi', 'Email hoặc số điện thoại đã được đăng ký');
            } else if (status === 400) {
                Alert.alert('Lỗi', backendMsg || 'Thông tin không hợp lệ');
            } else if (status >= 500) {
                Alert.alert('Lỗi', 'Hệ thống đang bận. Vui lòng thử lại sau.');
            } else if (!status) {
                // Network error — đã hiển thị toast từ interceptor
            } else {
                Alert.alert('Lỗi', 'Đăng ký thất bại. Vui lòng thử lại.');
            }
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <StatusBar barStyle="dark-content" />
            <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
                <View style={styles.header}>
                    <Text style={styles.title}>Tạo tài khoản</Text>
                    <Text style={styles.subtitle}>Tham gia cộng đồng HomeSwipe ngay</Text>
                </View>

                <View style={styles.form}>
                    <Input
                        label="Họ và tên"
                        placeholder="Nguyễn Văn A"
                        value={fullName}
                        onChangeText={setFullName}
                        error={fieldErrors.fullName}
                    />

                    <Input
                        label="Email"
                        placeholder="email@domain.com"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        error={fieldErrors.email}
                    />
                    <Input
                        label="Số điện thoại"
                        placeholder="0123456789"
                        value={phone}
                        onChangeText={setPhone}
                        error={fieldErrors.phone}
                    />
                    <Input
                        label="Mật khẩu"
                        placeholder="••••••••"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        error={fieldErrors.password}
                    />

                    <Input
                        label="Xác nhận mật khẩu"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        error={fieldErrors.confirmPassword}
                    />

                    {error && <Text style={styles.errorText}>{error}</Text>}

                    <Button
                        title="Đăng ký"
                        onPress={handleRegister}
                        isLoading={isLoading}
                        style={styles.registerButton}
                    />

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Đã có tài khoản? </Text>
                        <Link href="/(auth)/login" asChild>
                            <TouchableOpacity>
                                <Text style={styles.linkText}>Đăng nhập</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    content: {
        padding: 24,
        justifyContent: 'center',
        minHeight: '100%',
    },
    header: {
        marginBottom: 32,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
    },
    form: {
        width: '100%',
    },
    errorText: {
        color: '#EF4444',
        textAlign: 'center',
        marginBottom: 16,
    },
    registerButton: {
        marginTop: 16,
        marginBottom: 24,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerText: {
        color: '#666',
        fontSize: 14,
    },
    linkText: {
        color: '#0066FF',
        fontWeight: '600',
        fontSize: 14,
    },
});
