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
// Property (khớp backend PropertyResponseDTO)
// ============================
export type PropertyStatus = 'PENDING' | 'ACTIVE' | 'FULL' | 'HIDDEN' | 'EXPIRED' | 'APPROVED' | 'REJECTED' | 'DELETED';

export interface Room {
    id: number;
    projectId?: number;
    projectNameSnapshot?: string;
    transactionType: string;  // "FOR_SALE" | "FOR_RENT"
    title: string;
    description?: string;
    price: number;                  // BigDecimal → number
    pricePerSqm?: number;           // Backend tính tự động: price / area
    area: number;
    address: string;
    province?: string;              // Backend @NotBlank khi tạo
    street?: string;                // Backend @NotBlank khi tạo
    ward?: string;                  // Backend @NotBlank khi tạo
    district?: string;              // Backend @NotBlank khi tạo

    latitude: number;
    longitude: number;

    propertyType: string;           // "APARTMENT" | "HOUSE" | "VILLA" | "COMMERCIAL" | "ROOM"
    capacity?: number;

    images: string[];               // List<String> URL Cloudinary
    amenities?: string[];
    videoUrl?: string;
    isQuotaDeducted?: boolean;

    status: PropertyStatus;
    ownerId: number;

    // Owner snapshot info (from PropertyResponseDTO)
    ownerNameSnapshot?: string;
    ownerAvatarSnapshot?: string;
    ownerSlugSnapshot?: string;
    ownerPhoneSnapshot?: string;

    // Legacy/enriched owner info
    ownerFullName?: string;
    ownerAvatarUrl?: string;
    ownerPhone?: string;

    createdAt: string;              // LocalDateTime → ISO string
    expiresAt?: string;

    // Promotion / Boost
    isPromoted?: boolean;           // true nếu đang được boost (PromotionQueue.ACTIVE)
    promotionExpiresAt?: string;    // Ngày hết hạn boost

    bedrooms?: number;
    bathrooms?: number;
    hasBalcony?: boolean;

    furnishingStatus?: string;      // "UNFURNISHED" | "FULLY_FURNISHED" ...
    availabilityStatus?: string;    // "IMMEDIATELY" | "NEGOTIABLE" ...
    electricityPrice?: string;      // "FREE" | "STATE_PRICE" | "LANDLORD_PRICE" | "SHARED" | "NEGOTIABLE"
    waterPrice?: string;
    internetPrice?: string;
    legalDocumentType?: string;     // "NONE" | "CERTIFICATE_OF_OWNERSHIP" | "LEASE_CONTRACT" | "AUTHORIZATION_LETTER"
}

// Backward compatibility alias
export type Property = Room;

export interface RecommendedProperty {
    id: number;
    title: string;
    price?: number;
    address?: string;
    videoUrl?: string;
    images?: string[];
    createdAt?: string;
    isPromoted?: boolean;
    itemType?: string;
    score?: number;
    district?: string;
    ownerId?: number;
    reasons?: string[];
    ownerTrustScore?: number;
    viewCount?: number;
    likeCount?: number;
    saveCount?: number;
    isLiked?: boolean;
    isSaved?: boolean;
    commentCount?: number;
    contactCount?: number;
    primarySource?: string;
    shareCount?: number;
}

export interface RecommendedReel {
    id: number;
    title: string;
    price?: number;
    address?: string;
    videoUrl?: string;
    viewCount?: number;
    likeCount?: number;
    saveCount?: number;
    isLiked?: boolean;
    isSaved?: boolean;
    commentCount?: number;
    primarySource?: string;
    ownerSlug?: string;
    ownerId?: number;
    contactCount?: number;
    shareCount?: number;
    ownerNameSnapshot?: string;
    ownerAvatarSnapshot?: string;
    createdAt?: string;
    isPromoted?: boolean;
    itemType?: string;
    score?: number;
    reasons?: string[];
    ownerTrustScore?: number;
}

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
    publicId?: string;
    fullName: string;
    avatarUrl?: string;
    kycStatus?: string;
    identityVerified?: boolean;
    membershipLevel?: string;
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
// Property Create/Update DTO (khớp backend PropertyCreateDTO)
// ============================
export interface PropertyRequestDTO {
    projectId?: number;
    transactionType: string;           // "FOR_SALE" | "FOR_RENT" 
    title: string;
    description?: string;
    price: number;
    area: number;
    address: string;                   // Backend @NotBlank
    province: string;                  // Backend @NotBlank
    street: string;                    // Backend @NotBlank
    ward: string;                      // Backend @NotBlank
    district: string;                  // Backend @NotBlank
    latitude: number;
    longitude: number;
    propertyType: string;              // "APARTMENT" | "HOUSE" | "VILLA" | "COMMERCIAL" | "ROOM"

    ownerNameSnapshot?: string;
    ownerAvatarSnapshot?: string;
    ownerSlugSnapshot?: string;

    capacity?: number;
    validityDays?: number;

    images: string[];
    videoUrl?: string;
    amenities?: string[];

    bedrooms?: number;
    bathrooms?: number;
    hasBalcony?: boolean;

    furnishingStatus?: string;         // "UNFURNISHED" | "PARTIALLY_FURNISHED" | "FULLY_FURNISHED" 
    availabilityStatus?: string;    // "IMMEDIATELY" | "THIS_MONTH" | "NEXT_MONTH" | "NEGOTIABLE"
    electricityPrice?: string;         // "FREE" | "STATE_PRICE" | "LANDLORD_PRICE" | "SHARED" | "NEGOTIABLE"
    waterPrice?: string;
    internetPrice?: string;
    legalDocumentType?: string;        // "NONE" | "CERTIFICATE_OF_OWNERSHIP" | "LEASE_CONTRACT" | "AUTHORIZATION_LETTER"
}

// Backward compatibility
export type RoomCreateDTO = PropertyRequestDTO;

// ============================
// Reels Types (khớp backend PropertyReelResponseDTO + ReelsFeedResponse)
// ============================
export interface PropertyReelItem {
    id: number;
    title: string;
    price: number;
    address: string;
    videoUrl: string;
    isLiked: boolean;
    isSaved: boolean;
    likeCount: number;
    ownerSlug?: string;
    ownerNameSnapshot?: string;
    ownerAvatarSnapshot?: string;
    createdAt: string;
}

export interface ReelsFeedResponse {
    items: PropertyReelItem[];
    nextCursor: string | null;
    hasNext: boolean;
}

// ============================
// Amenity (khớp backend Amenity entity)
// ============================
export interface Amenity {
    id: number;
    name: string;
    icon?: string;
}

// ============================
// Project (khớp backend ProjectResponseDTO)
// ============================
export type ProjectType = 'APARTMENT_COMPLEX' | 'VILLA_AREA' | 'TOWNHOUSE_AREA' | 'COMMERCIAL' | 'RESORT';

export interface ProjectResponseDTO {
    id: number;
    name: string;
    description?: string;
    address: string;
    province?: string;
    district?: string;
    latitude: number;
    longitude: number;
    projectType: ProjectType | string;
    amenities?: string[];
    thumbnail?: string;         // URL ảnh đại diện (nếu backend bổ sung sau)
    createdBy: number;
    status: string;
    createdAt: string;
}

export interface ProjectCreateDTO {
    name: string;
    description?: string;
    address: string;
    latitude: number;
    longitude: number;
    projectType: string;
    amenities?: string[];
}

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
    referenceId?: string | number; // Added for navigation
    data?: any;                    // Added for navigation
    route?: string;                // Added for navigation
}

// ============================
// Chat Types (khớp backend ChatMessageResponse + ConversationResponse)
// ============================
export type MessageType = 'TEXT' | 'IMAGE' | 'VOICE' | 'LOCATION' | 'PROPERTY' | 'APPOINTMENT';

// Khớp backend ChatMessageResponse
export interface ChatMessage {
    id: string;
    senderId: number;
    receiverId: number;
    content?: string;
    type: MessageType;
    createdAt: string;
    // Frontend-only fields (không từ backend)
    metadata?: {
        latitude?: number;
        longitude?: number;
        roomId?: number;
        audioUrl?: string;
        appointmentId?: number;
        datetime?: string;
    };
    isRead?: boolean;  // optional, frontend dùng cho UI
}

// Khớp backend ConversationResponse
export interface Conversation {
    id: number;                 // partnerId
    fullName: string;           // backend: fullName
    avatar?: string;            // backend: avatar
    lastMessage?: string;       // backend: lastMessage
    lastTime?: string;          // backend: lastTime
    isOnline?: boolean;         // backend: isOnline
    unreadCount: number;        // backend: unreadCount
    // Frontend aliases cho backward compat
    partnerId?: number;         // = id
    partnerName?: string;       // = fullName
    partnerAvatar?: string;     // = avatar
    lastMessageAt?: string;     // = lastTime
}

// ============================
// Filter / Search (khớp backend PropertySearchRequestDTO)
// ============================
export interface RoomFilters {
    keyword?: string;
    transactionType?: string;   // "FOR_SALE" | "FOR_RENT"
    propertyType?: string;      // "APARTMENT" | "HOUSE" | "LAND" | "ROOM"
    province?: string;
    ward?: string;
    minPrice?: number;
    maxPrice?: number;
    minArea?: number;
    maxArea?: number;
    bedroomMode?: 'exact' | 'min';
    bedroomValue?: number;
    bedroomList?: number[];
    bathroomMode?: 'exact' | 'min';
    bathroomValue?: number;
    minBathrooms?: number;
    projectId?: number;
    sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'nearest';
}

export interface SearchParams extends RoomFilters {
    keyword?: string;
    page?: number;
    size?: number;
    bedrooms?: number;       // single value để gửi lên API (từ bedroomList[0])
    transactionType?: string;
}

// Backend PropertySearchRequestDTO — tìm kiếm nâng cao
export interface PropertySearchRequest {
    keyword?: string;
    minPrice?: number;          // BigDecimal
    maxPrice?: number;
    minArea?: number;
    maxArea?: number;
    propertyTypes?: string[];   // List<String>
    transactionTypes?: string[];
    amenities?: string[];
    district?: string;
    ward?: string;
    street?: string;
    province?: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
    minBedrooms?: number;
    minBathrooms?: number;
    hasBalcony?: boolean;
    minCapacity?: number;
    projectId?: number;
    furnishingStatuses?: string[];
    availabilityStatuses?: string[];
    electricityPrices?: string[];
    waterPrices?: string[];
    internetPrices?: string[];
    filterMonth?: string;
    sortBy?: string;            // default: 'createdAt'
    sortDir?: string;           // 'asc' | 'desc'
    page?: number;              // default: 0
    size?: number;              // default: 12
}

// Backend PropertySearchItemDTO
export interface PropertySearchItem {
    id: number;
    propertyType: string;
    transactionType: string;
    title: string;
    price: number;
    area: number;
    address: string;
    province?: string;
    street?: string;
    ward?: string;
    district?: string;
    bedrooms?: number;
    bathrooms?: number;
    hasBalcony?: boolean;
    furnishingStatus?: string;
    latitude?: number;
    longitude?: number;
    thumbnail?: string;
    createdAt: string;
}

// Backend PropertyAnalyticsResponse (khớp PropertyAnalyticsController)
export interface MarketInsight {
    popularPriceText?: string;
    popularPriceUnit?: string;
    popularPriceLabel?: string;
    yearlyGrowthPercent?: number;
    yearlyGrowthTrend?: string;    // "UP" | "DOWN"
    yearlyGrowthLabel?: string;
    diffFromPeakPercent?: number;
    diffFromPeakTrend?: string;
    diffFromPeakLabel?: string;
}

export interface PriceTrendItem {
    month: string;
    averagePrice: number;
    totalPosts: number;
}

export interface PropertyAnalyticsResponse {
    marketInsights: MarketInsight;
    trends: PriceTrendItem[];
}

export interface WardPriceDTO {
    wardName: string;
    averagePrice: string;   // Backend trả string (VD: "12.5 tr/m²")
    unit?: string;
    totalPosts: number;
}

export interface RegionTransactionStat {
    regionName: string;
    totalPosts: number;
    forSaleCount: number;
    forRentCount: number;
}

// ============================
// Boost Status (PromotionQueue)
// ============================
export type BoostStatus = 'WAITING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface BoostStatusItem {
    id: string;
    propertyId?: number;
    propertyTitle?: string;
    packageName: string;
    amount: number;
    status: BoostStatus;
    activatedAt?: string;
    expiresAt?: string;
    createdAt: string;
    priorityLevel?: number;     // 1=Basic, 2=Silver, 3=Gold
    durationDays?: number;
}

// ============================
// Wallet (khớp backend Wallet entity)
// ============================
export interface WalletInfo {
    id: number;
    userId: number;
    balance: number;            // BigDecimal → number
    holdBalance?: number;       // Backend wallet-service field
    holdAmount?: number;        // Legacy mobile alias
}

// ============================
// Comment Types (khớp backend PropertyCommentController + CommentResponse)
// ============================
export interface CommentRequest {
    propertyId: number;
    parentId?: number | null;
    replyToUserId?: number | null;
    content: string;
}

export interface CommentResponse {
    id: number;
    propertyId: number;
    userId?: number | null;          // null nếu là guest
    guestId?: string | null;         // null nếu là user đã login
    authorId?: number | null;        // frontend-normalized alias = userId
    displayName?: string;            // frontend-enriched from /customers/{id}/summary
    displayAvatar?: string | null;   // frontend-enriched from /customers/{id}/summary
    parentId?: number | null;        // null nếu là comment gốc
    replyToUserId?: number | null;
    content: string;
    createdAt: string;
    updatedAt?: string;
}

// ============================
// Owner Review Types (khớp backend OwnerReviewController + OwnerReviewResponse)
// ============================
export interface OwnerReviewRequest {
    ownerId: number;
    propertyId: number;
    rating: number;                  // 1–5
    images?: string[];               // List URL (không gửi local file://)
    comment: string;
}

export interface OwnerReviewResponse {
    id: number;
    ownerId: number;
    reviewerId: number;
    propertyId: number;
    verified?: boolean;
    rating: number;
    images?: string[];
    comment: string;
    ownerReply?: string | null;
    ownerReplyAt?: string | null;
    createdAt: string;
}

export interface OwnerRatingSummary {
    ownerId: number;
    averageRating: number;
    verifiedReviewCount: number;
    reviewCount: number;
    fiveStar: number;
    fourStar: number;
    threeStar: number;
    twoStar: number;
    oneStar: number;
}

// Backward-compat alias (tránh break các chỗ import Review nếu còn)
export type Review = OwnerReviewResponse;

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
// Appointment Types (backend /appointments + legacy UI aliases)
// ============================
export type AppointmentStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED' | 'SUGGESTED';

export interface Appointment {
    id: number;
    propertyId: number;
    propertyTitle?: string;
    propertyImage?: string;
    userId?: number;
    ownerId: number;
    partnerId?: number;
    appointmentTime: string;
    suggestedTime?: string;
    suggestedNote?: string;
    myRequest?: boolean;
    updatedAt?: string;

    // Legacy aliases used by existing appointment UI.
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
    status: AppointmentStatus;
    createdAt: string;
}

// ============================
// Transaction Types (khớp backend Transaction entity)
// ============================
export type TransactionType = 'DEPOSIT' | 'POST_FEE' | 'MEMBERSHIP' | 'BOOST' | 'REFUND';
export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface Transaction {
    id: number;
    userId: number;
    description?: string;
    amount: number;
    type: string;              // "DEPOSIT", "POST_FEE", etc.
    vnpayCode?: string;
    couponId?: number;
    status: string;            // "SUCCESS", "FAILED", etc.
    createdAt: string;
}

// VNPay response (backend trả về { url: string })
export interface VNPayPaymentResponse {
    url?: string;           // field cũ của backend
    paymentUrl?: string;    // field mới (nếu backend đổi)
    code?: number;
    message?: string;
    result?: {
        url?: string;
        paymentUrl?: string;
    };
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
