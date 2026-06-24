import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Linking, Dimensions, Alert, TextInput, Modal, Share,
    StatusBar, Platform, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';   // ✅ Thay react-native-maps
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePropertyStore } from '../../store/propertyStore';
import { useAuthStore } from '../../store/authStore';
import { useReviewStore } from '../../store/reviewStore';
import { useCommentStore } from '../../store/commentStore';
import { useAppointmentStore } from '../../store/appointmentStore';
import { useInteractionStore } from '../../store/interactionStore';
import { roomService } from '../../services/api/rooms';
import { ImageGallery } from '../../components/property/ImageGallery';
import { ReviewCard } from '../../components/property/ReviewCard';
import { CommentResponse, Room } from '../../types';
import { formatCompactVND } from '../../utils/formatPrice';
import { useSafeRouter } from '../../hooks/useSafeRouter';

const { width } = Dimensions.get('window');

// ✅ Tạo HTML cho Leaflet map (OpenStreetMap - miễn phí, không cần API Key)
const buildLeafletHtml = (
    lat: number,
    lng: number,
    title: string,
    showCircle = false,
    zoom = 15
) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { height: 100%; width: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: true, attributionControl: false })
               .setView([${lat}, ${lng}], ${zoom});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    var icon = L.divIcon({
      html: '<div style="background:#0066FF;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      className: ''
    });

    L.marker([${lat}, ${lng}], { icon: icon })
     .addTo(map)
     .bindPopup('<b>${title.replace(/'/g, "\\'")}</b>')
     .openPopup();

    ${showCircle ? `
    L.circle([${lat}, ${lng}], {
      radius: 500,
      color: 'rgba(0,102,255,0.4)',
      fillColor: 'rgba(0,102,255,0.08)',
      fillOpacity: 1,
      weight: 2
    }).addTo(map);
    ` : ''}
  </script>
</body>
</html>
`;

// ✅ Map icon động theo tên tiện ích từ DB
const getAmenityIcon = (name: string): string => {
    const n = name.toLowerCase();
    if (n.includes('wifi') || n.includes('wi-fi') || n.includes('internet')) return 'wifi';
    if (n.includes('điều hòa') || n.includes('điều hoà') || n.includes('máy lạnh')) return 'thermometer';
    if (n.includes('máy giặt')) return 'water';
    if (n.includes('bãi đỗ') || n.includes('parking') || n.includes('xe')) return 'car';
    if (n.includes('hồ bơi') || n.includes('pool')) return 'water';
    if (n.includes('gym') || n.includes('thể dục')) return 'fitness';
    if (n.includes('thang máy') || n.includes('elevator')) return 'arrow-up';
    if (n.includes('bảo vệ') || n.includes('security')) return 'shield-checkmark';
    if (n.includes('camera')) return 'camera';
    if (n.includes('ban công') || n.includes('balcony')) return 'home';
    if (n.includes('bếp') || n.includes('kitchen')) return 'restaurant';
    if (n.includes('sân vườn') || n.includes('garden')) return 'leaf';
    return 'checkmark-circle';
};

const NEARBY_POIS = [
    { icon: '🏫', label: 'Trường quốc tế', distance: '500m' },
    { icon: '🏥', label: 'Bệnh viện Đa khoa', distance: '1.2km' },
    { icon: '🚇', label: 'Metro Tân Cảng', distance: '800m' },
    { icon: '🏪', label: 'VinMart / Co.op', distance: '300m' },
    { icon: '☕', label: 'Coffee & Café', distance: '150m' },
];

const getOwnerName = (room: Room): string =>
    room.ownerNameSnapshot || room.ownerFullName || 'Chủ nhà';

const getOwnerAvatar = (room: Room): string => {
    const name = getOwnerName(room);
    return room.ownerAvatarSnapshot
        || room.ownerAvatarUrl
        || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0066FF&color=fff`;
};

const getOwnerPhone = (room: Room): string | undefined =>
    room.ownerPhoneSnapshot || room.ownerPhone;

const getCommentDisplayName = (comment: CommentResponse): string => {
    const name = comment.displayName?.trim();
    if (name) return name;
    return comment.userId ? 'Người dùng' : 'Khách';
};

const getCommentAvatar = (comment: CommentResponse): string | null => {
    const avatar = comment.displayAvatar?.trim();
    return avatar || null;
};

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'ACTIVE': return { label: '✅ Đang hiển thị', bg: '#E8F5E9', color: '#2E7D32' };
        case 'PENDING': return { label: '⏳ Chờ duyệt', bg: '#FFF8E1', color: '#F57F17' };
        case 'HIDDEN': return { label: '🔒 Đã ẩn', bg: '#F3F4F6', color: '#6B7280' };
        case 'FULL': return { label: '❌ Hết phòng', bg: '#FFEBEE', color: '#C62828' };
        case 'REJECTED': return { label: '🚫 Bị từ chối', bg: '#FFEBEE', color: '#C62828' };
        case 'EXPIRED': return { label: '⌛ Hết hạn', bg: '#F3F4F6', color: '#6B7280' };
        default: return { label: status, bg: '#F3F4F6', color: '#6B7280' };
    }
};

export default function PropertyDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { router, safePush } = useSafeRouter();
    const insets = useSafeAreaInsets();
    const { currentRoom, fetchRoomDetail, isLoading } = usePropertyStore();
    const { user, isAuthenticated } = useAuthStore();
    const {
        reviewsByOwner, summaryByOwner,
        fetchOwnerReviews, fetchOwnerSummary,
        submitReview, replyReview: replyOwnerReview,
        isSubmitting,
    } = useReviewStore();
    const {
        commentsByProperty, countByProperty,
        fetchComments, addComment, deleteComment,
        isSubmitting: isCommentSubmitting,
    } = useCommentStore();
    const { createAppointment, isSubmitting: bookingSubmitting } = useAppointmentStore();
    const {
        isLiked, isSaved: isPropertySaved, toggleLike, toggleSave: toggleSaveInteraction,
        setSaved, setLiked,
    } = useInteractionStore();

    const [activeTab, setActiveTab] = useState<'info' | 'reviews' | 'comments'>('info');
    const [isSavedLocal, setIsSavedLocal] = useState(false);
    const [isLikedLocal, setIsLikedLocal] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [showFullMap, setShowFullMap] = useState(false);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewImages, setReviewImages] = useState<string[]>([]);
    const [commentText, setCommentText] = useState('');
    const [bookingDate, setBookingDate] = useState('');
    const [bookingNote, setBookingNote] = useState('');
    const [userDistance, setUserDistance] = useState<string | null>(null);
    const [descExpanded, setDescExpanded] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const roomId = Number(id);
    const room = currentRoom?.id === roomId ? currentRoom : null;

    // Owner review data — keyed by ownerId
    const ownerId = room?.ownerId || 0;
    // Guard: luôn là array dù store/service trả về bất kỳ shape nào
    const rawOwnerReviews = reviewsByOwner[ownerId];
    const safeOwnerReviews = Array.isArray(rawOwnerReviews) ? rawOwnerReviews : ([] as import('../../types').OwnerReviewResponse[]);
    const reviewSummary = summaryByOwner[ownerId] || null;
    const reviewTotal = reviewSummary?.reviewCount ?? safeOwnerReviews.length;
    const reviewAvg = reviewSummary?.averageRating ?? (
        safeOwnerReviews.length > 0
            ? safeOwnerReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / safeOwnerReviews.length
            : 0
    );

    // Comment data — keyed by propertyId
    const rawComments = commentsByProperty[roomId];
    const safeComments = Array.isArray(rawComments) ? rawComments : ([] as CommentResponse[]);
    const commentCount = countByProperty[roomId] || 0;

    useEffect(() => {
        if (roomId) {
            fetchRoomDetail(roomId);
            fetchComments(roomId, true);
        }
    }, [roomId]);

    // Khi room load xong và có ownerId → tải review + summary
    useEffect(() => {
        if (room?.ownerId) {
            fetchOwnerReviews(room.ownerId);
            fetchOwnerSummary(room.ownerId);
        }
    }, [room?.ownerId]);

    useEffect(() => {
        if (room?.latitude && room?.longitude) {
            fetchDistanceFromUser();
        }
    }, [room?.latitude, room?.longitude]);

    useEffect(() => {
        setIsSavedLocal(isPropertySaved(roomId));
        setIsLikedLocal(isLiked(roomId));
    }, [roomId, isPropertySaved, isLiked]);

    const getFullAddress = (r: Room) => r.address || '';

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
        if (!isAuthenticated) { safePush('/(auth)/login' as any); return; }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const newSaved = !isSavedLocal;
        setIsSavedLocal(newSaved);
        setSaved(roomId, newSaved);
        try {
            await toggleSaveInteraction(roomId);
        } catch {
            setIsSavedLocal(!newSaved);
            setSaved(roomId, !newSaved);
            Alert.alert('Lỗi', 'Không thể lưu tin. Vui lòng thử lại.');
        }
    };

    const handleLike = async () => {
        if (!isAuthenticated) { safePush('/(auth)/login' as any); return; }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newLiked = !isLikedLocal;
        setIsLikedLocal(newLiked);
        setLiked(roomId, newLiked);
        try {
            await toggleLike(roomId);
        } catch {
            setIsLikedLocal(!newLiked);
            setLiked(roomId, !newLiked);
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `${room?.title}\n${room ? getFullAddress(room) : ''}\nGiá: ${formatCompactVND(room?.price)}/tháng\n\nXem thêm trên HomeSwipe`,
                title: room?.title,
            });
        } catch { }
    };

    const handleCall = () => {
        if (!isAuthenticated) { safePush('/(auth)/login' as any); return; }
        const ownerPhone = room ? getOwnerPhone(room) : undefined;
        if (ownerPhone) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Linking.openURL(`tel:${ownerPhone}`);
        } else {
            Alert.alert('Thông báo', 'Số điện thoại chủ nhà chưa được cập nhật.');
        }
    };

 const handleChat = () => {
    if (!isAuthenticated) { safePush('/(auth)/login' as any); return; }
    if (!room) return;

    // Navigate sang chat với property info để auto-send
    safePush({
        pathname: `/chat/${room.ownerId}`,
        params: {
            propertyId: room.id,
            propertyTitle: room.title,
            propertyPrice: room.price,
            propertyAddress: room.address || '',
            propertyArea: room.area,
            propertyImage: room.images?.[0] || '',
        },
    } as any);
};
    const handleNavigate = () => {
        if (!room?.latitude || !room?.longitude) return;
        const { latitude, longitude } = room;
        Alert.alert(
            'Chỉ đường đến đây', getFullAddress(room),
            [
                { text: 'Bản đồ trong app', onPress: () => setShowFullMap(true) },
                { text: 'Google Maps', onPress: () => openGoogleMaps(latitude, longitude) },
                ...(Platform.OS === 'ios' ? [{ text: 'Apple Maps', onPress: () => Linking.openURL(`maps://app?daddr=${latitude},${longitude}`) }] : []),
                { text: 'Waze', onPress: () => Linking.openURL(`https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`) },
                { text: 'Sao chép địa chỉ', onPress: () => Alert.alert('Địa chỉ', getFullAddress(room)) },
                { text: 'Huỷ', style: 'cancel' },
            ]
        );
    };

    const openGoogleMaps = (lat: number, lng: number) => {
        const url = Platform.select({
            ios: `comgooglemaps://?daddr=${lat},${lng}`,
            android: `google.navigation:q=${lat},${lng}`,
        }) || `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        Linking.canOpenURL(url).then(supported =>
            Linking.openURL(supported ? url : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`)
        );
    };

    const handleSubmitReview = async () => {
        if (!isAuthenticated) { safePush('/(auth)/login' as any); return; }
        if (!reviewComment.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập nội dung đánh giá'); return; }
        if (!room?.ownerId) { Alert.alert('Lỗi', 'Không xác định được chủ nhà.'); return; }
        // Lọc chỉ gửi URL hợp lệ (không gửi local file:// lên backend)
        const validImageUrls = reviewImages.filter(uri => uri.startsWith('http'));
        try {
            await submitReview({
                ownerId: room.ownerId,
                propertyId: roomId,
                rating: reviewRating,
                comment: reviewComment,
                images: validImageUrls.length > 0 ? validImageUrls : undefined,
            });
            // Refresh summary sau khi gửi
            fetchOwnerSummary(room.ownerId);
            setShowReviewModal(false);
            setReviewComment('');
            setReviewRating(5);
            setReviewImages([]);
            Alert.alert('Thành công', 'Cảm ơn bạn đã đánh giá!');
        } catch (e: any) {
            Alert.alert('Lỗi', e.message || 'Gửi đánh giá thất bại');
        }
    };

    const handleSubmitComment = async () => {
        if (!isAuthenticated) { safePush('/(auth)/login' as any); return; }
        if (!commentText.trim()) return;
        try {
            await addComment({ propertyId: roomId, content: commentText.trim() });
            setCommentText('');
        } catch (e: any) {
            Alert.alert('Lỗi', e.message || 'Gửi bình luận thất bại');
        }
    };

    const handleDeleteComment = async (commentId: number) => {
        Alert.alert(
            'Xoá bình luận',
            'Bạn có chắc muốn xoá bình luận này?',
            [
                { text: 'Huỷ', style: 'cancel' },
                {
                    text: 'Xoá', style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteComment(commentId, roomId);
                        } catch (e: any) {
                            Alert.alert('Lỗi', e.message || 'Không thể xoá bình luận');
                        }
                    },
                },
            ]
        );
    };

    const pickReviewImages = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true, quality: 0.8,
            selectionLimit: 5 - reviewImages.length,
        });
        if (!result.canceled)
            setReviewImages(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, 5));
    };

    const padDatePart = (value: number) => value.toString().padStart(2, '0');

    const getDefaultBookingDate = () => {
        const next = new Date();
        next.setHours(next.getHours() + 1);
        const minutes = next.getMinutes();

        if (minutes === 0 || minutes === 30) {
            next.setSeconds(0, 0);
        } else if (minutes < 30) {
            next.setMinutes(30, 0, 0);
        } else {
            next.setHours(next.getHours() + 1, 0, 0, 0);
        }

        return next;
    };

    const formatBookingInput = (date: Date) => {
        return `${padDatePart(date.getDate())}/${padDatePart(date.getMonth() + 1)}/${date.getFullYear()} ${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
    };

    const toLocalAppointmentTime = (date: Date) => {
        return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}:00`;
    };

    const parseBookingDateToDate = (value: string) => {
        const trimmed = value.trim();
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
            const parsed = new Date(trimmed.length === 16 ? `${trimmed}:00` : trimmed);
            return Number.isNaN(parsed.getTime()) ? null : parsed;
        }

        const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/);
        if (!match) return null;

        const [, day, month, year, hour, minute] = match;
        const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0, 0);
        const isSameDate =
            parsed.getFullYear() === Number(year) &&
            parsed.getMonth() === Number(month) - 1 &&
            parsed.getDate() === Number(day) &&
            parsed.getHours() === Number(hour) &&
            parsed.getMinutes() === Number(minute);

        return isSameDate ? parsed : null;
    };

    const openBookingModal = () => {
        setBookingDate(formatBookingInput(getDefaultBookingDate()));
        setShowBookingModal(true);
    };

    const adjustBookingDay = (days: number) => {
        const current = parseBookingDateToDate(bookingDate) || getDefaultBookingDate();
        const next = new Date(current);
        next.setDate(next.getDate() + days);

        if (next <= new Date()) {
            setBookingDate(formatBookingInput(getDefaultBookingDate()));
            return;
        }

        setBookingDate(formatBookingInput(next));
    };

    const setTomorrowBooking = () => {
        const next = getDefaultBookingDate();
        next.setDate(next.getDate() + 1);
        setBookingDate(formatBookingInput(next));
    };

    const handleBooking = async () => {
        if (!isAuthenticated) { safePush('/(auth)/login' as any); return; }
        if (!bookingDate.trim()) { Alert.alert('Lỗi', 'Vui lòng chọn ngày xem phòng'); return; }
        const appointmentDate = parseBookingDateToDate(bookingDate);
        if (!appointmentDate) {
            Alert.alert('Lỗi', 'Vui lòng nhập thời gian theo định dạng DD/MM/YYYY HH:MM hoặc YYYY-MM-DDTHH:MM:SS');
            return;
        }
        if (appointmentDate <= new Date()) {
            Alert.alert('Lỗi', 'Vui lòng chọn thời gian trong tương lai');
            return;
        }
        try {
            const appointmentTime = toLocalAppointmentTime(appointmentDate);
            await createAppointment({ roomId, scheduledAt: appointmentTime, note: bookingNote });
            setShowBookingModal(false);
            setBookingDate(''); setBookingNote('');
            Alert.alert('Thành công', '🎉 Đặt lịch xem phòng thành công! Chủ nhà sẽ liên hệ xác nhận.');
        } catch (e: any) {
            Alert.alert('Lỗi', e.message || 'Đặt lịch thất bại');
        }
    };

    const handleDeleteProperty = () => {
        if (!room) return;
        Alert.alert(
            'Xoá tin đăng',
            `Bạn có chắc muốn xoá vĩnh viễn tin "${room.title}"? Hành động này không thể hoàn tác.`,
            [
                { text: 'Huỷ', style: 'cancel' },
                {
                    text: 'Xoá vĩnh viễn', style: 'destructive',
                    onPress: async () => {
                        setIsDeleting(true);
                        try {
                            await roomService.deleteRoom(room.id);
                            Alert.alert('Thành công', 'Tin đăng đã được xoá', [
                                { text: 'OK', onPress: () => router.back() },
                            ]);
                        } catch (e: any) {
                            Alert.alert('Lỗi', e.message || 'Không thể xoá tin');
                        } finally { setIsDeleting(false); }
                    },
                },
            ]
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

    const isOwner = user && room && user.id === room.ownerId;
    const shortDesc = room.description?.slice(0, 150);
    const isLongDesc = (room.description?.length || 0) > 150;
    const statusBadge = getStatusBadge(room.status);
    const ownerName = getOwnerName(room);
    const ownerAvatar = getOwnerAvatar(room);

    return (
        <View style={styles.wrapper}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="light-content" />

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Image Gallery */}
                <View style={{ position: 'relative' }}>
                    <ImageGallery
                        images={room.images?.length > 0 ? room.images : ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800']}
                        compact
                    />
                    <View style={[styles.galleryOverlayTop, { top: insets.top + 8 }]}>
                        <TouchableOpacity style={styles.overlayBtn} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={22} color="white" />
                        </TouchableOpacity>
                        <View style={styles.overlayRightBtns}>
                            <TouchableOpacity style={styles.overlayBtn} onPress={handleShare}>
                                <Ionicons name="share-social-outline" size={22} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.overlayBtn} onPress={handleLike}>
                                <Ionicons name={isLikedLocal ? 'heart' : 'heart-outline'} size={22} color={isLikedLocal ? '#FF4D6D' : 'white'} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.overlayBtn} onPress={handleFavorite}>
                                <Ionicons name={isSavedLocal ? 'bookmark' : 'bookmark-outline'} size={22} color={isSavedLocal ? '#FFB800' : 'white'} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View style={styles.content}>
                    {/* Price & Status */}
                    <View style={styles.priceRow}>
                        <View>
                            <Text style={styles.price}>{formatCompactVND(room.price)}</Text>
                            <Text style={styles.priceUnit}>đồng / {room.transactionType === 'FOR_SALE' ? 'căn' : 'tháng'}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                            <Text style={[styles.statusText, { color: statusBadge.color }]}>{statusBadge.label}</Text>
                        </View>
                    </View>

                    <Text style={styles.title}>{room.title}</Text>

                    {/* Address */}
                    <TouchableOpacity style={styles.addressRow} onPress={handleNavigate} activeOpacity={0.7}>
                        <Ionicons name="location" size={16} color="#0066FF" />
                        <Text style={styles.addressText} numberOfLines={2}>{getFullAddress(room)}</Text>
                        <View style={styles.directionChip}>
                            <Ionicons name="navigate-outline" size={12} color="#0066FF" />
                            <Text style={styles.directionText}>Chỉ đường</Text>
                        </View>
                    </TouchableOpacity>

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
                                <Ionicons key={s} name={s <= Math.round(reviewAvg) ? 'star' : 'star-outline'} size={14} color="#FFB800" />
                            ))}
                        </View>
                        <Text style={styles.ratingText}>{reviewAvg.toFixed(1)} ({reviewTotal} đánh giá)</Text>
                    </View>

                    {/* Quick Stats */}
                    <View style={styles.statsGrid}>
                        {!!room.area && (
                            <View style={styles.statItem}>
                                <Ionicons name="resize-outline" size={22} color="#0066FF" />
                                <Text style={styles.statValue}>{room.area} m²</Text>
                                <Text style={styles.statLabel}>Diện tích</Text>
                            </View>
                        )}
                        {room.bedrooms !== undefined && (
                            <View style={styles.statItem}>
                                <Ionicons name="bed-outline" size={22} color="#0066FF" />
                                <Text style={styles.statValue}>{room.bedrooms}</Text>
                                <Text style={styles.statLabel}>Phòng ngủ</Text>
                            </View>
                        )}
                        {room.bathrooms !== undefined && (
                            <View style={styles.statItem}>
                                <Ionicons name="water-outline" size={22} color="#0066FF" />
                                <Text style={styles.statValue}>{room.bathrooms}</Text>
                                <Text style={styles.statLabel}>Phòng tắm</Text>
                            </View>
                        )}
                        {room.capacity !== undefined && (
                            <View style={styles.statItem}>
                                <Ionicons name="people-outline" size={22} color="#0066FF" />
                                <Text style={styles.statValue}>{room.capacity}</Text>
                                <Text style={styles.statLabel}>Sức chứa</Text>
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
                            style={[styles.tab, activeTab === 'comments' && styles.tabActive]}
                            onPress={() => setActiveTab('comments')}
                        >
                            <Text style={[styles.tabText, activeTab === 'comments' && styles.tabTextActive]}>
                                {`Bình luận (${commentCount})`}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'reviews' && styles.tabActive]}
                            onPress={() => setActiveTab('reviews')}
                        >
                            <Text style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}>
                                {`Đánh giá (${reviewTotal})`}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* ===== TAB INFO ===== */}
                    {activeTab === 'info' && (
                        <>
                            {/* Description */}
                            {!!room.description && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>📝 Mô tả</Text>
                                    <Text style={styles.description}>
                                        {descExpanded ? room.description : shortDesc}
                                        {isLongDesc && !descExpanded && '...'}
                                    </Text>
                                    {isLongDesc && (
                                        <TouchableOpacity onPress={() => setDescExpanded(!descExpanded)}>
                                            <Text style={styles.seeMoreBtn}>{descExpanded ? 'Thu gọn ▲' : 'Xem thêm ▼'}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}

                            {/* Property Details */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>🏷️ Chi tiết</Text>
                                <View style={styles.detailsGrid}>
                                    <DetailRow label="Loại BĐS" value={
                                        room.propertyType === 'ROOM' ? 'Phòng trọ'
                                            : room.propertyType === 'APARTMENT' ? 'Căn hộ'
                                                : room.propertyType === 'HOUSE' ? 'Nhà'
                                                    : room.propertyType || 'Phòng'
                                    } />
                                    <DetailRow label="Giao dịch" value={room.transactionType === 'FOR_RENT' ? 'Cho thuê' : 'Bán'} />
                                    {!!room.furnishingStatus && <DetailRow label="Nội thất" value={
                                        room.furnishingStatus === 'UNFURNISHED' ? 'Không có'
                                            : room.furnishingStatus === 'PARTIALLY_FURNISHED' ? 'Cơ bản'
                                                : room.furnishingStatus === 'FULLY_FURNISHED' ? 'Đầy đủ'
                                                    : room.furnishingStatus
                                    } />}
                                    {!!room.availabilityStatus && <DetailRow label="Tình trạng" value={
                                        room.availabilityStatus === 'IMMEDIATELY' ? 'Vào ngay'
                                            : room.availabilityStatus === 'THIS_MONTH' ? 'Tháng này'
                                                : room.availabilityStatus === 'NEXT_MONTH' ? 'Tháng sau'
                                                    : room.availabilityStatus === 'NEGOTIABLE' ? 'Thỏa thuận'
                                                        : room.availabilityStatus
                                    } />}
                                    {!!room.electricityPrice && <DetailRow label="Tiền điện" value={room.electricityPrice === 'STATE_PRICE' ? 'Giá nhà nước' : 'Miễn phí'} />}
                                    {!!room.waterPrice && <DetailRow label="Tiền nước" value={room.waterPrice === 'STATE_PRICE' ? 'Giá nhà nước' : 'Miễn phí'} />}
                                    {!!room.internetPrice && <DetailRow label="Internet" value={room.internetPrice === 'FREE' ? 'Miễn phí' : 'Có phí'} />}
                                    {room.hasBalcony !== undefined && <DetailRow label="Ban công" value={room.hasBalcony ? 'Có' : 'Không'} />}
                                </View>
                            </View>

                            {/* Amenities */}
                            {room.amenities && room.amenities.length > 0 && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>✨ Tiện ích</Text>
                                    <View style={styles.amenitiesGrid}>
                                        {room.amenities.map((amenity, index) => (
                                            <View key={index} style={styles.amenityItem}>
                                                <Ionicons name={getAmenityIcon(amenity) as any} size={18} color="#0066FF" />
                                                <Text style={styles.amenityText}>{amenity}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* ✅ Map - Leaflet WebView (thay MapView Google) */}
                            {!!(room.latitude && room.longitude) && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>📍 Vị trí</Text>
                                    <TouchableOpacity
                                        style={styles.mapContainer}
                                        onPress={() => setShowFullMap(true)}
                                        activeOpacity={0.9}
                                    >
                                        {/* WebView Leaflet - preview nhỏ */}
                                        <WebView
                                            style={styles.map}
                                            source={{
                                                html: buildLeafletHtml(
                                                    room.latitude,
                                                    room.longitude,
                                                    room.title,
                                                    false,
                                                    15
                                                )
                                            }}
                                            originWhitelist={['*']}
                                            javaScriptEnabled
                                            scrollEnabled={false}
                                            pointerEvents="none"
                                        />
                                        <View style={styles.mapExpandBtn}>
                                            <Ionicons name="expand-outline" size={16} color="#0066FF" />
                                            <Text style={styles.mapExpandText}>Xem bản đồ đầy đủ</Text>
                                        </View>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.addressNavRow} onPress={handleNavigate}>
                                        <Ionicons name="location" size={16} color="#0066FF" />
                                        <Text style={styles.fullAddress} numberOfLines={2}>{getFullAddress(room)}</Text>
                                        <View style={styles.directionBtn}>
                                            <Ionicons name="navigate" size={14} color="white" />
                                            <Text style={styles.directionBtnText}>Chỉ đường</Text>
                                        </View>
                                    </TouchableOpacity>

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
                            {!!room.ownerId && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>👤 Thông tin chủ nhà</Text>
                                    <TouchableOpacity
                                        style={styles.landlordCard}
                                    onPress={() => safePush(`/landlord-profile?landlordId=${room.ownerId}${room.ownerSlugSnapshot ? `&slug=${room.ownerSlugSnapshot}` : ''}` as any)}
                                        activeOpacity={0.7}
                                    >
                                        <Image source={{ uri: ownerAvatar }} style={styles.landlordAvatar} />
                                        <View style={styles.landlordInfo}>
                                            <Text style={styles.landlordName}>{ownerName}</Text>
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

                            {/* Owner Management */}
                            {isOwner && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>⚙️ Quản lý tin đăng</Text>
                                    <View style={{ gap: 10 }}>
                                        <TouchableOpacity
                                            style={[styles.ownerActionBtn, { backgroundColor: '#FFEBEE' }]}
                                            onPress={handleDeleteProperty} disabled={isDeleting}
                                        >
                                            {isDeleting ? <ActivityIndicator size="small" color="#EF4444" /> : (
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

                    {/* ===== TAB COMMENTS ===== */}
                    {activeTab === 'comments' && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>💬 Bình luận ({commentCount})</Text>

                            {/* Ô nhập comment */}
                            {isAuthenticated ? (
                                <View style={styles.commentInputRow}>
                                    <TextInput
                                        style={styles.commentInput}
                                        placeholder="Viết bình luận..."
                                        value={commentText}
                                        onChangeText={setCommentText}
                                        multiline
                                        maxLength={500}
                                    />
                                    <TouchableOpacity
                                        style={[styles.commentSendBtn, (!commentText.trim() || isCommentSubmitting) && styles.commentSendBtnDisabled]}
                                        onPress={handleSubmitComment}
                                        disabled={!commentText.trim() || isCommentSubmitting}
                                    >
                                        {isCommentSubmitting
                                            ? <ActivityIndicator size="small" color="white" />
                                            : <Ionicons name="send" size={18} color="white" />
                                        }
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.loginToCommentBtn}
                                    onPress={() => safePush('/(auth)/login' as any)}
                                >
                                    <Ionicons name="log-in-outline" size={16} color="#0066FF" />
                                    <Text style={styles.loginToCommentText}>Đăng nhập để bình luận</Text>
                                </TouchableOpacity>
                            )}

                            {/* Danh sách comment */}
                            {safeComments.length === 0 ? (
                                <View style={styles.emptyReviews}>
                                    <Ionicons name="chatbubble-outline" size={48} color="#CCC" />
                                    <Text style={styles.emptyText}>Chưa có bình luận nào. Hãy là người đầu tiên!</Text>
                                </View>
                            ) : (
                                safeComments.map(c => (
                                    <View key={c.id} style={styles.commentCard}>
                                        <View style={styles.commentHeader}>
                                            <Image
                                                source={{ uri: getCommentAvatar(c) || `https://ui-avatars.com/api/?name=${encodeURIComponent(getCommentDisplayName(c))}&background=EEF4FF&color=0066FF` }}
                                                style={styles.commentAvatar}
                                            />
                                            <View style={styles.commentMeta}>
                                                <Text style={styles.commentUser}>
                                                    {getCommentDisplayName(c)}
                                                </Text>
                                                <Text style={styles.commentDate}>
                                                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString('vi-VN') : ''}
                                                </Text>
                                            </View>
                                            {/* Nút xoá — chỉ hiện nếu là comment của mình */}
                                            {user && (c.authorId ?? c.userId) === user.id && (
                                                <TouchableOpacity
                                                    onPress={() => handleDeleteComment(c.id)}
                                                    style={styles.commentDeleteBtn}
                                                >
                                                    <Ionicons name="trash-outline" size={16} color="#FF4444" />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                        <Text style={styles.commentContent}>{c.content}</Text>
                                    </View>
                                ))
                            )}
                        </View>
                    )}

                    {/* ===== TAB REVIEWS ===== */}
                    {activeTab === 'reviews' && (
                        <View style={styles.section}>
                            {/* Summary */}
                            <View style={styles.reviewSummary}>
                                <Text style={styles.bigRating}>{reviewAvg.toFixed(1)}</Text>
                                <View>
                                    <View style={styles.stars}>
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <Ionicons key={s} name={s <= Math.round(reviewAvg) ? 'star' : 'star-outline'} size={18} color="#FFB800" />
                                        ))}
                                    </View>
                                    <Text style={styles.reviewCount}>{reviewTotal} đánh giá</Text>
                                    {reviewSummary && reviewSummary.verifiedReviewCount > 0 && (
                                        <Text style={styles.verifiedCount}>{reviewSummary.verifiedReviewCount} đã xác minh</Text>
                                    )}
                                </View>
                            </View>

                            {/* Nút viết đánh giá — chỉ hiện cho user không phải owner */}
                            {isAuthenticated && user?.id !== room?.ownerId && (
                                <TouchableOpacity style={styles.writeReviewBtn} onPress={() => setShowReviewModal(true)}>
                                    <Ionicons name="create-outline" size={18} color="#0066FF" />
                                    <Text style={styles.writeReviewText}>Viết đánh giá chủ nhà</Text>
                                </TouchableOpacity>
                            )}

                            {safeOwnerReviews.length === 0 ? (
                                <View style={styles.emptyReviews}>
                                    <Ionicons name="star-outline" size={48} color="#CCC" />
                                    <Text style={styles.emptyText}>Chưa có đánh giá nào về chủ nhà</Text>
                                </View>
                            ) : (
                                safeOwnerReviews.map(review => (
                                    <ReviewCard
                                        key={review.id}
                                        review={review}
                                        isOwner={user?.id === room?.ownerId}
                                        onReply={user?.id === room?.ownerId
                                            ? (reviewId, replyText) => replyOwnerReview(reviewId, room!.ownerId, replyText)
                                            : undefined
                                        }
                                    />
                                ))
                            )}
                        </View>
                    )}

                    <View style={{ height: 120 }} />
                </View>
            </ScrollView>

            {/* Bottom Action Bar */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                <View style={styles.bottomPriceInfo}>
                    <Text style={styles.bottomPrice}>{formatCompactVND(room.price)}</Text>
                    <Text style={styles.bottomUnit}>/{room.transactionType === 'FOR_SALE' ? 'căn' : 'tháng'}</Text>
                </View>
                {user?.id === room.ownerId ? (
                    <View style={styles.bottomBtns}>
                        <TouchableOpacity style={styles.scheduleBtn} onPress={() => safePush(`/packages/boost/${roomId}` as any)}>
                            <Ionicons name="rocket-outline" size={18} color="#0066FF" />
                            <Text style={styles.scheduleBtnText}>Boost tin</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.chatBtn} onPress={() => safePush('/edit-profile' as any)}>
                            <Ionicons name="create-outline" size={18} color="white" />
                            <Text style={styles.chatBtnText}>Sửa thông tin</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.bottomBtns}>
                        <TouchableOpacity style={styles.scheduleBtn} onPress={() => {
                            if (!isAuthenticated) { safePush('/(auth)/login' as any); return; }
                            openBookingModal();
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

            {/* ===== FULL MAP MODAL - Leaflet WebView ===== */}
            <Modal visible={showFullMap} animationType="slide" onRequestClose={() => setShowFullMap(false)}>
                <View style={styles.fullMapContainer}>
                    <StatusBar barStyle="dark-content" />
                    <View style={[styles.fullMapHeader, { paddingTop: insets.top + 8 }]}>
                        <TouchableOpacity onPress={() => setShowFullMap(false)} style={styles.fullMapBack}>
                            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                        </TouchableOpacity>
                        <Text style={styles.fullMapTitle}>Vị trí bất động sản</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* ✅ WebView Leaflet - Full Map */}
                    <WebView
                        style={{ flex: 1 }}
                        source={{
                            html: buildLeafletHtml(
                                room.latitude || 10.762622,
                                room.longitude || 106.660172,
                                room.title,
                                true,   // showCircle = true (vùng 500m)
                                15
                            )
                        }}
                        originWhitelist={['*']}
                        javaScriptEnabled
                    />

                    <View style={[styles.fullMapBottom, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                        <TouchableOpacity style={styles.fullMapNavBtn} onPress={handleNavigate}>
                            <Ionicons name="navigate" size={20} color="white" />
                            <Text style={styles.fullMapNavText}>🧭 Chỉ đường đến đây</Text>
                        </TouchableOpacity>
                        {userDistance && <Text style={styles.fullMapDistance}>📏 {userDistance} từ bạn</Text>}
                    </View>
                </View>
            </Modal>

            {/* ===== REVIEW MODAL ===== */}
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
                            multiline numberOfLines={4}
                            value={reviewComment} onChangeText={setReviewComment}
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
                            onPress={handleSubmitReview} disabled={isSubmitting}
                        >
                            {isSubmitting ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>Gửi đánh giá</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ===== BOOKING MODAL ===== */}
            <Modal visible={showBookingModal} transparent animationType="slide">
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={[styles.modalContainer, styles.bookingModalContainer, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
                        <ScrollView
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.bookingModalContent}
                        >
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
                            value={bookingDate} onChangeText={setBookingDate}
                            keyboardType="numbers-and-punctuation"
                            returnKeyType="done"
                        />
                        <View style={styles.bookingQuickRow}>
                            <TouchableOpacity style={styles.bookingQuickBtn} onPress={() => adjustBookingDay(-1)}>
                                <Text style={styles.bookingQuickText}>-1 ngay</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.bookingQuickBtn} onPress={() => setBookingDate(formatBookingInput(getDefaultBookingDate()))}>
                                <Text style={styles.bookingQuickText}>Hom nay</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.bookingQuickBtn} onPress={setTomorrowBooking}>
                                <Text style={styles.bookingQuickText}>Ngay mai</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.bookingQuickBtn} onPress={() => adjustBookingDay(1)}>
                                <Text style={styles.bookingQuickText}>+1 ngay</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.bookingHint}>Mac dinh la khung gio gan nhat trong tuong lai. Khong the dat lich qua khu.</Text>
                        <Text style={styles.modalLabel}>Ghi chú (tuỳ chọn)</Text>
                        <TextInput
                            style={styles.reviewTextInput}
                            placeholder="Thêm ghi chú cho chủ nhà..."
                            multiline numberOfLines={3}
                            value={bookingNote} onChangeText={setBookingNote}
                        />
                        <TouchableOpacity
                            style={[styles.submitBtn, bookingSubmitting && styles.submitBtnDisabled]}
                            onPress={handleBooking} disabled={bookingSubmitting}
                        >
                            {bookingSubmitting ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>Xác nhận đặt lịch</Text>}
                        </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
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
    galleryOverlayTop: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    overlayBtn: { backgroundColor: 'rgba(0,0,0,0.4)', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    overlayRightBtns: { flexDirection: 'row', gap: 8 },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 4 },
    price: { fontSize: 26, fontWeight: '800', color: '#FF6B35' },
    priceUnit: { fontSize: 13, color: '#888', marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusText: { fontSize: 12, fontWeight: '600' },
    title: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginTop: 8, marginBottom: 8 },
    addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, backgroundColor: '#F0F5FF', padding: 10, borderRadius: 10 },
    directionChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#E8F0FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    directionText: { fontSize: 11, color: '#0066FF', fontWeight: '600' },
    distanceBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EFF4FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 8 },
    distanceText: { fontSize: 13, color: '#0066FF', fontWeight: '600' },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
    stars: { flexDirection: 'row', gap: 2 },
    ratingText: { fontSize: 13, color: '#666' },
    statsGrid: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'white', borderRadius: 14, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    statItem: { alignItems: 'center', gap: 4 },
    statValue: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
    statLabel: { fontSize: 11, color: '#888' },
    tabBar: { flexDirection: 'row', backgroundColor: '#F0F0F0', borderRadius: 10, padding: 4, marginBottom: 20 },
    addressText: { flex: 1, fontSize: 13, color: '#555' },

    tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
    tabActive: { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    tabText: { fontSize: 14, color: '#888' },
    tabTextActive: { fontWeight: '700', color: '#1A1A1A' },
    section: { marginBottom: 22 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
    description: { fontSize: 14, color: '#555', lineHeight: 22 },
    seeMoreBtn: { color: '#0066FF', fontWeight: '600', marginTop: 6, fontSize: 14 },
    detailsGrid: { backgroundColor: 'white', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
    detailLabel: { fontSize: 14, color: '#888' },
    detailValue: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
    amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    amenityItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0F5FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
    amenityText: { fontSize: 13, color: '#333' },
    mapContainer: { borderRadius: 14, overflow: 'hidden', marginBottom: 10, height: 190 },
    map: { flex: 1 },
    mapExpandBtn: { position: 'absolute', bottom: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'white', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
    mapExpandText: { color: '#0066FF', fontSize: 12, fontWeight: '600' },
    addressNavRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, backgroundColor: '#F8FAFF', borderRadius: 10, marginBottom: 14 },
    fullAddress: { flex: 1, fontSize: 13, color: '#444' },
    directionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0066FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
    directionBtnText: { color: 'white', fontSize: 12, fontWeight: '700' },
    poiSection: { backgroundColor: 'white', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    poiTitle: { fontSize: 13, fontWeight: '700', color: '#888', marginBottom: 10 },
    poiItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
    poiIcon: { fontSize: 18, marginRight: 10 },
    poiLabel: { flex: 1, fontSize: 13, color: '#333' },
    poiDistance: { fontSize: 13, color: '#0066FF', fontWeight: '600' },
    landlordCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 14, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    landlordAvatar: { width: 52, height: 52, borderRadius: 26 },
    landlordInfo: { flex: 1, marginLeft: 12 },
    landlordName: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
    verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    verifiedText: { fontSize: 12, color: '#0066FF' },
    landlordBtns: { flexDirection: 'row', gap: 8 },
    landlordCallBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0066FF', justifyContent: 'center', alignItems: 'center' },
    landlordChatBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F0FF', justifyContent: 'center', alignItems: 'center' },
    ownerActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12 },
    ownerActionText: { fontSize: 15, fontWeight: '600' },
    reviewSummary: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
    bigRating: { fontSize: 48, fontWeight: '800', color: '#1A1A1A' },
    reviewCount: { fontSize: 13, color: '#888', marginTop: 4 },
    writeReviewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E8F0FF', padding: 12, borderRadius: 10, marginBottom: 16, justifyContent: 'center' },
    writeReviewText: { color: '#0066FF', fontWeight: '600', fontSize: 14 },
    emptyReviews: { alignItems: 'center', paddingVertical: 32, gap: 8 },
    emptyText: { color: '#999', fontSize: 14 },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 10 },
    bottomPriceInfo: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
    bottomPrice: { fontSize: 20, fontWeight: '700', color: '#FF6B35' },
    bottomUnit: { fontSize: 12, color: '#888' },
    bottomBtns: { flexDirection: 'row', gap: 10 },
    scheduleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: '#0066FF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
    scheduleBtnText: { color: '#0066FF', fontWeight: '600', fontSize: 14 },
    chatBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0066FF', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
    chatBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
    // Full Map Modal
    fullMapContainer: { flex: 1, backgroundColor: 'white' },
    fullMapHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    fullMapBack: { width: 40, height: 40, justifyContent: 'center' },
    fullMapTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
    fullMapBottom: { padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F0F0F0', gap: 8 },
    fullMapNavBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0066FF', borderRadius: 14, paddingVertical: 14, shadowColor: '#0066FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
    fullMapNavText: { color: 'white', fontWeight: '700', fontSize: 16 },
    fullMapDistance: { textAlign: 'center', color: '#666', fontSize: 14 },
    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContainer: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    bookingModalContainer: { maxHeight: '88%' },
    bookingModalContent: { paddingBottom: 8 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
    modalLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
    starPicker: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 20 },
    reviewTextInput: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, padding: 12, fontSize: 14, minHeight: 100, textAlignVertical: 'top', marginBottom: 20 },
    bookingInput: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, padding: 12, fontSize: 14, marginBottom: 10 },
    bookingQuickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    bookingQuickBtn: { borderWidth: 1, borderColor: '#D8E6FF', backgroundColor: '#F4F8FF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
    bookingQuickText: { color: '#0066FF', fontSize: 13, fontWeight: '700' },
    bookingHint: { color: '#777', fontSize: 12, lineHeight: 17, marginBottom: 14 },
    submitBtn: { backgroundColor: '#0066FF', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    submitBtnDisabled: { backgroundColor: '#AAC8FF' },
    submitBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
    // Comment styles
    commentCard: { backgroundColor: 'white', borderRadius: 12, padding: 12, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
    commentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    commentAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F0F0F0' },
    commentMeta: { flex: 1, marginLeft: 8 },
    commentUser: { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
    commentDate: { fontSize: 11, color: '#999', marginTop: 1 },
    commentDeleteBtn: { padding: 4 },
    commentContent: { fontSize: 14, color: '#444', lineHeight: 20 },
    commentInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 14, backgroundColor: '#F8F8F8', borderRadius: 12, padding: 8, borderWidth: 1, borderColor: '#E8E8E8' },
    commentInput: { flex: 1, fontSize: 14, color: '#1A1A1A', maxHeight: 80, minHeight: 36, paddingTop: 4 },
    commentSendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0066FF', justifyContent: 'center', alignItems: 'center' },
    commentSendBtnDisabled: { backgroundColor: '#AAC8FF' },
    loginToCommentBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', backgroundColor: '#EEF4FF', borderRadius: 10, paddingVertical: 12, marginBottom: 14 },
    loginToCommentText: { color: '#0066FF', fontWeight: '600', fontSize: 14 },
    verifiedCount: { fontSize: 12, color: '#22C55E', marginTop: 2 },
});
