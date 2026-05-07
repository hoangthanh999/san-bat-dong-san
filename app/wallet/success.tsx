import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';

export default function PaymentSuccessScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { amount, txRef } = useLocalSearchParams<{ amount: string; txRef: string }>();
    const amountNum = parseInt(amount || '0', 10);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.content}>
                <View style={styles.iconCircle}>
                    <Ionicons name="checkmark-circle" size={72} color="#22C55E" />
                </View>
                <Text style={styles.title}>Nạp tiền thành công! 🎉</Text>
                <Text style={styles.amount}>+{amountNum.toLocaleString('vi-VN')} đ</Text>
                {txRef ? (
                    <Text style={styles.txRef}>Mã giao dịch: {txRef}</Text>
                ) : null}
                <View style={styles.infoCard}>
                    <Ionicons name="wallet" size={20} color="#22C55E" />
                    <Text style={styles.infoText}>
                        Số dư ví của bạn đã được cập nhật thành công.
                    </Text>
                </View>
            </View>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity
                    style={styles.walletBtn}
                    onPress={() => router.replace('/wallet' as any)}
                    activeOpacity={0.85}
                >
                    <Ionicons name="wallet-outline" size={20} color="white" />
                    <Text style={styles.walletBtnText}>Về ví của tôi</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.homeBtn}
                    onPress={() => router.replace('/(tabs)' as any)}
                    activeOpacity={0.85}
                >
                    <Text style={styles.homeBtnText}>Về trang chủ</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0FDF4' },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30, gap: 12 },
    iconCircle: {
        width: 130, height: 130, borderRadius: 65,
        backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center', marginBottom: 8,
    },
    title: { fontSize: 26, fontWeight: '800', color: '#1A1A1A', textAlign: 'center' },
    amount: { fontSize: 36, fontWeight: '800', color: '#22C55E' },
    txRef: { fontSize: 13, color: '#888', marginTop: 4 },
    infoCard: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: 'white', borderRadius: 12, padding: 14,
        borderLeftWidth: 3, borderLeftColor: '#22C55E', width: '100%', marginTop: 16,
    },
    infoText: { flex: 1, fontSize: 14, color: '#333', lineHeight: 20 },
    footer: {
        padding: 16, paddingBottom: 16, // overridden inline using insets.bottom
        backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#E0E0E0', gap: 10,
    },
    walletBtn: {
        backgroundColor: '#22C55E', borderRadius: 14, paddingVertical: 15,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    walletBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
    homeBtn: {
        borderWidth: 1.5, borderColor: '#22C55E', borderRadius: 14,
        paddingVertical: 13, alignItems: 'center',
    },
    homeBtnText: { color: '#22C55E', fontWeight: '700', fontSize: 16 },
});
