import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, Platform, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function KYCUploadBackScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [imageUri, setImageUri] = useState<string | null>(null);

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
            Alert.alert('Thiếu ảnh', 'Vui lòng chụp hoặc chọn ảnh mặt sau CCCD');
            return;
        }

        // Lưu URI ảnh mặt sau
        await AsyncStorage.setItem('kyc_back_uri', imageUri);

        router.push('/kyc/info' as any);
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Bước 2/3 — Mặt sau CCCD</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '66%' }]} />
            </View>

            <View style={styles.content}>
                <Text style={styles.title}>Chụp mặt sau CCCD/CMND</Text>
                <Text style={styles.subtitle}>Lật thẻ và chụp mặt sau có chứa mã vạch / QR</Text>

                <TouchableOpacity
                    style={styles.previewFrame}
                    onPress={() => pickOrCapture('camera')}
                    activeOpacity={0.8}
                >
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
                    ) : (
                        <View style={styles.placeholderContent}>
                            <Ionicons name="card" size={48} color="#0066FF" />
                            <Text style={styles.placeholderText}>Nhấn để chụp mặt sau</Text>
                        </View>
                    )}
                    {imageUri && (
                        <View style={styles.retakeOverlay}>
                            <Ionicons name="refresh" size={20} color="white" />
                            <Text style={styles.retakeText}>Chụp lại</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <View style={styles.notesCard}>
                    <Text style={styles.notesTitle}>Lưu ý:</Text>
                    {[
                        'Ảnh rõ nét, đủ sáng',
                        'Không che khuất mã QR / vạch',
                        'Đặt thẻ trên nền phẳng',
                    ].map((note, i) => (
                        <View key={i} style={styles.noteRow}>
                            <View style={styles.noteDot} />
                            <Text style={styles.noteText}>{note}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => pickOrCapture('camera')}>
                        <Ionicons name="camera" size={22} color="#0066FF" />
                        <Text style={styles.actionBtnText}>Chụp ảnh</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => pickOrCapture('gallery')}>
                        <Ionicons name="images" size={22} color="#0066FF" />
                        <Text style={styles.actionBtnText}>Chọn file</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.nextBtn, !imageUri && styles.nextBtnDisabled]}
                    onPress={handleNext}
                    disabled={!imageUri}
                    activeOpacity={0.85}
                >
                    <Text style={styles.nextBtnText}>Tiếp theo</Text>
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
        paddingTop: 0 /* paddingTop set via inline style using useSafeAreaInsets */,
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
