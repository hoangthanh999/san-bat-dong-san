import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, Platform, Alert, Image, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useKYCStore } from '../../store/kycStore';

export default function KYCUploadFrontScreen() {
    const router = useRouter();
    const [imageUri, setImageUri] = useState<string | null>(null);
    const { scanCitizenId, isScanning } = useKYCStore();

    const pickOrCapture = async (source: 'camera' | 'gallery') => {
        let result: ImagePicker.ImagePickerResult;

        if (source === 'camera') {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Quyền truy cập', 'Cần quyền camera để chụp ảnh CCCD');
                return;
            }
            result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                quality: 0.8,
                allowsEditing: true,
                aspect: [16, 10],
            });
        } else {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Quyền truy cập', 'Cần quyền thư viện ảnh');
                return;
            }
            result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.8,
                allowsEditing: true,
                aspect: [16, 10],
            });
        }

        if (!result.canceled && result.assets[0]) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleNext = async () => {
        if (!imageUri) {
            Alert.alert('Thiếu ảnh', 'Vui lòng chụp hoặc chọn ảnh mặt trước CCCD');
            return;
        }

        try {
            await AsyncStorage.setItem('kyc_front_uri', imageUri);

            const imageFile = {
                uri: imageUri,
                name: 'front.jpg',
                type: 'image/jpeg',
            } as any;

            await scanCitizenId(imageFile);
            router.push('/kyc/upload-back' as any);
        } catch (error: any) {
            const msg = error.message || 'Không thể đọc thông tin từ ảnh.';

            // Nếu phiên hết hạn hoặc đã xác thực → về trang chính
            if (msg.includes('đã xác thực') || msg.includes('đang chờ duyệt')) {
                Alert.alert('Thông báo', msg, [
                    { text: 'OK', onPress: () => router.replace('/(tabs)/profile' as any) }
                ]);
                return;
            }

            // Lỗi ảnh không hợp lệ → reset ảnh để chụp lại
            if (msg.includes('không hợp lệ') || msg.includes('không thể đọc') || msg.includes('rõ nét')) {
                Alert.alert('Ảnh không hợp lệ', msg, [
                    { text: 'Chụp lại', onPress: () => setImageUri(null) }
                ]);
                return;
            }

            // Lỗi khác
            Alert.alert('Quét CCCD thất bại', msg);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Bước 1/3 — Mặt trước CCCD</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Progress bar */}
            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '33%' }]} />
            </View>

            <View style={styles.content}>
                <Text style={styles.title}>Chụp mặt trước CCCD/CMND</Text>
                <Text style={styles.subtitle}>Đảm bảo ảnh rõ nét, đủ sáng và không bị che khuất</Text>

                {/* Preview frame */}
                <TouchableOpacity
                    style={styles.previewFrame}
                    onPress={() => pickOrCapture('camera')}
                    activeOpacity={0.8}
                    disabled={isScanning}
                >
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
                    ) : (
                        <View style={styles.placeholderContent}>
                            <Ionicons name="card-outline" size={48} color="#0066FF" />
                            <Text style={styles.placeholderText}>Nhấn để chụp ảnh</Text>
                        </View>
                    )}
                    {imageUri && !isScanning && (
                        <View style={styles.retakeOverlay}>
                            <Ionicons name="refresh" size={20} color="white" />
                            <Text style={styles.retakeText}>Chụp lại</Text>
                        </View>
                    )}
                    {isScanning && (
                        <View style={styles.scanningOverlay}>
                            <ActivityIndicator color="white" size="large" />
                            <Text style={styles.scanningText}>Đang quét CCCD...</Text>
                            <Text style={styles.scanningSubtext}>Vui lòng đợi trong giây lát</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Notes */}
                <View style={styles.notesCard}>
                    <Text style={styles.notesTitle}>📋 Lưu ý quan trọng:</Text>
                    {[
                        'Chỉ chấp nhận ảnh CCCD/CMND thật',
                        'Ảnh phải rõ nét, đủ sáng, không bị lóa',
                        'Không chụp lại ảnh từ màn hình',
                        'Đặt thẻ trên nền phẳng, tương phản',
                    ].map((note, i) => (
                        <View key={i} style={styles.noteRow}>
                            <View style={styles.noteDot} />
                            <Text style={styles.noteText}>{note}</Text>
                        </View>
                    ))}
                </View>

                {/* Action buttons */}
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => pickOrCapture('camera')} disabled={isScanning}>
                        <Ionicons name="camera" size={22} color={isScanning ? '#AAA' : '#0066FF'} />
                        <Text style={[styles.actionBtnText, isScanning && { color: '#AAA' }]}>Chụp ảnh</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => pickOrCapture('gallery')} disabled={isScanning}>
                        <Ionicons name="images" size={22} color={isScanning ? '#AAA' : '#0066FF'} />
                        <Text style={[styles.actionBtnText, isScanning && { color: '#AAA' }]}>Chọn file</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.nextBtn, (!imageUri || isScanning) && styles.nextBtnDisabled]}
                    onPress={handleNext}
                    disabled={!imageUri || isScanning}
                    activeOpacity={0.85}
                >
                    {isScanning ? (
                        <>
                            <ActivityIndicator color="white" size="small" />
                            <Text style={styles.nextBtnText}>Đang quét CCCD...</Text>
                        </>
                    ) : (
                        <>
                            <Text style={styles.nextBtnText}>Quét & Tiếp theo</Text>
                            <Ionicons name="arrow-forward" size={20} color="white" />
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
    content: { flex: 1, padding: 20 },
    title: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', textAlign: 'center', marginBottom: 6 },
    subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
    previewFrame: {
        height: 200, borderRadius: 16, borderWidth: 2, borderColor: '#0066FF',
        borderStyle: 'dashed', overflow: 'hidden', backgroundColor: '#F0F5FF',
        justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    },
    previewImage: { width: '100%', height: '100%' },
    placeholderContent: { alignItems: 'center', gap: 8 },
    placeholderText: { color: '#0066FF', fontWeight: '600', fontSize: 15 },
    retakeOverlay: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row',
        justifyContent: 'center', alignItems: 'center', paddingVertical: 8, gap: 6,
    },
    retakeText: { color: 'white', fontWeight: '600' },
    scanningOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,102,255,0.85)', justifyContent: 'center', alignItems: 'center', gap: 10,
    },
    scanningText: { color: 'white', fontWeight: '700', fontSize: 16 },
    scanningSubtext: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
    notesCard: {
        backgroundColor: '#FFF8E1', borderRadius: 12, padding: 14,
        borderLeftWidth: 3, borderLeftColor: '#FFB800', marginBottom: 20, gap: 6,
    },
    notesTitle: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 4 },
    noteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    noteDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFB800' },
    noteText: { fontSize: 13, color: '#555', flex: 1 },
    actionRow: { flexDirection: 'row', gap: 12 },
    actionBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderWidth: 1.5, borderColor: '#0066FF', borderRadius: 12, paddingVertical: 12,
        backgroundColor: 'white',
    },
    actionBtnText: { color: '#0066FF', fontWeight: '600', fontSize: 15 },
    footer: {
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        backgroundColor: 'white',
        borderTopWidth: 1, borderTopColor: '#F0F0F0',
    },
    nextBtn: {
        backgroundColor: '#0066FF', borderRadius: 14, paddingVertical: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    nextBtnDisabled: { backgroundColor: '#B0C4DE' },
    nextBtnText: { color: 'white', fontWeight: '700', fontSize: 17 },
});
