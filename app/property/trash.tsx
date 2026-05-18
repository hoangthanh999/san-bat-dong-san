import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthGuardScreen } from '../../components/auth/AuthGuardScreen';
import { useAuthStore } from '../../store/authStore';
import { roomService } from '../../services/api/rooms';
import { Room } from '../../types';

const fallbackImage = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400';

function formatPrice(value: number) {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)} tr`;
    return `${value.toLocaleString('vi-VN')}đ`;
}

export default function PropertyTrashScreen() {
    return (
        <AuthGuardScreen message="Đăng nhập để xem thùng rác bài đăng" icon="trash-outline">
            <PropertyTrashContent />
        </AuthGuardScreen>
    );
}

function PropertyTrashContent() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    const [items, setItems] = useState<Room[]>([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);

    const isAdmin = user?.role === 'ADMIN';

    const load = async (reset = true) => {
        if (loading) return;
        setLoading(true);
        try {
            const nextPage = reset ? 0 : page + 1;
            const res = isAdmin
                ? await roomService.getAdminTrash(nextPage, 10)
                : await roomService.getMyTrash(nextPage, 10);
            setItems(prev => reset ? res.content : [...prev, ...res.content]);
            setPage(res.number);
            setHasMore(!res.last);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load(true);
    }, [isAdmin]);

    const restore = (room: Room) => {
        Alert.alert('Khôi phục bài đăng', `Khôi phục "${room.title}"?`, [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Khôi phục',
                onPress: async () => {
                    await (isAdmin ? roomService.adminRestoreProperty(room.id) : roomService.restoreProperty(room.id));
                    await load(true);
                },
            },
        ]);
    };

    const forceDelete = (room: Room) => {
        Alert.alert('Xóa vĩnh viễn', `Xóa vĩnh viễn "${room.title}"?`, [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xóa',
                style: 'destructive',
                onPress: async () => {
                    await (isAdmin ? roomService.adminHardDeleteProperty(room.id) : roomService.hardDeleteProperty(room.id));
                    await load(true);
                },
            },
        ]);
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={23} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Thùng rác bài đăng</Text>
                <TouchableOpacity style={styles.backBtn} onPress={() => load(true)}>
                    <Ionicons name="refresh" size={21} color="#0066FF" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={items}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.list}
                refreshing={loading}
                onRefresh={() => load(true)}
                onEndReached={() => hasMore && load(false)}
                onEndReachedThreshold={0.4}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <Image source={{ uri: item.images?.[0] || fallbackImage }} style={styles.image} contentFit="cover" />
                        <View style={styles.body}>
                            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                            <Text style={styles.price}>{formatPrice(item.price)}</Text>
                            <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
                            <View style={styles.actions}>
                                <TouchableOpacity style={styles.restoreBtn} onPress={() => restore(item)}>
                                    <Ionicons name="return-up-back-outline" size={15} color="#0066FF" />
                                    <Text style={styles.restoreText}>Khôi phục</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.deleteBtn} onPress={() => forceDelete(item)}>
                                    <Ionicons name="trash-outline" size={15} color="#EF4444" />
                                    <Text style={styles.deleteText}>Xóa hẳn</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
                ListEmptyComponent={!loading ? (
                    <View style={styles.empty}>
                        <Ionicons name="trash-outline" size={52} color="#CCC" />
                        <Text style={styles.emptyTitle}>Thùng rác đang trống</Text>
                    </View>
                ) : null}
                ListFooterComponent={loading && items.length > 0 ? <ActivityIndicator color="#0066FF" /> : null}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
    list: { padding: 16, paddingBottom: 36, gap: 12 },
    card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
    image: { width: 110, height: 124, backgroundColor: '#E5E7EB' },
    body: { flex: 1, padding: 12, gap: 5 },
    title: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', lineHeight: 19 },
    price: { fontSize: 15, fontWeight: '800', color: '#FF6B35' },
    address: { fontSize: 12, color: '#777' },
    actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
    restoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F0FF', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 6 },
    restoreText: { fontSize: 12, color: '#0066FF', fontWeight: '700' },
    deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF0F0', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 6 },
    deleteText: { fontSize: 12, color: '#EF4444', fontWeight: '700' },
    empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 100, gap: 10 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: '#777' },
});
