import React, { useEffect, useCallback, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    StatusBar, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProjectStore } from '../../store/projectStore';
import { ProjectResponseDTO, ProjectType } from '../../types';
import { useSafeRouter } from '../../hooks/useSafeRouter';

// ──────────────────────────────────────────
// Config loại dự án
// ──────────────────────────────────────────
const PROJECT_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    APARTMENT_COMPLEX: { label: 'Căn hộ', icon: 'office-building', color: '#0066FF', bg: '#E8F0FF' },
    VILLA_AREA:        { label: 'Biệt thự', icon: 'home-city',      color: '#8B5CF6', bg: '#EDE9FE' },
    TOWNHOUSE_AREA:    { label: 'Nhà phố',  icon: 'home-group',     color: '#10B981', bg: '#D1FAE5' },
    COMMERCIAL:        { label: 'Thương mại', icon: 'store',         color: '#F59E0B', bg: '#FEF3C7' },
    RESORT:            { label: 'Resort',   icon: 'palm-tree',       color: '#EF4444', bg: '#FEE2E2' },
};

const ALL_FILTERS = [
    { key: null,                  label: 'Tất cả' },
    { key: 'APARTMENT_COMPLEX',   label: 'Căn hộ' },
    { key: 'VILLA_AREA',          label: 'Biệt thự' },
    { key: 'TOWNHOUSE_AREA',      label: 'Nhà phố' },
    { key: 'COMMERCIAL',          label: 'Thương mại' },
    { key: 'RESORT',              label: 'Resort' },
];

// ──────────────────────────────────────────
// ProjectCard component
// ──────────────────────────────────────────
function ProjectCard({ item, onPress }: { item: ProjectResponseDTO; onPress: () => void }) {
    const cfg = PROJECT_TYPE_CONFIG[item.projectType] ?? {
        label: item.projectType, icon: 'domain', color: '#666', bg: '#F0F0F0',
    };

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.82}>
            {/* Icon header */}
            <View style={[styles.cardIconWrap, { backgroundColor: cfg.bg }]}>
                <MaterialCommunityIcons name={cfg.icon} size={44} color={cfg.color} />
            </View>

            {/* Info */}
            <View style={styles.cardBody}>
                {/* Type badge */}
                <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.typeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>

                <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>

                <View style={styles.cardRow}>
                    <Ionicons name="location-outline" size={13} color="#888" />
                    <Text style={styles.cardAddress} numberOfLines={1}>{item.address}</Text>
                </View>

                {/* Amenities */}
                {item.amenities && item.amenities.length > 0 && (
                    <View style={styles.amenitiesRow}>
                        {item.amenities.slice(0, 3).map((a, i) => (
                            <View key={i} style={styles.amenityChip}>
                                <Text style={styles.amenityChipText}>{a}</Text>
                            </View>
                        ))}
                        {item.amenities.length > 3 && (
                            <View style={[styles.amenityChip, { backgroundColor: '#F0F0F0' }]}>
                                <Text style={[styles.amenityChipText, { color: '#888' }]}>
                                    +{item.amenities.length - 3}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                <View style={styles.cardFooter}>
                    <View style={[styles.statusDot, {
                        backgroundColor: item.status === 'ACTIVE' ? '#22C55E' : '#F59E0B'
                    }]} />
                    <Text style={styles.statusText}>
                        {item.status === 'ACTIVE' ? 'Đang mở bán' : item.status}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#CCC" style={{ marginLeft: 'auto' }} />
                </View>
            </View>
        </TouchableOpacity>
    );
}

// ──────────────────────────────────────────
// Main Screen
// ──────────────────────────────────────────
export default function ProjectsScreen() {
    const { router, safePush } = useSafeRouter();
    const insets = useSafeAreaInsets();
    const {
        projects, isLoading, isLoadingMore, hasMore, filterType,
        fetchProjects, loadMoreProjects, setFilterType,
    } = useProjectStore();

    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchProjects();
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchProjects(true);
        setRefreshing(false);
    }, []);

    const handleFilterChange = useCallback((key: string | null) => {
        setFilterType(key);
    }, []);

    // Filter client-side theo projectType
    const displayProjects = filterType
        ? projects.filter((p) => p.projectType === filterType)
        : projects;

    const renderFooter = () => {
        if (!isLoadingMore) return null;
        return (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator color="#0066FF" />
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Dự án BĐS</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Filter chips */}
            <View style={styles.filterWrap}>
                <FlatList
                    data={ALL_FILTERS}
                    keyExtractor={(item) => item.key ?? 'all'}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[
                                styles.filterChip,
                                filterType === item.key && styles.filterChipActive,
                            ]}
                            onPress={() => handleFilterChange(item.key)}
                        >
                            <Text style={[
                                styles.filterChipText,
                                filterType === item.key && styles.filterChipTextActive,
                            ]}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* Project count */}
            {!isLoading && (
                <Text style={styles.resultCount}>
                    {displayProjects.length} dự án
                </Text>
            )}

            {/* List */}
            {isLoading && projects.length === 0 ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#0066FF" />
                    <Text style={styles.loadingText}>Đang tải dự án...</Text>
                </View>
            ) : (
                <FlatList
                    data={displayProjects}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <ProjectCard
                            item={item}
                            onPress={() => safePush(`/projects/${item.id}` as any)}
                        />
                    )}
                    contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
                    showsVerticalScrollIndicator={false}
                    onEndReached={() => !filterType && loadMoreProjects()}
                    onEndReachedThreshold={0.4}
                    ListFooterComponent={renderFooter}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="domain" size={56} color="#DDD" />
                            <Text style={styles.emptyTitle}>Chưa có dự án</Text>
                            <Text style={styles.emptySubtitle}>
                                Chưa có dự án BĐS nào phù hợp với bộ lọc của bạn.
                            </Text>
                        </View>
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#0066FF']}
                            tintColor="#0066FF"
                        />
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingBottom: 12,
        backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },

    filterWrap: {
        backgroundColor: 'white', paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    },
    filterChip: {
        paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1.5, borderColor: '#E0E0E0',
        backgroundColor: 'white',
    },
    filterChipActive: { backgroundColor: '#0066FF', borderColor: '#0066FF' },
    filterChipText: { fontSize: 13, color: '#555', fontWeight: '600' },
    filterChipTextActive: { color: 'white' },

    resultCount: {
        fontSize: 13, color: '#888', fontWeight: '500',
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
    },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: '#888', fontSize: 14 },

    // ProjectCard
    card: {
        backgroundColor: 'white', borderRadius: 16, marginBottom: 14,
        overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    },
    cardIconWrap: {
        height: 120, justifyContent: 'center', alignItems: 'center',
    },
    cardBody: { padding: 14, gap: 8 },
    typeBadge: {
        alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 20,
    },
    typeBadgeText: { fontSize: 11, fontWeight: '700' },
    cardName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', lineHeight: 22 },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    cardAddress: { fontSize: 13, color: '#888', flex: 1 },
    amenitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    amenityChip: {
        backgroundColor: '#F0F4FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    },
    amenityChipText: { fontSize: 11, color: '#0066FF', fontWeight: '500' },
    cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusText: { fontSize: 12, color: '#666', fontWeight: '500' },

    emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: '#888' },
    emptySubtitle: { fontSize: 14, color: '#AAA', textAlign: 'center', paddingHorizontal: 32 },
});
