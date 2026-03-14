import React, { useRef } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useWalletStore } from '../../store/walletStore';

export default function VNPayWebViewScreen() {
    const router = useRouter();
    const { paymentUrl, amount } = useLocalSearchParams<{ paymentUrl: string; amount: string }>();
    const { fetchBalance } = useWalletStore();
    const hasNavigated = useRef(false);

    const handleNavigationChange = async (navState: { url: string }) => {
        const { url } = navState;

        // Backend redirects here after payment
        if ((url.includes('/payment/vnpay-return') || url.includes('vnpay-return')) && !hasNavigated.current) {
            hasNavigated.current = true;
            try {
                const queryString = url.includes('?') ? url.split('?')[1] : '';
                const params = new URLSearchParams(queryString);
                const responseCode = params.get('vnp_ResponseCode');
                const txRef = params.get('vnp_TxnRef') || params.get('vnp_TransactionNo') || '';

                // Refresh balance regardless
                await fetchBalance();

                if (responseCode === '00') {
                    router.replace({ pathname: '/wallet/success' as any, params: { amount, txRef } });
                } else {
                    router.replace('/wallet/failed' as any);
                }
            } catch {
                router.replace('/wallet/failed' as any);
            }
        }
    };

    if (!paymentUrl) {
        return (
            <View style={styles.error}>
                <Text style={styles.errorText}>URL thanh toán không hợp lệ</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style="dark" />

            {/* Safe area top padding for iOS */}
            {Platform.OS === 'ios' && <View style={styles.safeTop} />}

            <WebView
                source={{ uri: paymentUrl }}
                onNavigationStateChange={handleNavigationChange}
                style={styles.webview}
                startInLoadingState
                renderLoading={() => (
                    <View style={styles.loading}>
                        <ActivityIndicator size="large" color="#0066FF" />
                        <Text style={styles.loadingText}>Đang tải trang thanh toán...</Text>
                    </View>
                )}
                javaScriptEnabled
                domStorageEnabled
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    safeTop: { height: 54, backgroundColor: 'white' },
    webview: { flex: 1 },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
    loadingText: { fontSize: 14, color: '#666' },
    error: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { color: '#EF4444', fontSize: 16 },
});
