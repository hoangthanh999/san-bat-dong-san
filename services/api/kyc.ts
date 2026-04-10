import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, STORAGE_KEYS } from '../../constants';
import { API_ENDPOINTS } from '../../constants';
import apiClient from './client';
import { KycOcrResponseDTO, KYCSubmitData, KYCStatusResponse, CustomerResponseDTO } from '../../types';

/**
 * Map backend error messages → thông báo user-friendly
 */
function mapErrorMessage(serverMessage: string, statusCode: number): string {
    const msg = serverMessage.toLowerCase();

    // Backend-specific KYC errors
    if (msg.includes('đã xác thực') || msg.includes('đang chờ duyệt')) {
        return 'Tài khoản của bạn đã xác thực hoặc đang chờ duyệt. Không cần gửi lại.';
    }
    if (msg.includes('không hợp lệ') || msg.includes('không thể đọc')) {
        return 'Ảnh CCCD không hợp lệ hoặc không thể đọc được. Vui lòng chụp lại ảnh rõ hơn.';
    }
    if (msg.includes('đã được sử dụng')) {
        return 'Số CCCD này đã được sử dụng bởi tài khoản khác. Vui lòng liên hệ hỗ trợ.';
    }
    if (msg.includes('hết hạn') || msg.includes('không hợp lệ. vui lòng quét lại')) {
        return 'Phiên xác minh đã hết hạn (15 phút). Vui lòng quay lại bước 1 để quét ảnh CCCD mới.';
    }
    if (msg.includes('không khớp')) {
        return 'Thông tin không khớp với ảnh CCCD đã quét. Vui lòng kiểm tra lại.';
    }
    if (msg.includes('quá mờ') || msg.includes('chói sáng') || msg.includes('chỉnh sửa')) {
        return 'Ảnh CCCD quá mờ hoặc bị chói sáng. Vui lòng chụp lại ở nơi đủ sáng.';
    }
    if (msg.includes('bóc tách') || msg.includes('cccd')) {
        return 'Không thể đọc thông tin từ ảnh. Vui lòng chụp ảnh CCCD thật rõ nét, đặt trên nền phẳng.';
    }

    // Generic errors
    if (statusCode === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (statusCode === 403) return 'Bạn không có quyền thực hiện thao tác này.';
    if (statusCode === 413) return 'Ảnh quá lớn. Vui lòng chụp ảnh có kích thước nhỏ hơn.';
    if (statusCode >= 500) return 'Hệ thống đang bận. Vui lòng thử lại sau ít phút.';

    return serverMessage || 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.';
}

/**
 * Gửi multipart/form-data bằng fetch() (React Native native, không dùng axios)
 * Axios trên React Native có bug không gửi được FormData chứa file URI
 */
async function multipartFetch<T>(endpoint: string, formData: FormData): Promise<T> {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const url = `${API_BASE_URL}${endpoint}`;

    console.log(`[KYC] POST ${url}`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
        });

        console.log(`[KYC] Status: ${response.status}`);

        // Xử lý response body
        const text = await response.text();
        let json: any;
        try {
            json = JSON.parse(text);
        } catch {
            console.error('[KYC] Response không phải JSON:', text.substring(0, 100));
            throw new Error('Lỗi kết nối server. Vui lòng thử lại.');
        }

        if (!response.ok) {
            const friendlyMessage = mapErrorMessage(json.message || '', response.status);
            console.error(`[KYC] Error ${response.status}:`, json.message);
            throw new Error(friendlyMessage);
        }

        // Unwrap ApiResponse { code, message, result }
        return (json.result !== undefined ? json.result : json) as T;

    } catch (error: any) {
        // Network errors (no internet, DNS fail, etc.)
        if (error.message === 'Network request failed' || error.message === 'Network Error') {
            throw new Error('Không có kết nối mạng. Vui lòng kiểm tra Wi-Fi hoặc 4G.');
        }
        throw error;
    }
}

export const kycService = {
    /**
     * Bước 1: Scan ảnh CCCD bằng FPT AI OCR
     * POST /customers/kyc/scan (multipart, field: "image")
     */
    scanCitizenId: async (imageFile: any): Promise<KycOcrResponseDTO> => {
        const formData = new FormData();
        formData.append('image', imageFile);
        return multipartFetch<KycOcrResponseDTO>(API_ENDPOINTS.CUSTOMER_KYC_SCAN, formData);
    },

    /**
     * Bước 2: Nộp hồ sơ KYC đầy đủ
     * POST /customers/kyc (multipart)
     */
    submitKYC: async (data: KYCSubmitData, frontImage: any, backImage: any): Promise<string> => {
        const formData = new FormData();
        formData.append('kycToken', data.kycToken);
        formData.append('citizenId', data.citizenId);
        formData.append('fullName', data.fullName);
        formData.append('address', data.address);
        formData.append('frontImage', frontImage);
        formData.append('backImage', backImage);
        return multipartFetch<string>(API_ENDPOINTS.CUSTOMER_KYC_SUBMIT, formData);
    },

    /**
     * Lấy trạng thái KYC từ customer profile
     */
    getKYCStatus: async (): Promise<KYCStatusResponse> => {
        const response = await apiClient.get<CustomerResponseDTO>(API_ENDPOINTS.CUSTOMER_PROFILE);
        const profile = response.data;
        return {
            kycStatus: profile.kycStatus || 'UNVERIFIED',
        };
    },
};
