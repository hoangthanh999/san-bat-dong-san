import React, { useState } from 'react';
import {
    View,
    Text,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function RegisterScreen() {
    const router = useRouter();
    const { register, isLoading, error } = useAuthStore();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

    const validate = () => {
        let errors: { [key: string]: string } = {};
        if (!fullName) errors.fullName = 'Vui lòng nhập họ tên';
        if (!email) errors.email = 'Vui lòng nhập email';
        if (!phone) errors.phone = 'Vui lòng nhập số điện thoại';
        if (!password) errors.password = 'Vui lòng nhập mật khẩu';
        if (password.length < 6) errors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
        if (password !== confirmPassword) errors.confirmPassword = 'Mật khẩu không khớp';
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleRegister = async () => {
        if (!validate()) return;

        try {
            await register({ email, password, fullName, phone });
            // Suggest routing to login or auto-login
            router.replace('/(auth)/login');
        } catch (err) {
            // Error handled in store
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.content}>
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
