import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
    View, StyleSheet, Dimensions, StatusBar,
    TouchableOpacity, Text, ScrollView, Animated, Alert, ActivityIndicator,
    FlatList,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { searchService } from '../../services/api/search';
import { Room, PropertySearchItem } from '../../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCompactVND } from '../../utils/formatPrice';
import { useSafeRouter } from '../../hooks/useSafeRouter';

const { height } = Dimensions.get('window');
const CARD_HEIGHT = 130;
const RESULTS_PANEL_MAX_HEIGHT = Math.round(height * 0.42);
const DEFAULT_RADIUS_KM = 5;
const RADIUS_OPTIONS_KM = [1, 3, 5, 10];

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

const getDistanceKm = (
    a: { latitude: number; longitude: number },
    b: { latitude: number; longitude: number },
) => {
    const R = 6371;
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
    const lat1 = (a.latitude * Math.PI) / 180;
    const lat2 = (b.latitude * Math.PI) / 180;
    const x =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

    return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

const getRoomDistanceKm = (room: Room, center: { lat: number; lng: number } | null) => {
    if (!center || !hasValidCoords(room)) return Number.POSITIVE_INFINITY;
    return getDistanceKm(
        { latitude: center.lat, longitude: center.lng },
        { latitude: room.latitude, longitude: room.longitude },
    );
};

const formatDistanceKm = (distanceKm: number) => {
    if (!Number.isFinite(distanceKm)) return null;
    return `${distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)} km`;
};

const getLocationText = (room: Room) =>
    [room.ward, room.district, room.province].filter(Boolean).join(', ') || room.address;

const getTransactionLabel = (transactionType?: string) => {
    if (transactionType === 'FOR_RENT') return 'Cho thuê';
    if (transactionType === 'FOR_SALE') return 'Bán';
    return 'BĐS';
};

// ─── Tạo HTML Leaflet map ──────────────────────────────────────────────────
const buildLeafletHTML = (
    rooms: Room[],
    userLat?: number,
    userLng?: number,
    radiusKm?: number,
    isPickCenterMode = false,
) => {
    const markers = rooms.map(r => ({
        id: r.id,
        lat: r.latitude,
        lng: r.longitude,
        label: formatCompactVND(r.price),
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
    ${isPickCenterMode ? '#map { cursor: crosshair; }' : ''}
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

    map.on('click', function(e) {
      if (selectedId !== null) {
        var prev = document.getElementById('m' + selectedId);
        if (prev) prev.classList.remove('selected');
        selectedId = null;
      }
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'mapPress',
        lat: e && e.latlng ? e.latlng.lat : null,
        lng: e && e.latlng ? e.latlng.lng : null
      }));
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
    const { safePush } = useSafeRouter();
    const insets = useSafeAreaInsets();
    const [mapRooms, setMapRooms] = useState<Room[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [activeFilter, setActiveFilter] = useState('all');
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [nearbyRooms, setNearbyRooms] = useState<Room[] | null>(null); // null = chưa search Near Me
    const [searchRadiusKm, setSearchRadiusKm] = useState(DEFAULT_RADIUS_KM);
    const [isPickingCenter, setIsPickingCenter] = useState(false);
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

    const isNearMeMode = nearbyRooms !== null;
    const resultRooms = isNearMeMode
        ? [...filteredRooms].sort((a, b) => getRoomDistanceKm(a, userLocation) - getRoomDistanceKm(b, userLocation))
        : [];

    const pulseNearMe = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(nearMeAnim, { toValue: 1.12, duration: 800, useNativeDriver: true }),
                Animated.timing(nearMeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            ])
        ).start();
    };

    const searchAroundPoint = async (lat: number, lng: number, radiusKm = searchRadiusKm) => {
        setUserLocation({ lat, lng });
        setNearbyRooms([]);
        setSelectedRoom(null);
        setMapError(null);
        webViewRef.current?.postMessage(JSON.stringify({ type: 'goToUser', lat, lng }));

        setIsSearchingNearby(true);
        try {
            const results = await searchService.searchProperties({
                latitude: lat,
                longitude: lng,
                radiusKm,
                page: 0,
                size: 50,
            });
            setNearbyRooms((results.content || []).map(searchItemToRoom));
        } catch (err) {
            console.warn('[Map] Radius search failed:', err);
            Alert.alert('Lỗi', 'Không thể tìm bất động sản quanh vị trí đã chọn. Vui lòng thử lại.');
        } finally {
            setIsSearchingNearby(false);
        }
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
        pulseNearMe();
        setIsPickingCenter(false);
        await searchAroundPoint(lat, lng);
    };

    const handleWebViewMessage = (event: any) => {
        try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === 'markerPress') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const room = filteredRooms.find(r => r.id === msg.id) || null;
                setSelectedRoom(room);
            } else if (msg.type === 'mapPress') {
                if (
                    isPickingCenter &&
                    Number.isFinite(Number(msg.lat)) &&
                    Number.isFinite(Number(msg.lng))
                ) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setIsPickingCenter(false);
                    searchAroundPoint(Number(msg.lat), Number(msg.lng));
                } else {
                    setSelectedRoom(null);
                }
            }
        } catch (e) { }
    };

    const leafletHTML = buildLeafletHTML(
        filteredRooms,
        userLocation?.lat,
        userLocation?.lng,
        searchRadiusKm,
        isPickingCenter,
    );

    const bottomInset = Math.max(insets.bottom, 16);
    const floatingBottom = isNearMeMode
        ? bottomInset + RESULTS_PANEL_MAX_HEIGHT + 16
        : bottomInset + 144;

    const renderResultItem = ({ item }: { item: Room }) => {
        const distanceText = formatDistanceKm(getRoomDistanceKm(item, userLocation));

        return (
            <TouchableOpacity
                style={styles.resultItem}
                onPress={() => safePush(`/property/${item.id}` as any)}
                activeOpacity={0.88}
            >
                <Image
                    source={{ uri: item.images[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400' }}
                    style={styles.resultImage}
                    contentFit="cover"
                />
                <View style={styles.resultInfo}>
                    <View style={styles.resultTopRow}>
                        <Text style={styles.resultPrice}>{formatCompactVND(item.price)}</Text>
                        {distanceText && (
                            <View style={styles.distanceBadge}>
                                <Ionicons name="navigate-outline" size={11} color="#0066FF" />
                                <Text style={styles.distanceText}>{distanceText}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.resultAddress} numberOfLines={1}>{getLocationText(item)}</Text>
                    <View style={styles.resultMetaRow}>
                        <View style={styles.resultTag}>
                            <Text style={styles.resultTagText}>{getTransactionLabel(item.transactionType)}</Text>
                        </View>
                        <Text style={styles.resultMetaText}>{item.area}m²</Text>
                        {item.bedrooms !== undefined && (
                            <Text style={styles.resultMetaText}>{item.bedrooms} PN</Text>
                        )}
                    </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#A0AEC0" />
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Bản đồ Leaflet */}
            <WebView
                ref={webViewRef}
                key={`map-${activeFilter}-${isNearMeMode ? 'near' : 'all'}-${filteredRooms.length}-${userLocation?.lat ?? 'x'}-${userLocation?.lng ?? 'x'}-${searchRadiusKm}-${isPickingCenter ? 'pick' : 'view'}`}
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
                            {isSearchingNearby ? `Đang tìm BĐS trong ${searchRadiusKm}km...` : 'Đang tải bản đồ...'}
                        </Text>
                    </View>
                </View>
            )}

            {/* Search Bar */}
            <View style={[styles.searchContainer, { top: insets.top + 8 }]}>
                <TouchableOpacity
                    style={styles.searchBar}
                    onPress={() => safePush('/filter' as any)}
                    activeOpacity={0.8}
                >
                    <Ionicons name="search" size={18} color="#666" />
                    <Text style={styles.searchText}>Tìm kiếm khu vực, địa chỉ...</Text>
                    <TouchableOpacity
                        style={styles.filterIconBtn}
                        onPress={() => safePush('/filter' as any)}
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
                                setIsPickingCenter(false);
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

            {/* Radius controls */}
            <View style={[styles.radiusContainer, { top: insets.top + 112 }]}>
                <View style={styles.radiusPill}>
                    <Text style={styles.radiusLabel}>Bán kính</Text>
                    {RADIUS_OPTIONS_KM.map(radius => (
                        <TouchableOpacity
                            key={radius}
                            style={[styles.radiusChip, searchRadiusKm === radius && styles.radiusChipActive]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setSearchRadiusKm(radius);
                                if (userLocation && nearbyRooms !== null && radius !== searchRadiusKm) {
                                    searchAroundPoint(userLocation.lat, userLocation.lng, radius);
                                }
                            }}
                            disabled={isSearchingNearby}
                        >
                            <Text style={[styles.radiusChipText, searchRadiusKm === radius && styles.radiusChipTextActive]}>
                                {radius}km
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <TouchableOpacity
                    style={[styles.pickCenterBtn, isPickingCenter && styles.pickCenterBtnActive]}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedRoom(null);
                        setIsPickingCenter(prev => !prev);
                    }}
                    activeOpacity={0.85}
                    disabled={isSearchingNearby}
                >
                    <Ionicons
                        name={isPickingCenter ? 'radio-button-on' : 'pin-outline'}
                        size={15}
                        color={isPickingCenter ? 'white' : '#0066FF'}
                    />
                    <Text style={[styles.pickCenterText, isPickingCenter && styles.pickCenterTextActive]}>
                        {isPickingCenter ? 'Chạm bản đồ' : 'Chọn điểm'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Near Me Button */}
            <Animated.View style={[
                styles.nearMeBtn,
                { bottom: floatingBottom, transform: [{ scale: nearMeAnim }] }
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
            {!isNearMeMode && (
                <View style={[styles.countBadge, { bottom: floatingBottom }]}>
                    <Text style={styles.countText}>{filteredRooms.length} bất động sản</Text>
                </View>
            )}

            {/* Empty state khi không có dữ liệu thật (không dùng mock nữa) */}
            {!isNearMeMode && !isLoadingMap && !isSearchingNearby && filteredRooms.length === 0 && (
                <View style={[styles.emptyBadge, { bottom: bottomInset + 170 }]}>
                    <Ionicons name="location-outline" size={16} color="#888" />
                    <Text style={styles.emptyText}>
                        {mapError
                            ? mapError
                            : isNearMeMode
                            ? `Không có BĐS nào trong bán kính ${searchRadiusKm}km`
                            : 'Chưa có bất động sản có tọa độ để hiển thị trên bản đồ'
                        }
                    </Text>
                </View>
            )}

            {/* Radius search results */}
            {isNearMeMode && (
                <View style={[styles.resultsPanel, { bottom: bottomInset + 4, maxHeight: RESULTS_PANEL_MAX_HEIGHT }]}>
                    <View style={styles.resultsHandle} />
                    <View style={styles.resultsHeader}>
                        <View style={styles.resultsHeaderText}>
                            <Text style={styles.resultsTitle}>Kết quả gần đây</Text>
                            <Text style={styles.resultsSubtitle}>
                                {resultRooms.length} BĐS trong bán kính {searchRadiusKm}km
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.resultsCloseBtn}
                            onPress={() => {
                                setNearbyRooms(null);
                                setUserLocation(null);
                                setSelectedRoom(null);
                                setMapError(null);
                                setIsPickingCenter(false);
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="close" size={18} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    {resultRooms.length > 0 ? (
                        <FlatList
                            data={resultRooms}
                            keyExtractor={(item) => String(item.id)}
                            renderItem={renderResultItem}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.resultsListContent}
                        />
                    ) : (
                        <View style={styles.resultsEmpty}>
                            <Ionicons name="search-outline" size={24} color="#94A3B8" />
                            <Text style={styles.resultsEmptyTitle}>Không tìm thấy bất động sản trong bán kính này.</Text>
                            <Text style={styles.resultsEmptyText}>Thử tăng bán kính hoặc chọn điểm khác.</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Selected Room Bottom Card */}
            {selectedRoom && !isNearMeMode && (
                <TouchableOpacity
                    style={[styles.bottomCard, { bottom: Math.max(insets.bottom, 16) + 4 }]}
                    onPress={() => safePush(`/property/${selectedRoom.id}` as any)}
                    activeOpacity={0.92}
                >
                    <Image
                        source={{ uri: selectedRoom.images[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400' }}
                        style={styles.cardImage}
                        contentFit="cover"
                    />
                    <View style={styles.cardInfo}>
                        <Text style={styles.cardPrice}>{formatCompactVND(selectedRoom.price)}/tháng</Text>
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

    // ── Radius controls ──
    radiusContainer: {
        position: 'absolute',
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    radiusPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderRadius: 18,
        paddingHorizontal: 10,
        paddingVertical: 7,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    radiusLabel: { fontSize: 12, fontWeight: '700', color: '#555' },
    radiusChip: {
        minWidth: 40,
        alignItems: 'center',
        borderRadius: 14,
        paddingHorizontal: 8,
        paddingVertical: 5,
        backgroundColor: '#F2F6FF',
    },
    radiusChipActive: { backgroundColor: '#0066FF' },
    radiusChipText: { fontSize: 12, fontWeight: '700', color: '#0066FF' },
    radiusChipTextActive: { color: 'white' },
    pickCenterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderRadius: 18,
        paddingHorizontal: 11,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    pickCenterBtnActive: { backgroundColor: '#0066FF' },
    pickCenterText: { fontSize: 12, fontWeight: '700', color: '#0066FF' },
    pickCenterTextActive: { color: 'white' },

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

    // ── Results panel ──
    resultsPanel: {
        position: 'absolute',
        left: 12,
        right: 12,
        backgroundColor: 'white',
        borderRadius: 18,
        paddingTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 12,
    },
    resultsHandle: {
        alignSelf: 'center',
        width: 42,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#CBD5E1',
        marginBottom: 8,
    },
    resultsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingBottom: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E2E8F0',
    },
    resultsHeaderText: { flex: 1, paddingRight: 12 },
    resultsTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
    resultsSubtitle: { marginTop: 2, fontSize: 12, fontWeight: '600', color: '#64748B' },
    resultsCloseBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    resultsListContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        padding: 8,
        gap: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    resultImage: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#E2E8F0' },
    resultInfo: { flex: 1, minWidth: 0 },
    resultTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 3,
    },
    resultPrice: { flex: 1, fontSize: 14, fontWeight: '800', color: '#FF6B35' },
    distanceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#EAF2FF',
        borderRadius: 10,
        paddingHorizontal: 7,
        paddingVertical: 3,
    },
    distanceText: { fontSize: 11, fontWeight: '800', color: '#0066FF' },
    resultTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 3 },
    resultAddress: { fontSize: 12, color: '#64748B', marginBottom: 7 },
    resultMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    resultTag: {
        backgroundColor: '#EEF6FF',
        borderRadius: 8,
        paddingHorizontal: 7,
        paddingVertical: 3,
    },
    resultTagText: { fontSize: 11, fontWeight: '800', color: '#0066FF' },
    resultMetaText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
    resultsEmpty: {
        minHeight: 145,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 22,
        gap: 6,
    },
    resultsEmptyTitle: { fontSize: 14, fontWeight: '800', color: '#334155', textAlign: 'center' },
    resultsEmptyText: { fontSize: 12, fontWeight: '600', color: '#64748B', textAlign: 'center' },

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
