/**
 * pushNotificationService.ts
 * Service trung tâm quản lý toàn bộ Push Notifications:
 *  - Xin quyền thông báo
 *  - Lấy Expo Push Token
 *  - Setup foreground / response handler
 *  - Schedule local notifications (appointment reminders)
 *  - Điều hướng khi user bấm vào notification
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';
import { notificationService } from './api/notifications';

// ─── Channel mặc định cho Android ────────────────────────────────────────────
export async function setupNotificationChannel() {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Thông báo chung',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#0066FF',
            enableVibrate: true,
            showBadge: true,
        });

        await Notifications.setNotificationChannelAsync('chat', {
            name: 'Tin nhắn',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250],
            lightColor: '#22C55E',
            enableVibrate: true,
            showBadge: true,
        });

        await Notifications.setNotificationChannelAsync('appointment', {
            name: 'Lịch hẹn xem nhà',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 500, 250, 500],
            lightColor: '#FF6B35',
            enableVibrate: true,
            showBadge: true,
        });
    }
}

// ─── Cấu hình hành vi khi có notification ─────────────────────────────────────
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,     // Hiện alert khi app đang mở (foreground)
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// ─── Xin quyền và lấy Expo Push Token ─────────────────────────────────────────
export async function registerForPushNotifications(): Promise<string | null> {
    // 1. Kiểm tra thiết bị thật (simulator không hỗ trợ push)
    if (!Device.isDevice) {
        console.warn('[PushNotif] Push notifications chỉ hoạt động trên thiết bị thật.');
        return null;
    }

    // 2. Thiết lập channel Android
    await setupNotificationChannel();

    // 3. Kiểm tra quyền hiện tại
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // 4. Xin quyền nếu chưa có
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
            ios: {
                allowAlert: true,
                allowBadge: true,
                allowSound: true,
            },
        });
        finalStatus = status;
    }

    // 5. Nếu user từ chối
    if (finalStatus !== 'granted') {
        console.warn('[PushNotif] Quyền thông báo bị từ chối.');
        await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED, 'false');
        return null;
    }

    // 6. Lấy Expo Push Token
    try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: 'your-expo-project-id', // Thay bằng EAS project ID thật
        });
        const token = tokenData.data;
        console.log('[PushNotif] Expo Push Token:', token);

        // 7. Lưu token vào AsyncStorage
        await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token);
        await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED, 'true');

        return token;
    } catch (error) {
        console.error('[PushNotif] Lỗi lấy push token:', error);
        return null;
    }
}

// ─── Gửi token lên server ────────────────────────────────────────────────────
export async function savePushTokenToServer(token: string): Promise<void> {
    try {
        await notificationService.savePushToken(token);
        console.log('[PushNotif] Đã lưu push token lên server.');
    } catch (error) {
        // Silently fail — sẽ retry lần sau
        console.warn('[PushNotif] Không thể lưu token lên server, sẽ thử lại sau.');
    }
}

// ─── Xóa push token khi logout ────────────────────────────────────────────────
export async function removePushToken(): Promise<void> {
    try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN);
        if (token) {
            await notificationService.deletePushToken(token);
        }
        await AsyncStorage.removeItem(STORAGE_KEYS.PUSH_TOKEN);
        await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED, 'false');
        // Xóa badge
        await Notifications.setBadgeCountAsync(0);
        console.log('[PushNotif] Đã xóa push token.');
    } catch (error) {
        console.error('[PushNotif] Lỗi xóa token:', error);
    }
}

// ─── Init đầy đủ (register + save to server) ──────────────────────────────────
export async function initializePushNotifications(): Promise<string | null> {
    const token = await registerForPushNotifications();
    if (token) {
        await savePushTokenToServer(token);
    }
    return token;
}

// ─── Setup Notification Handlers (gọi ở _layout.tsx) ─────────────────────────
/**
 * Thiết lập 2 listener chính:
 * 1. foregroundSubscription: Khi app đang mở và có notification đến
 * 2. responseSubscription: Khi user bấm vào notification (mở từ background/killed)
 *
 * @param router - expo-router Router object để điều hướng
 * @param onNewNotification - callback khi có notification mới (cập nhật badge)
 * @returns cleanup function để gọi khi unmount
 */
export function setupNotificationHandlers(
    router: any,
    onNewNotification?: () => void
): () => void {
    // Listener 1: Foreground – Notification đến khi app đang mở
    const foregroundSubscription = Notifications.addNotificationReceivedListener(
        (notification) => {
            console.log('[PushNotif] Nhận notification (foreground):', notification);
            // Cập nhật badge/unread count
            onNewNotification?.();
        }
    );

    // Listener 2: Response – User bấm vào notification
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
        (response) => {
            const data = response.notification.request.content.data as any;
            console.log('[PushNotif] User bấm vào notification:', data);
            handleNotificationNavigation(router, data);
        }
    );

    // Cleanup function
    return () => {
        foregroundSubscription.remove();
        responseSubscription.remove();
    };
}

// ─── Điều hướng dựa trên notification type / data ────────────────────────────
export function handleNotificationNavigation(router: any, data: any) {
    if (!data) return;

    try {
        const { type, roomId, chatPartnerId } = data;

        switch (type) {
            case 'CHAT':
                if (chatPartnerId) {
                    router.push(`/chat/${chatPartnerId}`);
                }
                break;

            case 'APPOINTMENT':
            case 'APPOINTMENT_REMINDER':
            case 'REVIEW':
            case 'ROOM_APPROVED':
            case 'ROOM_REJECTED':
                if (roomId) {
                    router.push(`/property/${roomId}`);
                }
                break;

            case 'SYSTEM':
            default:
                router.push('/notifications');
                break;
        }
    } catch (error) {
        console.error('[PushNotif] Lỗi điều hướng từ notification:', error);
    }
}

// ─── Xử lý notification khi app khởi động từ killed state ────────────────────
export async function handleInitialNotification(router: any): Promise<void> {
    try {
        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        if (lastResponse) {
            const data = lastResponse.notification.request.content.data as any;
            console.log('[PushNotif] App được mở từ notification:', data);
            // Delay nhỏ để router sẵn sàng
            setTimeout(() => handleNotificationNavigation(router, data), 500);
        }
    } catch (error) {
        console.error('[PushNotif] Lỗi xử lý initial notification:', error);
    }
}

// ─── Đặt Badge Count ─────────────────────────────────────────────────────────
export async function setBadgeCount(count: number): Promise<void> {
    try {
        await Notifications.setBadgeCountAsync(count);
    } catch (error) {
        console.error('[PushNotif] Lỗi set badge:', error);
    }
}

// ─── Local Notifications (Appointment Reminder) ───────────────────────────────
/**
 * Tạo local notification nhắc lịch hẹn xem nhà
 * Gửi trước 1 giờ trước giờ hẹn
 */
export async function scheduleAppointmentReminder(params: {
    appointmentId: number;
    roomId: number;
    roomTitle: string;
    scheduledAt: string; // ISO date string
    landlordName: string;
}): Promise<string | null> {
    try {
        const appointmentDate = new Date(params.scheduledAt);
        const reminderDate = new Date(appointmentDate.getTime() - 60 * 60 * 1000); // Trước 1 giờ

        // Nếu thời gian nhắc đã qua thì bỏ qua
        if (reminderDate <= new Date()) {
            console.log('[PushNotif] Lịch hẹn quá gần, không schedule reminder.');
            return null;
        }

        const notifId = await Notifications.scheduleNotificationAsync({
            content: {
                title: '⏰ Nhắc lịch xem nhà',
                body: `Bạn có lịch xem "${params.roomTitle}" với ${params.landlordName} lúc ${appointmentDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} hôm nay!`,
                data: {
                    type: 'APPOINTMENT_REMINDER',
                    roomId: params.roomId,
                    appointmentId: params.appointmentId,
                },
                sound: 'default',
                badge: 1,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: reminderDate,
            },
        });

        console.log('[PushNotif] Đã schedule appointment reminder:', notifId);
        return notifId;
    } catch (error) {
        console.error('[PushNotif] Lỗi schedule appointment reminder:', error);
        return null;
    }
}

/**
 * Tạo local notification ngay lập tức (dùng để test)
 */
export async function sendLocalNotification(params: {
    title: string;
    body: string;
    data?: Record<string, any>;
}): Promise<void> {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: params.title,
            body: params.body,
            data: params.data || {},
            sound: 'default',
        },
        trigger: null, // Gửi ngay
    });
}

/**
 * Hủy tất cả scheduled notifications
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[PushNotif] Đã hủy tất cả scheduled notifications.');
}

/**
 * Hủy scheduled notification theo ID
 */
export async function cancelScheduledNotification(notifId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notifId);
}
