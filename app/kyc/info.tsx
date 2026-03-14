import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, Platform, Alert, TextInput, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKYCStore } from '../../store/kycStore';

export default function KYCInfoScreen() {
    const router = useRouter();
    const { submitKYC, isSubmitting } = useKYCStore();
    const [citizenId, setCitizenId] = useState('');
    const [fullName, setFullName] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [agreed, setAgreed] = useState(false);

    const handleSubmit = async () => {
        if (!citizenId.trim()) {
            Alert.alert('Thiếu thông tin', 'Vui lòng nhập số CCCD/CMND');
            return;
        }
        if (!fullName.trim()) {
            Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ và tên');
            return;
        }
        if (!dateOfBirth.trim()) {
            Alert.alert('Thiếu thông tin', 'Vui lòng nhập ngày sinh');
            return;
        }
        if (!agreed) {
            Alert.alert('Xác nhận', 'Vui lòng đồng ý với điều khoản');
            return;
        }

        try {
            const frontBase64 = await AsyncStorage.getItem('kyc_front_base64');
            const backBase64 = await AsyncStorage.getItem('kyc_back_base64');

            if (!frontBase64 || !backBase64) {
                Alert.alert('Lỗi', 'Không tìm thấy ảnh CCCD. Vui lòng thực hiện lại từ bước 1.');
                router.push('/kyc/upload-front' as any);
                return;
            }

            await submitKYC({
                citizenId: citizenId.trim(),
                fullName: fullName.trim(),
                dateOfBirth: dateOfBirth.trim(),
                frontImageBase64: frontBase64,
                backImageBase64: backBase64,
            });

            // Clean up temp data
            await AsyncStorage.multiRemove(['kyc_front_base64', 'kyc_back_base64']);
            router.replace('/kyc/pending' as any);
        } catch (error: any) {
            Alert.alert('Gửi thất bại', error.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Bước 3/3 — Thông tin CCCD</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '100%' }]} />
            </View>

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    <Text style={styles.sectionTitle}>Nhập thông tin trên CCCD</Text>
                    <Text style={styles.sectionSub}>Điền chính xác theo thông tin trên thẻ CCCD/CMND</Text>

                    {/* Citizen ID */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Số CCCD / CMND <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Nhập số CCCD hoặc CMND"
                            value={citizenId}
                            onChangeText={setCitizenId}
                            keyboardType="number-pad"
                            maxLength={12}
                            placeholderTextColor="#aaa"
                        />
                    </View>

                    {/* Full Name */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Họ và tên (theo CCCD) <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={styles.input}
                            placeholder="VD: NGUYEN VAN A"
                            value={fullName}
                            onChangeText={setFullName}
                            autoCapitalize="characters"
                            placeholderTextColor="#aaa"
                        />
                    </View>

                    {/* Date of Birth */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Ngày sinh <Text style={styles.required}>*</Text></Text>
                        <TextInput
                            style={styles.input}
                            placeholder="DD/MM/YYYY"
                            value={dateOfBirth}
                            onChangeText={setDateOfBirth}
                            keyboardType="numbers-and-punctuation"
                            maxLength={10}
                            placeholderTextColor="#aaa"
                        />
                    </View>

                    {/* Consent */}
                    <TouchableOpacity
                        style={styles.consentCard}
                        onPress={() => setAgreed(!agreed)}
                        activeOpacity={0.8}
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
                        <Text style={styles.submitBtnText}>Đang gửi...</Text>
                    ) : (
                        <>
                            <Ionicons name="send" size={20} color="white" />
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
        paddingTop: Platform.OS === 'ios' ? 54 : 16,
        paddingBottom: 12,
        backgroundColor: 'white',
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
    progressBar: { height: 4, backgroundColor: '#E0E0E0' },
    progressFill: { height: 4, backgroundColor: '#0066FF', borderRadius: 2 },
    scroll: { flex: 1 },
    content: { padding: 20, paddingBottom: 40 },
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
