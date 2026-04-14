import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
    View, FlatList, StatusBar, ViewToken,
    TouchableOpacity, Text, StyleSheet, RefreshControl,
    useWindowDimensions, LayoutChangeEvent,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePropertyStore } from '../../store/propertyStore';
import { useNotificationStore } from '../../store/notificationStore';
import PropertyCard from '../../components/property/PropertyCard';
import { Skeleton } from '../../components/ui/Skeleton';
import { Room } from '../../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FeedScreen() {
    const router = useRouter();
    const { rooms, fetchRooms, isLoading, loadMoreRooms } = usePropertyStore();
    const { unreadCount } = useNotificationStore();
    const [activeId, setActiveId] = useState<number | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const insets = useSafeAreaInsets();
    const { height, width } = useWindowDimensions();

    // Dùng onLayout để đo chiều cao THỰC TẾ của container FlatList
    // Cách này chính xác 100% trên mọi thiết bị (notch, punch-hole, home indicator...)
    // Không cần tính thủ công tab bar / insets
    const [feedHeight, setFeedHeight] = useState(0);
    const onFeedLayout = useCallback((e: LayoutChangeEvent) => {
        const h = e.nativeEvent.layout.height;
        if (h > 0) setFeedHeight(h);
    }, []);
    const CARD_HEIGHT = feedHeight > 0 ? feedHeight : height;

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

            {/* Floating Header — vị trí dựa trên insets.top */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
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

            <View style={{ flex: 1 }} onLayout={onFeedLayout}>
                {/* Chỉ render FlatList khi đã đo được chiều cao thực tế */}
                {CARD_HEIGHT > 0 && (
                    <FlatList
                        ref={flatListRef}
                        data={displayRooms}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <PropertyCard item={item} isActive={item.id === activeId} cardHeight={CARD_HEIGHT} />
                        )}
                        pagingEnabled
                        snapToInterval={CARD_HEIGHT}
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
                        removeClippedSubviews={false}
                        windowSize={3}
                        initialNumToRender={1}
                        maxToRenderPerBatch={1}
                    />
                )}
            </View>
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
        area: 85,
        address: 'Vinhomes Central Park, Phường 22, Quận Bình Thạnh, Hồ Chí Minh',
        latitude: 10.795,
        longitude: 106.72,
        images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop'],
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-living-room-with-a-fireplace-and-christmas-decorations-2780-large.mp4',
        transactionType: 'RENT',
        propertyType: 'APARTMENT',
        status: 'ACTIVE',
        amenities: ['Pool', 'Gym', 'Parking', 'WiFi'],
        ownerId: 101,
        ownerFullName: 'Nguyễn Văn A',
        ownerAvatarUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
        ownerPhone: '0901234567',
        bedrooms: 2,
        bathrooms: 2,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
        id: 2,
        title: 'Phòng trọ giá rẻ gần đại học Bách Khoa, giờ giấc tự do',
        description: 'Phòng mới xây, giờ giấc tự do, có gác lửng.',
        price: 3500000,
        area: 25,
        address: 'Lý Thường Kiệt, Phường 12, Quận 10, Hồ Chí Minh',
        latitude: 10.772,
        longitude: 106.658,
        images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop'],
        transactionType: 'RENT',
        propertyType: 'ROOM',
        status: 'ACTIVE',
        ownerId: 102,
        ownerFullName: 'Trần Thị B',
        ownerAvatarUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
        ownerPhone: '0912345678',
        bedrooms: 1,
        bathrooms: 1,
        createdAt: new Date().toISOString(),
    },
    {
        id: 3,
        title: 'Nhà nguyên căn mặt tiền kinh doanh, 1 trệt 2 lầu đẹp',
        description: 'Nhà 1 trệt 2 lầu, thích hợp mở văn phòng hoặc kinh doanh.',
        price: 25000000,
        area: 120,
        address: 'Nguyễn Văn Linh, Phường Tân Phong, Quận 7, Hồ Chí Minh',
        latitude: 10.73,
        longitude: 106.7,
        images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop'],
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-modern-apartment-with-a-view-of-the-city-at-night-3456-large.mp4',
        transactionType: 'RENT',
        propertyType: 'HOUSE',
        status: 'ACTIVE',
        ownerId: 103,
        ownerFullName: 'Lê Văn C',
        ownerAvatarUrl: 'https://randomuser.me/api/portraits/men/86.jpg',
        ownerPhone: '0987654321',
        bedrooms: 4,
        bathrooms: 3,
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
    {
        id: 4,
        title: 'Studio hiện đại, full nội thất cao cấp, gần Metro Tân Cảng',
        description: 'Studio sang trọng với đầy đủ tiện nghi.',
        price: 8500000,
        area: 35,
        address: 'Điện Biên Phủ, Phường 22, Quận Bình Thạnh, Hồ Chí Minh',
        latitude: 10.789,
        longitude: 106.715,
        images: ['https://images.unsplash.com/photo-1560448205-4d9b3e6bb6db?w=800&auto=format&fit=crop'],
        transactionType: 'RENT',
        propertyType: 'APARTMENT',
        status: 'ACTIVE',
        amenities: ['WiFi', 'Điều hoà', 'Bếp', 'Máy giặt'],
        ownerId: 104,
        ownerFullName: 'Phạm Thị D',
        ownerAvatarUrl: 'https://randomuser.me/api/portraits/women/65.jpg',
        ownerPhone: '0933445566',
        bedrooms: 0,
        bathrooms: 1,
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
];
