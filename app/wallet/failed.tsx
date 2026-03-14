import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';

export default function PaymentFailedScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.content}>
                <View style={styles.iconCircle}>
                    <Ionicons name="close-circle" size={72} color="#EF4444" />
                </View>
                <Text style={styles.title}>Thanh toán thất bại</Text>
                <Text style={styles.subtitle}>Giao dịch bị hủy hoặc có lỗi xảy ra trong quá trình thanh toán.</Text>

                <View style={styles.reasonsCard}>
                    <Text style={styles.reasonsTitle}>Nguyên nhân có thể:</Text>
                    {[
                        'Bạn đã hủy giao dịch',
                        'Số dư tài khoản ngân hàng không đủ',
                        'Kết nối mạng bị gián đoạn',
                        'Thẻ bị từ chối bởi ngân hàng phát hành',
                    ].map((r, i) => (
                        <View key={i} style={styles.reasonRow}>
                            <View style={styles.dot} />
                            <Text style={styles.reasonText}>{r}</Text>
                        </View>
                    ))}
                </View>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={() => router.replace('/wallet/deposit' as any)}
                    activeOpacity={0.85}
                >
                    <Ionicons name="refresh" size={20} color="white" />
                    <Text style={styles.retryBtnText}>Thử lại</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.walletBtn}
                    onPress={() => router.replace('/wallet' as any)}
                    activeOpacity={0.85}
                >
                    <Text style={styles.walletBtnText}>Về ví của tôi</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF5F5' },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30, gap: 12 },
    iconCircle: {
        width: 130, height: 130, borderRadius: 65,
        backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginBottom: 8,
    },
    title: { fontSize: 26, fontWeight: '800', color: '#1A1A1A', textAlign: 'center' },
    subtitle: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22 },
    reasonsCard: {
        backgroundColor: 'white', borderRadius: 12, padding: 16,
        borderLeftWidth: 3, borderLeftColor: '#EF4444', width: '100%', gap: 8, marginTop: 16,
    },
    reasonsTitle: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 4 },
    reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
    reasonText: { fontSize: 13, color: '#555' },
    footer: {
        padding: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#E0E0E0', gap: 10,
    },
    retryBtn: {
        backgroundColor: '#EF4444', borderRadius: 14, paddingVertical: 15,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    retryBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
    walletBtn: {
        borderWidth: 1.5, borderColor: '#EF4444', borderRadius: 14,
        paddingVertical: 13, alignItems: 'center',
    },
    walletBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 16 },
});
