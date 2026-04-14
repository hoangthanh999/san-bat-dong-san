import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Hook responsive cho header padding.
 * Trả về paddingTop chính xác dựa trên safe area thực tế của thiết bị.
 * Dùng ở tất cả các screens cần header custom (không dùng expo-router header).
 */
export function useHeaderHeight() {
    const insets = useSafeAreaInsets();
    return {
        /** paddingTop cho header: safe area top + 8px spacing */
        headerPaddingTop: insets.top + 8,
        /** Chiều cao vùng an toàn phía trên (status bar) */
        statusBarHeight: insets.top,
        /** insets từ react-native-safe-area-context */
        insets,
    };
}

/**
 * Hook tính chiều cao tab bar.
 * Logic phải KHỚP với _layout.tsx: 48 (content) + 8 (paddingTop) + max(insets.bottom, 12)
 */
export function useTabBarHeight() {
    const insets = useSafeAreaInsets();
    const tabBarPaddingBottom = Math.max(insets.bottom, 12);
    return 48 + 8 + tabBarPaddingBottom;
}
