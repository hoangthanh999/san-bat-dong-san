// ============================
// Backend API Response Wrapper
// ============================
// Backend trả về: { code?: number, message?: string, result: T }
// Client interceptor sẽ tự động unwrap result, nên service nhận T trực tiếp.
export interface BackendApiResponse<T> {
    code?: number;
    message?: string;
    result: T;
}

// Spring Boot Page response
export interface PaginatedResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;  // current page index (0-based)
    first: boolean;
    last: boolean;
}

// ============================
// Property (từ property-service PropertyResponseDTO)
// ============================
export type RentalType = 'WHOLE' | 'SHARED';
export type GenderConstraint = 'MALE_ONLY' | 'FEMALE_ONLY' | 'MIXED';
export type PropertyStatus = 'PENDING' | 'ACTIVE' | 'FULL' | 'HIDDEN' | 'EXPIRED' | 'APPROVED' | 'REJECTED';

export interface PropertyLandlordInfo {
    id: number;
    fullName: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
}

export interface Room {
    id: number;
    title: string;
    description: string;
    price: number;
    deposit: number;
    area: number;

    // Địa chỉ tách chi tiết
    province: string;
    district: string;
    ward: string;
    addressDetail: string;

    // Tọa độ (backend tách từ PostGIS Point)
    latitude: number;
    longitude: number;

    // Media
    images: string[];        // mảng URL Cloudinary
    videoUrl?: string;

    // Chi tiết
    furnitureStatus?: string;
    legalStatus?: string;
    direction?: string;
    floorNumber?: number;
    numBedrooms?: number;
    numBathrooms?: number;

    // Loại hình thuê
    rentalType: RentalType;
    capacity?: number;
    currentTenants?: number;
    genderConstraint?: GenderConstraint;

    amenities?: string[];

    // Package & Status
    status: PropertyStatus;
    packageType?: string;
    priorityLevel?: number;
    autoRenew?: boolean;

    // Thông tin chủ trọ (từ identity-service, embed trong response)
    landlordInfo?: PropertyLandlordInfo;

    // Stats
    averageRating: number;
    totalReviews: number;

    // Timestamps
    createdAt: string;
    updatedAt?: string;
    expirationDate?: string;
    lastPushedAt?: string;
    approvedAt?: string;
}

// Backward compatibility alias
export type Property = Room;

// ============================
// User (kết hợp identity-service + customer-service)
// ============================
export type UserRole = 'ADMIN' | 'USER' | 'OWNER';
export type KYCStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface LifestyleProfile {
    sleepTime?: string;
    hasPet?: boolean;
    smoking?: boolean;
    cleanlinessLevel?: number;
    personality?: string;
}

export interface User {
    id: number;
    email: string;
    fullName: string;
    phone?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    role: UserRole;
    kycStatus?: KYCStatus;
    isActive?: boolean;
    createdAt?: string;
    lifestyleProfile?: LifestyleProfile;
}

// ============================
// Auth Types (identity-service)
// ============================
export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    fullName: string;
    phone: string;   // backend @NotBlank — bắt buộc
}

// Backend login trả về (trước khi unwrap result)
export interface AuthResponse {
    token: string;
    id: number;
    email: string;
    fullName: string;
    role: string;
}

export interface ChangePasswordRequest {
    oldPassword: string;
    newPassword: string;
}

export interface ChangeEmailRequest {
    newEmail: string;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    token: string;
    newPassword: string;
}

// ============================
// Customer Profile (customer-service)
// ============================
export interface CustomerProfileDTO {
    fullName?: string;
    phone?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    lifestyleProfile?: LifestyleProfile;
}

export interface CustomerPublicResponseDTO {
    id: string;
    fullName: string;
    avatarUrl?: string;
    kycStatus?: string;
    phone?: string;
    createdAt?: string;
}

export interface CustomerResponseDTO {
    id: number;
    email: string;
    fullName: string;
    phone?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    kycStatus: KYCStatus;
    lifestyleProfile?: LifestyleProfile;
}

// ============================
// KYC Types (customer-service)
// ============================
export interface KycOcrResponseDTO {
    // Fields trả về từ FPT AI OCR scan
    citizenId?: string;
    fullName?: string;
    address?: string;
    kycToken?: string;
    [key: string]: any;
}

export interface KYCSubmitData {
    kycToken: string;
    citizenId: string;
    fullName: string;
    address: string;
}

export interface KYCStatusResponse {
    kycStatus: KYCStatus;
    citizenId?: string;
    fullName?: string;
    rejectedReason?: string;
    updatedAt?: string;
}

// ============================
// Property Create/Update DTO (property-service)
// ============================
export interface PropertyRequestDTO {
    title: string;
    description?: string;
    price: number;
    deposit?: number;
    area: number;

    province?: string;
    district?: string;
    ward?: string;
    addressDetail?: string;

    latitude: number;
    longitude: number;

    furnitureStatus?: string;
    legalStatus?: string;
    direction?: string;
    floorNumber?: number;
    numBedrooms?: number;
    numBathrooms?: number;

    rentalType: RentalType;
    capacity?: number;
    genderConstraint?: GenderConstraint;

    images: string[];
    videoUrl?: string;
    amenities?: string[];

    servicePackageId?: number;
}

// Backward compatibility
export type RoomCreateDTO = PropertyRequestDTO;

// ============================
// Notification (notification-service)
// ============================
export interface Notification {
    id: number;
    userId: string;     // backend dùng String
    type: string;       // VD: "KYC_APPROVED", "ROOM_APPROVED"...
    title: string;
    content: string;    // backend dùng "content" không phải "message"
    isRead: boolean;
    createdAt: string;
}

// ============================
// Chat Types (chưa có backend, giữ cho tương lai)
// ============================
export type MessageType = 'TEXT' | 'IMAGE' | 'VOICE' | 'LOCATION' | 'PROPERTY' | 'APPOINTMENT';

export interface ChatMessage {
    id: number;
    senderId: number;
    receiverId: number;
    content?: string;
    type: MessageType;
    metadata?: {
        latitude?: number;
        longitude?: number;
        roomId?: number;
        audioUrl?: string;
        appointmentId?: number;
        datetime?: string;
    };
    isRead: boolean;
    createdAt: string;
}

export interface Conversation {
    id: number;
    partnerId: number;
    partnerName: string;
    partnerAvatar?: string;
    lastMessage?: string;
    lastMessageAt?: string;
    unreadCount: number;
    isOnline?: boolean;
}

// ============================
// Filter / Search (khớp với PropertyController.searchProperties params)
// ============================
export interface RoomFilters {
    type?: string;          // RentalType: "WHOLE" | "SHARED"
    minPrice?: number;
    maxPrice?: number;
    minArea?: number;
    maxArea?: number;
    bedroomList?: number[];
    bathroomList?: number[];
    directionList?: string[];
    furniture?: string;
    sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'nearest';
}

export interface SearchParams extends RoomFilters {
    keyword?: string;
    lat?: number;
    lng?: number;
    radius?: number;
    page?: number;
    size?: number;
}

// ============================
// Review Types (chưa có backend)
// ============================
export interface Review {
    id: number;
    roomId: number;
    userId: number;
    userName: string;
    userAvatar?: string;
    rating: number;
    comment: string;
    reviewImages?: string[];
    landlordReply?: string;
    reply?: string;
    createdAt: string;
}

// ============================
// Favorite Types (chưa có backend)
// ============================
export interface Favorite {
    id: number;
    userId: number;
    roomId: number;
    room: Room;
    createdAt: string;
}

// ============================
// Appointment Types (chưa có backend)
// ============================
export interface Appointment {
    id: number;
    roomId: number;
    roomTitle?: string;
    roomImage?: string;
    tenantId: number;
    tenantName?: string;
    tenantAvatar?: string;
    landlordId: number;
    landlordName?: string;
    scheduledAt: string;
    suggestedMeetTime?: string;
    note?: string;
    message?: string;
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'RESCHEDULED';
    createdAt: string;
}

// ============================
// Wallet & Transaction Types (chưa có backend)
// ============================
export type TransactionType = 'DEPOSIT' | 'POST_FEE' | 'MEMBERSHIP' | 'BOOST' | 'REFUND';
export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface Transaction {
    id: number;
    type: TransactionType;
    amount: number;
    status: TransactionStatus;
    description?: string;
    referenceCode?: string;
    roomTitle?: string;
    createdAt: string;
}

export interface WalletBalance {
    balance: number;
    userId: number;
}

export interface VNPayPaymentResponse {
    paymentUrl: string;
    orderId?: string;
}

// ============================
// Contract Types (chưa có backend)
// ============================
export type ContractStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';

export interface Contract {
    id: number;
    roomId: number;
    roomTitle?: string;
    roomAddress?: string;
    roomImage?: string;
    landlordId: number;
    landlordName?: string;
    tenantId: number;
    tenantName?: string;
    startDate: string;
    endDate: string;
    monthlyRent: number;
    deposit: number;
    electricityPrice?: number;
    waterPrice?: number;
    garbageFee?: number;
    wifiFee?: number;
    status: ContractStatus;
    createdAt: string;
}

// ============================
// Service Package Types (chưa có backend)
// ============================
export type PackageType = 'MEMBERSHIP' | 'ROOM_PROMOTION';

export interface ServicePackage {
    id: number;
    name: string;
    type: PackageType;
    price: number;
    durationDays: number;
    description?: string;
    features?: string[];
    isPopular?: boolean;
}

export interface BoostRoom {
    roomId: number;
    packageId: number;
}

// ============================
// Notification Types (notification-service)
// ============================
export type NotificationType = 'APPOINTMENT' | 'REVIEW' | 'CHAT' | 'SYSTEM' | 'ROOM_APPROVED' | 'BILL' | 'CONTRACT';

// ============================
// Push Notification Types
// ============================
export interface PushTokenRequest {
    token: string;
    platform: 'ios' | 'android';
}

// Legacy API response type (cho các service chưa update)
export interface ApiResponse<T> {
    code?: number;
    message?: string;
    result: T;
}
