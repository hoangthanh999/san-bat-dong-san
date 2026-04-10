import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Linking,
    Dimensions,
    Alert,
    TextInput,
    Modal,
    Share,
    StatusBar,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, Circle } from 'react-native-maps';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

import { usePropertyStore } from '../../store/propertyStore';
import { useAuthStore } from '../../store/authStore';
import { useReviewStore } from '../../store/reviewStore';
import { useAppointmentStore } from '../../store/appointmentStore';
import { roomService } from '../../services/api/rooms';
import { ImageGallery } from '../../components/property/ImageGallery';
import { ReviewCard } from '../../components/property/ReviewCard';
import { Room } from '../../types';

const { width } = Dimensions.get('window');

const AMENITY_ICONS: Record<string, string> = {
    'Pool': 'water', 'Gym': 'fitness', 'Parking': 'car', 'WiFi': 'wifi',
    'Điều hoà': 'thermometer', 'Bảo vệ': 'shield-checkmark', 'Thang máy': 'arrow-up',
    'Ban công': 'home', 'Bếp': 'restaurant', 'Máy giặt': 'water',
};

const NEARBY_POIS = [
    { icon: '🏫', label: 'Trường quốc tế', distance: '500m' },
    { icon: '🏥', label: 'Bệnh viện Đa khoa', distance: '1.2km' },
    { icon: '🚇', label: 'Metro Tân Cảng', distance: '800m' },
    { icon: '🏪', label: 'VinMart / Co.op', distance: '300m' },
    { icon: '☕', label: 'Coffee & Café', distance: '150m' },
];

export default function PropertyDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { currentRoom, fetchRoomDetail, isLoading, toggleFavorite } = usePropertyStore();
    const { user, isAuthenticated } = useAuthStore();
    const { reviewsByRoom, fetchReviews, addReview, isSubmitting } = useReviewStore();
    const { createAppointment, isSubmitting: bookingSubmitting } = useAppointmentStore();

    const [activeTab, setActiveTab] = useState<'info' | 'reviews'>('info');
    const [isFavorited, setIsFavorited] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [showFullMap, setShowFullMap] = useState(false);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewImages, setReviewImages] = useState<string[]>([]);
    const [bookingDate, setBookingDate] = useState('');
    const [bookingNote, setBookingNote] = useState('');
    const [userDistance, setUserDistance] = useState<string | null>(null);
    const [descExpanded, setDescExpanded] = useState(false);
    const [isTogglingStatus, setIsTogglingStatus] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const roomId = Number(id);
    const room = currentRoom?.id === roomId ? currentRoom : null;
    const reviews = reviewsByRoom[roomId] || [];

    useEffect(() => {
        if (roomId) {
            fetchRoomDetail(roomId);
            fetchReviews(roomId, true);
            fetchDistanceFromUser();
        }
    }, [roomId]);

    // Helper: ghép địa chỉ từ các trường tách riêng của backend
    const getFullAddress = (r: Room) => {
        return [r.addressDetail, r.ward, r.district, r.province].filter(Boolean).join(', ');
    };

    const fetchDistanceFromUser = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
            if (room?.latitude && room?.longitude) {
                const dist = calculateDistance(
                    loc.coords.latitude, loc.coords.longitude,
                    room.latitude, room.longitude
                );
                setUserDistance(dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`);
            }
        } catch (e) { }
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const handleFavorite = async () => {
        if (!isAuthenticated) { router.push('/(auth)/login'); return; }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsFavorited(prev => !prev);
        await toggleFavorite(roomId);
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `${room?.title}\n${room ? getFullAddress(room) : ''}\nGiá: ${formatPrice(room?.price || 0)}/tháng\n\nXem thêm trên HomeSwipe`,
                title: room?.title,
            });
        } catch (e) { }
    };

    const handleCall = () => {
        if (!isAuthenticated) { router.push('/(auth)/login'); return; }
        if (room?.landlordInfo?.phone) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Linking.openURL(`tel:${room.landlordInfo.phone}`);
        } else {
            Alert.alert('Thông báo', 'Số điện thoại chủ nhà chưa được cập nhật.');
        }
    };

    const handleChat = () => {
        if (!isAuthenticated) { router.push('/(auth)/login'); return; }
        router.push(`/chat/${room?.landlordInfo?.id}`);
    };

    const handleNavigate = () => {
        if (!room?.latitude || !room?.longitude) return;
        const { latitude, longitude } = room;

        Alert.alert(
            'Chỉ đường đến đây',
            getFullAddress(room),
            [
                { text: 'Bản đồ trong app', onPress: () => setShowFullMap(true) },
                { text: 'Google Maps', onPress: () => openGoogleMaps(latitude, longitude) },
                ...(Platform.OS === 'ios' ? [{ text: 'Apple Maps', onPress: () => Linking.openURL(`maps://app?daddr=${latitude},${longitude}`) }] : []),
                { text: 'Waze', onPress: () => openWaze(latitude, longitude) },
                { text: 'Sao chép địa chỉ', onPress: () => copyAddress() },
                { text: 'Huỷ', style: 'cancel' },
            ]
        );
    };

    const openGoogleMaps = (lat: number, lng: number) => {
        const url = Platform.select({
            ios: `comgooglemaps://?daddr=${lat},${lng}`,
            android: `google.navigation:q=${lat},${lng}`,
        }) || `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

        Linking.canOpenURL(url).then(supported => {
            Linking.openURL(supported ? url : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
        });
    };

    const openWaze = (lat: number, lng: number) => {
        Linking.openURL(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`);
    };

    const copyAddress = () => {
        // Clipboard not installed, just show alert
        Alert.alert('Đã sao chép', room ? getFullAddress(room) : '');
    };

    const handleSubmitReview = async () => {
        if (!reviewComment.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập nội dung đánh giá'); return; }
        try {
            await addReview(roomId, reviewRating, reviewComment, reviewImages.length > 0 ? reviewImages : undefined);
            setShowReviewModal(false);
            setReviewComment('');
            setReviewRating(5);
            setReviewImages([]);
            Alert.alert('Thành công', 'Cảm ơn bạn đã đánh giá!');
        } catch (e: any) {
            Alert.alert('Lỗi', e.message || 'Gửi đánh giá thất bại');
        }
    };

    const pickReviewImages = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
            selectionLimit: 5 - reviewImages.length,
        });
        if (!result.canceled) {
            setReviewImages(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, 5));
        }
    };

    const handleBooking = async () => {
        if (!isAuthenticated) { router.push('/(auth)/login'); return; }
        if (!bookingDate.trim()) { Alert.alert('Lỗi', 'Vui lòng chọn ngày xem phòng'); return; }
        try {
            await createAppointment({ roomId, scheduledAt: bookingDate, note: bookingNote });
            setShowBookingModal(false);
            setBookingDate('');
            setBookingNote('');
            Alert.alert('Thành công', '🎉 Đặt lịch xem phòng thành công! Chủ nhà sẽ liên hệ xác nhận.');
        } catch (e: any) {
            Alert.alert('Lỗi', e.message || 'Đặt lịch thất bại');
        }
    };

    const formatPrice = (price: number) => {
        if (price >= 1000000000) return `${(price / 1000000000).toFixed(1)} tỷ`;
        return `${(price / 1000000).toFixed(0)} triệu`;
    };

    // Check if current user is the owner
    const isOwner = user && room && room.landlordInfo && user.id === room.landlordInfo.id;

    const handleToggleStatus = async () => {
        if (!room) return;
        const newStatus = room.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        const label = newStatus === 'ACTIVE' ? 'hiện' : 'ẩn';
        Alert.alert(
            `${newStatus === 'ACTIVE' ? 'Hiện' : 'Ẩn'} tin đăng`,
            `Bạn có chắc muốn ${label} tin "${room.title}"?`,
            [
                { text: 'Huỷ', style: 'cancel' },
                {
                    text: `${newStatus === 'ACTIVE' ? 'Hiện' : 'Ẩn'} tin`,
                    onPress: async () => {
                        setIsTogglingStatus(true);
                        try {
                            await roomService.updateStatus(room.id, newStatus);
                            fetchRoomDetail(room.id); // refresh
                            Alert.alert('Thành công', `Tin đã được ${label}`);
                        } catch (e: any) {
                            Alert.alert('Lỗi', e.message || `Không thể ${label} tin`);
                        } finally {
                            setIsTogglingStatus(false);
                        }
                    },
                },
            ],
        );
    };

    const handleDeleteProperty = () => {
        if (!room) return;
        Alert.alert(
            'Xoá tin đăng',
            `Bạn có chắc muốn xoá vĩnh viễn tin "${room.title}"? Hành động này không thể hoàn tác.`,
            [
                { text: 'Huỷ', style: 'cancel' },
                {
                    text: 'Xoá vĩnh viễn',
                    style: 'destructive',
                    onPress: async () => {
                        setIsDeleting(true);
                        try {
                            await roomService.deleteRoom(room.id);
                            Alert.alert('Thành công', 'Tin đăng đã được xoá', [
                                { text: 'OK', onPress: () => router.back() },
                            ]);
                        } catch (e: any) {
                            Alert.alert('Lỗi', e.message || 'Không thể xoá tin');
                        } finally {
                            setIsDeleting(false);
                        }
                    },
                },
            ],
        );
    };

    if (isLoading || !room) {
        return (
            <View style={styles.loadingContainer}>
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator size="large" color="#0066FF" />
                <Text style={styles.loadingText}>Đang tải thông tin...</Text>
            </View>
        );
    }

    const averageRating = room.averageRating || 0;
    const shortDesc = room.description?.slice(0, 150);
    const isLongDesc = (room.description?.length || 0) > 150;

    return (
        <View style={styles.wrapper}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="light-content" />

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Image Gallery */}
                <View style={{ position: 'relative' }}>
                    <ImageGallery
                        images={room.images.length > 0 ? room.images : ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800']}
                        compact
                    />
                    <View style={styles.galleryOverlayTop}>
                        <TouchableOpacity style={styles.overlayBtn} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={22} color="white" />
                        </TouchableOpacity>
                        <View style={styles.overlayRightBtns}>
                            <TouchableOpacity style={styles.overlayBtn} onPress={handleShare}>
                                <Ionicons name="share-social-outline" size={22} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.overlayBtn} onPress={handleFavorite}>
                                <Ionicons
                                    name={isFavorited ? 'heart' : 'heart-outline'}
                                    size={22}
                                    color={isFavorited ? '#FF4757' : 'white'}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View style={styles.content}>
                    {/* Price & Status */}
                    <View style={styles.priceRow}>
                        <View>
                            <Text style={styles.price}>{formatPrice(room.price)}</Text>
                            <Text style={styles.priceUnit}>đồng / tháng</Text>
                        </View>
                        <View style={[styles.statusBadge, room.status === 'ACTIVE' ? styles.statusActive : styles.statusOther]}>
                            <Text style={styles.statusText}>
                                {room.status === 'ACTIVE' ? '✅ Còn phòng' : room.status === 'FULL' ? '❌ Hết phòng' : room.status}
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.title}>{room.title}</Text>

                    {/* Address row with navigate */}
                    <TouchableOpacity style={styles.addressRow} onPress={handleNavigate} activeOpacity={0.7}>
                        <Ionicons name="location" size={16} color="#0066FF" />
                        <Text style={styles.addressText} numberOfLines={2}>{getFullAddress(room)}</Text>
                        <View style={styles.directionChip}>
                            <Ionicons name="navigate-outline" size={12} color="#0066FF" />
                            <Text style={styles.directionText}>Chỉ đường</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Distance badge */}
                    {userDistance && (
                        <View style={styles.distanceBadge}>
                            <Ionicons name="walk-outline" size={14} color="#0066FF" />
                            <Text style={styles.distanceText}>📏 {userDistance} từ bạn</Text>
                        </View>
                    )}

                    {/* Rating */}
                    <View style={styles.ratingRow}>
                        <View style={styles.stars}>
                            {[1, 2, 3, 4, 5].map(s => (
                                <Ionicons key={s} name={s <= Math.round(averageRating) ? 'star' : 'star-outline'} size={14} color="#FFB800" />
                            ))}
                        </View>
                        <Text style={styles.ratingText}>{averageRating.toFixed(1)} ({room.totalReviews} đánh giá)</Text>
                    </View>

                    {/* Quick Stats */}
                    <View style={styles.statsGrid}>
                        {room.area && (
                            <View style={styles.statItem}>
                                <Ionicons name="resize-outline" size={22} color="#0066FF" />
                                <Text style={styles.statValue}>{room.area} m²</Text>
                                <Text style={styles.statLabel}>Diện tích</Text>
                            </View>
                        )}
                        {room.numBedrooms !== undefined && (
                            <View style={styles.statItem}>
                                <Ionicons name="bed-outline" size={22} color="#0066FF" />
                                <Text style={styles.statValue}>{room.numBedrooms}</Text>
                                <Text style={styles.statLabel}>Phòng ngủ</Text>
                            </View>
                        )}
                        {room.numBathrooms !== undefined && (
                            <View style={styles.statItem}>
                                <Ionicons name="water-outline" size={22} color="#0066FF" />
                                <Text style={styles.statValue}>{room.numBathrooms}</Text>
                                <Text style={styles.statLabel}>Phòng tắm</Text>
                            </View>
                        )}
                        {room.deposit > 0 && (
                            <View style={styles.statItem}>
                                <Ionicons name="cash-outline" size={22} color="#0066FF" />
                                <Text style={styles.statValue}>{formatPrice(room.deposit)}</Text>
                                <Text style={styles.statLabel}>Đặt cọc</Text>
                            </View>
                        )}
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabBar}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'info' && styles.tabActive]}
                            onPress={() => setActiveTab('info')}
                        >
                            <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>Thông tin</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'reviews' && styles.tabActive]}
                            onPress={() => setActiveTab('reviews')}
                        >
                            <Text style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}>
                                Đánh giá ({room.totalReviews})
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {activeTab === 'info' && (
                        <>
                            {/* Description */}
                            {room.description && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>📝 Mô tả</Text>
                                    <Text style={styles.description}>
                                        {descExpanded ? room.description : shortDesc}
                                        {isLongDesc && !descExpanded && '...'}
                                    </Text>
                                    {isLongDesc && (
                                        <TouchableOpacity onPress={() => setDescExpanded(!descExpanded)}>
                                            <Text style={styles.seeMoreBtn}>
                                                {descExpanded ? 'Thu gọn ▲' : 'Xem thêm ▼'}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}

                            {/* Property Details */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>🏷️ Chi tiết</Text>
                                <View style={styles.detailsGrid}>
                                    <DetailRow label="Loại phòng" value={room.rentalType === 'WHOLE' ? 'Nguyên căn' : 'Phòng chia sẻ'} />
                                    {room.furnitureStatus && <DetailRow label="Nội thất" value={room.furnitureStatus} />}
                                    {room.direction && <DetailRow label="Hướng" value={room.direction} />}
                                    {room.floorNumber && <DetailRow label="Tầng" value={`Tầng ${room.floorNumber}`} />}
                                    {room.genderConstraint && (
                                        <DetailRow
                                            label="Đối tượng"
                                            value={room.genderConstraint === 'MALE_ONLY' ? 'Nam' : room.genderConstraint === 'FEMALE_ONLY' ? 'Nữ' : 'Tất cả'}
                                        />
                                    )}
                                    {room.capacity && <DetailRow label="Sức chứa" value={`${room.capacity} người`} />}
                                </View>
                            </View>

                            {/* Amenities */}
                            {room.amenities && room.amenities.length > 0 && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>✨ Tiện ích</Text>
                                    <View style={styles.amenitiesGrid}>
                                        {room.amenities.map((amenity, index) => (
                                            <View key={index} style={styles.amenityItem}>
                                                <Ionicons
                                                    name={(AMENITY_ICONS[amenity] || 'checkmark-circle') as any}
                                                    size={18}
                                                    color="#0066FF"
                                                />
                                                <Text style={styles.amenityText}>{amenity}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Map Section */}
                            {room.latitude && room.longitude && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>📍 Vị trí</Text>

                                    {/* Mini Map */}
                                    <TouchableOpacity
                                        style={styles.mapContainer}
                                        onPress={() => setShowFullMap(true)}
                                        activeOpacity={0.9}
                                    >
                                        <MapView
                                            style={styles.map}
                                            provider={PROVIDER_GOOGLE}
                                            initialRegion={{
                                                latitude: room.latitude,
                                                longitude: room.longitude,
                                                latitudeDelta: 0.005,
                                                longitudeDelta: 0.005,
                                            }}
                                            scrollEnabled={false}
                                            zoomEnabled={false}
                                            pitchEnabled={false}
                                            rotateEnabled={false}
                                        >
                                            <Marker coordinate={{
                                                latitude: room.latitude,
                                                longitude: room.longitude,
                                            }} />
                                        </MapView>
                                        <View style={styles.mapExpandBtn}>
                                            <Ionicons name="expand-outline" size={16} color="#0066FF" />
                                            <Text style={styles.mapExpandText}>Xem bản đồ đầy đủ</Text>
                                        </View>
                                    </TouchableOpacity>

                                    {/* Address row */}
                                    <TouchableOpacity style={styles.addressNavRow} onPress={handleNavigate}>
                                        <Ionicons name="location" size={16} color="#0066FF" />
                                        <Text style={styles.fullAddress} numberOfLines={2}>{getFullAddress(room)}</Text>
                                        <View style={styles.directionBtn}>
                                            <Ionicons name="navigate" size={14} color="white" />
                                            <Text style={styles.directionBtnText}>Chỉ đường</Text>
                                        </View>
                                    </TouchableOpacity>

                                    {/* Nearby POI */}
                                    <View style={styles.poiSection}>
                                        <Text style={styles.poiTitle}>Tiện ích gần đó</Text>
                                        {NEARBY_POIS.map((poi, i) => (
                                            <View key={i} style={styles.poiItem}>
                                                <Text style={styles.poiIcon}>{poi.icon}</Text>
                                                <Text style={styles.poiLabel}>{poi.label}</Text>
                                                <Text style={styles.poiDistance}>{poi.distance}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Landlord Card */}
                            {room.landlordInfo && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>👤 Thông tin chủ nhà</Text>
                                <TouchableOpacity
                                    style={styles.landlordCard}
                                    onPress={() => router.push(`/landlord-profile?slug=${(room.landlordInfo as any)?.slug || ''}&landlordId=${room.landlordInfo?.id}` as any)}
                                    activeOpacity={0.7}
                                >
                                    <Image
                                        source={{ uri: room.landlordInfo.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(room.landlordInfo.fullName || 'User')}&background=0066FF&color=fff` }}
                                        style={styles.landlordAvatar}
                                    />
                                    <View style={styles.landlordInfo}>
                                        <Text style={styles.landlordName}>{room.landlordInfo.fullName}</Text>
                                        <View style={styles.verifiedBadge}>
                                            <Ionicons name="checkmark-circle" size={14} color="#0066FF" />
                                            <Text style={styles.verifiedText}>Đã xác minh</Text>
                                        </View>
                                        <Text style={{ fontSize: 12, color: '#0066FF', marginTop: 2 }}>Xem hồ sơ →</Text>
                                    </View>
                                    <View style={styles.landlordBtns}>
                                        <TouchableOpacity style={styles.landlordCallBtn} onPress={handleCall}>
                                            <Ionicons name="call" size={18} color="white" />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.landlordChatBtn} onPress={handleChat}>
                                            <Ionicons name="chatbubble-ellipses" size={18} color="#0066FF" />
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            </View>
                            )}

                            {/* Owner Management Section */}
                            {isOwner && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>⚙️ Quản lý tin đăng</Text>
                                    <View style={{ gap: 10 }}>
                                        <TouchableOpacity
                                            style={[styles.ownerActionBtn, { backgroundColor: room.status === 'ACTIVE' ? '#FFF3E0' : '#E8F5E9' }]}
                                            onPress={handleToggleStatus}
                                            disabled={isTogglingStatus}
                                        >
                                            {isTogglingStatus ? (
                                                <ActivityIndicator size="small" color="#999" />
                                            ) : (
                                                <>
                                                    <Ionicons
                                                        name={room.status === 'ACTIVE' ? 'eye-off-outline' : 'eye-outline'}
                                                        size={20}
                                                        color={room.status === 'ACTIVE' ? '#E65100' : '#2E7D32'}
                                                    />
                                                    <Text style={[
                                                        styles.ownerActionText,
                                                        { color: room.status === 'ACTIVE' ? '#E65100' : '#2E7D32' },
                                                    ]}>
                                                        {room.status === 'ACTIVE' ? 'Ẩn tin đăng' : 'Hiện tin đăng'}
                                                    </Text>
                                                </>
                                            )}
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.ownerActionBtn, { backgroundColor: '#FFEBEE' }]}
                                            onPress={handleDeleteProperty}
                                            disabled={isDeleting}
                                        >
                                            {isDeleting ? (
                                                <ActivityIndicator size="small" color="#EF4444" />
                                            ) : (
                                                <>
                                                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                                    <Text style={[styles.ownerActionText, { color: '#EF4444' }]}>Xoá tin đăng</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </>
                    )}

                    {activeTab === 'reviews' && (
                        <View style={styles.section}>
                            <View style={styles.reviewSummary}>
                                <Text style={styles.bigRating}>{averageRating.toFixed(1)}</Text>
                                <View>
                                    <View style={styles.stars}>
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <Ionicons key={s} name={s <= Math.round(averageRating) ? 'star' : 'star-outline'} size={18} color="#FFB800" />
                                        ))}
                                    </View>
                                    <Text style={styles.reviewCount}>{room.totalReviews} đánh giá</Text>
                                </View>
                            </View>

                            {isAuthenticated && (
                                <TouchableOpacity style={styles.writeReviewBtn} onPress={() => setShowReviewModal(true)}>
                                    <Ionicons name="create-outline" size={18} color="#0066FF" />
                                    <Text style={styles.writeReviewText}>Viết đánh giá</Text>
                                </TouchableOpacity>
                            )}

                            {reviews.length === 0 ? (
                                <View style={styles.emptyReviews}>
                                    <Ionicons name="chatbubbles-outline" size={48} color="#CCC" />
                                    <Text style={styles.emptyText}>Chưa có đánh giá nào</Text>
                                </View>
                            ) : (
                                reviews.map(review => (
                                    <ReviewCard key={review.id} review={review} isMyReview={user?.id === review.userId} />
                                ))
                            )}
                        </View>
                    )}

                    <View style={{ height: 120 }} />
                </View>
            </ScrollView>

            {/* Bottom Action Bar */}
            <View style={styles.bottomBar}>
                <View style={styles.bottomPriceInfo}>
                    <Text style={styles.bottomPrice}>{formatPrice(room.price)}</Text>
                    <Text style={styles.bottomUnit}>/tháng</Text>
                </View>
                {/* If user is the landlord of this room: show Boost + Edit */}
                {user?.id === room.landlordInfo?.id ? (
                    <View style={styles.bottomBtns}>
                        <TouchableOpacity
                            style={styles.scheduleBtn}
                            onPress={() => router.push(`/packages/boost/${roomId}` as any)}
                        >
                            <Ionicons name="rocket-outline" size={18} color="#0066FF" />
                            <Text style={styles.scheduleBtnText}>Boost tin</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.chatBtn} onPress={() => router.push(`/edit-profile` as any)}>
                            <Ionicons name="create-outline" size={18} color="white" />
                            <Text style={styles.chatBtnText}>Sửa thông tin</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.bottomBtns}>
                        <TouchableOpacity style={styles.scheduleBtn} onPress={() => {
                            if (!isAuthenticated) { router.push('/(auth)/login'); return; }
                            setShowBookingModal(true);
                        }}>
                            <Ionicons name="calendar-outline" size={18} color="#0066FF" />
                            <Text style={styles.scheduleBtnText}>Đặt lịch</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.chatBtn} onPress={handleChat}>
                            <Ionicons name="chatbubble-ellipses" size={18} color="white" />
                            <Text style={styles.chatBtnText}>Chat ngay</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>


            {/* Full Map Modal */}
            <Modal visible={showFullMap} animationType="slide" onRequestClose={() => setShowFullMap(false)}>
                <View style={styles.fullMapContainer}>
                    <StatusBar barStyle="dark-content" />
                    <View style={styles.fullMapHeader}>
                        <TouchableOpacity onPress={() => setShowFullMap(false)} style={styles.fullMapBack}>
                            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                        </TouchableOpacity>
                        <Text style={styles.fullMapTitle}>Vị trí bất động sản</Text>
                        <View style={{ width: 40 }} />
                    </View>
                    <MapView
                        style={{ flex: 1 }}
                        provider={PROVIDER_GOOGLE}
                        initialRegion={{
                            latitude: room.latitude || 10.762622,
                            longitude: room.longitude || 106.660172,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        }}
                        showsUserLocation
                        showsMyLocationButton
                    >
                        {room.latitude && room.longitude && (
                            <>
                                <Marker
                                    coordinate={{ latitude: room.latitude, longitude: room.longitude }}
                                    title={room.title}
                                    description={formatPrice(room.price) + '/tháng'}
                                />
                                <Circle
                                    center={{ latitude: room.latitude, longitude: room.longitude }}
                                    radius={500}
                                    fillColor="rgba(0, 102, 255, 0.08)"
                                    strokeColor="rgba(0, 102, 255, 0.3)"
                                    strokeWidth={2}
                                />
                            </>
                        )}
                    </MapView>
                    <View style={styles.fullMapBottom}>
                        <TouchableOpacity style={styles.fullMapNavBtn} onPress={handleNavigate}>
                            <Ionicons name="navigate" size={20} color="white" />
                            <Text style={styles.fullMapNavText}>🧭 Chỉ đường đến đây</Text>
                        </TouchableOpacity>
                        {userDistance && (
                            <Text style={styles.fullMapDistance}>📏 {userDistance} từ bạn</Text>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Review Modal */}
            <Modal visible={showReviewModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Viết đánh giá</Text>
                            <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalLabel}>Đánh giá của bạn</Text>
                        <View style={styles.starPicker}>
                            {[1, 2, 3, 4, 5].map(star => (
                                <TouchableOpacity key={star} onPress={() => setReviewRating(star)}>
                                    <Ionicons name={star <= reviewRating ? 'star' : 'star-outline'} size={36} color={star <= reviewRating ? '#FFB800' : '#CCC'} />
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={styles.modalLabel}>Nhận xét</Text>
                        <TextInput
                            style={styles.reviewTextInput}
                            placeholder="Chia sẻ trải nghiệm của bạn..."
                            multiline
                            numberOfLines={4}
                            value={reviewComment}
                            onChangeText={setReviewComment}
                        />
                        <Text style={styles.modalLabel}>Thêm ảnh thực tế (tối đa 5)</Text>
                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                            {reviewImages.map((uri, i) => (
                                <View key={i} style={{ position: 'relative' }}>
                                    <Image source={{ uri }} style={{ width: 64, height: 64, borderRadius: 8 }} />
                                    <TouchableOpacity
                                        style={{ position: 'absolute', top: -6, right: -6, backgroundColor: '#EF4444', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}
                                        onPress={() => setReviewImages(prev => prev.filter((_, idx) => idx !== i))}
                                    >
                                        <Ionicons name="close" size={12} color="white" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                            {reviewImages.length < 5 && (
                                <TouchableOpacity
                                    style={{ width: 64, height: 64, borderRadius: 8, borderWidth: 2, borderColor: '#E0E0E0', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' }}
                                    onPress={pickReviewImages}
                                >
                                    <Ionicons name="camera-outline" size={24} color="#0066FF" />
                                </TouchableOpacity>
                            )}
                        </View>
                        <TouchableOpacity
                            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                            onPress={handleSubmitReview}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>Gửi đánh giá</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Booking Modal */}
            <Modal visible={showBookingModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>📅 Đặt lịch xem phòng</Text>
                            <TouchableOpacity onPress={() => setShowBookingModal(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalLabel}>Thời gian muốn xem (DD/MM/YYYY HH:MM)</Text>
                        <TextInput
                            style={styles.bookingInput}
                            placeholder="VD: 15/03/2026 10:00"
                            value={bookingDate}
                            onChangeText={setBookingDate}
                        />
                        <Text style={styles.modalLabel}>Ghi chú (tuỳ chọn)</Text>
                        <TextInput
                            style={styles.reviewTextInput}
                            placeholder="Thêm ghi chú cho chủ nhà..."
                            multiline
                            numberOfLines={3}
                            value={bookingNote}
                            onChangeText={setBookingNote}
                        />
                        <TouchableOpacity
                            style={[styles.submitBtn, bookingSubmitting && styles.submitBtnDisabled]}
                            onPress={handleBooking}
                            disabled={bookingSubmitting}
                        >
                            {bookingSubmitting ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>Xác nhận đặt lịch</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: { flex: 1, backgroundColor: '#F8F9FA' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: '#666', fontSize: 14 },
    container: { flex: 1 },
    content: { padding: 16 },
    galleryOverlayTop: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 40,
        left: 12, right: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    overlayBtn: {
        backgroundColor: 'rgba(0,0,0,0.4)',
        width: 40, height: 40, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center',
    },
    overlayRightBtns: { flexDirection: 'row', gap: 8 },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 4 },
    price: { fontSize: 26, fontWeight: '800', color: '#FF6B35' },
    priceUnit: { fontSize: 13, color: '#888', marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusActive: { backgroundColor: '#E8F5E9' },
    statusOther: { backgroundColor: '#FFF3E0' },
    statusText: { fontSize: 12, fontWeight: '600', color: '#2E7D32' },
    title: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginTop: 8, marginBottom: 8 },
    addressRow: {
        flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8,
        backgroundColor: '#F0F5FF', padding: 10, borderRadius: 10,
    },
    addressText: { flex: 1, fontSize: 13, color: '#555' },
    directionChip: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        backgroundColor: '#E8F0FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
    },
    directionText: { fontSize: 11, color: '#0066FF', fontWeight: '600' },
    distanceBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: '#EFF4FF', paddingHorizontal: 10, paddingVertical: 6,
        borderRadius: 20, alignSelf: 'flex-start', marginBottom: 8,
    },
    distanceText: { fontSize: 13, color: '#0066FF', fontWeight: '600' },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
    stars: { flexDirection: 'row', gap: 2 },
    ratingText: { fontSize: 13, color: '#666' },
    statsGrid: {
        flexDirection: 'row', justifyContent: 'space-around',
        backgroundColor: 'white', borderRadius: 14, padding: 16, marginBottom: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    },
    statItem: { alignItems: 'center', gap: 4 },
    statValue: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
    statLabel: { fontSize: 11, color: '#888' },
    tabBar: {
        flexDirection: 'row', backgroundColor: '#F0F0F0',
        borderRadius: 10, padding: 4, marginBottom: 20,
    },
    tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
    tabActive: {
        backgroundColor: 'white',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
    },
    tabText: { fontSize: 14, color: '#888' },
    tabTextActive: { fontWeight: '700', color: '#1A1A1A' },
    section: { marginBottom: 22 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
    description: { fontSize: 14, color: '#555', lineHeight: 22 },
    seeMoreBtn: { color: '#0066FF', fontWeight: '600', marginTop: 6, fontSize: 14 },
    detailsGrid: {
        backgroundColor: 'white', borderRadius: 12, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    },
    detailRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
    },
    detailLabel: { fontSize: 14, color: '#888' },
    detailValue: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
    amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    amenityItem: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#F0F5FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    },
    amenityText: { fontSize: 13, color: '#333' },
    mapContainer: { borderRadius: 14, overflow: 'hidden', marginBottom: 10, height: 190 },
    map: { flex: 1 },
    mapExpandBtn: {
        position: 'absolute', bottom: 10, right: 10,
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'white', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
    },
    mapExpandText: { color: '#0066FF', fontSize: 12, fontWeight: '600' },
    addressNavRow: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        padding: 12, backgroundColor: '#F8FAFF', borderRadius: 10, marginBottom: 14,
    },
    fullAddress: { flex: 1, fontSize: 13, color: '#444' },
    directionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#0066FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
    },
    directionBtnText: { color: 'white', fontSize: 12, fontWeight: '700' },
    poiSection: {
        backgroundColor: 'white', borderRadius: 12, padding: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    },
    poiTitle: { fontSize: 13, fontWeight: '700', color: '#888', marginBottom: 10 },
    poiItem: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
        borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
    },
    poiIcon: { fontSize: 18, marginRight: 10 },
    poiLabel: { flex: 1, fontSize: 13, color: '#333' },
    poiDistance: { fontSize: 13, color: '#0066FF', fontWeight: '600' },
    landlordCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'white', borderRadius: 14, padding: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    },
    landlordAvatar: { width: 52, height: 52, borderRadius: 26 },
    landlordInfo: { flex: 1, marginLeft: 12 },
    landlordName: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
    verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    verifiedText: { fontSize: 12, color: '#0066FF' },
    landlordBtns: { flexDirection: 'row', gap: 8 },
    landlordCallBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0066FF', justifyContent: 'center', alignItems: 'center' },
    landlordChatBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F0FF', justifyContent: 'center', alignItems: 'center' },
    reviewSummary: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
    bigRating: { fontSize: 48, fontWeight: '800', color: '#1A1A1A' },
    reviewCount: { fontSize: 13, color: '#888', marginTop: 4 },
    writeReviewBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#E8F0FF', padding: 12, borderRadius: 10, marginBottom: 16, justifyContent: 'center',
    },
    writeReviewText: { color: '#0066FF', fontWeight: '600', fontSize: 14 },
    emptyReviews: { alignItems: 'center', paddingVertical: 32, gap: 8 },
    emptyText: { color: '#999', fontSize: 14 },
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'white', flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingHorizontal: 16,
        paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 12,
        borderTopWidth: 1, borderTopColor: '#F0F0F0',
        shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 10,
    },
    bottomPriceInfo: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
    bottomPrice: { fontSize: 20, fontWeight: '700', color: '#FF6B35' },
    bottomUnit: { fontSize: 12, color: '#888' },
    bottomBtns: { flexDirection: 'row', gap: 10 },
    scheduleBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        borderWidth: 1.5, borderColor: '#0066FF', borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 10,
    },
    scheduleBtnText: { color: '#0066FF', fontWeight: '600', fontSize: 14 },
    chatBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#0066FF', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10,
    },
    chatBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
    // Full Map Modal
    fullMapContainer: { flex: 1, backgroundColor: 'white' },
    fullMapHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 54 : 16, paddingBottom: 12,
        backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    },
    fullMapBack: { width: 40, height: 40, justifyContent: 'center' },
    fullMapTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
    fullMapBottom: {
        padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16,
        backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F0F0F0', gap: 8,
    },
    fullMapNavBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: '#0066FF', borderRadius: 14, paddingVertical: 14,
        shadowColor: '#0066FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
    },
    fullMapNavText: { color: 'white', fontWeight: '700', fontSize: 16 },
    fullMapDistance: { textAlign: 'center', color: '#666', fontSize: 14 },
    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContainer: {
        backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
    modalLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
    starPicker: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 20 },
    reviewTextInput: {
        borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, padding: 12,
        fontSize: 14, minHeight: 100, textAlignVertical: 'top', marginBottom: 20,
    },
    bookingInput: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, padding: 12, fontSize: 14, marginBottom: 16 },
    submitBtn: { backgroundColor: '#0066FF', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    submitBtnDisabled: { backgroundColor: '#AAC8FF' },
    submitBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
    ownerActionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12,
    },
    ownerActionText: { fontSize: 15, fontWeight: '600' },
});
