import paymentClient from './paymentClient';
import { API_ENDPOINTS } from '../../constants';

/**
 * Cấu trúc DTO để tạo hóa đơn
 * POST /api/bills — body: BillCreateDTO
 * Backend: BillController.createBill()
 */
export interface BillCreateDTO {
    contractId: number;         // ID hợp đồng thuê
    month: number;              // Tháng (1-12)
    year: number;               // Năm (vd: 2026)
    electricNew: number;        // Chỉ số điện mới (kWh)
    waterNew: number;           // Chỉ số nước mới (m³)
    electricPrice: number;      // Đơn giá điện (VND/kWh)
    waterPrice: number;         // Đơn giá nước (VND/m³)
    monthlyRent: number;        // Tiền thuê tháng (VND)
    serviceFees?: number;       // Phí dịch vụ (VND, optional)
}

/**
 * Cấu trúc response từ server
 * Backend: BillResponseDTO
 */
export interface BillResponseDTO {
    id: number;
    contractId: number;
    month: number;
    year: number;
    electricUsage: number;      // Số điện tiêu thụ = electricNew - electricOld
    waterUsage: number;         // Số nước tiêu thụ = waterNew - waterOld
    totalAmount: number;        // Tổng tiền cần thanh toán
    status: 'UNPAID' | 'PAID' | 'OVERDUE';
    createdAt: string;          // ISO datetime
}

/**
 * Bill Service
 * Gửi hóa đơn tiền trọ hàng tháng (chủ trọ gọi)
 * Qua paymentClient (trực tiếp :8087, vì /api/bills/ mới được thêm vào Nginx)
 *
 * ⚠️ Lưu ý: Endpoint /api/bills/ đã được thêm vào nginx.conf.
 * Có thể dùng apiClient (Nginx) hoặc paymentClient (trực tiếp) đều được.
 * Hiện tại dùng paymentClient để nhất quán với các payment endpoints khác.
 */
export const billService = {
    /**
     * Tạo hóa đơn tiền trọ mới
     * POST /api/bills — body: BillCreateDTO (JSON)
     * Auth: JWT bắt buộc
     *
     * Response: BillResponseDTO trực tiếp (ResponseEntity — không wrap ApiResponse)
     */
    createBill: async (data: BillCreateDTO): Promise<BillResponseDTO> => {
        const response = await paymentClient.post<BillResponseDTO>(
            API_ENDPOINTS.BILLS_CREATE,
            data
        );
        return response.data;
    },
};
