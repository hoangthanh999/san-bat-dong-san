import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
    View, StyleSheet, Dimensions, StatusBar,
    TouchableOpacity, Text, ScrollView, Animated, Alert, ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { searchService } from '../../services/api/search';
import { Room, PropertySearchItem } from '../../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const CARD_HEIGHT = 130;
const NEAR_ME_RADIUS_KM = 5; // Tìm kiếm trong bán kính 5km

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

// ─── Convert PropertySearchItem → Room (lightweight map-only display) ─────────
function searchItemToRoom(item: PropertySearchItem): Room {
    return {
        id: item.id,
        title: item.title,
        price: item.price,
        area: item.area,
        address: item.address,
        province: item.province,
        district: item.district,
        ward: item.ward,
        street: item.street,
        propertyType: item.propertyType,
        transactionType: item.transactionType,
        images: item.thumbnail ? [item.thumbnail] : [],
        latitude: item.latitude ?? 0,
        longitude: item.longitude ?? 0,
        bedrooms: item.bedrooms,
        bathrooms: item.bathrooms,
        hasBalcony: item.hasBalcony,
        furnishingStatus: item.furnishingStatus,
        status: 'ACTIVE' as any,
        ownerId: 0,
        createdAt: item.createdAt,
    };
}

const hasValidCoords = (room: Room) =>
    Number.isFinite(room.latitude) &&
    Number.isFinite(room.longitude) &&
    room.latitude !== 0 &&
    room.longitude !== 0;

// ─── Tạo HTML Leaflet map ──────────────────────────────────────────────────
const buildLeafletHTML = (rooms: Room[], userLat?: number, userLng?: number, radiusKm?: number) => {
    const markers = rooms.map(r => ({
        id: r.id,
        lat: r.latitude,
        lng: r.longitude,
        label: r.price >= 1000000000
            ? `${(r.price / 1000000000).toFixed(1)}tỷ`
            : `${(r.price / 1000000).toFixed(0)}tr`,
    }));

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    .price-marker {
      background: white;
      border: 2.5px solid #0066FF;
      border-radius: 20px;
      padding: 5px 10px;
      font-size: 12px;
      font-weight: 800;
      color: #0066FF;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.18);
      cursor: pointer;
      transition: all 0.15s;
    }
    .price-marker.selected {
      background: #0066FF;
      color: white;
      transform: scale(1.18);
      z-index: 9999 !important;
    }
    .user-dot {
      width: 16px; height: 16px;
      background: #0066FF;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 0 0 4px rgba(0,102,255,0.25);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([10.776, 106.7], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    var markers = {};
    var selectedId = null;
    var rooms = ${JSON.stringify(markers)};
    var boundsPoints = [];

    rooms.forEach(function(r) {
      if (!r.lat || !r.lng) return;
      boundsPoints.push([r.lat, r.lng]);
      var icon = L.divIcon({
        className: '',
        html: '<div class="price-marker" id="m' + r.id + '">' + r.label + '</div>',
        iconAnchor: [0, 0],
      });
      var m = L.marker([r.lat, r.lng], { icon: icon }).addTo(map);
      m.on('click', function() {
        if (selectedId !== null) {
          var prev = document.getElementById('m' + selectedId);
          if (prev) prev.classList.remove('selected');
        }
        selectedId = r.id;
        var el = document.getElementById('m' + r.id);
        if (el) el.classList.add('selected');
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerPress', id: r.id }));
      });
      markers[r.id] = m;
    });

    ${userLat && userLng ? `
      var userIcon = L.divIcon({
        className: '',
        html: '<div class="user-dot"></div>',
        iconAnchor: [8, 8],
      });
      L.marker([${userLat}, ${userLng}], { icon: userIcon }).addTo(map);
      L.circle([${userLat}, ${userLng}], {
        radius: ${(radiusKm || 5) * 1000},
        color: 'rgba(0,102,255,0.4)',
        fillColor: 'rgba(0,102,255,0.08)',
        fillOpacity: 1,
        weight: 2,
      }).addTo(map);
      map.setView([${userLat}, ${userLng}], 14);
    ` : `
      if (boundsPoints.length === 1) {
        map.setView(boundsPoints[0], 15);
      } else if (boundsPoints.length > 1) {
        map.fitBounds(boundsPoints, { padding: [48, 48], maxZoom: 15 });
      }
    `}

    map.on('click', function() {
      if (selectedId !== null) {
        var prev = document.getElementById('m' + selectedId);
        if (prev) prev.classList.remove('selected');
        selectedId = null;
      }
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapPress' }));
    });

    // Nhận lệnh từ React Native
    document.addEventListener('message', function(e) { handleMsg(e.data); });
    window.addEventListener('message', function(e) { handleMsg(e.data); });
    function handleMsg(data) {
      try {
        var msg = JSON.parse(data);
        if (msg.type === 'goToUser' && msg.lat && msg.lng) {
          map.setView([msg.lat, msg.lng], 15, { animate: true });
        }
      } catch(e) {}
    }
  </script>
</body>
</html>`;
};

// ─────────────────────────────────────────────────────────────────────────────

export default function MapScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [mapRooms, setMapRooms] = useState<Room[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [activeFilter, setActiveFilter] = useState('all');
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [nearbyRooms, setNearbyRooms] = useState<Room[] | null>(null); // null = chưa search Near Me
    const [isLoadingMap, setIsLoadingMap] = useState(false);
    const [isSearchingNearby, setIsSearchingNearby] = useState(false);
    const [mapError, setMapError] = useState<string | null>(null);
    const nearMeAnim = useRef(new Animated.Value(1)).current;
    const webViewRef = useRef<WebView>(null);

    const loadMapProperties = useCallback(async () => {
        setIsLoadingMap(true);
        setMapError(null);
        try {
            const results = await searchService.searchProperties({
                page: 0,
                size: 100,
            });
            setMapRooms((results.content || []).map(searchItemToRoom));
        } catch (err) {
            console.warn('[Map] Load map properties failed:', err);
            setMapError('Không thể tải dữ liệu bản đồ. Vui lòng thử lại.');
            setMapRooms([]);
        } finally {
            setIsLoadingMap(false);
        }
    }, []);

    useEffect(() => {
        loadMapProperties();
    }, [loadMapProperties]);

    // Chỉ dùng rooms thật từ backend (có tọa độ hợp lệ)
    const roomsWithCoords = (nearbyRooms ?? mapRooms).filter(hasValidCoords);

    const filteredRooms = roomsWithCoords.filter(room => {
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
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Cần quyền truy cập', 'Vui lòng cho phép truy cập vị trí để tìm nhà gần bạn.');
            return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude: lat, longitude: lng } = loc.coords;
        setUserLocation({ lat, lng });
        webViewRef.current?.postMessage(JSON.stringify({ type: 'goToUser', lat, lng }));
        pulseNearMe();

        // Gọi backend search theo tọa độ thực + bán kính
        setIsSearchingNearby(true);
        try {
            const results = await searchService.searchProperties({
                latitude: lat,
                longitude: lng,
                radiusKm: NEAR_ME_RADIUS_KM,
                page: 0,
                size: 50,
            });
            const mapped = (results.content || []).map(searchItemToRoom);
            setNearbyRooms(mapped);
            setSelectedRoom(null);
        } catch (err) {
            console.warn('[Map] Near me search failed:', err);
            Alert.alert('Lỗi', 'Không thể tìm bất động sản gần bạn. Vui lòng thử lại.');
        } finally {
            setIsSearchingNearby(false);
        }
    };

    const handleWebViewMessage = (event: any) => {
        try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === 'markerPress') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const room = filteredRooms.find(r => r.id === msg.id) || null;
                setSelectedRoom(room);
            } else if (msg.type === 'mapPress') {
                setSelectedRoom(null);
            }
        } catch (e) { }
    };

    const formatPrice = (price: number) =>
        price >= 1000000000
            ? `${(price / 1000000000).toFixed(1)}tỷ`
            : `${(price / 1000000).toFixed(0)}tr`;

    const leafletHTML = buildLeafletHTML(
        filteredRooms,
        userLocation?.lat,
        userLocation?.lng,
        NEAR_ME_RADIUS_KM,
    );

    const isNearMeMode = nearbyRooms !== null;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Bản đồ Leaflet */}
            <WebView
                ref={webViewRef}
                key={`map-${activeFilter}-${isNearMeMode ? 'near' : 'all'}-${filteredRooms.length}-${userLocation?.lat ?? 'x'}-${userLocation?.lng ?? 'x'}`}
                style={styles.map}
                source={{ html: leafletHTML }}
                onMessage={handleWebViewMessage}
                javaScriptEnabled
                domStorageEnabled
                originWhitelist={['*']}
                mixedContentMode="always"
            />

            {/* Loading overlay khi đang fetch dữ liệu */}
            {(isLoadingMap || isSearchingNearby) && (
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingCard}>
                        <ActivityIndicator size="small" color="#0066FF" />
                        <Text style={styles.loadingText}>
                            {isSearchingNearby ? `Đang tìm BĐS trong ${NEAR_ME_RADIUS_KM}km...` : 'Đang tải bản đồ...'}
                        </Text>
                    </View>
                </View>
            )}

            {/* Search Bar */}
            <View style={[styles.searchContainer, { top: insets.top + 8 }]}>
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
            <View style={[styles.chipsContainer, { top: insets.top + 64 }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                    {/* Chip xóa Near Me mode */}
                    {isNearMeMode && (
                        <TouchableOpacity
                            style={[styles.chip, styles.chipClear]}
                            onPress={() => {
                                setNearbyRooms(null);
                                setUserLocation(null);
                                setSelectedRoom(null);
                                setMapError(null);
                            }}
                        >
                            <Ionicons name="close" size={12} color="white" />
                            <Text style={[styles.chipText, { color: 'white' }]}>Xóa Near Me</Text>
                        </TouchableOpacity>
                    )}
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
            <Animated.View style={[
                styles.nearMeBtn,
                { bottom: Math.max(insets.bottom, 16) + 144, transform: [{ scale: nearMeAnim }] }
            ]}>
                <TouchableOpacity
                    style={[styles.nearMeBtnInner, isNearMeMode && styles.nearMeBtnActive]}
                    onPress={handleNearMe}
                    activeOpacity={0.8}
                    disabled={isSearchingNearby}
                >
                    <Ionicons name="navigate" size={20} color="white" />
                    <Text style={styles.nearMeText}>{isNearMeMode ? 'Cập nhật' : 'Gần tôi'}</Text>
                </TouchableOpacity>
            </Animated.View>

            {/* Room count badge */}
            <View style={[styles.countBadge, { bottom: Math.max(insets.bottom, 16) + 144 }]}>
                {isNearMeMode
                    ? <Text style={styles.countText}>📍 {filteredRooms.length} BĐS trong {NEAR_ME_RADIUS_KM}km</Text>
                    : <Text style={styles.countText}>{filteredRooms.length} bất động sản</Text>
                }
            </View>

            {/* Empty state khi không có dữ liệu thật (không dùng mock nữa) */}
            {!isLoadingMap && !isSearchingNearby && filteredRooms.length === 0 && (
                <View style={[styles.emptyBadge, { bottom: Math.max(insets.bottom, 16) + 170 }]}>
                    <Ionicons name="location-outline" size={16} color="#888" />
                    <Text style={styles.emptyText}>
                        {mapError
                            ? mapError
                            : isNearMeMode
                            ? 'Không có BĐS nào trong bán kính gần bạn'
                            : 'Chưa có bất động sản có tọa độ để hiển thị trên bản đồ'
                        }
                    </Text>
                </View>
            )}

            {/* Selected Room Bottom Card */}
            {selectedRoom && (
                <TouchableOpacity
                    style={[styles.bottomCard, { bottom: Math.max(insets.bottom, 16) + 4 }]}
                    onPress={() => router.push(`/property/${selectedRoom.id}`)}
                    activeOpacity={0.92}
                >
                    <Image
                        source={{ uri: selectedRoom.images[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400' }}
                        style={styles.cardImage}
                        contentFit="cover"
                    />
                    <View style={styles.cardInfo}>
                        <Text style={styles.cardPrice}>{formatPrice(selectedRoom.price)}/tháng</Text>
                        <Text style={styles.cardTitle} numberOfLines={1}>{selectedRoom.title}</Text>
                        <Text style={styles.cardAddress} numberOfLines={1}>📍 {selectedRoom.address}</Text>
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

    // ── Loading overlay ──
    loadingOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: 'center', alignItems: 'center',
        pointerEvents: 'none' as any,
    },
    loadingCard: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: 'white', borderRadius: 12,
        paddingHorizontal: 18, paddingVertical: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12, shadowRadius: 8, elevation: 6,
    },
    loadingText: { fontSize: 13, color: '#555', fontWeight: '600' },

    // ── Empty state ──
    emptyBadge: {
        position: 'absolute', left: 16, right: 16,
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 10,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
    },
    emptyText: { fontSize: 13, color: '#666', flex: 1, textAlign: 'center' },

    // ── Search Bar ──
    searchContainer: { position: 'absolute', left: 16, right: 16 },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
        borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12, shadowRadius: 8, elevation: 6,
    },
    searchText: { flex: 1, color: '#999', fontSize: 14 },
    filterIconBtn: {
        width: 32, height: 32, borderRadius: 8, backgroundColor: '#EFF4FF',
        justifyContent: 'center', alignItems: 'center',
    },

    // ── Filter Chips ──
    chipsContainer: { position: 'absolute', left: 0, right: 0 },
    chipsScroll: { paddingHorizontal: 16, gap: 8 },
    chip: {
        backgroundColor: 'white', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
        borderWidth: 1.5, borderColor: '#E0E0E0',
        flexDirection: 'row', alignItems: 'center', gap: 4,
    },
    chipActive: { backgroundColor: '#0066FF', borderColor: '#0066FF' },
    chipClear: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
    chipText: { fontSize: 13, fontWeight: '600', color: '#555' },
    chipTextActive: { color: 'white' },

    // ── Near Me button ──
    nearMeBtn: { position: 'absolute', right: 16 },
    nearMeBtnInner: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#0066FF', borderRadius: 24,
        paddingHorizontal: 16, paddingVertical: 10,
        shadowColor: '#0066FF', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
    },
    nearMeBtnActive: { backgroundColor: '#0052CC' },
    nearMeText: { color: 'white', fontWeight: '700', fontSize: 13 },

    // ── Count badge ──
    countBadge: {
        position: 'absolute', left: 16, backgroundColor: 'white',
        borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
    },
    countText: { fontSize: 12, fontWeight: '600', color: '#333' },

    // ── Bottom Card ──
    bottomCard: {
        position: 'absolute', left: 16, right: 16, backgroundColor: 'white',
        borderRadius: 16, flexDirection: 'row', alignItems: 'center',
        overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 12, elevation: 10,
    },
    cardImage: { width: 90, height: CARD_HEIGHT - 20, margin: 10, borderRadius: 10 },
    cardInfo: { flex: 1, paddingVertical: 12, paddingRight: 8 },
    cardPrice: { fontSize: 16, fontWeight: '800', color: '#FF6B35', marginBottom: 4 },
    cardTitle: { fontSize: 13, fontWeight: '600', color: '#1A1A1A', marginBottom: 3 },
    cardAddress: { fontSize: 12, color: '#888', marginBottom: 6 },
    cardMeta: { flexDirection: 'row', gap: 10 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    metaText: { fontSize: 11, color: '#666' },
    cardArrow: { paddingRight: 12 },
    closeCard: {
        position: 'absolute', top: 8, right: 8, width: 22, height: 22,
        borderRadius: 11, backgroundColor: '#F0F0F0',
        justifyContent: 'center', alignItems: 'center',
    },
});
