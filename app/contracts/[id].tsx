import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeRouter } from '../../hooks/useSafeRouter';
import { AuthGuardScreen } from '../../components/auth/AuthGuardScreen';

export default function ContractDetailScreen() {
    return (
        <AuthGuardScreen
            message="Đăng nhập để xem chi tiết hợp đồng"
            icon="document-text-outline"
        >
            <ContractDetailDisabledContent />
        </AuthGuardScreen>
    );
}

function ContractDetailDisabledContent() {
    const { router } = useSafeRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chi tiết hợp đồng</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.center}>
                <View style={styles.iconWrap}>
                    <Ionicons name="construct-outline" size={34} color="#f96302" />
                </View>
                <Text style={styles.title}>Tính năng đang phát triển</Text>
                <Text style={styles.message}>
                    Hợp đồng điện tử đang được hoàn thiện và sẽ ra mắt trong phiên bản tiếp theo.
                </Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => router.back()} activeOpacity={0.85}>
                    <Text style={styles.primaryText}>Quay lại</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 0,
        paddingBottom: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        gap: 12,
    },
    iconWrap: {
        width: 72,
        height: 72,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF3E8',
        marginBottom: 4,
    },
    title: { fontSize: 20, fontWeight: '800', color: '#111827', textAlign: 'center' },
    message: { fontSize: 14, color: '#64748B', lineHeight: 21, textAlign: 'center' },
    primaryBtn: {
        marginTop: 8,
        backgroundColor: '#f96302',
        borderRadius: 14,
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
    primaryText: { color: 'white', fontSize: 14, fontWeight: '800' },
});

