import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeRouter } from '../../hooks/useSafeRouter';

interface Props {
    children: React.ReactNode;
    /** Thông báo hiển thị khi chưa đăng nhập */
    message?: string;
    /** Icon hiển thị */
    icon?: keyof typeof Ionicons.glyphMap;
}

/**
 * HOC bọc các màn hình yêu cầu đăng nhập.
 * Nếu chưa đăng nhập → hiện UI thông báo + nút chuyển tới Login.
 * Không crash app, không hiện chấm đỏ.
 */
export function AuthGuardScreen({ children, message, icon = 'lock-closed-outline' }: Props) {
    const { isAuthenticated, isLoading } = useAuthStore();
    const { router, safePush } = useSafeRouter();
    const insets = useSafeAreaInsets();

    if (isLoading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <StatusBar barStyle="dark-content" />
                <View style={styles.loading}>
                    <Text style={styles.loadingText}>Đang kiểm tra...</Text>
                </View>
            </View>
        );
    }

    if (!isAuthenticated) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <StatusBar barStyle="dark-content" />
                <View style={styles.content}>
                    <View style={styles.iconCircle}>
                        <Ionicons name={icon} size={48} color="#f96302" />
                    </View>
                    <Text style={styles.title}>Yêu cầu đăng nhập</Text>
                    <Text style={styles.message}>
                        {message || 'Bạn cần đăng nhập để sử dụng tính năng này'}
                    </Text>
                    <TouchableOpacity
                        style={styles.loginBtn}
                        onPress={() => safePush('/(auth)/login' as any)}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="log-in-outline" size={20} color="white" />
                        <Text style={styles.loginBtnText}>Đăng nhập ngay</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.registerLink}
                        onPress={() => safePush('/(auth)/register' as any)}
                    >
                        <Text style={styles.registerText}>Chưa có tài khoản? <Text style={styles.registerBold}>Đăng ký</Text></Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back" size={16} color="#888" />
                        <Text style={styles.backText}>Quay lại</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return <>{children}</>;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 14,
        color: '#999',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        gap: 12,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FFF3E8',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1A1A1A',
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        lineHeight: 21,
    },
    loginBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#f96302',
        borderRadius: 14,
        paddingHorizontal: 32,
        paddingVertical: 14,
        marginTop: 8,
        shadowColor: '#f96302',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    loginBtnText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 16,
    },
    registerLink: {
        marginTop: 4,
    },
    registerText: {
        fontSize: 14,
        color: '#888',
    },
    registerBold: {
        color: '#f96302',
        fontWeight: '600',
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 16,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    backText: {
        fontSize: 14,
        color: '#888',
    },
});

