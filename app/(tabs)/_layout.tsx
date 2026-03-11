import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
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

    const tabBg = isDark ? '#1A1A1A' : '#FFFFFF';
    const tabBorder = isDark ? '#333' : '#E0E0E0';
    const activeColor = '#0066FF';
    const inactiveColor = isDark ? '#888' : '#999';

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: tabBg,
                    borderTopColor: tabBorder,
                    height: Platform.OS === 'ios' ? 88 : 64,
                    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
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
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Khám phá',
                    tabBarIcon: ({ color, focused }) => (
                        <View>
                            <Feather name="home" size={24} color={color} />
                        </View>
                    ),
                }}
            />

            <Tabs.Screen
                name="map"
                options={{
                    title: 'Bản đồ',
                    tabBarIcon: ({ color }) => (
                        <Feather name="map" size={24} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="post"
                options={{
                    title: '',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={styles.postButton}>
                            <Feather name="plus" size={30} color="white" />
                        </View>
                    ),
                }}
            />

            <Tabs.Screen
                name="chat"
                options={{
                    title: 'Tin nhắn',
                    tabBarIcon: ({ color }) => (
                        <View style={styles.iconWrapper}>
                            <Feather name="message-square" size={24} color={color} />
                            <Badge count={totalUnread} />
                        </View>
                    ),
                }}
            />

            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Cá nhân',
                    tabBarIcon: ({ color }) => (
                        <View style={styles.iconWrapper}>
                            <Feather name="user" size={24} color={color} />
                            <Badge count={notifUnread} />
                        </View>
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    iconWrapper: { position: 'relative' },
    badge: {
        position: 'absolute', top: -6, right: -10,
        backgroundColor: '#EF4444', minWidth: 18, height: 18,
        borderRadius: 9, justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: 4, borderWidth: 1.5, borderColor: 'white',
    },
    badgeText: { color: 'white', fontSize: 10, fontWeight: '800' },
    postButton: {
        top: -18,
        backgroundColor: '#0066FF',
        width: 56, height: 56, borderRadius: 28,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#0066FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
    },
});
