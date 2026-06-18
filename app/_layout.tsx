import { Stack, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useChatStore } from '../store/chatStore';
import { useNotificationStore } from '../store/notificationStore';
import {
    setupNotificationHandlers,
    handleInitialNotification,
} from '../services/pushNotificationService';
import { ToastProvider } from '../components/ui/Toast';
import { AppStartupScreen } from '../components/startup/AppStartupScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
    const [loaded] = useFonts({});
    const [bootstrapReady, setBootstrapReady] = useState(false);

    // ✅ Lấy thêm user để có user.id cho connectWS
    const { checkAuth, isAuthenticated, user } = useAuthStore();

    const {
        fetchUnreadCount,
        initializePushNotifications: initPush,
        loadNotificationSettings,
        fetchNotifications,
        connectWS,       // ✅ THÊM MỚI
        disconnectWS,    // ✅ THÊM MỚI
    } = useNotificationStore();

    const { connectWebSocket } = useChatStore();
    const router = useRouter();

    // Ref để cleanup notification handlers
    const cleanupRef = useRef<(() => void) | null>(null);

    // Khởi động app
    useEffect(() => {
        let mounted = true;

        const bootstrap = async () => {
            try {
                await checkAuth();
            } catch (error) {
                console.warn('[Startup] Auth restore failed, continue into app.', error);
            } finally {
                if (mounted) {
                    setBootstrapReady(true);
                }
            }
        };

        bootstrap();

        return () => {
            mounted = false;
        };
    }, [checkAuth]);

    useEffect(() => {
        if (loaded) {
            SplashScreen.hideAsync().catch(() => {});
        }
    }, [loaded]);

    // Khởi tạo khi user đã đăng nhập
    useEffect(() => {
        if (!isAuthenticated || !user?.id) return;

        // 1. Load trạng thái notifications từ storage
        loadNotificationSettings();

        // 2. Fetch dữ liệu ban đầu
        fetchUnreadCount();
        fetchNotifications(true);

        // 3. Kết nối WebSocket chat
        connectWebSocket();

        // 4. ✅ Kết nối WebSocket notification realtime
        //    user.id đảm bảo subscribe đúng /user/queue/notifications
        connectWS(user.id);

        // 5. Khởi tạo push notifications (xin quyền + đăng ký token)
        initPush();

        // 6. Xử lý notification khi app được mở từ killed state
        handleInitialNotification(router);

        // 7. Setup foreground + response handlers
        const cleanup = setupNotificationHandlers(
            router,
            () => {
                // Callback khi có notification mới (cập nhật badge)
                fetchUnreadCount();
            }
        );
        cleanupRef.current = cleanup;

        // ✅ Cleanup: ngắt WS notification khi logout / unmount
        return () => {
            cleanupRef.current?.();
            disconnectWS();
        };
    }, [isAuthenticated, user?.id]); // ✅ Depend on user.id để reconnect nếu user đổi

    if (!loaded) return null;

    if (!bootstrapReady) {
        return (
            <GestureHandlerRootView style={{ flex: 1 }}>
                <SafeAreaProvider>
                    <AppStartupScreen />
                </SafeAreaProvider>
            </GestureHandlerRootView>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <Stack>
                    <Stack.Screen name="index" options={{ headerShown: false }} />
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
                    <Stack.Screen name="login-success" options={{ headerShown: false }} />
                    {/* KYC screens */}
                    <Stack.Screen name="kyc/index" options={{ headerShown: false, animation: 'slide_from_right' }} />
                    <Stack.Screen name="kyc/upload-front" options={{ headerShown: false, animation: 'slide_from_right' }} />
                    <Stack.Screen name="kyc/upload-back" options={{ headerShown: false, animation: 'slide_from_right' }} />
                    <Stack.Screen name="kyc/info" options={{ headerShown: false, animation: 'slide_from_right' }} />
                    <Stack.Screen name="kyc/pending" options={{ headerShown: false, animation: 'slide_from_right' }} />
                    {/* Wallet screens */}
                    <Stack.Screen name="wallet/index" options={{ headerShown: false, animation: 'slide_from_right' }} />
                    <Stack.Screen name="wallet/deposit" options={{ headerShown: false, animation: 'slide_from_right' }} />
                    <Stack.Screen name="wallet/vnpay" options={{ headerShown: false, animation: 'slide_from_right' }} />
                    <Stack.Screen name="wallet/success" options={{ headerShown: false, animation: 'slide_from_right' }} />
                    <Stack.Screen name="wallet/failed" options={{ headerShown: false, animation: 'slide_from_right' }} />
                    <Stack.Screen name="wallet/history" options={{ headerShown: false, animation: 'slide_from_right' }} />
                    <Stack.Screen name="wallet/operations" options={{ headerShown: false, animation: 'slide_from_right' }} />
                    <Stack.Screen name="wallet/withdraw" options={{ headerShown: false, animation: 'slide_from_right' }} />
                    <Stack.Screen name="liked-properties" options={{ headerShown: false, animation: 'slide_from_right' }} />
                    <Stack.Screen name="property/trash" options={{ headerShown: false, animation: 'slide_from_right' }} />
                    <Stack.Screen name="bills/create" options={{ headerShown: false, animation: 'slide_from_right' }} />
                    {/* Appointment screens */}
                    <Stack.Screen name="appointments/index" options={{ headerShown: false, animation: 'slide_from_right' }} />
                    <Stack.Screen name="appointments/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
                    {/* Contract screens */}
                    <Stack.Screen name="contracts/index" options={{ headerShown: false, animation: 'slide_from_right' }} />
                    <Stack.Screen name="contracts/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
                    {/* Package screens */}
                    <Stack.Screen name="packages/index" options={{ headerShown: false, animation: 'slide_from_right' }} />
                    <Stack.Screen name="packages/boost/[roomId]" options={{ headerShown: false, animation: 'slide_from_right' }} />
                    {/* Settings screens */}
                    <Stack.Screen name="settings/security" options={{ headerShown: false, animation: 'slide_from_right' }} />
                    {/* Landlord profile */}
                    <Stack.Screen name="landlord-profile" options={{ headerShown: false, animation: 'slide_from_right' }} />
                    {/* Analytics */}
                    <Stack.Screen name="analytics/index" options={{ headerShown: false, animation: 'slide_from_right' }} />
                    {/* Profile */}
                    <Stack.Screen name="profile/lifestyle" options={{ headerShown: false, animation: 'slide_from_right' }} />
                    {/* Projects */}
                    <Stack.Screen name="projects/index" options={{ headerShown: false, animation: 'slide_from_right' }} />
                    <Stack.Screen name="projects/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
                    {/* Filter */}
                    <Stack.Screen name="filter" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
                    <Stack.Screen name="+not-found" options={{ headerShown: false }} />
                </Stack>
                <ToastProvider />
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
