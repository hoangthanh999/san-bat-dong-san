import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, Platform, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { userService } from '../services/api/user';
import { roomService } from '../services/api/rooms';
import { CustomerPublicResponseDTO, Room } from '../types';

export default function LandlordProfileScreen() {
    const router = useRouter();
    const { slug, landlordId } = useLocalSearchParams<{ slug?: string; landlordId?: string }>();
    const [profile, setProfile] = useState<CustomerPublicResponseDTO | null>(null);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [slug, landlordId]);

    const loadData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Load public profile
            if (slug) {
                const p = await userService.getPublicProfile(slug);
                setProfile(p);
            }
            // Load landlord's properties
            if (landlordId) {
                const res = await roomService.getPropertiesByLandlord(Number(landlordId));
                setRooms(res.content || []);
            }
        } catch (e: any) {
            setError('Không thể tải thông tin người dùng');
            console.warn('[LandlordProfile] Error:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const getFullAddress = (r: Room) => {
        return r.address || '';
    };

    const formatPrice = (p: number) => {
        if (p >= 1000000) return `${(p / 1000000).toFixed(0)} tr/th`;
        return `${(p / 1000).toFixed(0)}K/th`;
    };

    if (isLoading) {
        return (
            <View style={styles.centerContainer}>
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator size="large" color="#0066FF" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centerContainer}>
                <Stack.Screen options={{ headerShown: false }} />
                <Ionicons name="alert-circle-outline" size={64} color="#CCC" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
                    <Text style={styles.retryBtnText}>Thử lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="light-content" />

            {/* Header Banner */}
            <View style={styles.banner}>
                <View style={styles.bannerGradient} />
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.bannerTitle}>Hồ sơ chủ nhà</Text>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <Image
                        source={{ uri: profile?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.fullName || 'User')}&background=0066FF&color=fff&size=200` }}
                        style={styles.avatar}
                    />
                    <Text style={styles.fullName}>{profile?.fullName || 'Chủ nhà'}</Text>

                    {/* KYC Badge */}
                    <View style={[styles.kycBadge, profile?.kycStatus === 'VERIFIED' ? styles.kycVerified : styles.kycUnverified]}>
                        <Ionicons
                            name={profile?.kycStatus === 'VERIFIED' ? 'shield-checkmark' : 'shield-outline'}
                            size={14}
                            color={profile?.kycStatus === 'VERIFIED' ? '#16A34A' : '#999'}
                        />
                        <Text style={[styles.kycText, profile?.kycStatus === 'VERIFIED' ? styles.kycTextVerified : styles.kycTextUnverified]}>
                            {profile?.kycStatus === 'VERIFIED' ? 'Đã xác minh' : 'Chưa xác minh'}
                        </Text>
                    </View>

                    {/* Stats */}
                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Text style={styles.statNum}>{rooms.length}</Text>
                            <Text style={styles.statLabel}>Tin đăng</Text>
                        </View>
                        {profile?.phone && (
                            <>
                                <View style={styles.statDivider} />
                                <View style={styles.stat}>
                                    <Ionicons name="call-outline" size={18} color="#0066FF" />
                                    <Text style={styles.statLabel}>{profile.phone}</Text>
                                </View>
                            </>
                        )}
                        {profile?.createdAt && (
                            <>
                                <View style={styles.statDivider} />
                                <View style={styles.stat}>
                                    <Text style={styles.statNum}>
                                        {new Date(profile.createdAt).toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' })}
                                    </Text>
                                    <Text style={styles.statLabel}>Tham gia</Text>
                                </View>
                            </>
                        )}
                    </View>
                </View>

                {/* Properties */}
                <View style={styles.propertiesSection}>
                    <Text style={styles.sectionTitle}>
                        Tin đăng ({rooms.length})
                    </Text>

                    {rooms.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="home-outline" size={48} color="#DDD" />
                            <Text style={styles.emptyText}>Chưa có tin đăng nào</Text>
                        </View>
                    ) : (
                        rooms.map(room => (
                            <TouchableOpacity
                                key={room.id}
                                style={styles.roomCard}
                                onPress={() => router.push(`/property/${room.id}` as any)}
                                activeOpacity={0.7}
                            >
                                <Image
                                    source={{ uri: room.images?.[0] || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400' }}
                                    style={styles.roomImage}
                                    contentFit="cover"
                                />
                                <View style={styles.roomInfo}>
                                    <Text numberOfLines={2} style={styles.roomTitle}>{room.title}</Text>
                                    <Text style={styles.roomPrice}>{formatPrice(room.price)}</Text>
                                    <Text numberOfLines={1} style={styles.roomAddress}>
                                        <Ionicons name="location-outline" size={12} color="#999" />
                                        {' '}{getFullAddress(room)}
                                    </Text>
                                    <View style={styles.roomMeta}>
                                        <Text style={styles.roomMetaItem}>
                                            <Ionicons name="resize-outline" size={12} color="#999" /> {room.area}m²
                                        </Text>
                                        {room.bedrooms != null && (
                                            <Text style={styles.roomMetaItem}>
                                                <Ionicons name="bed-outline" size={12} color="#999" /> {room.bedrooms} PN
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                <View style={{ height: 60 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: '#F8F9FA' },
    errorText: { fontSize: 16, color: '#888' },
    retryBtn: { backgroundColor: '#0066FF', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
    retryBtnText: { color: 'white', fontWeight: '700' },
    banner: {
        height: 120, backgroundColor: '#0066FF',
        justifyContent: 'flex-end', padding: 16,
        paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight ?? 24) + 8,
    },
    bannerGradient: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#0052CC',
    },
    backBtn: {
        position: 'absolute', top: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight ?? 24) + 8, left: 16,
        width: 40, height: 40, justifyContent: 'center',
    },
    bannerTitle: { fontSize: 20, fontWeight: '700', color: 'white', marginTop: 20 },
    scrollView: { flex: 1, marginTop: -20 },
    profileCard: {
        backgroundColor: 'white', borderRadius: 20, marginHorizontal: 16,
        padding: 24, alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    },
    avatar: {
        width: 80, height: 80, borderRadius: 40,
        borderWidth: 3, borderColor: '#E8F0FF', backgroundColor: '#E0E0E0',
        marginTop: -60,
    },
    fullName: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', marginTop: 12 },
    kycBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 8,
    },
    kycVerified: { backgroundColor: '#F0FDF4' },
    kycUnverified: { backgroundColor: '#F8F9FA' },
    kycText: { fontSize: 12, fontWeight: '600' },
    kycTextVerified: { color: '#16A34A' },
    kycTextUnverified: { color: '#999' },
    statsRow: {
        flexDirection: 'row', justifyContent: 'center', gap: 24,
        marginTop: 20, paddingTop: 16,
        borderTopWidth: 1, borderTopColor: '#F0F0F0', width: '100%',
    },
    stat: { alignItems: 'center', gap: 2 },
    statNum: { fontSize: 18, fontWeight: '800', color: '#0066FF' },
    statLabel: { fontSize: 12, color: '#888' },
    statDivider: { width: 1, backgroundColor: '#E8E8E8' },
    propertiesSection: { marginTop: 20, paddingHorizontal: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 14 },
    emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
    emptyText: { fontSize: 14, color: '#999' },
    roomCard: {
        flexDirection: 'row', backgroundColor: 'white', borderRadius: 14,
        overflow: 'hidden', marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    roomImage: { width: 110, height: 110 },
    roomInfo: { flex: 1, padding: 12, justifyContent: 'center', gap: 3 },
    roomTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', lineHeight: 19 },
    roomPrice: { fontSize: 16, fontWeight: '800', color: '#FF6B35' },
    roomAddress: { fontSize: 12, color: '#999' },
    roomMeta: { flexDirection: 'row', gap: 12, marginTop: 2 },
    roomMetaItem: { fontSize: 12, color: '#888' },
});
