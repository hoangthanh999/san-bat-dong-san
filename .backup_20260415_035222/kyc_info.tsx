import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, Platform, Alert, TextInput, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKYCStore } from '../../store/kycStore';

export default function KYCInfoScreen() {
    const router = useRouter();
    const { submitKYC, isSubmitting, scanResult } = useKYCStore();
    const [citizenId, setCitizenId] = useState(scanResult?.citizenId || '');
    const [fullName, setFullName] = useState(scanResult?.fullName || '');
    const [address, setAddress] = useState(scanResult?.address || '');
    const [agreed, setAgreed] = useState(false);

    const handleSubmit = async () => {
        // Validate
        if (!citizenId.trim()) {
            Alert.alert('Thiếu thông tin', 'Vui lòng nhập số CCCD/CMND');
            return;
        }
        if (citizenId.trim().length < 9) {
            Alert.alert('Số CCCD không hợp lệ', 'Số CCCD/CMND phải có ít nhất 9 ký tự');
            return;
        }
        if (!fullName.trim()) {
            Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ và tên');
            return;
        }
        if (!address.trim()) {
            Alert.alert('Thiếu thông tin', 'Vui lòng nhập địa chỉ thường trú');
            return;
        }
        if (!agreed) {
            Alert.alert('Xác nhận', 'Vui lòng đồng ý với điều khoản để tiếp tục');
            return;
        }

        // Kiểm tra kycToken (bắt buộc từ bước scan, lưu trong Redis 15 phút)
        if (!scanResult?.kycToken) {
            Alert.alert(
                'Phiên hết hạn',
                'Phiên xác minh đã hết hạn (15 phút). Vui lòng quay lại bước 1 để quét ảnh CCCD mới.',
                [{ text: 'Quét lại', onPress: () => router.replace('/kyc/upload-front' as any) }]
            );
            return;
        }

        try {
            // Đọc URI ảnh từ bước 1 và 2
            const frontUri = await AsyncStorage.getItem('kyc_front_uri');
            const backUri = await AsyncStorage.getItem('kyc_back_uri');

            if (!frontUri || !backUri) {
                Alert.alert(
                    'Thiếu ảnh CCCD',
                    'Không tìm thấy ảnh CCCD đã chụp. Vui lòng thực hiện lại từ bước 1.',
                    [{ text: 'Bắt đầu lại', onPress: () => router.replace('/kyc/upload-front' as any) }]
                );
                return;
            }

            await submitKYC(
                {
                    kycToken: scanResult.kycToken,
                    citizenId: citizenId.trim(),
                    fullName: fullName.trim(),
                    address: address.trim(),
                },
                { uri: frontUri, name: 'front.jpg', type: 'image/jpeg' },
                { uri: backUri, name: 'back.jpg', type: 'image/jpeg' },
            );

            // Dọn dẹp dữ liệu tạm
            await AsyncStorage.multiRemove(['kyc_front_uri', 'kyc_back_uri']);
            router.replace('/kyc/pending' as any);

        } catch (error: any) {
            const msg = error.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';

            // Phiên hết hạn → quay lại bước 1
            if (msg.includes('hết hạn') || msg.includes('quét lại') || msg.includes('quét ảnh')) {
                Alert.alert('Phiên hết hạn', msg, [
                    { text: 'Quét lại', onPress: () => router.replace('/kyc/upload-front' as any) }
                ]);
                return;
            }

            // Đã xác thực rồi → về profile
            if (msg.includes('đã xác thực') || msg.includes('đang chờ duyệt')) {
                Alert.alert('Thông báo', msg, [
                    { text: 'OK', onPress: () => router.replace('/(tabs)/profile' as any) }
                ]);
                return;
            }

            // CCCD đã dùng → liên hệ support
            if (msg.includes('đã được sử dụng') || msg.includes('tài khoản khác')) {
                Alert.alert('CCCD đã được sử dụng', msg);
                return;
            }

            // Ảnh mờ → chụp lại
            if (msg.includes('mờ') || msg.includes('chói sáng')) {
                Alert.alert('Ảnh không đạt yêu cầu', msg, [
                    { text: 'Chụp lại', onPress: () => router.replace('/kyc/upload-front' as any) }
                ]);
                return;
            }

            // Lỗi khác
            Alert.alert('Gửi thất bại', msg);
        }
    };

    const isOcrFilled = !!(scanResult?.citizenId && scanResult.fullName);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Bước 3/3 — Xác nhận thông tin</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '100%' }]} />
            </View>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    {/* OCR Info Banner */}
                    {isOcrFilled && (
                        <View style={styles.ocrBanner}>
                            <Ionicons name="sparkles" size={18} color="#22C55E" />
                            <Text style={styles.ocrBannerText}>
                                Thông tin đã tự động điền từ ảnh CCCD. Vui lòng kiểm tra lại.
                            </Text>
                        </View>
                    )}

                    <Text style={styles.sectionTitle}>Thông tin trên CCCD</Text>
                    <Text style={styles.sectionSub}>Kiểm tra thông tin bên dưới chính xác với CCCD của bạn</Text>

                    {/* Citizen ID */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Số CCCD / CMND <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={[styles.input, isOcrFilled && styles.inputFilled]}
                            placeholder="Nhập số CCCD hoặc CMND"
                            value={citizenId}
                            onChangeText={setCitizenId}
                            keyboardType="number-pad"
                            maxLength={12}
                            placeholderTextColor="#aaa"
                            editable={!isSubmitting}
                        />
                    </View>

                    {/* Full Name */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Họ và tên (theo CCCD) <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={[styles.input, isOcrFilled && styles.inputFilled]}
                            placeholder="VD: NGUYEN VAN A"
                            value={fullName}
                            onChangeText={setFullName}
                            autoCapitalize="characters"
                            placeholderTextColor="#aaa"
                            editable={!isSubmitting}
                        />
                    </View>

                    {/* Address */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Địa chỉ thường trú <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={[styles.input, isOcrFilled && styles.inputFilled]}
                            placeholder="Nhập địa chỉ theo CCCD"
                            value={address}
                            onChangeText={setAddress}
                            placeholderTextColor="#aaa"
                            editable={!isSubmitting}
                            multiline
                        />
                    </View>

                    {/* Timer warning */}
                    <View style={styles.timerCard}>
                        <Ionicons name="timer-outline" size={18} color="#FF9500" />
                        <Text style={styles.timerText}>
                            Phiên xác minh có hiệu lực 15 phút kể từ khi quét ảnh. Nếu hết hạn, bạn cần quét lại.
                        </Text>
                    </View>

                    {/* Consent */}
                    <TouchableOpacity
                        style={styles.consentCard}
                        onPress={() => setAgreed(!agreed)}
                        activeOpacity={0.8}
                        disabled={isSubmitting}
                    >
                        <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                            {agreed && <Ionicons name="checkmark" size={14} color="white" />}
                        </View>
                        <Text style={styles.consentText}>
                            Tôi xác nhận rằng thông tin trên là chính xác và đồng ý với{' '}
                            <Text style={styles.consentLink}>Chính sách bảo mật</Text> và{' '}
                            <Text style={styles.consentLink}>Điều khoản sử dụng</Text> của nền tảng.
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.submitBtn, (!agreed || isSubmitting) && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={!agreed || isSubmitting}
                    activeOpacity={0.85}
                >
                    {isSubmitting ? (
                        <>
                            <ActivityIndicator color="white" size="small" />
                            <Text style={styles.submitBtnText}>Đang gửi hồ sơ...</Text>
                        </>
                    ) : (
                        <>
                            <Ionicons name="shield-checkmark" size={20} color="white" />
                            <Text style={styles.submitBtnText}>Gửi xác minh</Text>
                        </>
                    )}
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
        paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight ?? 24) + 8,
        paddingBottom: 12,
        backgroundColor: 'white',
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
    progressBar: { height: 4, backgroundColor: '#E0E0E0' },
    progressFill: { height: 4, backgroundColor: '#22C55E', borderRadius: 2 },
    scroll: { flex: 1 },
    content: { padding: 20, paddingBottom: 40 },
    ocrBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#F0FFF4', borderRadius: 10, padding: 12,
        borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 16,
    },
    ocrBannerText: { fontSize: 13, color: '#16A34A', flex: 1, lineHeight: 18 },
    sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 },
    sectionSub: { fontSize: 14, color: '#666', marginBottom: 24, lineHeight: 20 },
    fieldGroup: { marginBottom: 18 },
    label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
    required: { color: '#EF4444' },
    input: {
        backgroundColor: 'white', borderWidth: 1.5, borderColor: '#E0E0E0',
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
        fontSize: 16, color: '#1A1A1A',
    },
    inputFilled: { borderColor: '#BBF7D0', backgroundColor: '#FAFFFE' },
    timerCard: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
        backgroundColor: '#FFF8E1', borderRadius: 10, padding: 12,
        borderWidth: 1, borderColor: '#FFE082', marginBottom: 16,
    },
    timerText: { fontSize: 12, color: '#B45309', flex: 1, lineHeight: 18 },
    consentCard: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 12,
        backgroundColor: 'white', borderRadius: 12, padding: 16,
        borderWidth: 1, borderColor: '#E0E0E0', marginTop: 4,
    },
    checkbox: {
        width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#0066FF',
        justifyContent: 'center', alignItems: 'center', marginTop: 1, flexShrink: 0,
    },
    checkboxChecked: { backgroundColor: '#0066FF', borderColor: '#0066FF' },
    consentText: { fontSize: 13, color: '#555', flex: 1, lineHeight: 20 },
    consentLink: { color: '#0066FF', fontWeight: '600' },
    footer: {
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        backgroundColor: 'white',
        borderTopWidth: 1, borderTopColor: '#F0F0F0',
    },
    submitBtn: {
        backgroundColor: '#0066FF', borderRadius: 14, paddingVertical: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    submitBtnDisabled: { backgroundColor: '#B0C4DE' },
    submitBtnText: { color: 'white', fontWeight: '700', fontSize: 17 },
});
