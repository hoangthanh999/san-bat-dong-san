/**
 * tokenStorage.ts
 *
 * Lưu trữ token xác thực bằng expo-secure-store (mã hóa native keychain/keystore).
 *
 * Migration: Nếu app trước đây lưu token bằng AsyncStorage, lần đầu đọc token
 * sẽ tự động migrate sang SecureStore và xóa bản cũ khỏi AsyncStorage.
 *
 * LƯU Ý:
 * - KHÔNG log giá trị token ở bất kỳ đâu trong file này.
 * - USER_DATA (tên, email, role) vẫn lưu AsyncStorage bình thường — không nhạy cảm.
 * - expo-secure-store yêu cầu native build — Expo Go sẽ fallback tự động.
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../constants';

// Keys dùng trong SecureStore (phải là alphanumeric + dấu chấm/gạch dưới, ≤ 255 ký tự)
const SECURE_KEY_ACCESS_TOKEN = 'hs_access_token';
const SECURE_KEY_REFRESH_TOKEN = 'hs_refresh_token';

// Legacy AsyncStorage keys — chỉ dùng để migrate một lần rồi xóa
const LEGACY_ACCESS_TOKEN_KEY = STORAGE_KEYS.AUTH_TOKEN;    // 'auth_token'
const LEGACY_REFRESH_TOKEN_KEY = STORAGE_KEYS.REFRESH_TOKEN; // 'refresh_token'

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Đọc token từ SecureStore. Nếu không có, thử migrate từ AsyncStorage legacy.
 */
async function readWithMigration(
    secureKey: string,
    legacyKey: string
): Promise<string | null> {
    try {
        // 1. Đọc từ SecureStore trước
        const secure = await SecureStore.getItemAsync(secureKey);
        if (secure) return secure;

        // 2. Không có → thử đọc legacy AsyncStorage
        const legacy = await AsyncStorage.getItem(legacyKey);
        if (!legacy) return null;

        // 3. Migrate: ghi vào SecureStore, xóa khỏi AsyncStorage
        await SecureStore.setItemAsync(secureKey, legacy);
        await AsyncStorage.removeItem(legacyKey);

        return legacy;
    } catch {
        // SecureStore có thể fail trên simulator hoặc khi chưa rebuild native
        // Fallback đọc AsyncStorage legacy để không mất session
        try {
            return await AsyncStorage.getItem(legacyKey);
        } catch {
            return null;
        }
    }
}

// ─── Access Token ──────────────────────────────────────────────────────────────

export async function getAccessToken(): Promise<string | null> {
    return readWithMigration(SECURE_KEY_ACCESS_TOKEN, LEGACY_ACCESS_TOKEN_KEY);
}

export async function setAccessToken(token: string): Promise<void> {
    try {
        await SecureStore.setItemAsync(SECURE_KEY_ACCESS_TOKEN, token);
        // Đảm bảo không còn bản cũ trong AsyncStorage
        await AsyncStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
    } catch {
        // Fallback nếu SecureStore chưa sẵn (e.g. chưa rebuild sau cài native module)
        await AsyncStorage.setItem(LEGACY_ACCESS_TOKEN_KEY, token);
    }
}

export async function removeAccessToken(): Promise<void> {
    try {
        await SecureStore.deleteItemAsync(SECURE_KEY_ACCESS_TOKEN);
    } catch { /* ignore */ }
    // Luôn xóa legacy key
    await AsyncStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
}

// ─── Refresh Token ─────────────────────────────────────────────────────────────

export async function getRefreshToken(): Promise<string | null> {
    return readWithMigration(SECURE_KEY_REFRESH_TOKEN, LEGACY_REFRESH_TOKEN_KEY);
}

export async function setRefreshToken(token: string): Promise<void> {
    try {
        await SecureStore.setItemAsync(SECURE_KEY_REFRESH_TOKEN, token);
        await AsyncStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
    } catch {
        await AsyncStorage.setItem(LEGACY_REFRESH_TOKEN_KEY, token);
    }
}

export async function removeRefreshToken(): Promise<void> {
    try {
        await SecureStore.deleteItemAsync(SECURE_KEY_REFRESH_TOKEN);
    } catch { /* ignore */ }
    await AsyncStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
}

// ─── Clear all tokens (dùng khi logout hoặc forceLogout) ──────────────────────

export async function clearTokens(): Promise<void> {
    // Xóa từ SecureStore
    await Promise.allSettled([
        SecureStore.deleteItemAsync(SECURE_KEY_ACCESS_TOKEN),
        SecureStore.deleteItemAsync(SECURE_KEY_REFRESH_TOKEN),
    ]);
    // Xóa legacy AsyncStorage keys (đảm bảo không còn token cũ)
    await AsyncStorage.multiRemove([
        LEGACY_ACCESS_TOKEN_KEY,
        LEGACY_REFRESH_TOKEN_KEY,
    ]);
}
