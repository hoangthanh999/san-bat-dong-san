import { Tabs } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChatStore } from '../../store/chatStore';
import { useNotificationStore } from '../../store/notificationStore';

function Badge({ count }: { count: number }) {
    if (count <= 0) return null;
    return (
        <View style={styles.badge}>
            <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
    );
}

export default function TabLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { totalUnread } = useChatStore();
    const { unreadCount: notifUnread } = useNotificationStore();
    const insets = useSafeAreaInsets();

    const tabBg = isDark ? '#1A1A1A' : '#FFFFFF';
    const tabBorder = isDark ? '#333' : '#E0E0E0';
    const activeColor = '#f96302';
    const inactiveColor = isDark ? '#888' : '#999';

    const tabBarPaddingBottom = Math.max(insets.bottom, 12);
    const TAB_BAR_HEIGHT = 48 + 8 + tabBarPaddingBottom;

    return (
        <Tabs
            initialRouteName="index"
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: tabBg,
                    borderTopColor: tabBorder,
                    height: TAB_BAR_HEIGHT,
                    paddingBottom: tabBarPaddingBottom,
                    paddingTop: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.06,
                    shadowRadius: 8,
                    elevation: 10,
                },
                tabBarActiveTintColor: activeColor,
                tabBarInactiveTintColor: inactiveColor,
                tabBarLabelStyle: { marginTop: 2, fontSize: 11, fontWeight: '600' },
            }}
        >
            {/* ── Home ── */}
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Trang chủ',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons
                            name={focused ? 'home' : 'home-outline'}
                            size={24}
                            color={color}
                        />
                    ),
                }}
            />

            {/* ── Reels — MỚI ── */}
            <Tabs.Screen
                name="reels"
                options={{
                    title: 'Reels',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={styles.reelsIconWrap}>
                            <Ionicons
                                name={focused ? 'play-circle' : 'play-circle-outline'}
                                size={26}
                                color={focused ? '#fff' : color}
                            />
                        </View>
                    ),
                    tabBarLabel: ({ focused }) => (
                        <Text style={[
                            styles.reelsLabel,
                            { color: focused ? activeColor : inactiveColor }
                        ]}>
                            Reels
                        </Text>
                    ),
                }}
            />

            {/* ── Post (FAB center) ── */}
            <Tabs.Screen
                name="post"
                options={{
                    title: '',
                    tabBarIcon: () => (
                        <View style={styles.postBtn}>
                            <Feather name="plus" size={26} color="#fff" />
                        </View>
                    ),
                    tabBarLabel: () => null,
                }}
            />

            {/* ── Chat ── */}
            <Tabs.Screen
                name="chat"
                options={{
                    title: 'Chat',
                    tabBarIcon: ({ color, focused }) => (
                        <View>
                            <Ionicons
                                name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
                                size={24}
                                color={color}
                            />
                            <Badge count={totalUnread} />
                        </View>
                    ),
                }}
            />

            {/* ── Profile ── */}
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Tôi',
                    tabBarIcon: ({ color, focused }) => (
                        <View>
                            <Ionicons
                                name={focused ? 'person' : 'person-outline'}
                                size={24}
                                color={color}
                            />
                            <Badge count={notifUnread} />
                        </View>
                    ),
                }}
            />

            {/* ── Map ── */}
            <Tabs.Screen
                name="map"
                options={{
                    href: null,
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    badge: {
        position: 'absolute',
        top: -4,
        right: -8,
        backgroundColor: '#FF3B30',
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 3,
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    badgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '800',
    },
    // Reels icon — pill tím nhỏ
    reelsIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: '#f96302',
        justifyContent: 'center',
        alignItems: 'center',
    },
    reelsLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
    },
    // Post FAB button
    postBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#f96302',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#f96302',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
});

