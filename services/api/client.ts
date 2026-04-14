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
        console.error('[API Error]', status, error.message);
        console.log('[API Error Body]', JSON.stringify(error.response?.data));

        // Handle 401 Unauthorized - Token expired
        if (status === 401) {
            await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
            await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);

            return Promise.reject({
                ...error,
                message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
            });
        }

        // Handle Network Error
        if (error.message === 'Network Error') {
            return Promise.reject({
                ...error,
                message: 'Không thể kết nối đến server. Kiểm tra kết nối mạng.',
            });
        }

        // Handle backend error response
        const backendMessage = (error.response?.data as any)?.message;
        const errorMessage = backendMessage || error.message || 'Đã xảy ra lỗi';

        return Promise.reject({
            ...error,
            message: errorMessage,
        });
    }
);

export default apiClient;
