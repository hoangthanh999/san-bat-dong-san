/**
 * Global Error Toast — hiển thị lỗi API thân thiện cho người dùng
 * thay vì crash app hoặc hiện chấm đỏ.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastType = 'error' | 'warning' | 'success' | 'info';

interface ToastMessage {
    id: string;
    message: string;
    type: ToastType;
}

// ============================================================
// GLOBAL EVENT EMITTER — Các nơi khác gọi showToast() để hiện toast
// ============================================================
type ToastListener = (msg: ToastMessage) => void;
const listeners: Set<ToastListener> = new Set();

export function showToast(message: string, type: ToastType = 'error') {
    const toast: ToastMessage = { id: Date.now().toString(), message, type };
    listeners.forEach(fn => fn(toast));
}

// ============================================================
// TOAST PROVIDER — đặt ở root _layout.tsx
// ============================================================
export function ToastProvider() {
    const insets = useSafeAreaInsets();
    const [toast, setToast] = useState<ToastMessage | null>(null);
    const slideAnim = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const hideToast = useCallback(() => {
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: -100, duration: 300, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => setToast(null));
    }, [slideAnim, opacity]);

    const handleToast = useCallback((msg: ToastMessage) => {
        // Clear previous timer
        if (timerRef.current) clearTimeout(timerRef.current);
        
        setToast(msg);
        slideAnim.setValue(-100);
        opacity.setValue(0);

        Animated.parallel([
            Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]).start();

        // Auto-hide after 4s
        timerRef.current = setTimeout(hideToast, 4000);
    }, [slideAnim, opacity, hideToast]);

    useEffect(() => {
        listeners.add(handleToast);
        return () => {
            listeners.delete(handleToast);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [handleToast]);

    if (!toast) return null;

    const configs: Record<ToastType, { bg: string; icon: string; iconColor: string }> = {
        error: { bg: '#FEF2F2', icon: 'alert-circle', iconColor: '#EF4444' },
        warning: { bg: '#FFFBEB', icon: 'warning', iconColor: '#F59E0B' },
        success: { bg: '#F0FDF4', icon: 'checkmark-circle', iconColor: '#22C55E' },
        info: { bg: '#EFF6FF', icon: 'information-circle', iconColor: '#3B82F6' },
    };
    const cfg = configs[toast.type];

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    top: insets.top + 8,
                    backgroundColor: cfg.bg,
                    transform: [{ translateY: slideAnim }],
                    opacity,
                },
            ]}
            pointerEvents="box-none"
        >
            <TouchableOpacity style={styles.inner} onPress={hideToast} activeOpacity={0.8}>
                <Ionicons name={cfg.icon as any} size={22} color={cfg.iconColor} />
                <Text style={[styles.message, { color: cfg.iconColor === '#EF4444' ? '#991B1B' : '#1A1A1A' }]} numberOfLines={3}>
                    {toast.message}
                </Text>
                <TouchableOpacity onPress={hideToast} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close" size={18} color="#999" />
                </TouchableOpacity>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 9999,
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 8,
    },
    inner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 10,
    },
    message: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
    },
});
