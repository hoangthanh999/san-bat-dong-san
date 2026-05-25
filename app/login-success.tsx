import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function LoginSuccessScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ token?: string; accessToken?: string }>();
    const { loginWithGoogle } = useAuthStore();

    useEffect(() => {
        const token = params.token || params.accessToken;
        if (!token) {
            router.replace('/(auth)/login' as any);
            return;
        }

        loginWithGoogle(String(token))
            .then(() => router.replace('/(tabs)' as any))
            .catch(() => router.replace('/(auth)/login' as any));
    }, [params.token, params.accessToken]);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <ActivityIndicator color="#0066FF" size="large" />
            <Text style={styles.text}>Đang hoàn tất đăng nhập...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: 'white',
    },
    text: {
        color: '#555',
        fontSize: 14,
        fontWeight: '600',
    },
});
