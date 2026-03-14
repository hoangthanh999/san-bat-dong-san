import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';

export default function KYCPendingScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            <View style={styles.content}>
                {/* Icon */}
                <View style={styles.iconCircle}>
                    <Ionicons name="time" size={64} color="#FF9500" />
                </View>

                <Text style={styles.title}>Đang chờ xác minh</Text>
                <Text style={styles.subtitle}>
                    Hồ sơ của bạn đã được gửi thành công.{'\n'}
                    Chúng tôi sẽ xét duyệt trong vòng{' '}
                    <Text style={styles.highlight}>24 giờ làm việc</Text>.
                </Text>

                {/* Status steps */}
                <View style={styles.stepsCard}>
                    {[
                        { icon: 'checkmark-circle', label: 'Gửi hồ sơ', done: true },
                        { icon: 'search', label: 'Đang xét duyệt', done: false, active: true },
                        { icon: 'shield-checkmark', label: 'Xác minh hoàn tất', done: false },
                    ].map((step, i) => (
                        <View key={i} style={styles.stepRow}>
                            <Ionicons
                                name={step.icon as any}
                                size={22}
                                color={step.done ? '#22C55E' : step.active ? '#FF9500' : '#CCC'}
                            />
                            <Text style={[
                                styles.stepLabel,
                                step.done && styles.stepDone,
                                step.active && styles.stepActive,
                            ]}>
                                {step.label}
                            </Text>
                        </View>
                    ))}
                </View>

                <View style={styles.infoCard}>
                    <Ionicons name="notifications-outline" size={20} color="#0066FF" />
                    <Text style={styles.infoText}>
                        Bạn sẽ nhận được thông báo khi hồ sơ được duyệt hoặc cần bổ sung thêm.
                    </Text>
                </View>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.homeBtn}
                    onPress={() => router.replace('/(tabs)' as any)}
                    activeOpacity={0.85}
                >
                    <Ionicons name="home-outline" size={20} color="white" />
                    <Text style={styles.homeBtnText}>Về trang chủ</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.profileBtn}
                    onPress={() => router.replace('/(tabs)/profile' as any)}
                    activeOpacity={0.85}
                >
                    <Text style={styles.profileBtnText}>Xem hồ sơ</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    content: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: 30,
    },
    iconCircle: {
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: '#FFF3E0', justifyContent: 'center', alignItems: 'center',
        marginBottom: 28,
    },
    title: { fontSize: 26, fontWeight: '800', color: '#1A1A1A', textAlign: 'center', marginBottom: 12 },
    subtitle: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 24, marginBottom: 30 },
    highlight: { color: '#FF9500', fontWeight: '700' },
    stepsCard: {
        width: '100%', backgroundColor: 'white', borderRadius: 16,
        padding: 20, gap: 16, marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepLabel: { fontSize: 15, color: '#AAA' },
    stepDone: { color: '#22C55E', fontWeight: '600' },
    stepActive: { color: '#FF9500', fontWeight: '700' },
    infoCard: {
        width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        backgroundColor: '#E8F0FF', borderRadius: 12, padding: 14,
    },
    infoText: { flex: 1, fontSize: 13, color: '#0066FF', lineHeight: 20 },
    footer: {
        padding: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F0F0F0',
        gap: 10,
    },
    homeBtn: {
        backgroundColor: '#0066FF', borderRadius: 14, paddingVertical: 15,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    homeBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
    profileBtn: {
        borderWidth: 1.5, borderColor: '#0066FF', borderRadius: 14, paddingVertical: 13,
        alignItems: 'center',
    },
    profileBtnText: { color: '#0066FF', fontWeight: '700', fontSize: 16 },
});
