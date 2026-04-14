import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
    View, StyleSheet, FlatList, Dimensions, StatusBar,
    TouchableOpacity, Text, ScrollView, Animated, Platform, Alert,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region, Circle } from 'react-native-maps';
import { Image } from 'expo-image';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';

import { usePropertyStore } from '../../store/propertyStore';
import { Room } from '../../types';
import { DEFAULT_MAP_REGION } from '../../constants';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.82;
const CARD_HEIGHT = 130;

const FILTER_CHIPS = [
    { id: 'all', label: 'Tất cả' },
    { id: 'cheap', label: '< 5 triệu' },
    { id: 'mid', label: '5–15 triệu' },
    { id: 'high', label: '> 15 triệu' },
    { id: '1pn', label: '1 PN' },
    { id: '2pn', label: '2 PN' },
    { id: '3pn', label: '3+ PN' },
    { id: 'whole', label: 'Nguyên căn' },
];

const MOCK_MAP_ROOMS: Room[] = [
    {
        id: 1, title: 'Căn hộ cao cấp view sông', price: 15000000, area: 85,
        address: 'Vinhomes Central Park, Bình Thạnh, TP.HCM',
        images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400'],
        latitude: 10.795, longitude: 106.72, transactionType: 'RENT', propertyType: 'APARTMENT', status: 'ACTIVE',
        ownerId: 101,
        bedrooms: 2, bathrooms: 2, createdAt: new Date().toISOString(),
        amenities: ['Pool', 'Gym'],
    },
    {
        id: 2, title: 'Phòng trọ gần ĐH Bách Khoa', price: 3500000, area: 25,
        address: 'Lý Thường Kiệt, Quận 10, TP.HCM',
        images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400'],
        latitude: 10.772, longitude: 106.658, transactionType: 'RENT', propertyType: 'ROOM', status: 'ACTIVE',
        ownerId: 102,
        bedrooms: 1, bathrooms: 1, createdAt: new Date().toISOString(),
    },
    {
        id: 3, title: 'Nhà mặt tiền kinh doanh Q7', price: 25000000, area: 120,
        address: 'Nguyễn Văn Linh, Quận 7, TP.HCM',
        images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400'],
        latitude: 10.73, longitude: 106.7, transactionType: 'RENT', propertyType: 'HOUSE', status: 'ACTIVE',
        ownerId: 103,
        bedrooms: 4, bathrooms: 3, createdAt: new Date().toISOString(),
    },
    {
        id: 4, title: 'Studio hiện đại gần Metro', price: 8500000, area: 35,
        address: 'Điện Biên Phủ, Bình Thạnh, TP.HCM',
        images: ['https://images.unsplash.com/photo-1560448205-4d9b3e6bb6db?w=400'],
        latitude: 10.789, longitude: 106.715, transactionType: 'RENT', propertyType: 'APARTMENT', status: 'ACTIVE',
        ownerId: 104,
        bedrooms: 0, bathrooms: 1, createdAt: new Date().toISOString(),
    },
];

export default function MapScreen() {
    const router = useRouter();
    const { rooms, fetchRooms, isLoading } = usePropertyStore();
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [activeFilter, setActiveFilter] = useState('all');
    const [userLocation, setUserLocation] = useState<Region | null>(null);
    const [showNearMe, setShowNearMe] = useState(false);
    const mapRef = useRef<MapView>(null);
    const nearMeAnim = useRef(new Animated.Value(1)).current;

    const displayRooms = rooms.length > 0 ? rooms : MOCK_MAP_ROOMS;

    const filteredRooms = displayRooms.filter(room => {
        switch (activeFilter) {
            case 'cheap': return room.price < 5000000;
            case 'mid': return room.price >= 5000000 && room.price <= 15000000;
            case 'high': return room.price > 15000000;
            case '1pn': return room.bedrooms === 1;
            case '2pn': return room.bedrooms === 2;
            case '3pn': return (room.bedrooms || 0) >= 3;
            case 'whole': return room.propertyType === 'HOUSE';
            default: return true;
        }
    });

    useEffect(() => {
        fetchRooms();
    }, []);

    const pulseNearMe = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(nearMeAnim, { toValue: 1.12, duration: 800, useNativeDriver: true }),
                Animated.timing(nearMeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            ])
        ).start();
    };

    const handleNearMe = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Cần quyền truy cập', 'Vui lòng cho phép truy cập vị trí để tìm nhà gần bạn.');
            return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const region = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
        };
        setUserLocation(region);
        setShowNearMe(true);
        mapRef.current?.animateToRegion(region, 800);
        pulseNearMe();
    };

    const handleMarkerPress = (room: Room) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedRoom(room);
        mapRef.current?.animateToRegion({
            latitude: room.latitude,
            longitude: room.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
        }, 500);
    };

    const formatPrice = (price: number) => {
        if (price >= 1000000000) return `${(price / 1000000000).toFixed(1)}tỷ`;
        return `${(price / 1000000).toFixed(0)}tr`;
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={DEFAULT_MAP_REGION}
                showsUserLocation
                showsMyLocationButton={false}
                onPress={() => setSelectedRoom(null)}
            >
                {filteredRooms.map(room => (
                    <Marker
                        key={room.id}
                        coordinate={{
                            latitude: room.latitude,
                            longitude: room.longitude,
                        }}
                        onPress={() => handleMarkerPress(room)}
                        tracksViewChanges={false}
                    >
                        <View style={[
                            styles.markerBubble,
                            selectedRoom?.id === room.id && styles.markerBubbleSelected,
                        ]}>
                            <Text style={[
                                styles.markerText,
                                selectedRoom?.id === room.id && styles.markerTextSelected,
                            ]}>
                                {formatPrice(room.price)}
                            </Text>
                        </View>
                    </Marker>
                ))}

                {showNearMe && userLocation && (
                    <Circle
                        center={{ latitude: userLocation.latitude, longitude: userLocation.longitude }}
                        radius={2000}
                        fillColor="rgba(0, 102, 255, 0.08)"
                        strokeColor="rgba(0, 102, 255, 0.3)"
                        strokeWidth={2}
                    />
                )}
            </MapView>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <TouchableOpacity
                    style={styles.searchBar}
                    onPress={() => router.push('/filter' as any)}
                    activeOpacity={0.8}
                >
                    <Ionicons name="search" size={18} color="#666" />
                    <Text style={styles.searchText}>Tìm kiếm khu vực, địa chỉ...</Text>
                    <TouchableOpacity
                        style={styles.filterIconBtn}
                        onPress={() => router.push('/filter' as any)}
                    >
                        <Ionicons name="options-outline" size={18} color="#0066FF" />
                    </TouchableOpacity>
                </TouchableOpacity>
            </View>

            {/* Filter Chips */}
            <View style={styles.chipsContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsScroll}
                >
                    {FILTER_CHIPS.map(chip => (
                        <TouchableOpacity
                            key={chip.id}
                            style={[styles.chip, activeFilter === chip.id && styles.chipActive]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setActiveFilter(chip.id);
                            }}
                        >
                            <Text style={[styles.chipText, activeFilter === chip.id && styles.chipTextActive]}>
                                {chip.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Near Me Button */}
            <Animated.View style={[styles.nearMeBtn, { transform: [{ scale: nearMeAnim }] }]}>
                <TouchableOpacity style={styles.nearMeBtnInner} onPress={handleNearMe} activeOpacity={0.8}>
                    <Ionicons name="navigate" size={20} color="white" />
                    <Text style={styles.nearMeText}>Gần tôi</Text>
                </TouchableOpacity>
            </Animated.View>

            {/* Room count badge */}
            <View style={styles.countBadge}>
                <Text style={styles.countText}>{filteredRooms.length} bất động sản</Text>
            </View>

            {/* Selected Room Bottom Card */}
            {selectedRoom && (
                <TouchableOpacity
                    style={styles.bottomCard}
                    onPress={() => router.push(`/property/${selectedRoom.id}`)}
                    activeOpacity={0.92}
                >
                    <Image
                        source={{ uri: selectedRoom.images[0] }}
                        style={styles.cardImage}
                        contentFit="cover"
                    />
                    <View style={styles.cardInfo}>
                        <Text style={styles.cardPrice}>
                            {formatPrice(selectedRoom.price)}/tháng
                        </Text>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                            {selectedRoom.title}
                        </Text>
                        <Text style={styles.cardAddress} numberOfLines={1}>
                            📍 {selectedRoom.address}
                        </Text>
                        <View style={styles.cardMeta}>
                            {selectedRoom.bedrooms !== undefined && (
                                <View style={styles.metaItem}>
                                    <Ionicons name="bed-outline" size={12} color="#666" />
                                    <Text style={styles.metaText}>{selectedRoom.bedrooms} PN</Text>
                                </View>
                            )}
                            <View style={styles.metaItem}>
                                <Ionicons name="resize-outline" size={12} color="#666" />
                                <Text style={styles.metaText}>{selectedRoom.area}m²</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.cardArrow}>
                        <Ionicons name="chevron-forward" size={20} color="#0066FF" />
                    </View>
                    <TouchableOpacity
                        style={styles.closeCard}
                        onPress={() => setSelectedRoom(null)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="close" size={16} color="#888" />
                    </TouchableOpacity>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { width: '100%', height: '100%' },
    searchContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight ?? 24) + 8,
        left: 16,
        right: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 6,
    },
    searchText: { flex: 1, color: '#999', fontSize: 14 },
    filterIconBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#EFF4FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    chipsContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 116 : (StatusBar.currentHeight ?? 24) + 62,
        left: 0,
        right: 0,
    },
    chipsScroll: {
        paddingHorizontal: 16,
        gap: 8,
    },
    chip: {
        backgroundColor: 'white',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 1.5,
        borderColor: '#E0E0E0',
    },
    chipActive: {
        backgroundColor: '#0066FF',
        borderColor: '#0066FF',
    },
    chipText: { fontSize: 13, fontWeight: '600', color: '#555' },
    chipTextActive: { color: 'white' },
    nearMeBtn: {
        position: 'absolute',
        bottom: 160,
        right: 16,
    },
    nearMeBtnInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#0066FF',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        shadowColor: '#0066FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
    },
    nearMeText: { color: 'white', fontWeight: '700', fontSize: 13 },
    countBadge: {
        position: 'absolute',
        bottom: 160,
        left: 16,
        backgroundColor: 'white',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    countText: { fontSize: 12, fontWeight: '600', color: '#333' },
    markerBubble: {
        backgroundColor: 'white',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#0066FF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 5,
    },
    markerBubbleSelected: {
        backgroundColor: '#0066FF',
        transform: [{ scale: 1.15 }],
    },
    markerText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#0066FF',
    },
    markerTextSelected: { color: 'white' },
    bottomCard: {
        position: 'absolute',
        bottom: 20,
        left: 16,
        right: 16,
        backgroundColor: 'white',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 10,
    },
    cardImage: {
        width: 90,
        height: CARD_HEIGHT - 20,
        margin: 10,
        borderRadius: 10,
    },
    cardInfo: { flex: 1, paddingVertical: 12, paddingRight: 8 },
    cardPrice: { fontSize: 16, fontWeight: '800', color: '#FF6B35', marginBottom: 4 },
    cardTitle: { fontSize: 13, fontWeight: '600', color: '#1A1A1A', marginBottom: 3 },
    cardAddress: { fontSize: 12, color: '#888', marginBottom: 6 },
    cardMeta: { flexDirection: 'row', gap: 10 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    metaText: { fontSize: 11, color: '#666' },
    cardArrow: { paddingRight: 12 },
    closeCard: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
