import React, { useState } from 'react';
import {
    View,
    Text,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TouchableOpacity,
    Image,
    StatusBar,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getApiBaseUrl } from '../../services/api/environment';
import { useSafeRouter } from '../../hooks/useSafeRouter';
import { API_ENDPOINTS } from '../../constants';

const GOOGLE_CALLBACK_URL = 'homeswipe://login-success';

const getOAuthCallbackQuery = (url: string) => {
    const query = url.split('?')[1]?.split('#')[0];
    if (!query) return null;

    const params = new URLSearchParams(query);
    const code = params.get('code');
    const token = params.get('token') || params.get('accessToken');

    if (code) return `code=${encodeURIComponent(code)}`;
    if (token) return `token=${encodeURIComponent(token)}`;

    return null;
};

export default function LoginScreen() {
    const { safePush, safeReplace } = useSafeRouter();
    const insets = useSafeAreaInsets();
    const { login, isLoading, error } = useAuthStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async () => {
        if (!email || !password) return;

        try {
            await login({ email, password });
            safeReplace('/(tabs)' as any);
        } catch (err) {
            // Error handled in store
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <StatusBar barStyle="dark-content" />
            <View style={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
                <View style={styles.header}>
                    <Image
                        source={require('../../assets/icon.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.title}>Chào mừng trở lại!</Text>
                    <Text style={styles.subtitle}>Đăng nhập để tiếp tục khám phá</Text>
                </View>

                <View style={styles.form}>
                    <Input
                        label="Email"
                        placeholder="nhap@email.com"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <Input
                        label="Mật khẩu"
                        placeholder="••••••••"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <TouchableOpacity
                        style={styles.forgotPassword}
                        onPress={() => safePush('/(auth)/forgot-password' as any)}
                    >
                        <Text style={styles.linkText}>Quên mật khẩu?</Text>
                    </TouchableOpacity>

                    {error && <Text style={styles.errorText}>{error}</Text>}

                    <Button
                        title="Đăng nhập"
                        onPress={handleLogin}
                        isLoading={isLoading}
                        style={styles.loginButton}
                    />

                    <View style={styles.divider}>
                        <View style={styles.line} />
                        <Text style={styles.dividerText}>Hoặc</Text>
                        <View style={styles.line} />
                    </View>

                    <GoogleLoginButton />

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Chưa có tài khoản? </Text>
                        <Link href="/(auth)/register" asChild>
                            <TouchableOpacity>
                                <Text style={styles.linkText}>Đăng ký ngay</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

// ============================================================
// Google Login Button — dùng expo-web-browser + deep link
// ============================================================
function GoogleLoginButton() {
    const { safeReplace } = useSafeRouter();
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setIsGoogleLoading(true);
        try {
            const WebBrowser = require('expo-web-browser');
            const { Alert } = require('react-native');

            const baseUrl = await getApiBaseUrl();
            const redirectUri = encodeURIComponent(GOOGLE_CALLBACK_URL);
            const backendOAuthUrl = `${baseUrl}${API_ENDPOINTS.GOOGLE_MOBILE_LOGIN}?redirect_uri=${redirectUri}`;

            // Open the backend mobile OAuth entrypoint and let login-success finish auth.
            const result = await WebBrowser.openAuthSessionAsync(
                backendOAuthUrl,
                GOOGLE_CALLBACK_URL
            );

            if (result.type === 'success' && result.url) {
                // Hand off the callback payload to the dedicated route.
                const callbackQuery = getOAuthCallbackQuery(result.url);
                if (callbackQuery) {
                    safeReplace(`/login-success?${callbackQuery}` as any);
                } else {
                    Alert.alert('Lỗi', 'Không nhận được thông tin đăng nhập từ Google. Vui lòng thử lại.');
                }
            }
            // Nếu type === 'cancel' → user đóng browser, không làm gì
        } catch (error: any) {
            const { Alert } = require('react-native');
            Alert.alert(
                'Đăng nhập Google thất bại',
                error?.message || 'Không thể kết nối đến Google. Vui lòng thử lại.',
            );
        } finally {
            setIsGoogleLoading(false);
        }
    };

    return (
        <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleGoogleLogin}
            disabled={isGoogleLoading}
            activeOpacity={0.8}
        >
            <View style={styles.googleBtnInner}>
                <View style={styles.googleIconBox}>
                    <Ionicons name="logo-google" size={20} color="#DB4437" />
                </View>
                <Text style={styles.googleBtnText}>
                    {isGoogleLoading ? 'Đang kết nối...' : 'Tiếp tục với Google'}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logo: {
        width: 80,
        height: 80,
        marginBottom: 16,
        borderRadius: 16,
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
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: 24,
    },
    linkText: {
        color: '#0066FF',
        fontWeight: '600',
        fontSize: 14,
    },
    errorText: {
        color: '#EF4444',
        textAlign: 'center',
        marginBottom: 16,
    },
    loginButton: {
        marginBottom: 24,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#E0E0E0',
    },
    dividerText: {
        marginHorizontal: 16,
        color: '#999',
    },
    googleBtn: {
        borderWidth: 1.5,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 24,
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    googleBtnInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    googleIconBox: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#FFF0EE',
        justifyContent: 'center',
        alignItems: 'center',
    },
    googleBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
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
});
