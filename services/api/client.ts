import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, STORAGE_KEYS } from '../../constants';

// Create Axios instance
const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor - Attach JWT token
apiClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        try {
            const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

            if (token && config.headers) {
                config.headers.Authorization = `Bearer ${token}`;
            }

            console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);

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

// Response Interceptor - Handle errors
apiClient.interceptors.response.use(
    (response) => {
        console.log(`[API Response] ${response.config.url} - Status: ${response.status}`);
        return response;
    },
    async (error: AxiosError) => {
        console.error('[API Error]', error.response?.status, error.message);

        // Handle 401 Unauthorized - Token expired
        if (error.response?.status === 401) {
            // Clear token and redirect to login
            await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
            await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);

            // You can emit an event or use navigation here to redirect to login
            // For now, just reject with custom error
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

        // Handle other errors
        const errorMessage = (error as any).response?.data?.message || (error as any).message || 'Đã xảy ra lỗi';

        return Promise.reject({
            ...error,
            message: errorMessage,
        });
    }
);

export default apiClient;
