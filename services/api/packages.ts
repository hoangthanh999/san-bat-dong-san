import apiClient from './client';
import { API_ENDPOINTS } from '../../constants';
import { ServicePackage, PackageType } from '../../types';

/**
 * Package Service
 * Mua gói dịch vụ qua apiClient (Nginx :8080 → payment-service:8087)
 *
 * ✅ Nginx ĐÃ route /api/packages/ → payment-service:8087 (đã thêm vào nginx.conf)
 * → Dùng apiClient (qua Nginx) là ĐÚNG. KHÔNG cần paymentClient.
 *
 * Backend: ServicePackageController
 * ⚠️ JWT bắt buộc: code backend gọi authentication.getName() — NullPointerException nếu không có token
 */
export const packageService = {
    /**
     * Lấy danh sách gói dịch vụ
     * ⚠️ Backend KHÔNG có API list packages — phải hardcode hoặc bỏ qua
     */
    getServicePackages: async (type?: PackageType): Promise<ServicePackage[]> => {
        console.warn('[packageService] Backend KHÔNG có GET /api/packages — danh sách gói phải hardcode');
        return [];
    },

    /**
     * Mua gói hội viên
     * POST /api/packages/buy-membership?packageId=Y
     * Đi qua nginx /api/packages/ → payment-service:8087
     * 
     * Backend: ServicePackageController.buyMembership(@AuthenticationPrincipal, @RequestParam packageId)
     * JWT Token cung cấp userId tự động
     */
    purchaseMembership: async (packageId: number): Promise<void> => {
        await apiClient.post(API_ENDPOINTS.PACKAGE_BUY_MEMBERSHIP, null, {
            params: { packageId },
        });
    },

    /**
     * Mua gói đẩy tin (Boost/Promotion)
     * POST /api/packages/buy-promotion?packageId=X&propertyId=Y
     * Đi qua nginx /api/packages/ → payment-service:8087
     * 
     * Backend: ServicePackageController.buyPromotion(@AuthenticationPrincipal, @RequestParam packageId, @RequestParam propertyId)
     * JWT Token cung cấp userId tự động
     */
    buyPromotion: async (packageId: number, propertyId: number): Promise<void> => {
        await apiClient.post(API_ENDPOINTS.PACKAGE_BUY_PROMOTION, null, {
            params: { packageId, propertyId },
        });
    },
};
