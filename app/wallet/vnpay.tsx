import React, { useCallback, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useWalletStore } from '../../store/walletStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function getQueryParams(url: string) {
    const queryString = url.includes('?') ? url.split('?')[1].split('#')[0] : '';
    return new URLSearchParams(queryString);
}

function getFinalPaymentRoute(url: string): '/payment-success' | '/wallet/success' | '/wallet/failed' | null {
    if (url.startsWith('homeswipe://payment-success') || url.includes('/payment-success')) {
        return '/payment-success';
    }

    if (url.startsWith('homeswipe://wallet/success')) {
        return '/wallet/success';
    }

    if (url.startsWith('homeswipe://wallet/failed') || url.includes('/payment-failed')) {
        return '/wallet/failed';
    }

    return null;
}

export default function VNPayWebViewScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { paymentUrl, amount } = useLocalSearchParams<{ paymentUrl: string; amount: string }>();
    const { fetchWallet, fetchTransactions } = useWalletStore();
    const hasNavigated = useRef(false);

    const routeFromFinalCallback = useCallback(async (url: string) => {
        const route = getFinalPaymentRoute(url);
        if (!route || hasNavigated.current) return false;

        hasNavigated.current = true;

        try {
            const params = getQueryParams(url);
            const txRef = params.get('txnRef') || params.get('transactionId') || '';
            const callbackAmount = params.get('amount') || amount;
            const status = params.get('status') || (route === '/wallet/failed' ? 'failed' : 'success');
            const message = params.get('message') || undefined;

            if (status !== 'failed') {
                await Promise.all([fetchWallet(), fetchTransactions()]);
            }

            if (route === '/payment-success') {
                router.replace({
                    pathname: '/payment-success' as any,
                    params: { amount: callbackAmount, txRef, txnRef: txRef, status, message },
                });
            } else if (route === '/wallet/success') {
                router.replace({ pathname: '/wallet/success' as any, params: { amount: callbackAmount, txRef } });
            } else {
                router.replace({ pathname: '/wallet/failed' as any, params: { txRef, message } });
            }

            return true;
        } catch {
            router.replace('/wallet/failed' as any);
            return true;
        }
    }, [amount, fetchTransactions, fetchWallet, router]);

    const handleNavigationChange = (navState: { url: string }) => {
        void routeFromFinalCallback(navState.url);
    };

    const handleShouldStartLoadWithRequest = (request: { url: string }) => {
        const route = getFinalPaymentRoute(request.url);
        if (!route) return true;

        void routeFromFinalCallback(request.url);
        return false;
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

            {/* Safe area top padding for status bar */}
            <View style={[styles.safeTop, { height: insets.top }]} />

            <WebView
                source={{ uri: paymentUrl }}
                onNavigationStateChange={handleNavigationChange}
                onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
                style={styles.webview}
                startInLoadingState
                originWhitelist={['*']}
                renderLoading={() => (
                    <View style={styles.loading}>
                        <ActivityIndicator size="large" color="#0066FF" />
                        <Text style={styles.loadingText}>Đang tải trang thanh toán...</Text>
                    </View>
                )}
                javaScriptEnabled
                domStorageEnabled
            />
            <View style={[styles.safeBottom, { height: insets.bottom }]} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    safeTop: { height: 0, backgroundColor: 'white' }, // height set via inline style using useSafeAreaInsets
    safeBottom: { height: 0, backgroundColor: 'white' }, // height set via inline style using useSafeAreaInsets
    webview: { flex: 1 },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
    loadingText: { fontSize: 14, color: '#666' },
    error: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { color: '#EF4444', fontSize: 16 },
});
