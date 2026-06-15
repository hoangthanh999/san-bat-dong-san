import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, STORAGE_KEYS } from '../../constants';
import { getApiBaseUrl } from './environment';

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

// Create Axios instance cho gateway (identity, customer, media, notification)
// KHÔNG set default Content-Type ở đây — interceptor sẽ xử lý

const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
});

const refreshClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
});

let refreshPromise: Promise<string> | null = null;

const AUTH_REFRESH_EXCLUDED_PATHS = [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/logout',
    '/auth/forgot-password',
    '/auth/reset-password',
];

function isRefreshExcludedUrl(url?: string): boolean {
    if (!url) return false;
    return AUTH_REFRESH_EXCLUDED_PATHS.some(path => url.includes(path));
}

function extractToken(data: any): string | null {
    const payload = data?.result !== undefined ? data.result : data;
    return payload?.token ?? null;
}

async function clearAuthState() {
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);

    try {
        const { useAuthStore } = require('../../store/authStore');
        useAuthStore.getState().forceLogout();
    } catch (e) { }
}

async function refreshAccessToken(): Promise<string> {
    if (!refreshPromise) {
        refreshPromise = (async () => {
            const currentToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
            if (!currentToken) {
                throw new Error('Missing access token');
            }

            const baseURL = await getApiBaseUrl();
            refreshClient.defaults.baseURL = baseURL;

            const response = await refreshClient.post('/auth/refresh', null, {
                headers: {
                    Authorization: `Bearer ${currentToken}`,
                },
            });

            const newToken = extractToken(response.data);
            if (!newToken) {
                throw new Error('Refresh response missing token');
            }

            await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, newToken);

            try {
                const { useAuthStore } = require('../../store/authStore');
                useAuthStore.setState({ token: newToken, isAuthenticated: true });
            } catch (e) { }

            return newToken;
        })().finally(() => {
            refreshPromise = null;
        });
    }

    return refreshPromise;
}
// Request Interceptor - Attach JWT token + tự động set Content-Type
apiClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        try {
            const baseURL = await getApiBaseUrl();
            config.baseURL = baseURL;
            apiClient.defaults.baseURL = baseURL;
            refreshClient.defaults.baseURL = baseURL;

            const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
            if (token && config.headers) {
                config.headers.Authorization = `Bearer ${token}`;
            } else if (config.headers?.Authorization) {
                delete (config.headers as any).Authorization;
            }

            // Tự động set Content-Type dựa trên loại data
            if (config.data instanceof FormData) {
                // FormData → KHÔNG set Content-Type
                // React Native sẽ tự thêm 'multipart/form-data; boundary=...'
                // Nếu axios đã set default, xóa nó đi
                if (config.headers['Content-Type']) {
                    delete (config.headers as any)['Content-Type'];
                }
            } else if (config.data && !config.headers['Content-Type']) {
                // JSON data mà chưa có Content-Type → set application/json
                config.headers['Content-Type'] = 'application/json';
            }

            console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);

            return config;
        } catch (error) {
            console.error('[API Request Error]', error);
            return Promise.reject(error);
        }
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor - Auto-unwrap backend ApiResponse { code, message, result }
apiClient.interceptors.response.use(
    (response) => {
        console.log(`[API Response] ${response.config.url} - Status: ${response.status}`);

        // Backend luôn trả về { code?, message?, result: T }
        // Tự động unwrap result để service layer nhận data trực tiếp
        if (response.data && response.data.result !== undefined) {
            response.data = response.data.result;
        }

        return response;
    },
    async (error: AxiosError) => {
        const status = error.response?.status;
        const originalRequest = error.config as RetryableRequestConfig | undefined;
        const url = originalRequest?.url || '';
        console.error('[API Error]', status, error.message, url);
        if (error.response?.data) {
            console.error('[API Error Data]', JSON.stringify(error.response.data));
        }

        // ============================================================
        // Import Toast để hiện thông báo thân thiện
        // ============================================================
        let showToast: ((msg: string, type?: string) => void) | null = null;
        try {
            const toastModule = require('../../components/ui/Toast');
            showToast = toastModule.showToast;
        } catch (e) {
            // Toast chưa sẵn sàng — fallback console
        }

        // Handle 401 Unauthorized - Token expired
        if (status === 401) {
            const canRefresh = originalRequest && !originalRequest._retry && !isRefreshExcludedUrl(url);

            if (canRefresh) {
                originalRequest._retry = true;

                try {
                    const newToken = await refreshAccessToken();

                    if (originalRequest.headers) {
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    }

                    return apiClient(originalRequest);
                } catch (refreshError) {
                    await clearAuthState();
                    showToast?.('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'warning');

                    return Promise.reject({
                        ...error,
                        message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
                    });
                }
            }

            return Promise.reject(error);
        }

        // Handle 403 Forbidden
        if (status === 403) {
            showToast?.('Bạn không có quyền thực hiện hành động này.', 'error');
            return Promise.reject({
                ...error,
                message: 'Bạn không có quyền thực hiện hành động này.',
            });
        }

        // Handle Network Error
        if (error.message === 'Network Error' || !error.response) {
            const msg = 'Không thể kết nối đến server. Kiểm tra kết nối mạng.';
            showToast?.(msg, 'error');
            return Promise.reject({
                ...error,
                message: msg,
            });
        }

        // Handle 5xx Server Error
        if (status && status >= 500) {
            const msg = 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.';
            showToast?.(msg, 'error');
            return Promise.reject({
                ...error,
                message: msg,
            });
        }

        // Handle 404 Not Found
        if (status === 404) {
            const msg = 'Không tìm thấy dữ liệu yêu cầu.';
            showToast?.(msg, 'warning');
            return Promise.reject({
                ...error,
                message: msg,
            });
        }

        // Handle backend error response (400, 422, etc.)
        const backendData = error.response?.data as any;
        const backendCode = backendData?.code;
        const backendMessage = backendData?.message;
        const errorMessage = backendMessage || error.message || 'Đã xảy ra lỗi';

        // Chỉ hiện toast cho lỗi không phải validation (validation đã hiện Alert riêng)
        if (status !== 400) {
            showToast?.(errorMessage, 'error');
        }

        return Promise.reject({
            ...error,
            backendCode,
            backendMessage,
            message: errorMessage,
        });
    }
);


export default apiClient;
