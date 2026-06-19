import React, { useEffect } from 'react';
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
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthGuardScreen } from '../components/auth/AuthGuardScreen';
import { InteractionPropertyDTO } from '../services/api/interaction';
import { useInteractionStore } from '../store/interactionStore';
import { useSafeRouter } from '../hooks/useSafeRouter';

const fallbackImage = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400';

function formatPrice(value: number) {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)} tr`;
    return `${value.toLocaleString('vi-VN')}đ`;
}

function LikedCard({ item, onPress, onUnlike }: {
    item: InteractionPropertyDTO;
    onPress: () => void;
    onUnlike: () => void;
}) {
    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
            <Image source={{ uri: item.imageUrl || fallbackImage }} style={styles.image} contentFit="cover" />
            <View style={styles.cardBody}>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.price}>{formatPrice(item.price)}</Text>
                <Text style={styles.address} numberOfLines={1}>
                    {item.district || item.province || item.address}
                </Text>
                <View style={styles.metaRow}>
                    {!!item.propertyType && <Text style={styles.badge}>{item.propertyType}</Text>}
                    {!!item.transactionType && <Text style={styles.badge}>{item.transactionType}</Text>}
                </View>
            </View>
            <TouchableOpacity style={styles.likeBtn} onPress={onUnlike}>
                <Ionicons name="heart" size={22} color="#EF4444" />
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

export default function LikedPropertiesScreen() {
    return (
        <AuthGuardScreen message="Đăng nhập để xem BĐS đã like" icon="heart-outline">
            <LikedPropertiesContent />
        </AuthGuardScreen>
    );
}

function LikedPropertiesContent() {
    const { router, safePush } = useSafeRouter();
    const insets = useSafeAreaInsets();
    const {
        likedProperties,
        isLoadingLiked,
        likedHasMore,
        fetchLikedProperties,
        loadMoreLiked,
        toggleLike,
    } = useInteractionStore();

    useEffect(() => {
        fetchLikedProperties(true);
    }, []);

    const unlike = (item: InteractionPropertyDTO) => {
        Alert.alert('Bỏ like BĐS', `Bỏ like "${item.title}"?`, [
            { text: 'Hủy', style: 'cancel' },
            { text: 'Bỏ like', style: 'destructive', onPress: () => toggleLike(item.id) },
        ]);
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={23} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>BĐS đã Like</Text>
                <View style={{ width: 40 }} />
            </View>

            {isLoadingLiked && likedProperties.length === 0 ? (
                <View style={styles.center}><ActivityIndicator color="#0066FF" /></View>
            ) : (
                <FlatList
                    data={likedProperties}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.list}
                    refreshing={isLoadingLiked}
                    onRefresh={() => fetchLikedProperties(true)}
                    onEndReached={() => likedHasMore && loadMoreLiked()}
                    onEndReachedThreshold={0.4}
                    renderItem={({ item }) => (
                        <LikedCard
                            item={item}
                            onPress={() => safePush(`/property/${item.id}` as any)}
                            onUnlike={() => unlike(item)}
                        />
                    )}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="heart-outline" size={52} color="#CCC" />
                            <Text style={styles.emptyTitle}>Chưa có BĐS nào đã like</Text>
                        </View>
                    }
                    ListFooterComponent={isLoadingLiked && likedProperties.length > 0 ? <ActivityIndicator color="#0066FF" /> : null}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
    list: { padding: 16, paddingBottom: 36, gap: 12 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
    image: { width: 104, height: 104, backgroundColor: '#E5E7EB' },
    cardBody: { flex: 1, padding: 12, gap: 4 },
    title: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', lineHeight: 19 },
    price: { fontSize: 15, fontWeight: '800', color: '#0066FF' },
    address: { fontSize: 12, color: '#777' },
    metaRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    badge: { fontSize: 10, fontWeight: '700', color: '#0066FF', backgroundColor: '#E8F0FF', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
    likeBtn: { padding: 14 },
    empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 100, gap: 10 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: '#777' },
});
