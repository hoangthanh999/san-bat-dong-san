import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useChatStore } from '../store/chatStore';
import { useNotificationStore } from '../store/notificationStore';
import {
    setupNotificationHandlers,
    handleInitialNotification,
} from '../services/pushNotificationService';

SplashScreen.preventAutoHideAsync();

const PROTECTED_SEGMENTS = ['post', 'chat', 'profile'];

function AuthGuard() {
    const { isAuthenticated, isLoading } = useAuthStore();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;
        const inTabsGroup = segments[0] === '(tabs)';
        const currentTab = segments[1] as string;
        if (inTabsGroup && PROTECTED_SEGMENTS.includes(currentTab) && !isAuthenticated) {
            router.replace('/(auth)/login');
        }
    }, [isAuthenticated, isLoading, segments]);

    return null;
}

export default function RootLayout() {
    const [loaded] = useFonts({});
    const { checkAuth, isAuthenticated } = useAuthStore();
    const {
        fetchUnreadCount,
        initializePushNotifications: initPush,
        loadNotificationSettings,
        fetchNotifications,
    } = useNotificationStore();
    const { connectWebSocket } = useChatStore();
    const router = useRouter();

    // Ref để cleanup notification handlers
    const cleanupRef = useRef<(() => void) | null>(null);

    // Khởi động app
    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        if (loaded) {
            SplashScreen.hideAsync();
        }
    }, [loaded]);

    // Khởi tạo push notifications khi user đã đăng nhập
    useEffect(() => {
        if (!isAuthenticated) return;

        // 1. Load trạng thái notifications từ storage
        loadNotificationSettings();

        // 2. Fetch dữ liệu ban đầu
        fetchUnreadCount();
        fetchNotifications(true);

        // 3. Kết nối WebSocket chat
        connectWebSocket();

        // 4. Khởi tạo push notifications (xin quyền + đăng ký token)
        initPush();

        // 5. Xử lý notification khi app được mở từ killed state
        handleInitialNotification(router);

        // 6. Setup foreground + response handlers
        const cleanup = setupNotificationHandlers(
            router,
            () => {
                // Callback khi có notification mới (cập nhật badge)
                fetchUnreadCount();
            }
        );
        cleanupRef.current = cleanup;

        return () => {
            cleanupRef.current?.();
        };
    }, [isAuthenticated]);

    if (!loaded) return null;

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen
                    name="property/[id]"
                    options={{ headerShown: false, presentation: 'card', animation: 'slide_from_right' }}
                />
                <Stack.Screen
                    name="chat/[id]"
                    options={{ headerShown: false, animation: 'slide_from_right' }}
                />
                <Stack.Screen
                    name="edit-profile"
                    options={{ headerShown: false, animation: 'slide_from_right' }}
                />
                <Stack.Screen
                    name="notifications"
                    options={{ headerShown: false, animation: 'slide_from_right' }}
                />
                <Stack.Screen name="+not-found" />
                <Stack.Screen
                    name="(auth)/onboarding"
                    options={{ headerShown: false, animation: 'fade' }}
                />
            </Stack>
            <AuthGuard />
        </GestureHandlerRootView>
    );
}
