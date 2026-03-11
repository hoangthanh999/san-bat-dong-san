import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
    View, FlatList, Dimensions, StatusBar, ViewToken,
    TouchableOpacity, Text, StyleSheet, Platform, RefreshControl,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePropertyStore } from '../../store/propertyStore';
import { useNotificationStore } from '../../store/notificationStore';
import PropertyCard from '../../components/property/PropertyCard';
import { Skeleton } from '../../components/ui/Skeleton';
import { Room } from '../../types';

const { height } = Dimensions.get('window');
const BOTTOM_TAB_HEIGHT = Platform.OS === 'ios' ? 88 : 64;

export default function FeedScreen() {
    const router = useRouter();
    const { rooms, fetchRooms, isLoading, loadMoreRooms } = usePropertyStore();
    const { unreadCount } = useNotificationStore();
    const [activeId, setActiveId] = useState<number | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50,
    }).current;

    const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0) {
            const activeItem = viewableItems[0].item as Room;
            setActiveId(activeItem.id);
        }
    }, []);

    useEffect(() => {
        fetchRooms();
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchRooms();
        setRefreshing(false);
    }, []);

    const displayRooms = rooms.length > 0 ? rooms : MOCK_ROOMS;

    if (isLoading && rooms.length === 0) {
        return (
            <View style={{ flex: 1, backgroundColor: 'black' }}>
                <StatusBar barStyle="light-content" />
                <Skeleton width="100%" height={height} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: 'black' }}>
            <StatusBar barStyle="light-content" translucent />

            {/* Floating Header */}
            <View style={styles.header} pointerEvents="box-none">
                <View style={styles.logoContainer}>
                    <Text style={styles.logoText}>🏠</Text>
                    <Text style={styles.logoName}>HomeSwipe</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={() => router.push('/filter' as any)}
                    >
                        <Ionicons name="search-outline" size={22} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={() => router.push('/notifications' as any)}
                    >
                        <Ionicons name="notifications-outline" size={22} color="white" />
                        {unreadCount > 0 && (
                            <View style={styles.notifBadge}>
                                <Text style={styles.notifBadgeText}>
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                ref={flatListRef}
                data={displayRooms}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <PropertyCard item={item} isActive={item.id === activeId} />
                )}
                pagingEnabled
                snapToInterval={height - BOTTOM_TAB_HEIGHT}
                snapToAlignment="start"
                decelerationRate="fast"
                showsVerticalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                onEndReached={() => loadMoreRooms()}
                onEndReachedThreshold={0.5}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="white"
                        progressBackgroundColor="rgba(0,0,0,0.5)"
                    />
                }
                windowSize={3}
                initialNumToRender={1}
                maxToRenderPerBatch={1}
                removeClippedSubviews
            />
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 54 : 16,
        paddingBottom: 12,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    logoText: { fontSize: 22 },
    logoName: {
        color: 'white',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    headerBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    notifBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
    },
    notifBadgeText: {
        color: 'white',
        fontSize: 9,
        fontWeight: '800',
    },
});

// Mock Data for Demo
const MOCK_ROOMS: Room[] = [
    {
        id: 1,
        title: 'Căn hộ cao cấp view sông Sài Gòn, nội thất sang trọng',
        description: 'Căn hộ 2PN, 2WC, full nội thất, view trực diện sông.',
        price: 15000000,
        deposit: 30000000,
        area: 85,
        address: 'Vinhomes Central Park, Bình Thạnh, TP.HCM',
        images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop'],
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-living-room-with-a-fireplace-and-christmas-decorations-2780-large.mp4',
        location: { latitude: 10.795, longitude: 106.72 },
        rentalType: 'WHOLE',
        status: 'ACTIVE',
        amenities: ['Pool', 'Gym', 'Parking', 'WiFi'],
        landlord: {
            id: 101,
            fullName: 'Nguyễn Văn A',
            avatarUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
            phone: '0901234567',
        },
        numBedrooms: 2,
        numBathrooms: 2,
        averageRating: 4.8,
        totalReviews: 12,
        createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    },
    {
        id: 2,
        title: 'Phòng trọ giá rẻ gần đại học Bách Khoa, giờ giấc tự do',
        description: 'Phòng mới xây, giờ giấc tự do, có gác lửng.',
        price: 3500000,
        deposit: 3500000,
        area: 25,
        address: 'Lý Thường Kiệt, Quận 10, TP.HCM',
        images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop'],
        location: { latitude: 10.772, longitude: 106.658 },
        rentalType: 'WHOLE',
        status: 'ACTIVE',
        landlord: {
            id: 102,
            fullName: 'Trần Thị B',
            avatarUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
            phone: '0912345678',
        },
        numBedrooms: 1,
        numBathrooms: 1,
        averageRating: 4.2,
        totalReviews: 5,
        createdAt: new Date().toISOString(), // Just now → "Mới đăng"
    },
    {
        id: 3,
        title: 'Nhà nguyên căn mặt tiền kinh doanh, 1 trệt 2 lầu đẹp',
        description: 'Nhà 1 trệt 2 lầu, thích hợp mở văn phòng hoặc kinh doanh.',
        price: 25000000,
        deposit: 50000000,
        area: 120,
        address: 'Nguyễn Văn Linh, Quận 7, TP.HCM',
        images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop'],
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-modern-apartment-with-a-view-of-the-city-at-night-3456-large.mp4',
        location: { latitude: 10.73, longitude: 106.7 },
        rentalType: 'WHOLE',
        status: 'ACTIVE',
        landlord: {
            id: 103,
            fullName: 'Lê Văn C',
            avatarUrl: 'https://randomuser.me/api/portraits/men/86.jpg',
            phone: '0987654321',
        },
        numBedrooms: 4,
        numBathrooms: 3,
        averageRating: 5.0,
        totalReviews: 2,
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
    {
        id: 4,
        title: 'Studio hiện đại, full nội thất cao cấp, gần Metro Tân Cảng',
        description: 'Studio sang trọng với đầy đủ tiện nghi.',
        price: 8500000,
        deposit: 17000000,
        area: 35,
        address: 'Điện Biên Phủ, Bình Thạnh, TP.HCM',
        images: ['https://images.unsplash.com/photo-1560448205-4d9b3e6bb6db?w=800&auto=format&fit=crop'],
        location: { latitude: 10.789, longitude: 106.715 },
        rentalType: 'WHOLE',
        status: 'ACTIVE',
        amenities: ['WiFi', 'Điều hoà', 'Bếp', 'Máy giặt'],
        landlord: {
            id: 104,
            fullName: 'Phạm Thị D',
            avatarUrl: 'https://randomuser.me/api/portraits/women/65.jpg',
            phone: '0933445566',
        },
        numBedrooms: 0,
        numBathrooms: 1,
        averageRating: 4.5,
        totalReviews: 8,
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
];
