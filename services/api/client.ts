import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, STORAGE_KEYS } from '../../constants';

// Create Axios instance cho gateway (identity, customer, media, notification)
// KHÔNG set default Content-Type ở đây — interceptor sẽ xử lý

const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
});
apiClient.interceptors.request.use(config => {
    console.log('[Request Body]', JSON.stringify(config.data));
    return config;
});
// Request Interceptor - Attach JWT token + tự động set Content-Type
apiClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        try {
            const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
            if (token && config.headers) {
                config.headers.Authorization = `Bearer ${token}`;
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
        const url = error.config?.url || '';
        console.error('[API Error]', status, error.message, url);

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
            await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
            await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);

            // Reset zustand auth state
            try {
                const { useAuthStore } = require('../../store/authStore');
                useAuthStore.getState().forceLogout();
            } catch (e) { }

            showToast?.('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'warning');

            return Promise.reject({
                ...error,
                message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
            });
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
        const backendMessage = (error.response?.data as any)?.message;
        const errorMessage = backendMessage || error.message || 'Đã xảy ra lỗi';

        // Chỉ hiện toast cho lỗi không phải validation (validation đã hiện Alert riêng)
        if (status !== 400) {
            showToast?.(errorMessage, 'error');
        }

        return Promise.reject({
            ...error,
            message: errorMessage,
        });
    }
);


export default apiClient;
