import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    FlatList, RefreshControl, StatusBar, Platform, Alert, Switch, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useUserStore } from '../../store/userStore';
import { useAppointmentStore } from '../../store/appointmentStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useInteractionStore } from '../../store/interactionStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '../../components/ui/Skeleton';
import { AuthGuardScreen } from '../../components/auth/AuthGuardScreen';
import { Room, Appointment } from '../../types';
import { InteractionPropertyDTO } from '../../services/api/interaction';
import { roomService } from '../../services/api/rooms';

function MiniRoomCard({ room, onPress, onEdit, onDelete }: {
    room: Room;
    onPress: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const formatPrice = (p: number) => `${(p / 1000000).toFixed(0)} tr/th`;
    return (
        <TouchableOpacity style={styles.miniCard} onPress={onPress} activeOpacity={0.8}>
            <Image source={{ uri: room.images[0] || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400' }} style={styles.miniCardImg} contentFit="cover" />
            <View style={styles.miniCardBody}>
                <Text numberOfLines={2} style={styles.miniCardTitle}>{room.title}</Text>
                <Text style={styles.miniCardPrice}>{formatPrice(room.price)}</Text>
                <View style={[styles.statusBadge, room.status === 'ACTIVE' ? styles.statusActive : styles.statusPending]}>
                    <Text style={[styles.statusText, room.status === 'ACTIVE' ? styles.statusActiveText : styles.statusPendingText]}>
                        {room.status === 'ACTIVE' ? 'Đang đăng' : room.status === 'PENDING' ? 'Chờ duyệt' : room.status}
                    </Text>
                </View>
                {/* Action buttons */}
                <View style={styles.miniCardActions}>
                    <TouchableOpacity style={styles.editBtn} onPress={onEdit} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                        <Ionicons name="create-outline" size={14} color="#0066FF" />
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
    const formatPrice = (p: number) => {
        if (p >= 1_000_000_000) return `${(p / 1_000_000_000).toFixed(1)} tỷ`;
        return `${(p / 1_000_000).toFixed(0)} tr`;
    };
    return (
        <TouchableOpacity style={styles.savedCard} onPress={onPress} activeOpacity={0.85}>
            <Image
                source={{ uri: item.imageUrl || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400' }}
                style={styles.savedCardImg}
                contentFit="cover"
            />
            <View style={styles.savedCardBody}>
                <Text numberOfLines={2} style={styles.savedCardTitle}>{item.title}</Text>
                <Text style={styles.savedCardPrice}>{formatPrice(item.price)}</Text>
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
        COMPLETED: '#0066FF',
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
    const router = useRouter();
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

    const [activeTab, setActiveTab] = useState<'myrooms' | 'appointments' | 'saved'>('myrooms');
    const [refreshing, setRefreshing] = useState(false);
    const [togglingNotif, setTogglingNotif] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            fetchProfile();
            fetchMyRooms(true);
            fetchAppointments(true).catch(() => undefined);
            fetchSavedProperties(true);
        }
    }, [isAuthenticated]);

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                fetchProfile(),
                fetchMyRooms(true),
                fetchAppointments(true).catch(() => undefined),
                fetchSavedProperties(true),
            ]);
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
                            fetchMyRooms(true);
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

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0066FF" />}
            showsVerticalScrollIndicator={false}
        >
            <StatusBar barStyle="light-content" />

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
                    <TouchableOpacity onPress={() => router.push('/notifications' as any)}>
                        <Ionicons name="notifications-outline" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Avatar & Info */}
            <View style={styles.profileSection}>
                <View style={styles.avatarRow}>
                    <View style={styles.avatarWrapper}>
                        <Image
                            source={{ uri: displayUser?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser?.fullName || 'User')}&background=0066FF&color=fff&size=200` }}
                            style={styles.avatar}
                        />
                        <TouchableOpacity style={styles.editAvatarBtn} onPress={() => router.push('/edit-profile' as any)}>
                            <Ionicons name="camera" size={14} color="white" />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.editProfileBtn} onPress={() => router.push('/edit-profile' as any)}>
                        <Ionicons name="create-outline" size={16} color="#0066FF" />
                        <Text style={styles.editProfileText}>Chỉnh sửa</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.fullName}>{displayUser?.fullName}</Text>
                <Text style={styles.email}>{displayUser?.email}</Text>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.stat}>
                        <Text style={styles.statNum}>{myRooms.length}</Text>
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
                    <Ionicons name={user?.role === 'ADMIN' ? 'shield' : user?.role === 'OWNER' ? 'home' : 'person'} size={14} color="white" />
                    <Text style={styles.roleText}>{user?.role === 'ADMIN' ? 'Quản trị viên' : user?.role === 'OWNER' ? 'Chủ nhà' : 'Người thuê'}</Text>
                </View>
                {(displayUser as any)?.walletBalance !== undefined && (
                    <View style={styles.walletBadge}>
                        <Ionicons name="wallet-outline" size={14} color="#0066FF" />
                        <Text style={styles.walletText}>{((displayUser as any).walletBalance / 1000).toFixed(0)}K đ</Text>
                    </View>
                )}
            </View>

            {/* Tabs */}
            <View style={styles.tabBar}>
                {[
                    { key: 'myrooms', label: 'Tin của tôi', icon: 'home-outline' },
                    { key: 'saved', label: 'Đã lưu', icon: 'bookmark-outline' },
                    { key: 'appointments', label: 'Lịch hẹn', icon: 'calendar-outline' },
                ].map(({ key, label, icon }) => (
                    <TouchableOpacity
                        key={key}
                        style={[styles.tab, activeTab === key && styles.tabActive]}
                        onPress={() => setActiveTab(key as typeof activeTab)}
                    >
                        <Ionicons name={icon as any} size={16} color={activeTab === key ? '#0066FF' : '#888'} />
                        <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>{label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Tab Content */}
            <View style={styles.tabContent}>
                {activeTab === 'myrooms' && (
                    isLoading ? (
                        <View style={{ gap: 12, padding: 16 }}>
                            {[1, 2].map(i => <Skeleton key={i} width="100%" height={100} borderRadius={12} />)}
                        </View>
                    ) : myRooms.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="home-outline" size={48} color="#CCC" />
                            <Text style={styles.emptyTitle}>Chưa có tin đăng</Text>
                            <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push('/(tabs)/post')}>
                                <Text style={styles.ctaBtnText}>Đăng tin ngay</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.cardList}>
                            {myRooms.map(room => (
                                <MiniRoomCard
                                    key={room.id}
                                    room={room}
                                    onPress={() => router.push(`/property/${room.id}` as any)}
                                    onEdit={() => router.push(`/property/edit/${room.id}` as any)}
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
                                <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push('/(tabs)' as any)}>
                                    <Text style={styles.ctaBtnText}>Khám phá BĐS</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.cardList}>
                                {savedProperties.map(item => (
                                    <SavedPropertyCard
                                        key={item.id}
                                        item={item}
                                        onPress={() => router.push(`/property/${item.id}` as any)}
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
                                            ? <ActivityIndicator size="small" color="#0066FF" />
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
                            onPress={() => router.push('/appointments' as any)}
                        >
                            <Text style={styles.seeAllText}>Xem tất cả lịch hẹn →</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Settings */}
            <View style={styles.settingsSection}>
                <Text style={styles.settingsTitle}>Cài đặt</Text>

                {/* Push Notification Toggle */}
                <View style={styles.settingsItemRow}>
                    <Ionicons name="notifications-outline" size={20} color="#555" />
                    <Text style={[styles.settingsLabel, { flex: 1 }]}>Thông báo đẩy</Text>
                    <Switch
                        value={isNotificationsEnabled}
                        onValueChange={handleToggleNotifications}
                        disabled={togglingNotif}
                        trackColor={{ false: '#E0E0E0', true: '#BDD7FF' }}
                        thumbColor={isNotificationsEnabled ? '#0066FF' : '#999'}
                        ios_backgroundColor="#E0E0E0"
                    />
                </View>

                {/* Account items */}
                <Text style={styles.settingsGroupLabel}>Tài khoản</Text>
                {[
                    { icon: 'person-outline', label: 'Thông tin cá nhân', onPress: () => router.push('/edit-profile' as any) },
                    { icon: 'heart-outline', label: 'Sở thích của tôi', onPress: () => router.push('/profile/lifestyle' as any) },
                    { icon: 'heart-circle-outline', label: 'BĐS đã Like', onPress: () => router.push('/liked-properties' as any) },
                    { icon: 'card-outline', label: 'Xác minh danh tính (KYC)', onPress: () => router.push('/kyc' as any) },
                    { icon: 'wallet-outline', label: 'Ví điện tử', onPress: () => router.push('/wallet' as any) },
                ].map(({ icon, label, onPress }) => (
                    <TouchableOpacity key={label} style={styles.settingsItem} onPress={onPress}>
                        <Ionicons name={icon as any} size={20} color="#555" />
                        <Text style={styles.settingsLabel}>{label}</Text>
                        <Ionicons name="chevron-forward" size={18} color="#CCC" />
                    </TouchableOpacity>
                ))}

                {/* Services */}
                <Text style={styles.settingsGroupLabel}>Dịch vụ</Text>
                {[
                    { icon: 'calendar-outline', label: 'Lịch hẹn xem phòng', onPress: () => router.push('/appointments' as any) },
                    { icon: 'document-text-outline', label: 'Hợp đồng của tôi', onPress: () => router.push('/contracts' as any) },
                    ...(user?.role === 'OWNER' || user?.role === 'ADMIN' ? [
                        { icon: 'trash-outline', label: 'Thùng rác bài đăng', onPress: () => router.push('/property/trash' as any) },
                        { icon: 'receipt-outline', label: 'Tạo hóa đơn tiền trọ', onPress: () => router.push('/bills/create' as any) },
                    ] : []),
                    { icon: 'star-outline', label: 'Gói dịch vụ & Boost tin', onPress: () => router.push('/packages' as any) },
                    { icon: 'bar-chart-outline', label: '📊 Thống kê thị trường', onPress: () => router.push('/analytics' as any) },
                ].map(({ icon, label, onPress }) => (
                    <TouchableOpacity key={label} style={styles.settingsItem} onPress={onPress}>
                        <Ionicons name={icon as any} size={20} color="#555" />
                        <Text style={styles.settingsLabel}>{label}</Text>
                        <Ionicons name="chevron-forward" size={18} color="#CCC" />
                    </TouchableOpacity>
                ))}

                {/* Support */}
                <Text style={styles.settingsGroupLabel}>Hỗ trợ</Text>
                {[
                    { icon: 'notifications-circle-outline', label: 'Lịch sử thông báo', onPress: () => router.push('/notifications' as any) },
                    { icon: 'shield-outline', label: 'Bảo mật & Mật khẩu', onPress: () => router.push('/settings/security' as any) },
                    { icon: 'help-circle-outline', label: 'Hỗ trợ', onPress: () => { } },
                ].map(({ icon, label, onPress }) => (
                    <TouchableOpacity key={label} style={styles.settingsItem} onPress={onPress}>
                        <Ionicons name={icon as any} size={20} color="#555" />
                        <Text style={styles.settingsLabel}>{label}</Text>
                        <Ionicons name="chevron-forward" size={18} color="#CCC" />
                    </TouchableOpacity>
                ))}

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                    <Text style={styles.logoutText}>Đăng xuất</Text>
                </TouchableOpacity>
            </View>

            <View style={{ height: 100 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    authRequired: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, paddingHorizontal: 40, backgroundColor: 'white' },
    authTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
    loginBtn: { backgroundColor: '#0066FF', borderRadius: 12, paddingHorizontal: 36, paddingVertical: 14, marginTop: 6 },
    loginBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
    registerLink: { color: '#0066FF', fontSize: 14, marginTop: 4 },
    banner: { height: 140, position: 'relative' },
    bannerImg: { ...StyleSheet.absoluteFillObject },
    bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 0 /* paddingTop set via inline style using useSafeAreaInsets */ },
    screenTitle: { fontSize: 20, fontWeight: '700', color: 'white' },
    profileSection: { backgroundColor: 'white', paddingBottom: 20, paddingHorizontal: 16 },
    avatarRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -40 },
    avatarWrapper: { position: 'relative' },
    avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: 'white', backgroundColor: '#E0E0E0' },
    editAvatarBtn: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: '#0066FF', justifyContent: 'center', alignItems: 'center' },
    editProfileBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: '#0066FF', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
    editProfileText: { color: '#0066FF', fontWeight: '600', fontSize: 13 },
    fullName: { fontSize: 22, fontWeight: '800', color: '#1A1A1A', marginTop: 10 },
    email: { fontSize: 14, color: '#888', marginTop: 2 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#F8F9FA', borderRadius: 12, padding: 16, marginTop: 16 },
    stat: { alignItems: 'center' },
    statNum: { fontSize: 22, fontWeight: '800', color: '#0066FF' },
    statLbl: { fontSize: 12, color: '#888', marginTop: 2 },
    statDivider: { width: 1, backgroundColor: '#E0E0E0' },
    roleBadgeRow: { flexDirection: 'row', gap: 10, padding: 12, paddingHorizontal: 16 },
    roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0066FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    roleText: { color: 'white', fontWeight: '600', fontSize: 12 },
    walletBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F0FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    walletText: { color: '#0066FF', fontWeight: '600', fontSize: 12 },
    tabBar: { flexDirection: 'row', backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F0F0F0', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', marginTop: 8 },
    tab: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, paddingVertical: 12 },
    tabActive: { borderBottomWidth: 2, borderBottomColor: '#0066FF' },
    tabText: { fontSize: 12, color: '#888' },
    tabTextActive: { color: '#0066FF', fontWeight: '600' },
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
    editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F0FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    editBtnText: { fontSize: 12, color: '#0066FF', fontWeight: '600' },
    deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF0F0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    deleteBtnText: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
    emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
    emptySub: { fontSize: 13, color: '#999', textAlign: 'center', paddingHorizontal: 40 },
    ctaBtn: { backgroundColor: '#0066FF', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
    ctaBtnText: { color: 'white', fontWeight: '600', fontSize: 14 },
    apptCard: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    apptDateBox: { width: 60, backgroundColor: '#0066FF', alignItems: 'center', justifyContent: 'center', padding: 8 },
    apptDay: { fontSize: 22, fontWeight: '800', color: 'white' },
    apptMonth: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
    apptInfo: { flex: 1, padding: 10, gap: 4 },
    apptRoom: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
    apptTime: { fontSize: 13, color: '#555' },
    apptStatus: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    apptStatusText: { fontSize: 11, fontWeight: '600' },
    settingsSection: { backgroundColor: 'white', marginTop: 12, padding: 16 },
    settingsTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
    settingsItemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
    settingsItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
    settingsLabel: { fontSize: 15, color: '#333' },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, marginTop: 4 },
    logoutText: { fontSize: 15, color: '#EF4444', fontWeight: '600' },
    seeAllBtn: { paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' as const },
    seeAllText: { fontSize: 14, color: '#0066FF', fontWeight: '600' as const },
    settingsGroupLabel: { fontSize: 12, fontWeight: '700' as const, color: '#AAA', textTransform: 'uppercase' as const, letterSpacing: 0.6, paddingHorizontal: 14, paddingTop: 16, paddingBottom: 4 },
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
    savedCardPrice: { fontSize: 14, fontWeight: '800', color: '#0066FF' },
    savedCardAddr: { fontSize: 11, color: '#888', marginTop: 1 },
    savedCardBadgeRow: { flexDirection: 'row', gap: 4, marginTop: 2, flexWrap: 'wrap' },
    typeBadge: { backgroundColor: '#F0F4FF', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
    typeBadgeText: { fontSize: 10, fontWeight: '600', color: '#0066FF' },
    unsaveBtn: { padding: 12 },
    // Load more
    loadMoreBtn: {
        alignItems: 'center', paddingVertical: 14, borderRadius: 12,
        backgroundColor: '#F0F4FF', marginTop: 4,
    },
    loadMoreText: { color: '#0066FF', fontWeight: '600', fontSize: 14 },
});
