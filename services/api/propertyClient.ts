import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PROPERTY_API_BASE_URL, STORAGE_KEYS } from '../../constants';

/**
 * propertyClient.ts
 * Axios client dự phòng cho property-service (port 8086) — kết nối TRỰC TIẾP.
 *
 * ⚠️ Nginx ĐÃ route tất cả endpoints của property-service:
 *    /properties, /public/properties, /public/projects, /admin/properties,
 *    /admin/projects, /admin/amenities, /amenities → property-service:8086
 *
 * → Ưu tiên dùng apiClient (qua Nginx :8080) cho tất cả property endpoints.
 * → propertyClient chỉ dùng khi cần bypass Nginx hoặc test trực tiếp.
 */
const propertyClient: AxiosInstance = axios.create({
    baseURL: PROPERTY_API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor - Attach JWT token
propertyClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        try {
            const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

            if (token && config.headers) {
                config.headers.Authorization = `Bearer ${token}`;
            }

            console.log(`[Property API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);

            return config;
        } catch (error) {
            console.error('[Property API Request Error]', error);
            return Promise.reject(error);
        }
    },
    (error) => Promise.reject(error)
);

// Response Interceptor - Auto-unwrap ApiResponse.result
propertyClient.interceptors.response.use(
    (response) => {
        console.log(`[Property API Response] ${response.config.url} - Status: ${response.status}`);

        // Backend trả về { code?, message?, result: T }
        if (response.data && response.data.result !== undefined) {
            response.data = response.data.result;
        }

        return response;
    },
    async (error: AxiosError) => {
        console.error('[Property API Error]', error.response?.status, error.message);

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
                message: 'Không thể kết nối đến Property Service. Kiểm tra kết nối mạng.',
            });
        }

        const backendMessage = (error.response?.data as any)?.message;
        const errorMessage = backendMessage || error.message || 'Đã xảy ra lỗi';

        return Promise.reject({
            ...error,
            message: errorMessage,
        });
    }
);

export default propertyClient;
