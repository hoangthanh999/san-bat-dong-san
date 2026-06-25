import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    API_BASE_URL,
    API_FALLBACK_BASE_URL,
    ENABLE_API_FALLBACK,
    STORAGE_KEYS,
    WS_AI_URL,
} from '../../constants';
import { clearTokens } from '../storage/tokenStorage';

type ApiEnvironmentName = 'production' | 'fallback';

interface ApiEnvironment {
    name: ApiEnvironmentName;
    baseUrl: string;
}

const PING_PATH = '/public/properties?page=0&size=1';
const PING_TIMEOUT_MS = 2500;
const PRODUCTION_BASE_URL = normalizeBaseUrl(API_BASE_URL);
const FALLBACK_BASE_URL = normalizeBaseUrl(API_FALLBACK_BASE_URL);

let currentEnvironment: ApiEnvironment | null = null;
let resolveEnvironmentPromise: Promise<ApiEnvironment> | null = null;

function normalizeBaseUrl(url?: string | null): string {
    return (url || '').trim().replace(/\/+$/, '');
}

function shouldTryFallback(error: unknown): boolean {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;

    return !axiosError.response
        || axiosError.code === 'ECONNABORTED'
        || axiosError.message?.toLowerCase().includes('timeout')
        || Boolean(status && status >= 500);
}

async function pingBaseUrl(baseUrl: string): Promise<void> {
    await axios.get(`${baseUrl}${PING_PATH}`, {
        timeout: PING_TIMEOUT_MS,
        validateStatus: status => status >= 200 && status < 300,
    });
}

async function clearAuthForEnvironmentChange() {
    // Xóa token qua SecureStore abstraction
    await clearTokens();
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);

    try {
        const { useAuthStore } = require('../../store/authStore');
        useAuthStore.getState().forceLogout();
    } catch {
        // Store may not be ready during early app startup.
    }
}

async function persistSelectedEnvironment(environment: ApiEnvironment): Promise<void> {
    const previousBaseUrl = normalizeBaseUrl(
        await AsyncStorage.getItem(STORAGE_KEYS.API_ENVIRONMENT_BASE_URL)
    );

    if (previousBaseUrl && previousBaseUrl !== environment.baseUrl) {
        await clearAuthForEnvironmentChange();
    }

    await AsyncStorage.setItem(STORAGE_KEYS.API_ENVIRONMENT_BASE_URL, environment.baseUrl);
}

async function resolveApiEnvironment(): Promise<ApiEnvironment> {
    if (!ENABLE_API_FALLBACK || !FALLBACK_BASE_URL) {
        const environment = { name: 'production' as const, baseUrl: PRODUCTION_BASE_URL };
        await persistSelectedEnvironment(environment);
        console.log('[API] Using production backend');
        return environment;
    }

    try {
        await pingBaseUrl(PRODUCTION_BASE_URL);
        const environment = { name: 'production' as const, baseUrl: PRODUCTION_BASE_URL };
        await persistSelectedEnvironment(environment);
        console.log('[API] Using production backend');
        return environment;
    } catch (error) {
        if (!shouldTryFallback(error)) {
            const environment = { name: 'production' as const, baseUrl: PRODUCTION_BASE_URL };
            await persistSelectedEnvironment(environment);
            console.log('[API] Using production backend');
            return environment;
        }

        try {
            await pingBaseUrl(FALLBACK_BASE_URL);
            const environment = { name: 'fallback' as const, baseUrl: FALLBACK_BASE_URL };
            await persistSelectedEnvironment(environment);
            console.log('[API] Falling back to local backend');
            return environment;
        } catch {
            const environment = { name: 'production' as const, baseUrl: PRODUCTION_BASE_URL };
            await persistSelectedEnvironment(environment);
            console.log('[API] Using production backend');
            return environment;
        }
    }
}

export async function getApiEnvironment(): Promise<ApiEnvironment> {
    if (currentEnvironment) return currentEnvironment;

    if (!resolveEnvironmentPromise) {
        resolveEnvironmentPromise = resolveApiEnvironment()
            .then(environment => {
                currentEnvironment = environment;
                return environment;
            })
            .finally(() => {
                resolveEnvironmentPromise = null;
            });
    }

    return resolveEnvironmentPromise;
}

export async function getApiBaseUrl(): Promise<string> {
    return (await getApiEnvironment()).baseUrl;
}

export async function getChatWebSocketUrl(): Promise<string> {
    return `${await getApiBaseUrl()}/ws-chat`;
}

export async function getNotificationWebSocketUrl(): Promise<string> {
    return `${await getApiBaseUrl()}/ws-notifier`;
}

export async function getAiWebSocketUrl(): Promise<string> {
    return normalizeBaseUrl(WS_AI_URL) || `${await getApiBaseUrl()}/ws-ai`;
}
