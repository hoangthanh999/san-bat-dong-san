import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PAYMENT_API_BASE_URL, STORAGE_KEYS } from '../../constants';

/**
 * Axios client cho payment-service (port 8087)
 * Nginx chỉ route /api/payment/ → payment-service
 * Các endpoint /api/transactions, /api/packages, /api/bills cần gọi trực tiếp
 */
const paymentClient: AxiosInstance = axios.create({
    baseURL: PAYMENT_API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor - Attach JWT token
paymentClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        try {
            const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

            if (token && config.headers) {
                config.headers.Authorization = `Bearer ${token}`;
            }

            console.log(`[Payment API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);

            return config;
        } catch (error) {
            console.error('[Payment API Request Error]', error);
            return Promise.reject(error);
        }
    },
    (error) => Promise.reject(error)
);

// Response Interceptor - Không unwrap vì payment-service trả ResponseEntity trực tiếp
paymentClient.interceptors.response.use(
    (response) => {
        console.log(`[Payment API Response] ${response.config.url} - Status: ${response.status}`);

        // Payment-service dùng ResponseEntity trả data trực tiếp, không wrap trong ApiResponse
        // Nhưng nếu có result thì unwrap cho nhất quán
        if (response.data && response.data.result !== undefined) {
            response.data = response.data.result;
        }

        return response;
    },
    async (error: AxiosError) => {
        console.error('[Payment API Error]', error.response?.status, error.message);

        if (error.response?.status === 401) {
            await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
            await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);

            return Promise.reject({
                ...error,
                message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
            });
        }

        if (error.message === 'Network Error') {
            return Promise.reject({
                ...error,
                message: 'Không thể kết nối đến Payment Service. Kiểm tra kết nối mạng.',
            });
        }

        const backendMessage = (error.response?.data as any)?.message || (error.response?.data as any)?.error;
        const errorMessage = backendMessage || error.message || 'Đã xảy ra lỗi';

        return Promise.reject({
            ...error,
            message: errorMessage,
        });
    }
);

export default paymentClient;
