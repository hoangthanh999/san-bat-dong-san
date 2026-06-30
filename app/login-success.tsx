import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';

const getParam = (value?: string | string[]) => {
    if (Array.isArray(value)) return value[0];
    return value;
};

export default function LoginSuccessScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        code?: string | string[];
        token?: string | string[];
        accessToken?: string | string[];
    }>();
    const { loginWithGoogle, loginWithOAuthCode } = useAuthStore();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const completeLogin = async () => {
            setErrorMessage(null);

            const code = getParam(params.code);
            const token = getParam(params.token) || getParam(params.accessToken);

            try {
                if (code) {
                    await loginWithOAuthCode(code);
                } else if (token) {
                    await loginWithGoogle(token);
                } else {
                    throw new Error('Missing OAuth callback payload');
                }

                if (isMounted) {
                    router.replace('/(tabs)' as any);
                }
            } catch {
                if (isMounted) {
                    setErrorMessage('Không thể hoàn tất đăng nhập Google. Vui lòng thử lại.');
                }
            }
        };

        completeLogin();

        return () => {
            isMounted = false;
        };
    }, [params.code, params.token, params.accessToken, loginWithGoogle, loginWithOAuthCode, router]);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            {errorMessage ? (
                <>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                    <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={() => router.replace('/(auth)/login' as any)}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.retryText}>Quay lại đăng nhập</Text>
                    </TouchableOpacity>
                </>
            ) : (
                <>
                    <ActivityIndicator color="#0066FF" size="large" />
                    <Text style={styles.text}>Đang hoàn tất đăng nhập...</Text>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingHorizontal: 24,
        backgroundColor: 'white',
    },
    text: {
        color: '#555',
        fontSize: 14,
        fontWeight: '600',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 20,
        textAlign: 'center',
    },
    retryBtn: {
        marginTop: 8,
        borderRadius: 12,
        backgroundColor: '#0066FF',
        paddingHorizontal: 18,
        paddingVertical: 12,
    },
    retryText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '700',
    },
});
