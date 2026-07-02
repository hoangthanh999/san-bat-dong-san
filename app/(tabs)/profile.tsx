import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    FlatList, RefreshControl, StatusBar, Platform, Alert, Switch, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useUserStore } from '../../store/userStore';
import { useAppointmentStore } from '../../store/appointmentStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useInteractionStore } from '../../store/interactionStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeRouter } from '../../hooks/useSafeRouter';
import { Skeleton } from '../../components/ui/Skeleton';
import { AuthGuardScreen } from '../../components/auth/AuthGuardScreen';
import { Room, Appointment } from '../../types';
import { InteractionPropertyDTO } from '../../services/api/interaction';
import { roomService } from '../../services/api/rooms';
import { useFocusEffect } from 'expo-router';
import { formatCompactVND } from '../../utils/formatPrice';

const isRentTransaction = (transactionType?: string) => {
    const type = String(transactionType || '').toUpperCase();
    return type === 'FOR_RENT' || type === 'RENT';
};

const formatPropertyPrice = (price?: number | string | null, transactionType?: string) => {
    const amount = typeof price === 'string' ? Number(price.replace(/[^\d.-]/g, '')) : Number(price);
    if (!Number.isFinite(amount) || amount <= 0) return 'Thỏa thuận';

    const base = formatCompactVND(amount);
    return isRentTransaction(transactionType) ? `${base} đ/tháng` : `${base} đ`;
};

function MiniRoomCard({ room, onPress, onEdit, onDelete }: {
    room: Room;
    onPress: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <TouchableOpacity style={styles.miniCard} onPress={onPress} activeOpacity={0.8}>
            <Image source={{ uri: room.images[0] || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400' }} style={styles.miniCardImg} contentFit="cover" />
            <View style={styles.miniCardBody}>
                <Text numberOfLines={2} style={styles.miniCardTitle}>{room.title}</Text>
                <Text style={styles.miniCardPrice}>{formatPropertyPrice(room.price, room.transactionType)}</Text>
                <View style={[styles.statusBadge, room.status === 'ACTIVE' ? styles.statusActive : styles.statusPending]}>
                    <Text style={[styles.statusText, room.status === 'ACTIVE' ? styles.statusActiveText : styles.statusPendingText]}>
                        {room.status === 'ACTIVE' ? 'Đang đăng' : room.status === 'PENDING' ? 'Chờ duyệt' : room.status}
                    </Text>
                </View>
                {/* Action buttons */}
                <View style={styles.miniCardActions}>
                    <TouchableOpacity style={styles.editBtn} onPress={onEdit} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                        <Ionicons name="create-outline" size={14} color="#f96302" />
                        <Text style={styles.editBtnText}>Sửa</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                        <Ionicons name="trash-outline" size={14} color="#EF4444" />
                        <Text style={styles.deleteBtnText}>Xóa</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
}

function SavedPropertyCard({
    item,
    onPress,
    onUnsave,
}: {
    item: InteractionPropertyDTO;
    onPress: () => void;
    onUnsave: () => void;
}) {
    return (
        <TouchableOpacity style={styles.savedCard} onPress={onPress} activeOpacity={0.85}>
            <Image
                source={{ uri: item.imageUrl || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400' }}
                style={styles.savedCardImg}
                contentFit="cover"
            />
            <View style={styles.savedCardBody}>
                <Text numberOfLines={2} style={styles.savedCardTitle}>{item.title}</Text>
                <Text style={styles.savedCardPrice}>{formatPropertyPrice(item.price, item.transactionType)}</Text>
                <Text style={styles.savedCardAddr} numberOfLines={1}>
                    <Ionicons name="location-outline" size={11} color="#888" /> {item.district || item.address}
                </Text>
                <View style={styles.savedCardBadgeRow}>
                    {item.propertyType && (
                        <View style={styles.typeBadge}>
                            <Text style={styles.typeBadgeText}>{item.propertyType}</Text>
                        </View>
                    )}
                    {item.transactionType && (
                        <View style={[styles.typeBadge, { backgroundColor: item.transactionType === 'FOR_SALE' ? '#FFF3E0' : '#E8F5E9' }]}>
                            <Text style={[styles.typeBadgeText, { color: item.transactionType === 'FOR_SALE' ? '#E65100' : '#2E7D32' }]}>
                                {item.transactionType === 'FOR_SALE' ? 'Mua bán' : 'Cho thuê'}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
            <TouchableOpacity
                style={styles.unsaveBtn}
                onPress={onUnsave}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                <Ionicons name="bookmark" size={20} color="#FFB800" />
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

function AppointmentChip({ appt }: { appt: Appointment }) {
    const date = new Date(appt.scheduledAt || appt.appointmentTime);
    const statusColor: Record<string, string> = {
        PENDING: '#FF9500',
        ACCEPTED: '#22C55E',
        REJECTED: '#EF4444',
        CANCELLED: '#EF4444',
        COMPLETED: '#f96302',
        SUGGESTED: '#8B5CF6',
    };
    const statusLabel: Record<string, string> = {
        PENDING: 'Chờ xác nhận',
        ACCEPTED: 'Đã chấp nhận',
        REJECTED: 'Đã từ chối',
        CANCELLED: 'Đã huỷ',
        COMPLETED: 'Hoàn thành',
        SUGGESTED: 'Đề xuất giờ mới',
    };
    const color = statusColor[appt.status] || '#888';
    return (
        <View style={styles.apptCard}>
            <View style={styles.apptDateBox}>
                <Text style={styles.apptDay}>{date.getDate()}</Text>
                <Text style={styles.apptMonth}>Tháng {date.getMonth() + 1}</Text>
            </View>
            <View style={styles.apptInfo}>
                <Text style={styles.apptRoom} numberOfLines={1}>{appt.roomTitle || appt.propertyTitle || `BDS #${appt.roomId}`}</Text>
                <Text style={styles.apptTime}>{date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</Text>
                <View style={[styles.apptStatus, { backgroundColor: `${color}20` }]}>
                    <Text style={[styles.apptStatusText, { color }]}>{statusLabel[appt.status] || appt.status}</Text>
                </View>
            </View>
        </View>
    );
}

export default function ProfileScreen() {
    return (
        <AuthGuardScreen
            message="Đăng nhập để xem hồ sơ cá nhân"
            icon="person-circle-outline"
        >
            <ProfileScreenContent />
        </AuthGuardScreen>
    );
}

function ProfileScreenContent() {
    const { safePush, safeReplace } = useSafeRouter();
    const insets = useSafeAreaInsets();
    const { user, isAuthenticated, logout } = useAuthStore();
    const { profile, myRooms, fetchProfile, fetchMyRooms, isLoading } = useUserStore();
    const { appointments, fetchAppointments } = useAppointmentStore();
    const {
        isNotificationsEnabled,
        initializePushNotifications: enablePush,
        disableNotifications: disablePush,
    } = useNotificationStore();
    const {
        savedProperties, isLoadingSaved, savedHasMore,
        fetchSavedProperties, loadMoreSaved, toggleSave,
    } = useInteractionStore();

    const accountRole = user?.role || profile?.role;
    const isOwner = accountRole === 'OWNER' || accountRole === 'ADMIN';
    const isAdmin = accountRole === 'ADMIN';
    const [activeTab, setActiveTab] = useState<'myrooms' | 'appointments' | 'saved'>(() => isOwner ? 'myrooms' : 'saved');
    const [refreshing, setRefreshing] = useState(false);
    const [togglingNotif, setTogglingNotif] = useState(false);
    const [hasLoadedMyRooms, setHasLoadedMyRooms] = useState(false);
    const didApplyRoleDefaultTab = useRef(false);

    const loadProfileData = useCallback(async () => {
        if (!isAuthenticated) {
            setHasLoadedMyRooms(false);
            return;
        }

        await fetchProfile();

        const latestProfile = useUserStore.getState().profile;
        if (latestProfile) {
            await fetchMyRooms(true);
            setHasLoadedMyRooms(true);
        }

        await Promise.all([
            fetchAppointments(true).catch(() => undefined),
            fetchSavedProperties(true),
        ]);
    }, [fetchAppointments, fetchMyRooms, fetchProfile, fetchSavedProperties, isAuthenticated]);

    useFocusEffect(
        useCallback(() => {
            loadProfileData();
        }, [loadProfileData])
    );

    useEffect(() => {
        if (!accountRole || didApplyRoleDefaultTab.current) return;
        setActiveTab(isOwner ? 'myrooms' : 'saved');
        didApplyRoleDefaultTab.current = true;
    }, [isOwner, accountRole]);

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await loadProfileData();
        } finally {
            setRefreshing(false);
        }
    };

    const handleLogout = () => {
        Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
            { text: 'Huỷ', style: 'cancel' },
            { text: 'Đăng xuất', style: 'destructive', onPress: logout },
        ]);
    };

    const goToListingsHome = useCallback(() => {
        safeReplace('/(tabs)' as any);
    }, [safeReplace]);

    const handleDeleteRoom = (room: Room) => {
        Alert.alert(
            'Xóa tin đăng',
            `Bạn có chắc muốn xóa "${room.title}"? Tin sẽ được chuyển vào thùng rác.`,
            [
                { text: 'Huỷ', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await roomService.deleteRoom(room.id);
                            Alert.alert('Đã xóa', 'Tin đăng đã được chuyển vào thùng rác.');
                            await fetchMyRooms(true);
                            setHasLoadedMyRooms(true);
                        } catch (err: any) {
                            Alert.alert('Lỗi', err?.message || 'Không thể xóa tin đăng');
                        }
                    },
                },
            ]
        );
    };

    const handleToggleNotifications = async (value: boolean) => {
        setTogglingNotif(true);
        try {
            if (value) {
                await enablePush();
            } else {
                Alert.alert(
                    'Tắt thông báo',
                    'Bạn sẽ không nhận được thông báo về tin nhắn, lịch hẹn và tin mới. Tiếp tục?',
                    [
                        { text: 'Huỷ', style: 'cancel' },
                        {
                            text: 'Tắt thông báo', style: 'destructive',
                            onPress: async () => {
                                await disablePush();
                            }
                        },
                    ]
                );
            }
        } finally {
            setTogglingNotif(false);
        }
    };

    const displayUser = profile || user;
    const isVerified = (displayUser as any)?.identityVerified === true || displayUser?.kycStatus === 'VERIFIED';
    const hasListings = hasLoadedMyRooms && myRooms.length > 0;
    const activeRooms = myRooms.filter(room => room.status === 'ACTIVE').length;
    const pendingRooms = myRooms.filter(room => room.status === 'PENDING').length;
    const listingCountValue = hasLoadedMyRooms ? myRooms.length : '—';
    const activeRoomsValue = hasLoadedMyRooms ? activeRooms : '—';
    const pendingRoomsValue = hasLoadedMyRooms ? pendingRooms : '—';
    const roleLabel = isAdmin ? 'Quản trị viên' : isOwner ? 'Chủ nhà' : 'Người dùng';
    const roleIcon = isAdmin ? 'shield-checkmark-outline' : isOwner ? 'home-outline' : 'person-outline';
    const primaryContact = displayUser?.email || displayUser?.phone || 'Chưa cập nhật liên hệ';
    const avatarUrl = displayUser?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser?.fullName || 'User')}&background=0066FF&color=fff&size=200`;
    const walletBalance = (displayUser as any)?.walletBalance;
    const dashboardStats = isOwner
        ? [
            { label: 'Tổng tin', value: listingCountValue },
            { label: 'Đang đăng', value: activeRoomsValue },
            { label: 'Chờ duyệt', value: pendingRoomsValue },
            { label: 'Lịch hẹn', value: appointments.length },
        ]
        : [
            { label: 'Đã lưu', value: savedProperties.length },
            { label: 'Lịch hẹn', value: appointments.length },
            { label: 'Tin đăng', value: listingCountValue },
        ];
    const quickActions = isOwner
        ? [
            { icon: 'add-circle-outline', label: 'Đăng tin', onPress: () => safePush('/(tabs)/post' as any) },
            { icon: 'home-outline', label: 'Tin đăng', onPress: goToListingsHome },
            { icon: 'calendar-outline', label: 'Lịch hẹn', onPress: () => safePush('/appointments' as any) },
            { icon: 'wallet-outline', label: 'Ví', onPress: () => safePush('/wallet' as any) },
        ]
        : [
            { icon: 'bookmark-outline', label: 'Đã lưu', onPress: () => setActiveTab('saved') },
            { icon: 'calendar-outline', label: 'Lịch hẹn', onPress: () => safePush('/appointments' as any) },
            { icon: 'chatbubbles-outline', label: 'Tin nhắn', onPress: () => safePush('/(tabs)/chat' as any) },
            { icon: 'wallet-outline', label: 'Ví', onPress: () => safePush('/wallet' as any) },
        ];
    const tabItems = isOwner
        ? [
            { key: 'myrooms' as const, label: 'Tin đăng', icon: 'home-outline' },
            { key: 'saved' as const, label: 'Đã lưu', icon: 'bookmark-outline' },
            { key: 'appointments' as const, label: 'Lịch hẹn', icon: 'calendar-outline' },
        ]
        : [
            { key: 'saved' as const, label: 'Đã lưu', icon: 'bookmark-outline' },
            { key: 'appointments' as const, label: 'Lịch hẹn', icon: 'calendar-outline' },
            { key: 'myrooms' as const, label: 'Tin đăng', icon: 'home-outline' },
        ];
    const accountSettings = [
        { icon: 'person-outline', label: 'Thông tin cá nhân', subtitle: 'Tên, ảnh đại diện và liên hệ', onPress: () => safePush('/edit-profile' as any) },
        { icon: 'card-outline', label: 'Xác minh danh tính', subtitle: 'Tăng độ tin cậy khi giao dịch', onPress: () => safePush('/kyc' as any) },
        { icon: 'shield-outline', label: 'Bảo mật & mật khẩu', subtitle: 'Quản lý đăng nhập an toàn', onPress: () => safePush('/settings/security' as any) },
        { icon: 'heart-outline', label: 'Sở thích của tôi', subtitle: 'Cá nhân hoá gợi ý bất động sản', onPress: () => safePush('/profile/lifestyle' as any) },
    ];
    const financeSettings = [
        { icon: 'wallet-outline', label: 'Ví điện tử', subtitle: 'Số dư, nạp/rút và giao dịch', onPress: () => safePush('/wallet' as any) },
        { icon: 'rocket-outline', label: 'Gói dịch vụ & Boost tin', subtitle: 'Tăng hiển thị tin đăng', onPress: () => safePush('/packages' as any) },
    ];
    const managementSettings = [
        { icon: 'calendar-outline', label: 'Lịch hẹn xem phòng', subtitle: 'Theo dõi các buổi xem nhà', onPress: () => safePush('/appointments' as any) },
        ...(isOwner ? [
            { icon: 'trash-outline', label: 'Thùng rác bài đăng', subtitle: 'Khôi phục hoặc xoá hẳn tin', onPress: () => safePush('/property/trash' as any) },
        ] : []),
        { icon: 'bar-chart-outline', label: 'Phân tích thị trường', subtitle: 'Theo dõi xu hướng giá', onPress: () => safePush('/analytics' as any) },
    ];
    const supportSettings = [
        { icon: 'notifications-circle-outline', label: 'Lịch sử thông báo', subtitle: 'Xem lại cập nhật đã nhận', onPress: () => safePush('/notifications' as any) },
        {
            icon: 'help-circle-outline',
            label: 'Hỗ trợ',
            subtitle: 'Trung tâm trợ giúp HomeVerse',
            onPress: () => Alert.alert(
                'Hỗ trợ',
                'Vui lòng liên hệ nhóm phát triển hoặc giảng viên hướng dẫn trong phiên bản demo.'
            ),
        },
    ];

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f96302" />}
            showsVerticalScrollIndicator={false}
        >
            <StatusBar barStyle="dark-content" />

            {/* Banner + Avatar */}
            <View style={[styles.banner, { paddingTop: insets.top + 8 }]}>
                <Image
                    source={{ uri: (displayUser as any)?.bannerUrl || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800' }}
                    style={styles.bannerImg}
                    contentFit="cover"
                />
                <View style={styles.bannerOverlay} />

                <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
                    <Text style={styles.screenTitle}>Hồ sơ</Text>
                    <TouchableOpacity onPress={() => safePush('/notifications' as any)}>
                        <Ionicons name="notifications-outline" size={24} color="#111827" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Avatar & Info */}
            <View style={styles.profileSection}>
                <View style={styles.avatarRow}>
                    <View style={styles.avatarWrapper}>
                        <Image
                            source={{ uri: avatarUrl }}
                            style={styles.avatar}
                        />
                        <TouchableOpacity style={styles.editAvatarBtn} onPress={() => safePush('/edit-profile' as any)}>
                            <Ionicons name="camera" size={14} color="white" />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.editProfileBtn} onPress={() => safePush('/edit-profile' as any)}>
                        <Ionicons name="create-outline" size={16} color="#f96302" />
                        <Text style={styles.editProfileText}>Chỉnh sửa</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.fullName} numberOfLines={2}>{displayUser?.fullName || 'Người dùng HomeVerse'}</Text>
                <Text style={styles.email} numberOfLines={1}>{primaryContact}</Text>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.stat}>
                        <Text style={styles.statNum}>{listingCountValue}</Text>
                        <Text style={styles.statLbl}>Tin đăng</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.stat}>
                        <Text style={styles.statNum}>{appointments.length}</Text>
                        <Text style={styles.statLbl}>Lịch hẹn</Text>
                    </View>
                </View>
            </View>

            {/* Role Badge */}
            <View style={styles.roleBadgeRow}>
                <View style={styles.roleBadge}>
                    <Ionicons name={roleIcon as any} size={14} color="#f96302" />
                    <Text style={styles.roleText}>{roleLabel}</Text>
                </View>
                {!isOwner && hasListings && (
                    <View style={styles.listingBadge}>
                        <Ionicons name="home-outline" size={14} color="#7C3AED" />
                        <Text style={styles.listingBadgeText}>Có tin đăng</Text>
                    </View>
                )}
                {isVerified && (
                    <View style={styles.verifiedBadge}>
                        <Ionicons name="shield-checkmark" size={14} color="#16A34A" />
                        <Text style={styles.verifiedText}>Đã xác minh</Text>
                    </View>
                )}
                {(displayUser as any)?.walletBalance !== undefined && (
                    <View style={styles.walletBadge}>
                        <Ionicons name="wallet-outline" size={14} color="#f96302" />
                        <Text style={styles.walletText}>{((displayUser as any).walletBalance / 1000).toFixed(0)}K đ</Text>
                    </View>
                )}
            </View>

            <View style={styles.quickActionGrid}>
                {quickActions.map(action => (
                    <TouchableOpacity key={action.label} style={styles.quickActionCard} onPress={action.onPress} activeOpacity={0.85}>
                        <View style={styles.quickActionIcon}>
                            <Ionicons name={action.icon as any} size={22} color="#f96302" />
                        </View>
                        <Text style={styles.quickActionLabel}>{action.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.dashboardCard}>
                <Text style={styles.sectionHeading}>{isOwner ? 'Tổng quan chủ nhà' : 'Hoạt động của tôi'}</Text>
                <View style={styles.dashboardGrid}>
                    {dashboardStats.map(stat => (
                        <View key={stat.label} style={styles.dashboardItem}>
                            <Text style={styles.dashboardValue}>{stat.value}</Text>
                            <Text style={styles.dashboardLabel}>{stat.label}</Text>
                        </View>
                    ))}
                    {walletBalance !== undefined && (
                        <View style={styles.dashboardItem}>
                            <Text style={styles.dashboardValue}>{(walletBalance / 1000).toFixed(0)}K</Text>
                            <Text style={styles.dashboardLabel}>Ví</Text>
                        </View>
                    )}
                </View>
            </View>

            {!isVerified && (
                <TouchableOpacity style={styles.verifyPrompt} onPress={() => safePush('/kyc' as any)} activeOpacity={0.85}>
                    <Ionicons name="shield-outline" size={18} color="#F59E0B" />
                    <Text style={styles.verifyPromptText}>Xác minh danh tính để tăng độ tin cậy</Text>
                    <Ionicons name="chevron-forward" size={16} color="#F59E0B" />
                </TouchableOpacity>
            )}

            {/* Tabs */}
            <View style={styles.tabBar}>
                {tabItems.map(({ key, label, icon }) => (
                    <TouchableOpacity
                        key={key}
                        style={[styles.tab, activeTab === key && styles.tabActive]}
                        onPress={() => setActiveTab(key as typeof activeTab)}
                    >
                        <Ionicons name={icon as any} size={16} color={activeTab === key ? '#f96302' : '#888'} />
                        <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>{label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Tab Content */}
            <View style={styles.tabContent}>
                {activeTab === 'myrooms' && (
                    (!hasLoadedMyRooms || isLoading) ? (
                        <View style={{ gap: 12, padding: 16 }}>
                            {[1, 2].map(i => <Skeleton key={i} width="100%" height={100} borderRadius={12} />)}
                        </View>
                    ) : myRooms.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="home-outline" size={48} color="#CCC" />
                            <Text style={styles.emptyTitle}>Chưa có tin đăng</Text>
                            <TouchableOpacity style={styles.ctaBtn} onPress={() => safePush('/(tabs)/post' as any)}>
                                <Text style={styles.ctaBtnText}>Đăng tin ngay</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.cardList}>
                            {myRooms.map(room => (
                                <MiniRoomCard
                                    key={room.id}
                                    room={room}
                                    onPress={() => safePush(`/property/${room.id}` as any)}
                                    onEdit={() => safePush(`/property/edit/${room.id}` as any)}
                                    onDelete={() => handleDeleteRoom(room)}
                                />
                            ))}
                        </View>
                    )
                )}


                {/* Tab: BĐS đã lưu */}
                {activeTab === 'saved' && (
                    <View style={{ minHeight: 200 }}>
                        {isLoadingSaved && savedProperties.length === 0 ? (
                            <View style={{ gap: 12, padding: 16 }}>
                                {[1, 2, 3].map(i => <Skeleton key={i} width="100%" height={110} borderRadius={12} />)}
                            </View>
                        ) : savedProperties.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="bookmark-outline" size={48} color="#CCC" />
                                <Text style={styles.emptyTitle}>Chưa có BĐS nào được lưu</Text>
                                <Text style={styles.emptySub}>Nhấn biểu tượng bookmark trên tin đăng để lưu lại</Text>
                                <TouchableOpacity style={styles.ctaBtn} onPress={() => safePush('/(tabs)' as any)}>
                                    <Text style={styles.ctaBtnText}>Khám phá BĐS</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.cardList}>
                                {savedProperties.map(item => (
                                    <SavedPropertyCard
                                        key={item.id}
                                        item={item}
                                        onPress={() => safePush(`/property/${item.id}` as any)}
                                        onUnsave={() => {
                                            Alert.alert(
                                                'Bỏ lưu BĐS',
                                                `Bỏ lưu "${item.title}"?`,
                                                [
                                                    { text: 'Huỷ', style: 'cancel' },
                                                    {
                                                        text: 'Bỏ lưu',
                                                        style: 'destructive',
                                                        onPress: () => toggleSave(item.id),
                                                    },
                                                ]
                                            );
                                        }}
                                    />
                                ))}
                                {savedHasMore && (
                                    <TouchableOpacity
                                        style={styles.loadMoreBtn}
                                        onPress={loadMoreSaved}
                                        disabled={isLoadingSaved}
                                    >
                                        {isLoadingSaved
                                            ? <ActivityIndicator size="small" color="#f96302" />
                                            : <Text style={styles.loadMoreText}>Tải thêm</Text>
                                        }
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                )}

                {/* Tab: Lịch hẹn */}
                {activeTab === 'appointments' && (
                    <View>
                        {appointments.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="calendar-outline" size={48} color="#CCC" />
                                <Text style={styles.emptyTitle}>Chưa có lịch hẹn</Text>
                                <Text style={styles.emptySub}>Đặt lịch xem phòng từ màn hình chi tiết bất động sản</Text>
                            </View>
                        ) : (
                            <View style={{ padding: 16, gap: 10 }}>
                                {appointments.slice(0, 3).map(appt => <AppointmentChip key={appt.id} appt={appt} />)}
                            </View>
                        )}
                        <TouchableOpacity
                            style={styles.seeAllBtn}
                            onPress={() => safePush('/appointments' as any)}
                        >
                            <Text style={styles.seeAllText}>Xem tất cả lịch hẹn →</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Settings */}
            <View style={styles.settingsSection}>
                <Text style={styles.settingsTitle}>Cài đặt & quản lý</Text>

                <View style={styles.settingsCard}>
                    <View style={styles.settingsItemRow}>
                        <View style={styles.settingsIconBox}>
                            <Ionicons name="notifications-outline" size={20} color="#f96302" />
                        </View>
                        <View style={styles.settingsTextBlock}>
                            <Text style={styles.settingsLabel}>Thông báo đẩy</Text>
                            <Text style={styles.settingsSubtitle}>Nhận thông báo tin nhắn, lịch hẹn và cập nhật mới</Text>
                        </View>
                        <Switch
                            value={isNotificationsEnabled}
                            onValueChange={handleToggleNotifications}
                            disabled={togglingNotif}
                            trackColor={{ false: '#E5E7EB', true: '#FED7AA' }}
                            thumbColor={isNotificationsEnabled ? '#f96302' : '#9CA3AF'}
                            ios_backgroundColor="#E5E7EB"
                        />
                    </View>
                </View>

                {[
                    { title: 'Tài khoản', items: accountSettings },
                    { title: 'Tài chính', items: financeSettings },
                    { title: 'Quản lý', items: managementSettings },
                    { title: 'Hỗ trợ', items: supportSettings },
                ].map(group => (
                    <View key={group.title}>
                        <Text style={styles.settingsGroupLabel}>{group.title}</Text>
                        <View style={styles.settingsCard}>
                            {group.items.map(({ icon, label, subtitle, onPress }, index) => (
                                <TouchableOpacity
                                    key={label}
                                    style={[styles.settingsItem, index === group.items.length - 1 && styles.settingsItemLast]}
                                    onPress={onPress}
                                    activeOpacity={0.82}
                                >
                                    <View style={styles.settingsIconBox}>
                                        <Ionicons name={icon as any} size={20} color="#f96302" />
                                    </View>
                                    <View style={styles.settingsTextBlock}>
                                        <Text style={styles.settingsLabel}>{label}</Text>
                                        <Text style={styles.settingsSubtitle}>{subtitle}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color="#C7CDD7" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                    <Text style={styles.logoutText}>Đăng xuất</Text>
                </TouchableOpacity>
            </View>

            <View style={{ height: insets.bottom + 88 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F6F8' },
    authRequired: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, paddingHorizontal: 40, backgroundColor: 'white' },
    authTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
    loginBtn: { backgroundColor: '#f96302', borderRadius: 12, paddingHorizontal: 36, paddingVertical: 14, marginTop: 6 },
    loginBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
    registerLink: { color: '#f96302', fontSize: 14, marginTop: 4 },
    banner: { minHeight: 78, position: 'relative', backgroundColor: '#F5F6F8', paddingBottom: 10 },
    bannerImg: { ...StyleSheet.absoluteFillObject, display: 'none' },
    bannerOverlay: { ...StyleSheet.absoluteFillObject, display: 'none' },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 0 /* paddingTop set via inline style using useSafeAreaInsets */ },
    screenTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
    profileSection: {
        backgroundColor: 'white',
        marginHorizontal: 16,
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    avatarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 0 },
    avatarWrapper: { position: 'relative' },
    avatar: { width: 76, height: 76, borderRadius: 38, borderWidth: 3, borderColor: '#FFF3E8', backgroundColor: '#E0E0E0' },
    editAvatarBtn: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: '#f96302', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
    editProfileBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#FED7AA', backgroundColor: '#FFF7ED', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
    editProfileText: { color: '#f96302', fontWeight: '600', fontSize: 13 },
    fullName: { fontSize: 22, fontWeight: '800', color: '#111827', marginTop: 12 },
    email: { fontSize: 14, color: '#6B7280', marginTop: 3 },
    statsRow: { display: 'none' },
    stat: { alignItems: 'center' },
    statNum: { fontSize: 22, fontWeight: '800', color: '#f96302' },
    statLbl: { fontSize: 12, color: '#888', marginTop: 2 },
    statDivider: { width: 1, backgroundColor: '#E0E0E0' },
    roleBadgeRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12 },
    roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF3E8', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20 },
    roleText: { color: '#f96302', fontWeight: '700', fontSize: 12 },
    listingBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F5F3FF', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20 },
    listingBadgeText: { color: '#7C3AED', fontWeight: '700', fontSize: 12 },
    verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F0FDF4', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20 },
    verifiedText: { color: '#16A34A', fontWeight: '700', fontSize: 12 },
    walletBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF3E8', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    walletText: { color: '#f96302', fontWeight: '600', fontSize: 12 },
    quickActionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginHorizontal: 16,
        marginTop: 14,
    },
    quickActionCard: {
        flexGrow: 1,
        flexBasis: '47%',
        minHeight: 78,
        backgroundColor: 'white',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 14,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    quickActionIcon: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#FFF3E8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickActionLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: '#111827' },
    dashboardCard: {
        backgroundColor: 'white',
        marginHorizontal: 16,
        marginTop: 14,
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    sectionHeading: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 12 },
    dashboardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    dashboardItem: {
        flexGrow: 1,
        flexBasis: '30%',
        minWidth: 92,
        backgroundColor: '#F5F6F8',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 10,
        alignItems: 'center',
    },
    dashboardValue: { fontSize: 19, fontWeight: '800', color: '#f96302' },
    dashboardLabel: { fontSize: 12, color: '#6B7280', marginTop: 2, textAlign: 'center' },
    verifyPrompt: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginHorizontal: 16,
        marginTop: 12,
        padding: 13,
        borderRadius: 14,
        backgroundColor: '#FFFBEB',
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    verifyPromptText: { flex: 1, fontSize: 13, color: '#92400E', fontWeight: '600' },
    tabBar: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 16, marginHorizontal: 16, marginTop: 14, padding: 4, borderWidth: 1, borderColor: '#E5E7EB' },
    tab: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, paddingVertical: 10, borderRadius: 12 },
    tabActive: { backgroundColor: '#FFF3E8' },
    tabText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
    tabTextActive: { color: '#f96302', fontWeight: '600' },
    tabContent: { minHeight: 200 },
    cardList: { padding: 16, gap: 12 },
    miniCard: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    miniCardImg: { width: 90, height: 90 },
    miniCardBody: { flex: 1, padding: 10, justifyContent: 'center', gap: 4 },
    miniCardTitle: { fontSize: 13, fontWeight: '600', color: '#1A1A1A', lineHeight: 18 },
    miniCardPrice: { fontSize: 14, fontWeight: '700', color: '#FF6B35' },
    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    statusActive: { backgroundColor: '#E8F5E9' },
    statusPending: { backgroundColor: '#FFF3E0' },
    statusText: { fontSize: 11, fontWeight: '600' },
    statusActiveText: { color: '#2E7D32' },
    statusPendingText: { color: '#E65100' },
    miniCardActions: { flexDirection: 'row', gap: 8, marginTop: 6 },
    editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF3E8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    editBtnText: { fontSize: 12, color: '#f96302', fontWeight: '600' },
    deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF0F0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    deleteBtnText: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
    emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
    emptySub: { fontSize: 13, color: '#999', textAlign: 'center', paddingHorizontal: 40 },
    ctaBtn: { backgroundColor: '#f96302', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
    ctaBtnText: { color: 'white', fontWeight: '600', fontSize: 14 },
    apptCard: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    apptDateBox: { width: 60, backgroundColor: '#f96302', alignItems: 'center', justifyContent: 'center', padding: 8 },
    apptDay: { fontSize: 22, fontWeight: '800', color: 'white' },
    apptMonth: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
    apptInfo: { flex: 1, padding: 10, gap: 4 },
    apptRoom: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
    apptTime: { fontSize: 13, color: '#555' },
    apptStatus: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    apptStatusText: { fontSize: 11, fontWeight: '600' },
    settingsSection: { marginTop: 18, paddingHorizontal: 16 },
    settingsTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 12 },
    settingsCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
    },
    settingsItemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
    settingsItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    settingsItemLast: { borderBottomWidth: 0 },
    settingsIconBox: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#FFF3E8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingsTextBlock: { flex: 1, minWidth: 0 },
    settingsLabel: { fontSize: 15, color: '#111827', fontWeight: '700' },
    settingsSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2, lineHeight: 16 },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        marginTop: 14,
        borderRadius: 16,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    logoutText: { fontSize: 15, color: '#EF4444', fontWeight: '600' },
    seeAllBtn: { paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' as const },
    seeAllText: { fontSize: 14, color: '#f96302', fontWeight: '600' as const },
    settingsGroupLabel: { fontSize: 12, fontWeight: '800' as const, color: '#6B7280', textTransform: 'uppercase' as const, letterSpacing: 0.6, paddingTop: 18, paddingBottom: 8 },
    devBanner: {
        flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8,
        backgroundColor: '#FFF3E0', paddingHorizontal: 16, paddingVertical: 8,
        marginHorizontal: 16, marginTop: 12, borderRadius: 8,
    },
    devBannerText: { flex: 1, fontSize: 12, color: '#E65100', lineHeight: 17 },
    // Saved Property Card
    savedCard: {
        flexDirection: 'row', backgroundColor: 'white', borderRadius: 14,
        overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, shadowRadius: 6, elevation: 3, alignItems: 'center',
    },
    savedCardImg: { width: 100, height: 100 },
    savedCardBody: { flex: 1, paddingVertical: 10, paddingHorizontal: 10, gap: 3 },
    savedCardTitle: { fontSize: 13, fontWeight: '600', color: '#1A1A1A', lineHeight: 18 },
    savedCardPrice: { fontSize: 14, fontWeight: '800', color: '#f96302' },
    savedCardAddr: { fontSize: 11, color: '#888', marginTop: 1 },
    savedCardBadgeRow: { flexDirection: 'row', gap: 4, marginTop: 2, flexWrap: 'wrap' },
    typeBadge: { backgroundColor: '#FFF7ED', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
    typeBadgeText: { fontSize: 10, fontWeight: '600', color: '#f96302' },
    unsaveBtn: { padding: 12 },
    // Load more
    loadMoreBtn: {
        alignItems: 'center', paddingVertical: 14, borderRadius: 12,
        backgroundColor: '#FFF7ED', marginTop: 4,
    },
    loadMoreText: { color: '#f96302', fontWeight: '600', fontSize: 14 },
});

