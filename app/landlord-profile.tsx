import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, ActivityIndicator, Linking, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, Stack } from 'expo-router';
import { userService } from '../services/api/user';
import { getUserSummarySilent } from '../services/api/user';
import { roomService } from '../services/api/rooms';
import { CustomerPublicResponseDTO, Room } from '../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeRouter } from '../hooks/useSafeRouter';
import { useAuthStore } from '../store/authStore';

/**
 * Kiểm tra chủ nhà đã xác minh chưa.
 * Backend trả `kycStatus` (String: "VERIFIED" | "PENDING" | "UNVERIFIED")
 * và/hoặc `identityVerified` (boolean).
 * Web cũng check cả hai → mobile normalize tương tự.
 */
function isOwnerVerified(profile: CustomerPublicResponseDTO | null): boolean {
    if (!profile) return false;
    return (
        profile.kycStatus === 'VERIFIED' ||
        profile.identityVerified === true
    );
}

export default function LandlordProfileScreen() {
    const { router, safePush } = useSafeRouter();
    const insets = useSafeAreaInsets();
    const { isAuthenticated, user } = useAuthStore();
    const { slug, landlordId } = useLocalSearchParams<{ slug?: string; landlordId?: string }>();
    const [profile, setProfile] = useState<CustomerPublicResponseDTO | null>(null);
    const [bannerUrl, setBannerUrl] = useState<string | null>(null);
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
            // ── Load public profile ──────────────────────────────────
            // Ưu tiên slug → gọi getPublicProfile (trả kycStatus, phone, createdAt)
            // Fallback landlordId → gọi summary (chỉ trả id, fullName, avatarUrl)
            if (slug) {
                try {
                    const p = await userService.getPublicProfile(slug);
                    setProfile(p);
                } catch {
                    // Nếu public-profile fail, fallback summary nếu có landlordId
                    if (landlordId) {
                        const summary = await getUserSummarySilent(Number(landlordId));
                        setProfile({
                            id: String(summary?.id ?? landlordId),
                            fullName: summary?.fullName || `Chủ nhà #${landlordId}`,
                            avatarUrl: summary?.avatarUrl,
                        });
                    }
                }
                // Load banner image from dedicated endpoint
                try {
                    const bannerData = await userService.getPublicBanner(slug);
                    if (bannerData?.bannerUrl) setBannerUrl(bannerData.bannerUrl);
                } catch {
                    // Banner is optional — fail silently
                }
            } else if (landlordId) {
                // Không có slug → chỉ lấy được summary (không có kycStatus/phone/createdAt)
                const summary = await getUserSummarySilent(Number(landlordId));
                setProfile({
                    id: String(summary?.id ?? landlordId),
                    fullName: summary?.fullName || `Chủ nhà #${landlordId}`,
                    avatarUrl: summary?.avatarUrl,
                });
            }

            // ── Load landlord's properties ───────────────────────────
            const ownerId = landlordId ? Number(landlordId) : (profile?.id ? Number(profile.id) : null);
            if (ownerId && !isNaN(ownerId)) {
                try {
                    const res = await roomService.getPropertiesByLandlord(ownerId);
                    setRooms(res.content || []);
                } catch {
                    console.warn('[LandlordProfile] Không tải được danh sách BĐS');
                }
            }
        } catch (e: any) {
            setError('Không thể tải thông tin người dùng');
            console.warn('[LandlordProfile] Error:', e);
        } finally {
            setIsLoading(false);
        }
    };

    // ── Handlers ────────────────────────────────────────────────────
    const handleChat = () => {
        if (!isAuthenticated) { safePush('/(auth)/login' as any); return; }
        const ownerId = landlordId ? Number(landlordId) : Number(profile?.id);
        if (!ownerId || isNaN(ownerId)) return;
        // Chặn tự nhắn chính mình
        if (user?.id === ownerId) {
            Alert.alert('Thông báo', 'Bạn không thể nhắn tin cho chính mình.');
            return;
        }
        safePush(`/chat/${ownerId}` as any);
    };

    const handleCall = () => {
        if (profile?.phone) {
            Linking.openURL(`tel:${profile.phone}`);
        }
    };

    const getFullAddress = (r: Room) => r.address || '';

    const formatPrice = (p: number) => {
        if (p >= 1000000) return `${(p / 1000000).toFixed(0)} tr/th`;
        return `${(p / 1000).toFixed(0)}K/th`;
    };

    // ── Computed ────────────────────────────────────────────────────
    const verified = isOwnerVerified(profile);
    const avatarUri = profile?.avatarUrl
        || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.fullName || 'User')}&background=0066FF&color=fff&size=200`;
    const activeRooms = rooms.filter(r => r.status === 'ACTIVE');

    // ── Loading ─────────────────────────────────────────────────────
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

    // ── Render ──────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="light-content" />

            {/* Header Banner */}
            <View style={[styles.banner, { paddingTop: insets.top + 8 }]}>
                {bannerUrl ? (
                    <Image
                        source={{ uri: bannerUrl }}
                        style={StyleSheet.absoluteFillObject}
                        contentFit="cover"
                    />
                ) : (
                    <View style={styles.bannerGradient} />
                )}
                <View style={styles.bannerOverlay} />
                <TouchableOpacity style={[styles.backBtn, { top: insets.top + 4 }]} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.bannerTitle}>Hồ sơ chủ nhà</Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Profile Card ────────────────────────────── */}
                <View style={styles.profileCard}>
                    {/* Avatar with verified badge overlay */}
                    <View style={styles.avatarWrapper}>
                        <Image source={{ uri: avatarUri }} style={styles.avatar} />
                        {verified && (
                            <View style={styles.avatarBadge}>
                                <Ionicons name="checkmark-circle" size={22} color="#0066FF" />
                            </View>
                        )}
                    </View>

                    <Text style={styles.fullName}>{profile?.fullName || 'Chủ nhà'}</Text>

                    {/* KYC Badge — chỉ hiện khi đã xác minh (giống web) */}
                    {verified && (
                        <View style={[styles.kycBadge, styles.kycVerified]}>
                            <Ionicons name="shield-checkmark" size={14} color="#16A34A" />
                            <Text style={[styles.kycText, styles.kycTextVerified]}>
                                Đã xác minh danh tính
                            </Text>
                        </View>
                    )}

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Text style={styles.statNum}>{rooms.length}</Text>
                            <Text style={styles.statLabel}>Tin đăng</Text>
                        </View>
                        {activeRooms.length !== rooms.length && rooms.length > 0 && (
                            <>
                                <View style={styles.statDivider} />
                                <View style={styles.stat}>
                                    <Text style={styles.statNum}>{activeRooms.length}</Text>
                                    <Text style={styles.statLabel}>Đang hiển thị</Text>
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

                    {/* Contact Info */}
                    {profile?.phone && (
                        <View style={styles.contactRow}>
                            <Ionicons name="call-outline" size={16} color="#0066FF" />
                            <Text style={styles.contactText}>{profile.phone}</Text>
                        </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.chatBtn} onPress={handleChat} activeOpacity={0.7}>
                            <Ionicons name="chatbubble-ellipses" size={18} color="white" />
                            <Text style={styles.chatBtnText}>Nhắn tin</Text>
                        </TouchableOpacity>
                        {profile?.phone && (
                            <TouchableOpacity style={styles.callBtn} onPress={handleCall} activeOpacity={0.7}>
                                <Ionicons name="call" size={18} color="#0066FF" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* ── Properties ──────────────────────────────── */}
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
                                onPress={() => safePush(`/property/${room.id}` as any)}
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
        height: 176, backgroundColor: '#0066FF',
        justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 18,
        paddingTop: 0,
        overflow: 'hidden',
    },
    bannerGradient: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#0052CC',
    },
    bannerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.25)',
    },
    backBtn: {
        position: 'absolute', left: 16,
        width: 42, height: 42, borderRadius: 21,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.22)',
    },
    bannerTitle: { fontSize: 21, fontWeight: '800', color: 'white' },
    scrollView: { flex: 1 },
    scrollContent: { paddingTop: 16 },

    // ── Profile Card ──
    profileCard: {
        backgroundColor: 'white', borderRadius: 20, marginHorizontal: 16,
        paddingHorizontal: 20, paddingTop: 22, paddingBottom: 20,
        alignItems: 'center', overflow: 'visible',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 12,
        zIndex: 2,
        elevation: 4,
    },
    avatar: {
        width: 92, height: 92, borderRadius: 46,
        borderWidth: 4, borderColor: 'white', backgroundColor: '#E0E0E0',
    },
    avatarBadge: {
        position: 'absolute', bottom: 2, right: 2,
        backgroundColor: 'white', borderRadius: 13,
        width: 26, height: 26, alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: 'white',
    },
    fullName: {
        fontSize: 22, fontWeight: '800', color: '#1A1A1A',
        textAlign: 'center', lineHeight: 27, paddingHorizontal: 8,
    },

    // ── KYC Badge ──
    kycBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 8,
    },
    kycVerified: { backgroundColor: '#F0FDF4' },
    kycText: { fontSize: 12, fontWeight: '600' },
    kycTextVerified: { color: '#16A34A' },

    // ── Stats ──
    statsRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        marginTop: 18, paddingTop: 16,
        borderTopWidth: 1, borderTopColor: '#F0F0F0', width: '100%',
    },
    stat: { flex: 1, alignItems: 'center', gap: 2, minWidth: 0, paddingHorizontal: 4 },
    statNum: { fontSize: 16, fontWeight: '800', color: '#0066FF', textAlign: 'center' },
    statLabel: { fontSize: 12, color: '#888' },
    statDivider: { width: 1, backgroundColor: '#E8E8E8', marginVertical: 4 },

    // ── Contact ──
    contactRow: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        justifyContent: 'center', alignSelf: 'stretch',
        marginTop: 14, paddingHorizontal: 12, paddingVertical: 10,
        borderRadius: 12, backgroundColor: '#F5F8FF',
    },
    contactText: { fontSize: 14, color: '#333', fontWeight: '500' },

    // ── Action Buttons ──
    actionRow: {
        flexDirection: 'row', gap: 10, marginTop: 16, width: '100%',
    },
    chatBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, backgroundColor: '#0066FF', borderRadius: 12,
        minHeight: 48, paddingVertical: 12,
    },
    chatBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
    callBtn: {
        width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#E8F0FF', borderWidth: 1, borderColor: '#D0E0FF',
    },

    // ── Properties ──
    propertiesSection: { marginTop: 22, paddingHorizontal: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 14 },
    emptyState: {
        alignItems: 'center', paddingVertical: 36, gap: 8,
        backgroundColor: 'white', borderRadius: 16,
    },
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
