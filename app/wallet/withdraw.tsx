import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeRouter } from '../../hooks/useSafeRouter';

export default function WithdrawScreen() {
    const { router, safeReplace } = useSafeRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backBtn}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Rút tiền</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.iconWrap}>
                    <Ionicons name="construct-outline" size={56} color="#0066FF" />
                </View>

                <Text style={styles.title}>Tính năng đang phát triển</Text>
                <Text style={styles.message}>
                    Tính năng rút tiền về ngân hàng đang phát triển. Hiện tại ví chỉ hỗ trợ nạp tiền,
                    thanh toán gói và hoàn tiền nội bộ.
                </Text>

                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={18} color="#0066FF" />
                    <Text style={styles.infoText}>
                        Ứng dụng không gửi thông tin ngân hàng lên hệ thống và không gọi API release cho thao tác rút tiền.
                    </Text>
                </View>
            </View>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => safeReplace('/wallet' as any)}
                    activeOpacity={0.85}
                >
                    <Ionicons name="wallet-outline" size={20} color="#fff" />
                    <Text style={styles.primaryBtnText}>Quay lại ví</Text>
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
        paddingBottom: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 14,
    },
    iconWrap: {
        width: 112,
        height: 112,
        borderRadius: 56,
        backgroundColor: '#E8F0FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1A1A1A',
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        lineHeight: 22,
        color: '#555',
        textAlign: 'center',
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: '#EBF3FF',
        borderRadius: 12,
        padding: 12,
        marginTop: 12,
    },
    infoText: {
        flex: 1,
        color: '#2457A6',
        fontSize: 13,
        lineHeight: 18,
    },
    footer: {
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    primaryBtn: {
        backgroundColor: '#0066FF',
        borderRadius: 14,
        paddingVertical: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
