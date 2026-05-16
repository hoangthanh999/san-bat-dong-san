import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, ActivityIndicator, FlatList,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProjectStore } from '../../store/projectStore';

// ──────────────────────────────────────────
// Config loại dự án (shared config)
// ──────────────────────────────────────────
const PROJECT_TYPE_CONFIG: Record<string, { label: string; icon: any; gradient: [string, string] }> = {
    APARTMENT_COMPLEX: { label: 'Khu căn hộ',    icon: 'office-building', gradient: ['#1E3A8A', '#3B82F6'] },
    VILLA_AREA:        { label: 'Khu biệt thự',   icon: 'home-city',       gradient: ['#4C1D95', '#8B5CF6'] },
    TOWNHOUSE_AREA:    { label: 'Khu nhà phố',    icon: 'home-group',      gradient: ['#065F46', '#10B981'] },
    COMMERCIAL:        { label: 'Thương mại',     icon: 'store',           gradient: ['#92400E', '#F59E0B'] },
    RESORT:            { label: 'Khu nghỉ dưỡng', icon: 'palm-tree',       gradient: ['#991B1B', '#EF4444'] },
};

const formatPrice = (price: number) => {
    if (price >= 1000000000) return `${(price / 1000000000).toFixed(1)} tỷ`;
    if (price >= 1000000) return `${(price / 1000000).toFixed(0)} tr`;
    return price.toLocaleString('vi-VN');
};

// ──────────────────────────────────────────
// Compact property row (for project properties list)
// ──────────────────────────────────────────
function PropertyRow({ item, onPress }: { item: any; onPress: () => void }) {
    return (
        <TouchableOpacity style={styles.propRow} onPress={onPress} activeOpacity={0.8}>
            {item.images?.[0] ? (
                <Image
                    source={{ uri: item.images[0] }}
                    style={styles.propThumb}
                    contentFit="cover"
                />
            ) : (
                <View style={[styles.propThumb, { backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="home-outline" size={24} color="#CCC" />
                </View>
            )}
            <View style={styles.propInfo}>
                <Text style={styles.propTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.propPrice}>
                    {formatPrice(item.price)}
                    <Text style={styles.propUnit}>
                        {item.transactionType === 'FOR_RENT' ? '/tháng' : ''}
                    </Text>
                </Text>
                <View style={styles.propMeta}>
                    {item.area > 0 && (
                        <View style={styles.metaChip}>
                            <Ionicons name="resize-outline" size={10} color="#666" />
                            <Text style={styles.metaChipText}>{item.area}m²</Text>
                        </View>
                    )}
                    {item.bedrooms !== undefined && (
                        <View style={styles.metaChip}>
                            <Ionicons name="bed-outline" size={10} color="#666" />
                            <Text style={styles.metaChipText}>{item.bedrooms} PN</Text>
                        </View>
                    )}
                    <View style={[styles.metaChip, {
                        backgroundColor: item.transactionType === 'FOR_SALE' ? '#FEF3C7' : '#D1FAE5'
                    }]}>
                        <Text style={[styles.metaChipText, {
                            color: item.transactionType === 'FOR_SALE' ? '#D97706' : '#059669'
                        }]}>
                            {item.transactionType === 'FOR_SALE' ? 'Mua bán' : 'Cho thuê'}
                        </Text>
                    </View>
                </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCC" />
        </TouchableOpacity>
    );
}

// ──────────────────────────────────────────
// Main Screen
// ──────────────────────────────────────────
export default function ProjectDetailScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();
    const projectId = Number(id);

    const {
        selectedProject: project,
        propertiesInProject,
        isLoadingDetail,
        isLoadingProperties,
        fetchProjectById,
        fetchPropertiesInProject,
        resetDetail,
    } = useProjectStore();

    const [activeTab, setActiveTab] = useState<'info' | 'properties'>('info');

    useEffect(() => {
        if (projectId) {
            fetchProjectById(projectId);
            fetchPropertiesInProject(projectId);
        }
        return () => resetDetail();
    }, [projectId]);

    const cfg = project
        ? (PROJECT_TYPE_CONFIG[project.projectType] ?? {
            label: project.projectType, icon: 'domain',
            gradient: ['#374151', '#6B7280'] as [string, string],
        })
        : { label: '', icon: 'domain', gradient: ['#1E3A8A', '#3B82F6'] as [string, string] };

    if (isLoadingDetail) {
        return (
            <View style={styles.center}>
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator size="large" color="#0066FF" />
                <Text style={{ color: '#888', marginTop: 12 }}>Đang tải dự án...</Text>
            </View>
        );
    }

    if (!project) {
        return (
            <View style={styles.center}>
                <Stack.Screen options={{ headerShown: false }} />
                <Ionicons name="alert-circle-outline" size={56} color="#DDD" />
                <Text style={{ color: '#888', marginTop: 12 }}>Không tìm thấy dự án</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtnFull}>
                    <Text style={styles.backBtnText}>Quay lại</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="light-content" />

            <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>
                {/* Hero Banner */}
                <LinearGradient
                    colors={cfg.gradient}
                    style={styles.heroBanner}
                >
                    {/* Back button */}
                    <TouchableOpacity
                        style={[styles.floatBack, { top: insets.top + 8 }]}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back" size={22} color="white" />
                    </TouchableOpacity>

                    <MaterialCommunityIcons name={cfg.icon} size={80} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.heroType}>{cfg.label}</Text>
                    <Text style={styles.heroName}>{project.name}</Text>
                </LinearGradient>

                {/* Tab Bar (sticky) */}
                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'info' && styles.tabActive]}
                        onPress={() => setActiveTab('info')}
                    >
                        <Ionicons
                            name="information-circle-outline" size={16}
                            color={activeTab === 'info' ? '#0066FF' : '#888'}
                        />
                        <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>
                            Thông tin
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'properties' && styles.tabActive]}
                        onPress={() => setActiveTab('properties')}
                    >
                        <Ionicons
                            name="home-outline" size={16}
                            color={activeTab === 'properties' ? '#0066FF' : '#888'}
                        />
                        <Text style={[styles.tabText, activeTab === 'properties' && styles.tabTextActive]}>
                            BĐS ({propertiesInProject.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Tab Content */}
                {activeTab === 'info' ? (
                    <View style={styles.content}>
                        {/* Address */}
                        <View style={styles.section}>
                            <View style={styles.infoRow}>
                                <Ionicons name="location" size={18} color="#0066FF" />
                                <Text style={styles.infoText}>{project.address}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Ionicons name="calendar-outline" size={18} color="#0066FF" />
                                <Text style={styles.infoText}>
                                    Đăng ngày {new Date(project.createdAt).toLocaleDateString('vi-VN')}
                                </Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Ionicons
                                    name={project.status === 'ACTIVE' ? 'checkmark-circle' : 'time-outline'}
                                    size={18}
                                    color={project.status === 'ACTIVE' ? '#22C55E' : '#F59E0B'}
                                />
                                <Text style={[styles.infoText, {
                                    color: project.status === 'ACTIVE' ? '#22C55E' : '#F59E0B',
                                    fontWeight: '600',
                                }]}>
                                    {project.status === 'ACTIVE' ? 'Đang mở bán / cho thuê' : project.status}
                                </Text>
                            </View>
                        </View>

                        {/* Description */}
                        {project.description && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Mô tả dự án</Text>
                                <Text style={styles.descText}>{project.description}</Text>
                            </View>
                        )}

                        {/* Amenities */}
                        {project.amenities && project.amenities.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Tiện ích dự án</Text>
                                <View style={styles.amenitiesGrid}>
                                    {project.amenities.map((a, i) => (
                                        <View key={i} style={styles.amenityItem}>
                                            <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                                            <Text style={styles.amenityItemText}>{a}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Location info */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Vị trí</Text>
                            <View style={styles.coordRow}>
                                <View style={styles.coordBadge}>
                                    <Text style={styles.coordLabel}>Vĩ độ</Text>
                                    <Text style={styles.coordValue}>{project.latitude.toFixed(6)}</Text>
                                </View>
                                <View style={styles.coordBadge}>
                                    <Text style={styles.coordLabel}>Kinh độ</Text>
                                    <Text style={styles.coordValue}>{project.longitude.toFixed(6)}</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={styles.mapBtn}
                                onPress={() => router.push('/map' as any)}
                            >
                                <Ionicons name="map-outline" size={16} color="#0066FF" />
                                <Text style={styles.mapBtnText}>Xem trên bản đồ</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View style={styles.content}>
                        {isLoadingProperties ? (
                            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                                <ActivityIndicator color="#0066FF" />
                                <Text style={{ color: '#888', marginTop: 10 }}>Đang tải danh sách BĐS...</Text>
                            </View>
                        ) : propertiesInProject.length === 0 ? (
                            <View style={styles.emptyProps}>
                                <Ionicons name="home-outline" size={48} color="#DDD" />
                                <Text style={styles.emptyPropsText}>Chưa có BĐS nào trong dự án này</Text>
                            </View>
                        ) : (
                            propertiesInProject.map((item) => (
                                <PropertyRow
                                    key={item.id}
                                    item={item}
                                    onPress={() => router.push(`/property/${item.id}` as any)}
                                />
                            ))
                        )}
                    </View>
                )}

                <View style={{ height: insets.bottom + 24 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },

    heroBanner: {
        height: 240,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    floatBack: {
        position: 'absolute', left: 16,
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center', alignItems: 'center',
    },
    heroType: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', letterSpacing: 1 },
    heroName: {
        color: 'white', fontSize: 22, fontWeight: '800',
        textAlign: 'center', paddingHorizontal: 24,
        textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
    },

    tabBar: {
        flexDirection: 'row', backgroundColor: 'white',
        borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    },
    tab: {
        flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        gap: 6, paddingVertical: 13,
    },
    tabActive: { borderBottomWidth: 2, borderBottomColor: '#0066FF' },
    tabText: { fontSize: 14, color: '#888', fontWeight: '500' },
    tabTextActive: { color: '#0066FF', fontWeight: '700' },

    content: { padding: 16, gap: 4 },
    section: {
        backgroundColor: 'white', borderRadius: 14, padding: 16,
        marginBottom: 12, gap: 10,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    infoText: { fontSize: 14, color: '#444', flex: 1, lineHeight: 20 },
    descText: { fontSize: 14, color: '#555', lineHeight: 22 },

    amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    amenityItem: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '47%' },
    amenityItemText: { fontSize: 13, color: '#444' },

    coordRow: { flexDirection: 'row', gap: 10 },
    coordBadge: {
        flex: 1, backgroundColor: '#F8F9FA', borderRadius: 10,
        padding: 10, gap: 2,
    },
    coordLabel: { fontSize: 11, color: '#888', fontWeight: '500' },
    coordValue: { fontSize: 14, color: '#1A1A1A', fontWeight: '700' },
    mapBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingVertical: 10, paddingHorizontal: 14,
        borderWidth: 1.5, borderColor: '#0066FF', borderRadius: 10,
        alignSelf: 'flex-start',
    },
    mapBtnText: { color: '#0066FF', fontWeight: '700', fontSize: 14 },

    // Property rows
    propRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'white', borderRadius: 14, padding: 12, marginBottom: 10,
        gap: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    propThumb: { width: 76, height: 76, borderRadius: 10, overflow: 'hidden' },
    propInfo: { flex: 1, gap: 4 },
    propTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', lineHeight: 19 },
    propPrice: { fontSize: 16, fontWeight: '800', color: '#0066FF' },
    propUnit: { fontSize: 12, fontWeight: '400', color: '#888' },
    propMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
    metaChip: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        backgroundColor: '#F0F0F0', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    },
    metaChipText: { fontSize: 10, color: '#666', fontWeight: '500' },

    emptyProps: { alignItems: 'center', paddingVertical: 50, gap: 10 },
    emptyPropsText: { fontSize: 15, color: '#AAA' },

    backBtnFull: {
        marginTop: 20, paddingHorizontal: 24, paddingVertical: 10,
        backgroundColor: '#0066FF', borderRadius: 10,
    },
    backBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
});
