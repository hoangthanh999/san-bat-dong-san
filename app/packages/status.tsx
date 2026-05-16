import React, { useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWalletStore } from '../../store/walletStore';
import { useAuthStore } from '../../store/authStore';
import { Transaction } from '../../types';

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────
const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
};

const formatAmount = (amount: number) => {
    if (!amount) return '0đ';
    return `${amount.toLocaleString('vi-VN')}đ`;
};

/** Tính số ngày còn lại từ hôm nay đến expiresAt */
const daysRemaining = (expiresAt: string): number => {
    const now = Date.now();
    const exp = new Date(expiresAt).getTime();
    return Math.max(0, Math.ceil((exp - now) / 86400000));
};

// Priority level → tên hiển thị
const PRIORITY_LABELS: Record<number, { label: string; color: string; icon: string }> = {
    3: { label: 'Gold',   color: '#F59E0B', icon: 'trophy' },
    2: { label: 'Silver', color: '#9CA3AF', icon: 'medal' },
    1: { label: 'Basic',  color: '#60A5FA', icon: 'rocket' },
};

// ──────────────────────────────────────────
// Active Boost Card (hiển thị khi boost đang chạy)
// ──────────────────────────────────────────
function ActiveBoostCard({ tx }: { tx: Transaction }) {
    // Ước tính expiresAt từ createdAt + 7 ngày (backend không trả expiresAt trong transaction)
    const createdAt = tx.createdAt;
    const expiresAt = new Date(new Date(createdAt).getTime() + 7 * 86400000).toISOString();
    const remaining = daysRemaining(expiresAt);
    const isActive = remaining > 0 && tx.status === 'SUCCESS';
    const priority = 1; // default Basic — backend không trả trong Transaction

    const priorityCfg = PRIORITY_LABELS[priority] ?? PRIORITY_LABELS[1];

    return (
        <LinearGradient
            colors={isActive ? ['#0044CC', '#0066FF'] : ['#374151', '#6B7280']}
            style={styles.activeCard}
        >
            <View style={styles.activeCardTop}>
                <View style={styles.activeBadge}>
                    <Ionicons name="flame" size={14} color="white" />
                    <Text style={styles.activeBadgeText}>
                        {isActive ? 'Đang boost' : 'Đã hết hạn'}
                    </Text>
                </View>
                <View style={[styles.priorityBadge, { backgroundColor: priorityCfg.color + '33' }]}>
                    <Ionicons name={priorityCfg.icon as any} size={12} color={priorityCfg.color} />
                    <Text style={[styles.priorityText, { color: priorityCfg.color }]}>
                        {priorityCfg.label}
                    </Text>
                </View>
            </View>

            <Text style={styles.activePackageName}>{tx.description ?? 'Gói đẩy tin'}</Text>
            <Text style={styles.activeAmount}>{formatAmount(Number(tx.amount))}</Text>

            {isActive && (
                <View style={styles.countdownWrap}>
                    <View style={styles.countdownBox}>
                        <Text style={styles.countdownNum}>{remaining}</Text>
                        <Text style={styles.countdownLabel}>ngày</Text>
                    </View>
                    <Text style={styles.countdownSep}>còn lại</Text>
                    <View style={styles.progressOuter}>
                        <View style={[styles.progressInner, { width: `${Math.min(100, (7 - remaining) / 7 * 100)}%` }]} />
                    </View>
                </View>
            )}

            <Text style={styles.activeDate}>
                Kích hoạt: {formatDate(createdAt)}
            </Text>
            <Text style={styles.activeDate}>
                Hết hạn: {formatDate(expiresAt)}
            </Text>
        </LinearGradient>
    );
}

// ──────────────────────────────────────────
// History Row
// ──────────────────────────────────────────
function HistoryRow({ tx }: { tx: Transaction }) {
    const isBoost = tx.type === 'BOOST';
    const isMembership = tx.type === 'MEMBERSHIP';
    const statusColors: Record<string, string> = {
        SUCCESS: '#22C55E',
        FAILED:  '#EF4444',
        PENDING: '#F59E0B',
    };
    const statusLabels: Record<string, string> = {
        SUCCESS: 'Thành công',
        FAILED:  'Thất bại',
        PENDING: 'Đang xử lý',
    };

    return (
        <View style={styles.histRow}>
            <View style={[styles.histIcon, { backgroundColor: isBoost ? '#FFF3E0' : '#E8F0FF' }]}>
                <Ionicons
                    name={isBoost ? 'flame' : 'star'}
                    size={20}
                    color={isBoost ? '#FF6B35' : '#0066FF'}
                />
            </View>
            <View style={styles.histInfo}>
                <Text style={styles.histTitle} numberOfLines={2}>
                    {tx.description ?? (isBoost ? 'Gói đẩy tin' : 'Gói hội viên')}
                </Text>
                <Text style={styles.histDate}>{formatDate(tx.createdAt)}</Text>
            </View>
            <View style={styles.histRight}>
                <Text style={styles.histAmount}>-{formatAmount(Number(tx.amount))}</Text>
                <View style={[styles.histStatus, { backgroundColor: (statusColors[tx.status] ?? '#888') + '20' }]}>
                    <Text style={[styles.histStatusText, { color: statusColors[tx.status] ?? '#888' }]}>
                        {statusLabels[tx.status] ?? tx.status}
                    </Text>
                </View>
            </View>
        </View>
    );
}

// ──────────────────────────────────────────
// Main Screen
// ──────────────────────────────────────────
export default function BoostStatusScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isAuthenticated } = useAuthStore();
    const { transactions, isLoading, fetchTransactions } = useWalletStore();

    useEffect(() => {
        if (isAuthenticated) {
            fetchTransactions();
        }
    }, [isAuthenticated]);

    // Lọc giao dịch liên quan boost/membership
    const boostTransactions = useMemo(
        () => transactions.filter((tx) => tx.type === 'BOOST' || tx.type === 'MEMBERSHIP'),
        [transactions]
    );

    // Xác định giao dịch "mới nhất" còn hiệu lực (SUCCESS, trong 7 ngày)
    const latestBoost = useMemo(() => {
        return boostTransactions.find((tx) => {
            if (tx.status !== 'SUCCESS') return false;
            const exp = new Date(tx.createdAt).getTime() + 7 * 86400000;
            return exp > Date.now();
        }) ?? null;
    }, [boostTransactions]);

    if (!isAuthenticated) {
        return (
            <View style={styles.notAuth}>
                <Stack.Screen options={{ headerShown: false }} />
                <Ionicons name="lock-closed-outline" size={56} color="#DDD" />
                <Text style={styles.notAuthTitle}>Chưa đăng nhập</Text>
                <Text style={styles.notAuthSub}>Đăng nhập để xem trạng thái boost tin của bạn</Text>
                <TouchableOpacity
                    style={styles.loginBtn}
                    onPress={() => router.push('/(auth)/login' as any)}
                >
                    <Text style={styles.loginBtnText}>Đăng nhập</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Trạng thái Boost</Text>
                <TouchableOpacity
                    style={styles.buyMoreBtn}
                    onPress={() => router.push('/packages' as any)}
                >
                    <Text style={styles.buyMoreText}>+ Mua thêm</Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#0066FF" />
                    <Text style={{ color: '#888', marginTop: 12 }}>Đang tải dữ liệu...</Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 20 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── Active Boost ── */}
                    <View>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="flame" size={18} color="#FF6B35" />
                            <Text style={styles.sectionTitle}>Đang hoạt động</Text>
                        </View>

                        {latestBoost ? (
                            <ActiveBoostCard tx={latestBoost} />
                        ) : (
                            <View style={styles.emptyBoost}>
                                <MaterialCommunityIcons name="rocket-launch-outline" size={56} color="#DDD" />
                                <Text style={styles.emptyTitle}>Chưa có boost đang chạy</Text>
                                <Text style={styles.emptySub}>
                                    Mua gói đẩy tin để tin của bạn xuất hiện ở top kết quả tìm kiếm
                                </Text>
                                <TouchableOpacity
                                    style={styles.emptyBtn}
                                    onPress={() => router.push('/packages' as any)}
                                >
                                    <Ionicons name="rocket-outline" size={16} color="white" />
                                    <Text style={styles.emptyBtnText}>Mua gói đẩy tin</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* ── History ── */}
                    <View>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="time-outline" size={18} color="#666" />
                            <Text style={styles.sectionTitle}>Lịch sử sử dụng</Text>
                            <Text style={styles.histCount}>({boostTransactions.length})</Text>
                        </View>

                        {boostTransactions.length === 0 ? (
                            <View style={styles.emptyHistory}>
                                <Ionicons name="receipt-outline" size={40} color="#DDD" />
                                <Text style={styles.emptyHistoryText}>Chưa có lịch sử giao dịch gói boost</Text>
                            </View>
                        ) : (
                            <View style={styles.histList}>
                                {boostTransactions.map((tx) => (
                                    <HistoryRow key={tx.id} tx={tx} />
                                ))}
                            </View>
                        )}
                    </View>

                    {/* ── Tips ── */}
                    <View style={styles.tipsCard}>
                        <View style={styles.tipsHeader}>
                            <Ionicons name="bulb-outline" size={16} color="#F59E0B" />
                            <Text style={styles.tipsTitle}>Lưu ý về boost tin</Text>
                        </View>
                        {[
                            'Tin được boost sẽ xuất hiện ưu tiên trong kết quả tìm kiếm và feed khám phá',
                            'Gói Gold (3 sao) có độ ưu tiên cao nhất, rồi đến Silver (2 sao) và Basic (1 sao)',
                            'Thời hạn boost được tính từ thời điểm kích hoạt, không phải thời điểm mua',
                            'Mỗi lần boost được xếp hàng theo thứ tự ưu tiên và sẽ tự động kích hoạt khi đến lượt',
                        ].map((tip, i) => (
                            <View key={i} style={styles.tipRow}>
                                <View style={styles.tipDot} />
                                <Text style={styles.tipText}>{tip}</Text>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    notAuth: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12, backgroundColor: '#F8F9FA' },
    notAuthTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
    notAuthSub: { fontSize: 14, color: '#888', textAlign: 'center' },
    loginBtn: {
        marginTop: 8, backgroundColor: '#0066FF', borderRadius: 12,
        paddingHorizontal: 32, paddingVertical: 13,
    },
    loginBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingBottom: 12,
        backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
    buyMoreBtn: {
        backgroundColor: '#E8F0FF', borderRadius: 20,
        paddingHorizontal: 12, paddingVertical: 6,
    },
    buyMoreText: { color: '#0066FF', fontWeight: '700', fontSize: 13 },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
    histCount: { fontSize: 13, color: '#888' },

    // Active card
    activeCard: {
        borderRadius: 20, padding: 20, gap: 8,
        shadowColor: '#0066FF', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
    },
    activeCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    activeBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 4,
    },
    activeBadgeText: { color: 'white', fontSize: 12, fontWeight: '700' },
    priorityBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
    },
    priorityText: { fontSize: 11, fontWeight: '700' },
    activePackageName: { color: 'white', fontSize: 20, fontWeight: '800' },
    activeAmount: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '500' },
    countdownWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
    countdownBox: {
        backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center',
    },
    countdownNum: { color: 'white', fontSize: 22, fontWeight: '900' },
    countdownLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 10 },
    countdownSep: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
    progressOuter: {
        flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 3, overflow: 'hidden',
    },
    progressInner: { height: '100%', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 3 },
    activeDate: { color: 'rgba(255,255,255,0.65)', fontSize: 12 },

    // Empty boost
    emptyBoost: {
        backgroundColor: 'white', borderRadius: 16, padding: 28,
        alignItems: 'center', gap: 10,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: '#888' },
    emptySub: { fontSize: 13, color: '#AAA', textAlign: 'center', lineHeight: 20 },
    emptyBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#FF6B35', borderRadius: 12,
        paddingHorizontal: 20, paddingVertical: 11, marginTop: 4,
    },
    emptyBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },

    // History
    histList: {
        backgroundColor: 'white', borderRadius: 16, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    },
    histRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        padding: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
    },
    histIcon: {
        width: 44, height: 44, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
    },
    histInfo: { flex: 1, gap: 3 },
    histTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', lineHeight: 19 },
    histDate: { fontSize: 11, color: '#AAA' },
    histRight: { alignItems: 'flex-end', gap: 4 },
    histAmount: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
    histStatus: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
    histStatusText: { fontSize: 10, fontWeight: '700' },

    emptyHistory: {
        backgroundColor: 'white', borderRadius: 16, padding: 28,
        alignItems: 'center', gap: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    },
    emptyHistoryText: { fontSize: 14, color: '#AAA' },

    // Tips
    tipsCard: {
        backgroundColor: '#FFFBEB', borderRadius: 14, padding: 16,
        borderWidth: 1, borderColor: '#FDE68A', gap: 8,
    },
    tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    tipsTitle: { fontSize: 14, fontWeight: '700', color: '#92400E' },
    tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    tipDot: {
        width: 5, height: 5, borderRadius: 3, backgroundColor: '#F59E0B',
        marginTop: 5, flexShrink: 0,
    },
    tipText: { fontSize: 12, color: '#78350F', lineHeight: 18, flex: 1 },
});
