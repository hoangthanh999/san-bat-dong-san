import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Room } from '../../types';
import { formatCompactVND } from '../../utils/formatPrice';
import { useSafeRouter } from '../../hooks/useSafeRouter';
import { useInteractionStore } from '../../store/interactionStore';
import { getPromotionBadgeLabel } from '../../utils/promotion';

interface FeedPropertyCardProps {
    item: Room;
}

const getTransactionLabel = (type?: string) => {
    if (type === 'FOR_RENT') return 'Cho thuê';
    if (type === 'FOR_SALE') return 'Bán';
    return 'BĐS';
};

const getPropertyLabel = (type?: string) => {
    switch (type) {
        case 'APARTMENT':
            return 'Căn hộ';
        case 'HOUSE':
            return 'Nhà phố';
        case 'LAND':
            return 'Đất nền';
        case 'VILLA':
            return 'Biệt thự';
        case 'ROOM':
            return 'Phòng';
        default:
            return type || 'BĐS';
    }
};

const getLocationText = (item: Room) =>
    [item.ward, item.district, item.province].filter(Boolean).join(', ') || item.address;

function FeedPropertyCard({ item }: FeedPropertyCardProps) {
    const { safePush } = useSafeRouter();
    const { width } = useWindowDimensions();
    const isSaved = useInteractionStore(state => state.isSaved(item.id));
    const toggleSave = useInteractionStore(state => state.toggleSave);
    const imageUri = item.images?.[0];
    const promotionBadge = getPromotionBadgeLabel(item);

    const handleOpenDetail = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        safePush(`/property/${item.id}` as any);
    }, [item.id, safePush]);

    const handleSave = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            await toggleSave(item.id);
        } catch (error) {
            console.warn('[FeedPropertyCard] toggle save failed:', error);
        }
    }, [item.id, toggleSave]);

    return (
        <TouchableOpacity
            style={[styles.card, { width: width - 32 }]}
            activeOpacity={0.92}
            onPress={handleOpenDetail}
        >
            <View style={styles.mediaWrap}>
                <Image
                    source={{ uri: imageUri || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800' }}
                    style={styles.image}
                    contentFit="cover"
                    transition={180}
                />
                <View style={styles.topBadges}>
                    <View style={styles.transactionBadge}>
                        <Text style={styles.transactionText}>{getTransactionLabel(item.transactionType)}</Text>
                    </View>
                    {promotionBadge && (
                        <View style={styles.promotedBadge}>
                            <Ionicons name="flash" size={12} color="#B45309" />
                            <Text style={styles.promotedText}>{promotionBadge}</Text>
                        </View>
                    )}
                </View>
                <TouchableOpacity
                    style={styles.saveButton}
                    activeOpacity={0.85}
                    onPress={handleSave}
                    accessibilityRole="button"
                    accessibilityLabel={isSaved ? 'Bỏ lưu bất động sản' : 'Lưu bất động sản'}
                >
                    <Ionicons
                        name={isSaved ? 'bookmark' : 'bookmark-outline'}
                        size={20}
                        color={isSaved ? '#f96302' : '#0F172A'}
                    />
                </TouchableOpacity>
                {item.videoUrl && (
                    <View style={styles.videoBadge}>
                        <Ionicons name="play" size={11} color="white" />
                        <Text style={styles.videoText}>Video</Text>
                    </View>
                )}
            </View>

            <View style={styles.content}>
                <View style={styles.priceRow}>
                    <Text style={styles.price}>{formatCompactVND(item.price)}</Text>
                    {item.area ? (
                        <Text style={styles.priceMeta}>{Math.round(item.area)} m²</Text>
                    ) : null}
                </View>

                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>

                <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={15} color="#64748B" />
                    <Text style={styles.address} numberOfLines={1}>{getLocationText(item)}</Text>
                </View>

                <View style={styles.metaRow}>
                    <View style={styles.metaChip}>
                        <MaterialCommunityIcons name="home-city-outline" size={14} color="#475569" />
                        <Text style={styles.metaText}>{getPropertyLabel(item.propertyType)}</Text>
                    </View>
                    {item.bedrooms !== undefined && (
                        <View style={styles.metaChip}>
                            <Ionicons name="bed-outline" size={14} color="#475569" />
                            <Text style={styles.metaText}>{item.bedrooms} PN</Text>
                        </View>
                    )}
                    {item.bathrooms !== undefined && (
                        <View style={styles.metaChip}>
                            <Ionicons name="water-outline" size={14} color="#475569" />
                            <Text style={styles.metaText}>{item.bathrooms} WC</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}

export default memo(FeedPropertyCard);

const styles = StyleSheet.create({
    card: {
        alignSelf: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E6ECF5',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
        elevation: 4,
    },
    mediaWrap: {
        height: 232,
        backgroundColor: '#E2E8F0',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    topBadges: {
        position: 'absolute',
        top: 12,
        left: 12,
        right: 56,
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    transactionBadge: {
        backgroundColor: '#f96302',
        borderRadius: 14,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    transactionText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '800',
    },
    promotedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FEF3C7',
        borderRadius: 14,
        paddingHorizontal: 9,
        paddingVertical: 6,
    },
    promotedText: {
        color: '#B45309',
        fontSize: 12,
        fontWeight: '800',
    },
    saveButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.94)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoBadge: {
        position: 'absolute',
        left: 12,
        bottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(15,23,42,0.72)',
        borderRadius: 13,
        paddingHorizontal: 9,
        paddingVertical: 5,
    },
    videoText: {
        color: 'white',
        fontSize: 11,
        fontWeight: '800',
    },
    content: {
        padding: 14,
        gap: 8,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 12,
    },
    price: {
        flex: 1,
        color: '#F97316',
        fontSize: 23,
        fontWeight: '900',
    },
    priceMeta: {
        color: '#64748B',
        fontSize: 13,
        fontWeight: '700',
    },
    title: {
        color: '#0F172A',
        fontSize: 16,
        lineHeight: 21,
        fontWeight: '800',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    address: {
        flex: 1,
        color: '#64748B',
        fontSize: 13,
        fontWeight: '600',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        paddingTop: 2,
    },
    metaChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        paddingHorizontal: 9,
        paddingVertical: 6,
    },
    metaText: {
        color: '#475569',
        fontSize: 12,
        fontWeight: '800',
    },
});

