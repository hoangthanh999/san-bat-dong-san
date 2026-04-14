import paymentClient from './paymentClient';
import { API_ENDPOINTS } from '../../constants';
import { ServicePackage, PackageType } from '../../types';

export const packageService = {
    /**
     * Lấy danh sách gói dịch vụ
     * ⚠️ Backend chưa có API list packages — đang phát triển
     */
    getServicePackages: async (type?: PackageType): Promise<ServicePackage[]> => {
        // TODO: Backend chưa có endpoint GET /api/packages
        console.warn('[packageService] getServicePackages: API chưa có trong backend - đang phát triển');
        return [];
    },

    /**
     * Mua gói hội viên
     * POST /api/packages/buy-membership?userId=X&packageId=Y
     * Gọi trực tiếp payment-service:8087 (không qua nginx)
     *
     * Backend: ServicePackageController.buyMembership(@RequestParam userId, @RequestParam packageId)
     */
    purchaseMembership: async (userId: number, packageId: number): Promise<void> => {
        await paymentClient.post(API_ENDPOINTS.PACKAGE_BUY_MEMBERSHIP, null, {
            params: { userId, packageId },
        });
    },

    /**
     * Boost tin đăng
     * ⚠️ Backend chưa có API boost — đang phát triển
     */
    boostRoom: async (data: { roomId: number; packageId: number }): Promise<void> => {
        // TODO: Backend chưa có endpoint POST /api/packages/boost
        console.warn('[packageService] boostRoom: API chưa có trong backend - đang phát triển');
    },
};
