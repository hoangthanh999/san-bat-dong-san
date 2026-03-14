import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';

const BENEFITS = [
    { icon: 'home-outline', text: 'Đăng tin bất động sản không giới hạn' },
    { icon: 'document-text-outline', text: 'Ký hợp đồng điện tử' },
    { icon: 'wallet-outline', text: 'Nhận thanh toán qua ví' },
    { icon: 'checkmark-circle-outline', text: 'Badge "Đã xác minh" trên hồ sơ' },
];

export default function KYCIntroScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Xác minh danh tính</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Icon */}
                <View style={styles.iconCircle}>
                    <Ionicons name="card-outline" size={64} color="#0066FF" />
                </View>

                {/* Title */}
                <Text style={styles.title}>Xác minh để mở khóa{'\n'}đầy đủ tính năng</Text>
                <Text style={styles.subtitle}>Hoàn thành xác minh CCCD để sử dụng toàn bộ tính năng của nền tảng</Text>

                {/* Benefits */}
                <View style={styles.benefitsCard}>
                    {BENEFITS.map((b, i) => (
                        <View key={i} style={styles.benefitRow}>
                            <View style={styles.checkCircle}>
                                <Ionicons name="checkmark" size={14} color="white" />
                            </View>
                            <Text style={styles.benefitText}>{b.text}</Text>
                        </View>
                    ))}
                </View>

                {/* Security note */}
                <View style={styles.securityRow}>
                    <Ionicons name="lock-closed" size={16} color="#666" />
                    <Text style={styles.securityText}>
                        Thông tin của bạn được bảo mật tuyệt đối theo chính sách bảo vệ dữ liệu cá nhân
                    </Text>
                </View>

                {/* Steps */}
                <View style={styles.stepsCard}>
                    <Text style={styles.stepsTitle}>Quy trình xác minh (3 bước)</Text>
                    {[
                        { step: '1', label: 'Chụp mặt trước CCCD' },
                        { step: '2', label: 'Chụp mặt sau CCCD' },
                        { step: '3', label: 'Nhập thông tin & xác nhận' },
                    ].map(({ step, label }) => (
                        <View key={step} style={styles.stepRow}>
                            <View style={styles.stepBadge}>
                                <Text style={styles.stepNum}>{step}</Text>
                            </View>
                            <Text style={styles.stepLabel}>{label}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* CTA */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.startBtn}
                    onPress={() => router.push('/kyc/upload-front' as any)}
                    activeOpacity={0.85}
                >
                    <Text style={styles.startBtnText}>Bắt đầu xác minh</Text>
                    <Ionicons name="arrow-forward" size={20} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 54 : 16,
        paddingBottom: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
    content: { padding: 20, paddingBottom: 40, alignItems: 'center' },
    iconCircle: {
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: '#E8F0FF',
        justifyContent: 'center', alignItems: 'center',
        marginTop: 20, marginBottom: 24,
    },
    title: { fontSize: 24, fontWeight: '800', color: '#1A1A1A', textAlign: 'center', lineHeight: 32 },
    subtitle: { fontSize: 15, color: '#666', textAlign: 'center', marginTop: 10, lineHeight: 22, paddingHorizontal: 10 },
    benefitsCard: {
        width: '100%', backgroundColor: 'white', borderRadius: 16,
        padding: 20, marginTop: 24, gap: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    },
    benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    checkCircle: {
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center',
    },
    benefitText: { fontSize: 15, color: '#1A1A1A', flex: 1 },
    securityRow: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
        marginTop: 16, paddingHorizontal: 4,
    },
    securityText: { fontSize: 13, color: '#666', flex: 1, lineHeight: 18 },
    stepsCard: {
        width: '100%', backgroundColor: 'white', borderRadius: 16,
        padding: 20, marginTop: 16, gap: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    },
    stepsTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepBadge: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: '#0066FF', justifyContent: 'center', alignItems: 'center',
    },
    stepNum: { color: 'white', fontWeight: '700', fontSize: 13 },
    stepLabel: { fontSize: 14, color: '#333' },
    footer: {
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        backgroundColor: 'white',
        borderTopWidth: 1, borderTopColor: '#F0F0F0',
    },
    startBtn: {
        backgroundColor: '#0066FF', borderRadius: 14,
        paddingVertical: 16, paddingHorizontal: 24,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    startBtnText: { color: 'white', fontWeight: '700', fontSize: 17 },
});
