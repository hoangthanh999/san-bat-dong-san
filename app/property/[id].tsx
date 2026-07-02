import React, { useCallback, useEffect, useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Linking, Dimensions, Alert, TextInput, Modal, Share,
    StatusBar, Platform, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';   // ✅ Thay react-native-maps
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
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
import { reelsApi, PropertyReel } from '../../services/api/reels';
import { recommendApi, type RecommendAction } from '../../services/api/recommend';
import { ImageGallery } from '../../components/property/ImageGallery';
import { ReviewCard } from '../../components/property/ReviewCard';
import { CommentResponse, Room } from '../../types';
import { formatCompactVND } from '../../utils/formatPrice';
import { useSafeRouter } from '../../hooks/useSafeRouter';
import { getPromotionBadgeLabel, isActivePromotion } from '../../utils/promotion';

const { width } = Dimensions.get('window');

type MapLoadState = 'loading' | 'ready' | 'error';

const buildSvgDataUri = (svg: string) =>
    `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

const FALLBACK_PROPERTY_IMAGE = buildSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520" viewBox="0 0 800 520">
  <rect width="800" height="520" fill="#E5E7EB"/>
  <rect x="220" y="150" width="360" height="220" rx="22" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="8"/>
  <circle cx="320" cy="230" r="34" fill="#CBD5E1"/>
  <path d="M250 330l86-88 72 70 46-48 96 66" fill="none" stroke="#94A3B8" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="400" y="425" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#64748B">Chua co anh</text>
</svg>
`);

const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'CN';
    return parts.slice(-2).map(part => part.charAt(0)).join('').toUpperCase();
};

const buildAvatarPlaceholderUri = (name: string, background = '#f96302', color = '#FFFFFF') =>
    buildSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="80" fill="${background}"/>
  <text x="80" y="94" text-anchor="middle" font-family="Arial, sans-serif" font-size="52" font-weight="700" fill="${color}">${getInitials(name)}</text>
</svg>
`);

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
      html: '<div style="background:#f96302;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>',
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
      color: 'rgba(249,99,2,0.4)',
      fillColor: 'rgba(249,99,2,0.08)',
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

const getOwnerName = (room: Room): string =>
    room.ownerNameSnapshot || room.ownerFullName || 'Chủ nhà';

const getOwnerAvatar = (room: Room): string => {
    const name = getOwnerName(room);
    return room.ownerAvatarSnapshot
        || room.ownerAvatarUrl
        || buildAvatarPlaceholderUri(name);
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

// ✅ Label maps tiếng Việt cho enum
const PROPERTY_TYPE_LABELS: Record<string, string> = {
    ROOM: 'Phòng trọ', APARTMENT: 'Căn hộ', HOUSE: 'Nhà nguyên căn',
    VILLA: 'Biệt thự', COMMERCIAL: 'Mặt bằng kinh doanh',
    LAND: 'Đất nền', OFFICE: 'Văn phòng',
};
const TRANSACTION_TYPE_LABELS: Record<string, string> = {
    FOR_RENT: 'Cho thuê', FOR_SALE: 'Bán',
};
const FURNISHING_LABELS: Record<string, string> = {
    UNFURNISHED: 'Không nội thất', PARTIALLY_FURNISHED: 'Nội thất cơ bản',
    FULLY_FURNISHED: 'Đầy đủ nội thất',
};
const AVAILABILITY_LABELS: Record<string, string> = {
    IMMEDIATELY: 'Vào ở ngay', THIS_MONTH: 'Trong tháng này',
    NEXT_MONTH: 'Tháng sau', NEGOTIABLE: 'Thỏa thuận',
};
const UTILITY_PRICE_LABELS: Record<string, string> = {
    FREE: 'Miễn phí', STATE_PRICE: 'Giá nhà nước',
    LANDLORD_PRICE: 'Theo chủ nhà', SHARED: 'Chia đều',
    NEGOTIABLE: 'Thỏa thuận',
};
const LEGAL_DOC_LABELS: Record<string, string> = {
    NONE: 'Không có', CERTIFICATE_OF_OWNERSHIP: 'Sổ đỏ / Sổ hồng',
    LEASE_CONTRACT: 'Hợp đồng thuê', AUTHORIZATION_LETTER: 'Giấy uỷ quyền',
};
const getLabel = (map: Record<string, string>, value?: string | null): string =>
    (value && map[value]) || 'Chưa cập nhật';

const formatCreatedAt = (iso?: string): string => {
    if (!iso) return 'Chưa cập nhật';
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return 'Chưa cập nhật';
        const dd = d.getDate().toString().padStart(2, '0');
        const mm = (d.getMonth() + 1).toString().padStart(2, '0');
        return `${dd}/${mm}/${d.getFullYear()}`;
    } catch { return 'Chưa cập nhật'; }
};

const getRoomListFromResponse = (res: any): Room[] => {
    const candidates = [
        res?.content,
        res?.data?.content,
        res?.items,
        res?.result?.content,
        res?.result,
    ];
    const list = candidates.find(Array.isArray);
    return Array.isArray(list) ? list : [];
};

const normalizeText = (value?: string | null) => (value || '').trim().toLowerCase();

const scoreSimilarRoom = (candidate: Room, current: Room) => {
    let score = 0;
    if (current.projectId && candidate.projectId === current.projectId) score += 80;
    if (candidate.propertyType && candidate.propertyType === current.propertyType) score += 24;
    if (candidate.transactionType && candidate.transactionType === current.transactionType) score += 24;
    if (normalizeText(candidate.ward) && normalizeText(candidate.ward) === normalizeText(current.ward)) score += 18;
    if (normalizeText(candidate.district) && normalizeText(candidate.district) === normalizeText(current.district)) score += 14;
    if (normalizeText(candidate.province) && normalizeText(candidate.province) === normalizeText(current.province)) score += 10;
    if (isActivePromotion(candidate)) score += 2;
    return score;
};

const isStrictSimilarRoom = (candidate: Room, current: Room) => {
    const sameCore =
        candidate.propertyType === current.propertyType &&
        candidate.transactionType === current.transactionType;
    const samePlace =
        (!!current.projectId && candidate.projectId === current.projectId) ||
        (normalizeText(candidate.ward) && normalizeText(candidate.ward) === normalizeText(current.ward)) ||
        (normalizeText(candidate.district) && normalizeText(candidate.district) === normalizeText(current.district)) ||
        (normalizeText(candidate.province) && normalizeText(candidate.province) === normalizeText(current.province));
    return sameCore && samePlace;
};

const pickSimilarRooms = (items: Room[], current: Room, limit = 6, strict = false) => {
    const candidates = items.filter(item =>
        item?.id &&
        item.id !== current.id &&
        (!strict || isStrictSimilarRoom(item, current))
    );
    const sorted = candidates
        .map(item => ({ item, score: scoreSimilarRoom(item, current) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ item }) => item);
    return sorted.slice(0, limit);
};

type RelatedVideoItem = Room | PropertyReel;

const getRelatedVideoUrl = (candidate: RelatedVideoItem) =>
    candidate.videoUrl?.trim() || null;

const getRelatedVideoThumbnail = (candidate: RelatedVideoItem) => {
    const raw = candidate as any;
    return raw.thumbnailUrl?.trim?.() || raw.images?.[0] || FALLBACK_PROPERTY_IMAGE;
};

const isStronglyRelatedVideo = (candidate: RelatedVideoItem, current: Room) => {
    const raw = candidate as any;
    if (!candidate?.id || candidate.id === current.id || !getRelatedVideoUrl(candidate)) return false;

    const sameProject = !!current.projectId && raw.projectId === current.projectId;
    if (sameProject) return true;

    const sameWard = !!normalizeText(raw.ward) && normalizeText(raw.ward) === normalizeText(current.ward);
    const sameDistrict = !!normalizeText(raw.district) && normalizeText(raw.district) === normalizeText(current.district);
    const samePropertyType = !!raw.propertyType && raw.propertyType === current.propertyType;
    const sameTransactionType =
        (!!raw.transactionType && raw.transactionType === current.transactionType) ||
        (raw.listingType === current.transactionType) ||
        (raw.listingType === 'RENT' && current.transactionType === 'FOR_RENT') ||
        (raw.listingType === 'SALE' && current.transactionType === 'FOR_SALE');
    const sameOwner = !!current.ownerId && raw.ownerId === current.ownerId;

    return sameOwner ||
        ((sameWard || sameDistrict) && samePropertyType) ||
        (sameDistrict && sameTransactionType && samePropertyType);
};

const scoreRelatedVideo = (candidate: RelatedVideoItem, current: Room) => {
    const raw = candidate as any;
    let score = 0;
    if (current.projectId && raw.projectId === current.projectId) score += 100;
    if (current.ownerId && raw.ownerId === current.ownerId) score += 70;
    if (normalizeText(raw.ward) && normalizeText(raw.ward) === normalizeText(current.ward)) score += 40;
    if (normalizeText(raw.district) && normalizeText(raw.district) === normalizeText(current.district)) score += 32;
    if (raw.propertyType && raw.propertyType === current.propertyType) score += 24;
    if (raw.transactionType && raw.transactionType === current.transactionType) score += 18;
    if (raw.listingType && (raw.listingType === current.transactionType || (raw.listingType === 'RENT' && current.transactionType === 'FOR_RENT') || (raw.listingType === 'SALE' && current.transactionType === 'FOR_SALE'))) score += 18;
    if (isActivePromotion(raw)) score += 2;
    return score;
};

const pickRelatedVideos = (items: RelatedVideoItem[], current: Room, limit = 6) => (
    items
        .filter(item => isStronglyRelatedVideo(item, current))
        .map(item => ({ item, score: scoreRelatedVideo(item, current) }))
        .sort((a, b) => b.score - a.score)
        .map(({ item }) => item)
        .slice(0, limit)
);

const buildRecommendMetadata = (room: Room) => ({
    duration: 1,
    watchTime: 0,
    price: Number(room.price || 0),
    locationMatch: 0,
    categoryMatch: 0,
    district: room.district || '',
    ward: room.ward || '',
    province: room.province || '',
    propertyType: room.propertyType || '',
    transactionType: room.transactionType || '',
});

const trackPropertyEngagement = (room: Room, action: RecommendAction, canTrackUserBehavior: boolean) => {
    if (!room?.id || !canTrackUserBehavior) return;

    if (action === 'VIEW') roomService.trackView(room.id).catch(() => { });
    if (action === 'CONTACT') roomService.trackContact(room.id).catch(() => { });
    if (action === 'SHARE') roomService.trackShare(room.id).catch(() => { });

    recommendApi.trackBehavior(
        room.id,
        room.videoUrl ? 'REEL' : 'PROPERTY',
        action,
        buildRecommendMetadata(room)
    ).catch(() => { });
};

export default function PropertyDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { router, safePush } = useSafeRouter();
    const insets = useSafeAreaInsets();
    const { currentRoom, fetchRoomDetail, isLoading, error: storeError } = usePropertyStore();
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
    } = useInteractionStore();

    const [activeTab, setActiveTab] = useState<'info' | 'reviews' | 'comments'>('info');
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
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [similarRooms, setSimilarRooms] = useState<Room[]>([]);
    const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);
    const [relatedReels, setRelatedReels] = useState<RelatedVideoItem[]>([]);
    const [isLoadingRelatedReels, setIsLoadingRelatedReels] = useState(false);
    const [mapLoadState, setMapLoadState] = useState<MapLoadState>('loading');
    const [fullMapLoadState, setFullMapLoadState] = useState<MapLoadState>('loading');
    const [isEnsuringRouteRoom, setIsEnsuringRouteRoom] = useState(true);

    const roomId = Number(id);
    const hasValidRoomId = Number.isFinite(roomId) && roomId > 0;
    const currentRoomMatchesRoute = hasValidRoomId && !!currentRoom && String(currentRoom.id) === String(roomId);
    const room = currentRoomMatchesRoute ? currentRoom : null;
    const videoUrl = room?.videoUrl?.trim() || null;
    const isSavedForRoom = isPropertySaved(roomId);
    const isLikedForRoom = isLiked(roomId);
    const canTrackUserBehavior = isAuthenticated && Number.isFinite(Number(user?.id)) && Number(user?.id) > 0;

    const videoPlayer = useVideoPlayer(videoUrl, player => {
        player.loop = false;
        player.muted = false;
    });

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

    useFocusEffect(
        useCallback(() => {
            if (!hasValidRoomId) {
                setIsEnsuringRouteRoom(false);
                return;
            }

            let active = true;
            const shouldFetchRouteRoom = !currentRoomMatchesRoute || !!storeError;

            if (shouldFetchRouteRoom) {
                setIsEnsuringRouteRoom(true);
                fetchRoomDetail(roomId).finally(() => {
                    if (active) setIsEnsuringRouteRoom(false);
                });
            } else {
                setIsEnsuringRouteRoom(false);
            }

            return () => {
                active = false;
                setIsEnsuringRouteRoom(true);
            };
        }, [hasValidRoomId, roomId, currentRoomMatchesRoute, storeError, fetchRoomDetail])
    );

    useEffect(() => {
        if (hasValidRoomId) {
            fetchComments(roomId, true);
        }
    }, [hasValidRoomId, roomId]);

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
        setMapLoadState('loading');
        setFullMapLoadState('loading');
    }, [room?.id, room?.latitude, room?.longitude]);

    useEffect(() => {
        if (showFullMap) setFullMapLoadState('loading');
    }, [showFullMap, room?.id]);

    useEffect(() => {
        if (room?.id) {
            trackPropertyEngagement(room, 'VIEW', canTrackUserBehavior);
        }
    }, [room?.id, canTrackUserBehavior]);

    useEffect(() => {
        if (!room?.id) return;
        let cancelled = false;

        const fetchRelatedContent = async () => {
            setIsLoadingSimilar(true);
            setIsLoadingRelatedReels(true);

            const fetchStrictRoomFallback = async () => {
                const res = await roomService.getRooms({ page: 0, size: 20 });
                const rooms = getRoomListFromResponse(res);
                return pickSimilarRooms(rooms, room, 6, true);
            };

            const fetchStrictReelFallback = async () => {
                const res = await reelsApi.getFeed(12);
                return pickRelatedVideos(res.items || [], room, 6);
            };

            try {
                const similar = await roomService.getSimilarRooms(room.id);
                let nextRooms = pickSimilarRooms(similar, room, 6);
                let nextReels = pickRelatedVideos(similar, room, 6);

                if (nextRooms.length === 0) {
                    try {
                        nextRooms = await fetchStrictRoomFallback();
                    } catch {
                        nextRooms = [];
                    }
                }

                if (nextReels.length === 0) {
                    try {
                        nextReels = await fetchStrictReelFallback();
                    } catch {
                        nextReels = [];
                    }
                }

                if (!cancelled) {
                    setSimilarRooms(nextRooms);
                    setRelatedReels(nextReels);
                }
            } catch {
                try {
                    const [nextRooms, nextReels] = await Promise.all([
                        fetchStrictRoomFallback().catch(() => []),
                        fetchStrictReelFallback().catch(() => []),
                    ]);

                    if (!cancelled) {
                        setSimilarRooms(nextRooms);
                        setRelatedReels(nextReels);
                    }
                } catch {
                    if (!cancelled) {
                        setSimilarRooms([]);
                        setRelatedReels([]);
                    }
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingSimilar(false);
                    setIsLoadingRelatedReels(false);
                }
            }
        };

        fetchRelatedContent();
        return () => { cancelled = true; };
    }, [room?.id]);

    useEffect(() => {
        try {
            if (showVideoModal && videoUrl) {
                videoPlayer.play();
            } else {
                videoPlayer.pause();
            }
        } catch { }
    }, [showVideoModal, videoPlayer, videoUrl]);

    useEffect(() => {
        if (!videoUrl && showVideoModal) setShowVideoModal(false);
        return () => {
            try { videoPlayer.pause(); } catch { }
        };
    }, [showVideoModal, videoPlayer, videoUrl]);

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
        try {
            await toggleSaveInteraction(roomId);
        } catch {
            Alert.alert('Lỗi', 'Không thể lưu tin. Vui lòng thử lại.');
        }
    };

    const handleLike = async () => {
        if (!isAuthenticated) { safePush('/(auth)/login' as any); return; }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await toggleLike(roomId);
        } catch {
        }
    };

    const handleShare = async () => {
        try {
            const sharePriceText = room
                ? `${formatCompactVND(room.price)}${room.transactionType === 'FOR_SALE' ? ' đ' : ' đ/tháng'}`
                : 'Thỏa thuận';
            const result = await Share.share({
                message: `${room?.title}\n${room ? getFullAddress(room) : ''}\nGiá: ${sharePriceText}\n\nXem thêm trên HomeVerse`,
                title: room?.title,
            });
            if (room && result.action !== Share.dismissedAction) {
                trackPropertyEngagement(room, 'SHARE', canTrackUserBehavior);
            }
        } catch { }
    };

    const openVideoModal = () => {
        if (!videoUrl) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowVideoModal(true);
    };

    const closeVideoModal = () => {
        try { videoPlayer.pause(); } catch { }
        setShowVideoModal(false);
    };

    const handleCall = () => {
        if (!isAuthenticated) { safePush('/(auth)/login' as any); return; }
        const ownerPhone = room ? getOwnerPhone(room) : undefined;
        if (ownerPhone) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            trackPropertyEngagement(room!, 'CONTACT', canTrackUserBehavior);
            Linking.openURL(`tel:${ownerPhone}`);
        } else {
            Alert.alert('Thông báo', 'Số điện thoại chủ nhà chưa được cập nhật.');
        }
    };

 const handleChat = () => {
    if (!isAuthenticated) { safePush('/(auth)/login' as any); return; }
    if (!room) return;

    trackPropertyEngagement(room, 'CONTACT', canTrackUserBehavior);

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
            mediaTypes: ['images'],
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
        if (room) {
            trackPropertyEngagement(room, 'CONTACT', canTrackUserBehavior);
        }
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

    const isRouteRoomStale = hasValidRoomId && !!currentRoom && !currentRoomMatchesRoute;

    if (isLoading || isEnsuringRouteRoom || isRouteRoomStale) {
        return (
            <View style={styles.loadingContainer}>
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator size="large" color="#f96302" />
                <Text style={styles.loadingText}>Đang tải thông tin...</Text>
            </View>
        );
    }

    if (!room) {
        return (
            <View style={styles.errorContainer}>
                <Stack.Screen options={{ headerShown: false }} />
                <Ionicons name="alert-circle-outline" size={64} color="#FF4D6D" />
                <Text style={styles.errorTitle}>Không thể tải bất động sản</Text>
                <Text style={styles.errorMessage}>
                    {storeError || 'Tin đăng không tồn tại hoặc đã bị gỡ.'}
                </Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => {
                    setIsEnsuringRouteRoom(true);
                    fetchRoomDetail(roomId).finally(() => setIsEnsuringRouteRoom(false));
                }}>
                    <Ionicons name="refresh" size={18} color="white" />
                    <Text style={styles.retryBtnText}>Thử lại</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={18} color="#f96302" />
                    <Text style={styles.backBtnText}>Quay lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const isOwner = user && room && user.id === room.ownerId;
    const shortDesc = room.description?.slice(0, 150);
    const isLongDesc = (room.description?.length || 0) > 150;
    const statusBadge = getStatusBadge(room.status);
    const promotionBadge = getPromotionBadgeLabel(room);
    const ownerName = getOwnerName(room);
    const ownerAvatar = getOwnerAvatar(room);
    const galleryImages = room.images?.length > 0 ? room.images : [FALLBACK_PROPERTY_IMAGE];
    const previewImage = room.images?.[0] || FALLBACK_PROPERTY_IMAGE;
    const hasVideo = !!videoUrl;
    const hasMapCoordinates = !!(room.latitude && room.longitude);

    return (
        <View style={styles.wrapper}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="light-content" />

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Header media */}
                <View style={{ position: 'relative' }}>
                    {hasVideo ? (
                        <TouchableOpacity
                            style={styles.videoPreview}
                            activeOpacity={0.92}
                            onPress={openVideoModal}
                        >
                            <Image
                                source={{ uri: previewImage }}
                                style={styles.videoPreviewImage}
                                contentFit="cover"
                            />
                            <View style={styles.videoPreviewScrim} />
                            <View style={styles.videoBadge}>
                                <Ionicons name="videocam" size={13} color="white" />
                                <Text style={styles.videoBadgeText}>Video thực tế</Text>
                            </View>
                            {room.images?.length > 0 && (
                                <View style={styles.mediaCountBadge}>
                                    <Ionicons name="images-outline" size={13} color="white" />
                                    <Text style={styles.mediaCountText}>{room.images.length} ảnh</Text>
                                </View>
                            )}
                            <View style={styles.videoPlayButton}>
                                <Ionicons name="play" size={34} color="white" style={{ marginLeft: 4 }} />
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <ImageGallery
                            images={galleryImages}
                            compact
                        />
                    )}
                    <View style={[styles.galleryOverlayTop, { top: insets.top + 8 }]}>
                        <TouchableOpacity style={styles.overlayBtn} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={22} color="white" />
                        </TouchableOpacity>
                        <View style={styles.overlayRightBtns}>
                            <TouchableOpacity style={styles.overlayBtn} onPress={handleShare}>
                                <Ionicons name="share-social-outline" size={22} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.overlayBtn} onPress={handleLike}>
                                <Ionicons name={isLikedForRoom ? 'heart' : 'heart-outline'} size={22} color={isLikedForRoom ? '#FF4D6D' : 'white'} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.overlayBtn} onPress={handleFavorite}>
                                <Ionicons name={isSavedForRoom ? 'bookmark' : 'bookmark-outline'} size={22} color={isSavedForRoom ? '#FFB800' : 'white'} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {hasVideo && room.images?.length > 0 && (
                    <ImageGallery
                        images={galleryImages}
                        compact
                    />
                )}

                <View style={styles.content}>
                    <View style={styles.heroCard}>
                    {/* Price & Status */}
                    <View style={styles.priceRow}>
                        <View>
                            <Text style={styles.price}>{formatCompactVND(room.price)}</Text>
                            <Text style={styles.priceUnit}>{room.transactionType === 'FOR_SALE' ? 'Giá bán' : 'đồng / tháng'}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                            <Text style={[styles.statusText, { color: statusBadge.color }]}>{statusBadge.label}</Text>
                        </View>
                    </View>

                    <Text style={styles.title} numberOfLines={3}>{room.title}</Text>
                    <View style={styles.metaRow}>
                        <Ionicons name="time-outline" size={13} color="#8A94A6" />
                        <Text style={styles.metaText}>Đăng ngày {formatCreatedAt(room.createdAt)}</Text>
                    </View>

                    {/* Badges — loại giao dịch / Tin nổi bật / Dự án */}
                    <View style={styles.badgeRow}>
                        <View style={styles.transactionBadge}>
                            <Text style={styles.transactionBadgeText}>{getLabel(TRANSACTION_TYPE_LABELS, room.transactionType)}</Text>
                        </View>
                        {promotionBadge && (
                            <View style={styles.promotedBadge}>
                                <Text style={styles.promotedBadgeText}>{promotionBadge}</Text>
                            </View>
                        )}
                        {!!room.projectNameSnapshot && (
                            <View style={styles.projectBadge}>
                                <Ionicons name="business-outline" size={12} color="#f96302" />
                                <Text style={styles.projectBadgeText} numberOfLines={1}>{room.projectNameSnapshot}</Text>
                            </View>
                        )}
                    </View>

                    {/* Address */}
                    <TouchableOpacity style={styles.addressRow} onPress={handleNavigate} activeOpacity={0.7}>
                        <Ionicons name="location" size={16} color="#f96302" />
                        <Text style={styles.addressText} numberOfLines={2}>{getFullAddress(room)}</Text>
                        <View style={styles.directionChip}>
                            <Ionicons name="navigate-outline" size={12} color="#f96302" />
                            <Text style={styles.directionText}>Chỉ đường</Text>
                        </View>
                    </TouchableOpacity>

                    {userDistance && (
                        <View style={styles.distanceBadge}>
                            <Ionicons name="walk-outline" size={14} color="#f96302" />
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

                    </View>

                    {/* Quick Stats */}
                    <View style={styles.statsGrid}>
                        {!!room.area && (
                            <View style={styles.statItem}>
                                <Ionicons name="resize-outline" size={22} color="#f96302" />
                                <Text style={styles.statValue}>{room.area} m²</Text>
                                <Text style={styles.statLabel}>Diện tích</Text>
                            </View>
                        )}
                        {room.bedrooms !== undefined && (
                            <View style={styles.statItem}>
                                <Ionicons name="bed-outline" size={22} color="#f96302" />
                                <Text style={styles.statValue}>{room.bedrooms}</Text>
                                <Text style={styles.statLabel}>Phòng ngủ</Text>
                            </View>
                        )}
                        {room.bathrooms !== undefined && (
                            <View style={styles.statItem}>
                                <Ionicons name="water-outline" size={22} color="#f96302" />
                                <Text style={styles.statValue}>{room.bathrooms}</Text>
                                <Text style={styles.statLabel}>Phòng tắm</Text>
                            </View>
                        )}
                        {room.capacity !== undefined && (
                            <View style={styles.statItem}>
                                <Ionicons name="people-outline" size={22} color="#f96302" />
                                <Text style={styles.statValue}>{room.capacity}</Text>
                                <Text style={styles.statLabel}>Sức chứa</Text>
                            </View>
                        )}
                        {room.hasBalcony !== undefined && (
                            <View style={styles.statItem}>
                                <Ionicons name="home-outline" size={22} color="#f96302" />
                                <Text style={styles.statValue}>{room.hasBalcony ? 'Có' : 'Không'}</Text>
                                <Text style={styles.statLabel}>Ban công</Text>
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
                                    <Text style={styles.detailGroupTitle}>Thông tin BĐS</Text>
                                    <DetailRow label="Loại BĐS" value={getLabel(PROPERTY_TYPE_LABELS, room.propertyType)} />
                                    <DetailRow label="Giao dịch" value={getLabel(TRANSACTION_TYPE_LABELS, room.transactionType)} />
                                    {!!room.area && <DetailRow label="Diện tích" value={`${room.area} m²`} />}
                                    {room.bedrooms !== undefined && room.bedrooms !== null && <DetailRow label="Phòng ngủ" value={`${room.bedrooms}`} />}
                                    {room.bathrooms !== undefined && room.bathrooms !== null && <DetailRow label="Phòng tắm" value={`${room.bathrooms}`} />}
                                    {room.capacity !== undefined && room.capacity !== null && <DetailRow label="Sức chứa" value={`${room.capacity} người`} />}
                                    {room.hasBalcony !== undefined && <DetailRow label="Ban công" value={room.hasBalcony ? 'Có' : 'Không'} />}
                                    {!!room.furnishingStatus && <DetailRow label="Nội thất" value={getLabel(FURNISHING_LABELS, room.furnishingStatus)} />}
                                    {!!room.availabilityStatus && <DetailRow label="Tình trạng vào ở" value={getLabel(AVAILABILITY_LABELS, room.availabilityStatus)} />}
                                    {(room.electricityPrice || room.waterPrice || room.internetPrice) && (
                                        <Text style={styles.detailGroupTitle}>Chi phí tiện ích</Text>
                                    )}
                                    {!!room.electricityPrice && <DetailRow label="Tiền điện" value={getLabel(UTILITY_PRICE_LABELS, room.electricityPrice)} />}
                                    {!!room.waterPrice && <DetailRow label="Tiền nước" value={getLabel(UTILITY_PRICE_LABELS, room.waterPrice)} />}
                                    {!!room.internetPrice && <DetailRow label="Internet" value={getLabel(UTILITY_PRICE_LABELS, room.internetPrice)} />}
                                    {(room.legalDocumentType || room.createdAt) && (
                                        <Text style={styles.detailGroupTitle}>Pháp lý & thời gian</Text>
                                    )}
                                    {!!room.legalDocumentType && <DetailRow label="Giấy tờ pháp lý" value={getLabel(LEGAL_DOC_LABELS, room.legalDocumentType)} />}
                                    <DetailRow label="Ngày đăng" value={formatCreatedAt(room.createdAt)} />
                                </View>
                            </View>

                            {/* Amenities */}
                            {room.amenities && room.amenities.length > 0 && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>✨ Tiện ích</Text>
                                    <View style={styles.amenitiesGrid}>
                                        {room.amenities.map((amenity, index) => (
                                            <View key={index} style={styles.amenityItem}>
                                                <Ionicons name={getAmenityIcon(amenity) as any} size={18} color="#f96302" />
                                                <Text style={styles.amenityText}>{amenity}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* ✅ Map - Leaflet WebView (thay MapView Google) */}
                            {hasMapCoordinates && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Vị trí bất động sản</Text>
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
                                            onLoadStart={() => setMapLoadState('loading')}
                                            onLoad={() => setMapLoadState('ready')}
                                            onError={() => setMapLoadState('error')}
                                        />
                                        {mapLoadState === 'loading' && (
                                            <View style={styles.mapStateOverlay} pointerEvents="none">
                                                <ActivityIndicator size="small" color="#f96302" />
                                            </View>
                                        )}
                                        {mapLoadState === 'error' && (
                                            <View style={styles.mapStateOverlay}>
                                                <Ionicons name="map-outline" size={22} color="#f96302" />
                                                <Text style={styles.mapStateText}>Không tải được bản đồ, vui lòng thử lại sau</Text>
                                            </View>
                                        )}
                                        <View style={styles.mapExpandBtn}>
                                            <Ionicons name="expand-outline" size={16} color="#f96302" />
                                            <Text style={styles.mapExpandText}>Xem bản đồ đầy đủ</Text>
                                        </View>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.addressNavRow} onPress={handleNavigate}>
                                        <Ionicons name="location" size={16} color="#f96302" />
                                        <Text style={styles.fullAddress} numberOfLines={2}>{getFullAddress(room)}</Text>
                                        <View style={styles.directionBtn}>
                                            <Ionicons name="navigate" size={14} color="white" />
                                            <Text style={styles.directionBtnText}>Chỉ đường</Text>
                                        </View>
                                    </TouchableOpacity>

                                </View>
                            )}

                            {!hasMapCoordinates && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Vị trí bất động sản</Text>
                                    <View style={styles.mapFallbackCard}>
                                        <Ionicons name="location-outline" size={24} color="#f96302" />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.mapFallbackTitle}>Chưa có tọa độ bản đồ</Text>
                                            <Text style={styles.mapFallbackText} numberOfLines={2}>{getFullAddress(room) || 'Địa chỉ đang được cập nhật.'}</Text>
                                        </View>
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
                                                <Ionicons name="checkmark-circle" size={14} color="#f96302" />
                                                <Text style={styles.verifiedText}>Đã xác minh</Text>
                                            </View>
                                            <Text style={{ fontSize: 12, color: '#f96302', marginTop: 2 }}>Xem hồ sơ →</Text>
                                        </View>
                                        <View style={styles.landlordBtns}>
                                            <TouchableOpacity style={styles.landlordCallBtn} onPress={handleCall}>
                                                <Ionicons name="call" size={18} color="white" />
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.landlordChatBtn} onPress={handleChat}>
                                                <Ionicons name="chatbubble-ellipses" size={18} color="#f96302" />
                                            </TouchableOpacity>
                                            {!isOwner && (
                                                <TouchableOpacity style={styles.landlordScheduleBtn} onPress={() => {
                                                    if (!isAuthenticated) { safePush('/(auth)/login' as any); return; }
                                                    openBookingModal();
                                                }}>
                                                    <Ionicons name="calendar-outline" size={18} color="#FF6B35" />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {(isLoadingSimilar || similarRooms.length > 0) && (
                                <View style={styles.section}>
                                    <SectionHeader
                                        title="Có thể bạn quan tâm"
                                        subtitle="Các tin tương tự từ hệ thống"
                                    />
                                    {isLoadingSimilar ? (
                                        <View style={styles.relatedLoading}>
                                            <ActivityIndicator size="small" color="#f96302" />
                                        </View>
                                    ) : (
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedList}>
                                            {similarRooms.map(item => (
                                                <SimilarRoomCard
                                                    key={item.id}
                                                    item={item}
                                                    onPress={() => {
                                                        if (item.id !== room.id) safePush(`/property/${item.id}` as any);
                                                    }}
                                                />
                                            ))}
                                        </ScrollView>
                                    )}
                                </View>
                            )}

                            {(isLoadingRelatedReels || relatedReels.length > 0) && (
                                <View style={styles.section}>
                                    <SectionHeader
                                        title="Video thực tế liên quan"
                                        subtitle="Xem nhanh các tin có video"
                                    />
                                    {isLoadingRelatedReels ? (
                                        <View style={styles.relatedLoading}>
                                            <ActivityIndicator size="small" color="#f96302" />
                                        </View>
                                    ) : (
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedList}>
                                            {relatedReels.map(item => (
                                                <RelatedReelCard
                                                    key={item.id}
                                                    item={item}
                                                    onPress={() => {
                                                        if (item.id !== room.id) safePush(`/property/${item.id}` as any);
                                                    }}
                                                />
                                            ))}
                                        </ScrollView>
                                    )}
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
                                    <Ionicons name="log-in-outline" size={16} color="#f96302" />
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
                                                source={{ uri: getCommentAvatar(c) || buildAvatarPlaceholderUri(getCommentDisplayName(c), '#FFF7ED', '#f96302') }}
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
                                    <Ionicons name="create-outline" size={18} color="#f96302" />
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
                    <Text style={styles.bottomUnit}>{room.transactionType === 'FOR_SALE' ? 'Giá bán' : '/tháng'}</Text>
                </View>
                {user?.id === room.ownerId ? (
                    <View style={styles.bottomBtns}>
                        <TouchableOpacity style={styles.scheduleBtn} onPress={() => safePush(`/packages/boost/${roomId}` as any)}>
                            <Ionicons name="rocket-outline" size={18} color="#f96302" />
                            <Text style={styles.scheduleBtnText}>Boost tin</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.chatBtn} onPress={() => safePush('/edit-profile' as any)}>
                            <Ionicons name="create-outline" size={18} color="white" />
                            <Text style={styles.chatBtnText}>Sửa thông tin</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.bottomBtns}>
                        <TouchableOpacity style={styles.bottomCallBtn} onPress={handleCall}>
                            <Ionicons name="call" size={18} color="#f96302" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.scheduleBtn} onPress={() => {
                            if (!isAuthenticated) { safePush('/(auth)/login' as any); return; }
                            openBookingModal();
                        }}>
                            <Ionicons name="calendar-outline" size={18} color="#f96302" />
                            <Text style={styles.scheduleBtnText}>Đặt lịch</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.chatBtn} onPress={handleChat}>
                            <Ionicons name="chatbubble-ellipses" size={18} color="white" />
                            <Text style={styles.chatBtnText}>Chat</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* ===== VIDEO MODAL ===== */}
            <Modal
                visible={showVideoModal}
                animationType="fade"
                onRequestClose={closeVideoModal}
                supportedOrientations={['portrait', 'landscape']}
            >
                <View style={styles.videoModalContainer}>
                    <StatusBar hidden />
                    <VideoView
                        player={videoPlayer}
                        style={styles.videoModalPlayer}
                        nativeControls
                        contentFit="contain"
                    />
                    <TouchableOpacity
                        style={[styles.videoModalClose, { top: insets.top + 12 }]}
                        onPress={closeVideoModal}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="close" size={28} color="white" />
                    </TouchableOpacity>
                </View>
            </Modal>

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

                    {hasMapCoordinates ? (
                        <>
                            <View style={styles.fullMapBody}>
                                <WebView
                                    style={{ flex: 1 }}
                                    source={{
                                        html: buildLeafletHtml(
                                            room.latitude,
                                            room.longitude,
                                            room.title,
                                            true,
                                            15
                                        )
                                    }}
                                    originWhitelist={['*']}
                                    javaScriptEnabled
                                    onLoadStart={() => setFullMapLoadState('loading')}
                                    onLoad={() => setFullMapLoadState('ready')}
                                    onError={() => setFullMapLoadState('error')}
                                />
                                {fullMapLoadState === 'loading' && (
                                    <View style={styles.mapStateOverlay} pointerEvents="none">
                                        <ActivityIndicator size="small" color="#f96302" />
                                    </View>
                                )}
                                {fullMapLoadState === 'error' && (
                                    <View style={styles.mapStateOverlay}>
                                        <Ionicons name="map-outline" size={28} color="#f96302" />
                                        <Text style={styles.mapStateText}>Không tải được bản đồ, vui lòng thử lại sau</Text>
                                    </View>
                                )}
                            </View>

                            <View style={[styles.fullMapBottom, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                                <TouchableOpacity style={styles.fullMapNavBtn} onPress={handleNavigate}>
                                    <Ionicons name="navigate" size={20} color="white" />
                                    <Text style={styles.fullMapNavText}>🧭 Chỉ đường đến đây</Text>
                                </TouchableOpacity>
                                {userDistance && <Text style={styles.fullMapDistance}>📏 {userDistance} từ bạn</Text>}
                            </View>
                        </>
                    ) : (
                        <View style={styles.fullMapFallback}>
                            <Ionicons name="location-outline" size={32} color="#f96302" />
                            <Text style={styles.mapFallbackTitle}>Chưa có tọa độ bản đồ</Text>
                            <Text style={styles.mapFallbackText} numberOfLines={2}>{getFullAddress(room) || 'Địa chỉ đang được cập nhật.'}</Text>
                        </View>
                    )}
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
                                    <Ionicons name="camera-outline" size={24} color="#f96302" />
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
                                <Text style={styles.bookingQuickText}>-1 ngày</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.bookingQuickBtn} onPress={() => setBookingDate(formatBookingInput(getDefaultBookingDate()))}>
                                <Text style={styles.bookingQuickText}>Hôm nay</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.bookingQuickBtn} onPress={setTomorrowBooking}>
                                <Text style={styles.bookingQuickText}>Ngày mai</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.bookingQuickBtn} onPress={() => adjustBookingDay(1)}>
                                <Text style={styles.bookingQuickText}>+1 ngày</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.bookingHint}>Mặc định là khung giờ gần nhất trong tương lai. Không thể đặt lịch quá khứ.</Text>
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

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
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

function SimilarRoomCard({ item, onPress }: { item: Room; onPress: () => void }) {
    const hasThumbnail = !!item.images?.[0];
    const thumbnail = hasThumbnail ? item.images[0] : FALLBACK_PROPERTY_IMAGE;
    const promotionBadge = getPromotionBadgeLabel(item);
    return (
        <TouchableOpacity style={styles.relatedCard} activeOpacity={0.86} onPress={onPress}>
            <View style={styles.relatedImageWrap}>
                <Image source={{ uri: thumbnail }} style={styles.relatedImage} contentFit="cover" />
                {!hasThumbnail && (
                    <View style={styles.noImageBadge}>
                        <Text style={styles.noImageBadgeText}>Chưa có ảnh</Text>
                    </View>
                )}
                <View style={styles.relatedBadgeRow}>
                    {promotionBadge && (
                        <View style={styles.relatedBadge}>
                            <Text style={styles.relatedBadgeText}>{promotionBadge}</Text>
                        </View>
                    )}
                    {!!item.videoUrl && (
                        <View style={styles.relatedBadge}>
                            <Ionicons name="videocam" size={10} color="white" />
                            <Text style={styles.relatedBadgeText}>Video</Text>
                        </View>
                    )}
                </View>
            </View>
            <View style={styles.relatedCardBody}>
                <Text style={styles.relatedCardTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.relatedCardPrice}>{formatCompactVND(item.price)}</Text>
                <View style={styles.relatedAddressRow}>
                    <Ionicons name="location-outline" size={12} color="#6B7280" />
                    <Text style={styles.relatedAddressText} numberOfLines={1}>{item.address}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

function RelatedReelCard({ item, onPress }: { item: RelatedVideoItem; onPress: () => void }) {
    const thumbnail = getRelatedVideoThumbnail(item);
    const hasThumbnail = thumbnail !== FALLBACK_PROPERTY_IMAGE;
    return (
        <TouchableOpacity style={styles.reelCard} activeOpacity={0.86} onPress={onPress}>
            <View style={styles.reelImageWrap}>
                <Image source={{ uri: thumbnail }} style={styles.reelImage} contentFit="cover" />
                {!hasThumbnail && (
                    <View style={styles.noImageBadge}>
                        <Text style={styles.noImageBadgeText}>Chưa có ảnh</Text>
                    </View>
                )}
                <View style={styles.reelScrim} />
                <View style={styles.reelPlayButton}>
                    <Ionicons name="play" size={22} color="white" style={{ marginLeft: 2 }} />
                </View>
                <View style={styles.reelBadge}>
                    <Ionicons name="videocam" size={10} color="white" />
                    <Text style={styles.relatedBadgeText}>Video</Text>
                </View>
            </View>
            <View style={styles.relatedCardBody}>
                <Text style={styles.relatedCardTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.relatedCardPrice}>{formatCompactVND(item.price)}</Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    wrapper: { flex: 1, backgroundColor: '#F5F7FB' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: '#F5F7FB' },
    loadingText: { color: '#6B7280', fontSize: 14, fontWeight: '600' },
    // Error state
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, paddingHorizontal: 32 },
    errorTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', textAlign: 'center' },
    errorMessage: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
    retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f96302', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
    retryBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: '#f96302', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
    backBtnText: { color: '#f96302', fontWeight: '600', fontSize: 14 },
    container: { flex: 1 },
    content: { padding: 16, paddingBottom: 8 },
    galleryOverlayTop: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    overlayBtn: { backgroundColor: 'rgba(17,24,39,0.58)', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
    overlayRightBtns: { flexDirection: 'row', gap: 8 },
    videoPreview: { width, height: 258, backgroundColor: '#111827', overflow: 'hidden' },
    videoPreviewImage: { width: '100%', height: '100%' },
    videoPreviewScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
    videoBadge: { position: 'absolute', left: 16, bottom: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.58)', borderRadius: 18, paddingHorizontal: 11, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
    videoBadgeText: { color: 'white', fontSize: 12, fontWeight: '800' },
    mediaCountBadge: { position: 'absolute', right: 16, bottom: 16, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.58)', borderRadius: 18, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
    mediaCountText: { color: 'white', fontSize: 12, fontWeight: '800' },
    videoPlayButton: { position: 'absolute', alignSelf: 'center', top: 99, width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(249,99,2,0.94)', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6 },
    heroCard: { backgroundColor: 'white', borderRadius: 18, padding: 16, marginTop: -20, marginBottom: 16, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 18, elevation: 4 },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
    price: { fontSize: 28, fontWeight: '900', color: '#FF6B35', letterSpacing: 0 },
    priceUnit: { fontSize: 12, color: '#8A94A6', marginTop: 2, fontWeight: '700' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusText: { fontSize: 12, fontWeight: '600' },
    title: { fontSize: 19, fontWeight: '800', color: '#111827', marginTop: 10, marginBottom: 6, lineHeight: 26, letterSpacing: 0 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
    metaText: { color: '#8A94A6', fontSize: 12, fontWeight: '600' },
    // Badge chips
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    transactionBadge: { backgroundColor: '#FFF7ED', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#FED7AA' },
    transactionBadgeText: { fontSize: 12, fontWeight: '800', color: '#f96302' },
    promotedBadge: { backgroundColor: '#FFF8E1', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#FFD54F' },
    promotedBadgeText: { fontSize: 12, fontWeight: '700', color: '#F57F17' },
    projectBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF7ED', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#FDBA74' },
    projectBadgeText: { fontSize: 12, fontWeight: '600', color: '#f96302', maxWidth: 200 },
    addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, backgroundColor: '#FFF7ED', padding: 11, borderRadius: 12, borderWidth: 1, borderColor: '#E7EEF9' },
    directionChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FFF3E8', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    directionText: { fontSize: 11, color: '#f96302', fontWeight: '600' },
    distanceBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF7ED', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 8 },
    distanceText: { fontSize: 13, color: '#f96302', fontWeight: '600' },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    stars: { flexDirection: 'row', gap: 2 },
    ratingText: { fontSize: 13, color: '#666' },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, backgroundColor: 'white', borderRadius: 18, padding: 12, marginBottom: 18, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
    statItem: { width: '31%', minHeight: 78, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#F8FAFC', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 4 },
    statValue: { fontSize: 15, fontWeight: '800', color: '#111827', textAlign: 'center' },
    statLabel: { fontSize: 11, color: '#7B8494', textAlign: 'center', fontWeight: '600' },
    tabBar: { flexDirection: 'row', backgroundColor: '#E9EEF6', borderRadius: 14, padding: 4, marginBottom: 20 },
    addressText: { flex: 1, fontSize: 13, color: '#555' },

    tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
    tabActive: { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    tabText: { fontSize: 14, color: '#888' },
    tabTextActive: { fontWeight: '700', color: '#1A1A1A' },
    section: { marginBottom: 20 },
    sectionHeader: { marginBottom: 12 },
    sectionTitle: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 10, letterSpacing: 0 },
    sectionSubtitle: { fontSize: 12, color: '#7B8494', lineHeight: 17, marginTop: -4 },
    description: { fontSize: 14, color: '#4B5563', lineHeight: 23, backgroundColor: 'white', borderRadius: 16, padding: 14, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
    seeMoreBtn: { color: '#f96302', fontWeight: '800', marginTop: 8, fontSize: 14 },
    detailsGrid: { backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    detailGroupTitle: { backgroundColor: '#F8FAFC', color: '#667085', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F4F8' },
    detailLabel: { flex: 0.44, fontSize: 13, color: '#7B8494', lineHeight: 19 },
    detailValue: { flex: 0.56, fontSize: 14, fontWeight: '700', color: '#111827', textAlign: 'right', lineHeight: 20 },
    amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, backgroundColor: 'white', borderRadius: 16, padding: 12, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
    amenityItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF7ED', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: '#FED7AA' },
    amenityText: { fontSize: 12, color: '#334155', fontWeight: '700' },
    mapContainer: { borderRadius: 16, overflow: 'hidden', marginBottom: 10, height: 176, backgroundColor: '#E5E7EB', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    map: { flex: 1 },
    mapStateOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 18, backgroundColor: 'rgba(248,250,252,0.94)' },
    mapStateText: { color: '#475569', fontSize: 13, fontWeight: '700', textAlign: 'center', lineHeight: 18 },
    mapExpandBtn: { position: 'absolute', bottom: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'white', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
    mapExpandText: { color: '#f96302', fontSize: 12, fontWeight: '600' },
    addressNavRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, backgroundColor: 'white', borderRadius: 14, marginBottom: 14, borderWidth: 1, borderColor: '#E7EEF9' },
    fullAddress: { flex: 1, fontSize: 13, color: '#444' },
    directionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f96302', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12 },
    directionBtnText: { color: 'white', fontSize: 12, fontWeight: '700' },
    mapFallbackCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'white', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E7EEF9' },
    mapFallbackTitle: { color: '#111827', fontSize: 14, fontWeight: '800', marginBottom: 3 },
    mapFallbackText: { color: '#667085', fontSize: 13, lineHeight: 18 },
    landlordCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 18, padding: 16, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
    landlordAvatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFF7ED' },
    landlordInfo: { flex: 1, marginLeft: 12 },
    landlordName: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
    verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    verifiedText: { fontSize: 12, color: '#f96302' },
    landlordBtns: { flexDirection: 'row', gap: 8 },
    landlordCallBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f96302', justifyContent: 'center', alignItems: 'center' },
    landlordChatBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF3E8', justifyContent: 'center', alignItems: 'center' },
    landlordScheduleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF2EA', justifyContent: 'center', alignItems: 'center' },
    relatedList: { gap: 12, paddingRight: 16, paddingBottom: 2 },
    relatedLoading: { height: 120, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white', borderRadius: 16 },
    relatedCard: { width: 184, backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 2 },
    relatedImageWrap: { height: 116, backgroundColor: '#E5E7EB' },
    relatedImage: { width: '100%', height: '100%' },
    relatedBadgeRow: { position: 'absolute', left: 8, top: 8, right: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    relatedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: 'rgba(17,24,39,0.72)', borderRadius: 12, paddingHorizontal: 7, paddingVertical: 4 },
    relatedBadgeText: { color: 'white', fontSize: 10, fontWeight: '800' },
    noImageBadge: { position: 'absolute', left: 8, bottom: 8, backgroundColor: 'rgba(17,24,39,0.72)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
    noImageBadgeText: { color: 'white', fontSize: 10, fontWeight: '800' },
    relatedCardBody: { padding: 11, gap: 5 },
    relatedCardTitle: { fontSize: 13, lineHeight: 18, color: '#1A1A1A', fontWeight: '700' },
    relatedCardPrice: { fontSize: 14, color: '#FF6B35', fontWeight: '800' },
    relatedAddressRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    relatedAddressText: { flex: 1, fontSize: 11, color: '#6B7280' },
    reelCard: { width: 166, backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 2 },
    reelImageWrap: { height: 158, backgroundColor: '#111827' },
    reelImage: { width: '100%', height: '100%' },
    reelScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.18)' },
    reelPlayButton: { position: 'absolute', alignSelf: 'center', top: 56, width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(249,99,2,0.94)', justifyContent: 'center', alignItems: 'center' },
    reelBadge: { position: 'absolute', left: 8, top: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.62)', borderRadius: 12, paddingHorizontal: 7, paddingVertical: 4 },
    ownerActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12 },
    ownerActionText: { fontSize: 15, fontWeight: '600' },
    reviewSummary: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
    bigRating: { fontSize: 48, fontWeight: '800', color: '#1A1A1A' },
    reviewCount: { fontSize: 13, color: '#888', marginTop: 4 },
    writeReviewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF3E8', padding: 12, borderRadius: 10, marginBottom: 16, justifyContent: 'center' },
    writeReviewText: { color: '#f96302', fontWeight: '600', fontSize: 14 },
    emptyReviews: { alignItems: 'center', paddingVertical: 32, gap: 8 },
    emptyText: { color: '#999', fontSize: 14 },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E8EDF5', shadowColor: '#0F172A', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 10 },
    bottomPriceInfo: { flexShrink: 1, marginRight: 8 },
    bottomPrice: { fontSize: 18, fontWeight: '900', color: '#FF6B35', letterSpacing: 0 },
    bottomUnit: { fontSize: 11, color: '#8A94A6', fontWeight: '700', marginTop: 1 },
    bottomBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    bottomCallBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FED7AA' },
    scheduleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: '#f96302', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: 'white' },
    scheduleBtnText: { color: '#f96302', fontWeight: '800', fontSize: 13 },
    chatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#f96302', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
    chatBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
    // Video modal
    videoModalContainer: { flex: 1, backgroundColor: 'black' },
    videoModalPlayer: { flex: 1 },
    videoModalClose: { position: 'absolute', right: 16, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
    // Full Map Modal
    fullMapContainer: { flex: 1, backgroundColor: 'white' },
    fullMapBody: { flex: 1, position: 'relative' },
    fullMapFallback: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 28, backgroundColor: '#F8FAFC' },
    fullMapHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    fullMapBack: { width: 40, height: 40, justifyContent: 'center' },
    fullMapTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
    fullMapBottom: { padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F0F0F0', gap: 8 },
    fullMapNavBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#f96302', borderRadius: 14, paddingVertical: 14, shadowColor: '#f96302', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
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
    bookingQuickBtn: { borderWidth: 1, borderColor: '#FED7AA', backgroundColor: '#FFF7ED', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
    bookingQuickText: { color: '#f96302', fontSize: 13, fontWeight: '700' },
    bookingHint: { color: '#777', fontSize: 12, lineHeight: 17, marginBottom: 14 },
    submitBtn: { backgroundColor: '#f96302', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    submitBtnDisabled: { backgroundColor: '#FDBA74' },
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
    commentSendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f96302', justifyContent: 'center', alignItems: 'center' },
    commentSendBtnDisabled: { backgroundColor: '#FDBA74' },
    loginToCommentBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', backgroundColor: '#FFF7ED', borderRadius: 10, paddingVertical: 12, marginBottom: 14 },
    loginToCommentText: { color: '#f96302', fontWeight: '600', fontSize: 14 },
    verifiedCount: { fontSize: 12, color: '#22C55E', marginTop: 2 },
});

