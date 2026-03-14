// Room/Property Types
export interface Room {
    id: number;
    title: string;
    description: string;
    price: number;
    deposit: number;
    area: number;
    address: string;

    // Media
    images: string[];
    videoUrl?: string;

    // Location (PostGIS Point from backend)
    location: {
        latitude: number;
        longitude: number;
    };

    // Details
    rentalType: 'WHOLE' | 'SHARED';
    furnitureStatus?: string;
    legalStatus?: string;
    direction?: string;
    floorNumber?: number;
    numBedrooms?: number;
    numBathrooms?: number;
    capacity?: number;
    currentTenants?: number;
    genderConstraint?: 'MALE_ONLY' | 'FEMALE_ONLY' | 'MIXED';

    // Amenities
    amenities?: string[];

    // Package & Status
    status: 'PENDING' | 'ACTIVE' | 'FULL' | 'HIDDEN' | 'EXPIRED' | 'APPROVED' | 'REJECTED';
    packageType?: string;
    priorityLevel?: number;
    servicePackageId?: number;

    // User
    landlord: {
        id: number;
        fullName: string;
        avatarUrl?: string;
        phone?: string;
        email?: string;
    };

    // Stats
    averageRating: number;
    totalReviews: number;

    // Timestamps
    createdAt: string;
    expirationDate?: string;
    lastPushedAt?: string;
    approvedAt?: string;
}

// User Types
export interface User {
    id: number;
    email: string;
    fullName: string;
    phone?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    role: 'ADMIN' | 'LANDLORD' | 'TENANT';
    walletBalance?: number;
    kycStatus?: string;
    membershipLevel?: string;
    membershipExpiresAt?: string;
    isActive: boolean;
    createdAt: string;
    lastActiveAt?: string;
}

// Auth Types
export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

// Chat Types
export type MessageType = 'TEXT' | 'IMAGE' | 'VOICE' | 'LOCATION' | 'PROPERTY' | 'APPOINTMENT';

export interface ChatMessage {
    id: number;
    senderId: number;
    receiverId: number;
    content?: string;
    type: MessageType;
    metadata?: {
        // For LOCATION
        latitude?: number;
        longitude?: number;
        // For PROPERTY
        roomId?: number;
        // For VOICE
        audioUrl?: string;
        // For APPOINTMENT
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

// Review Types
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

// Favorite Types
export interface Favorite {
    id: number;
    userId: number;
    roomId: number;
    room: Room;
    createdAt: string;
}

// Appointment Types
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

// Filter Types
export interface RoomFilters {
    type?: string;
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

// Search Types
export interface SearchParams extends RoomFilters {
    keyword?: string;
    address?: string;
    lat?: number;
    lng?: number;
    radius?: number;
    page?: number;
    size?: number;
}

// API Response Types
export interface ApiResponse<T> {
    data: T;
    message?: string;
    success: boolean;
}

export interface PaginatedResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
}

// Form Types
export interface RoomCreateDTO {
    title: string;
    description?: string;
    price: number;
    deposit?: number;
    area: number;
    address: string;
    latitude: number;
    longitude: number;
    rentalType: 'WHOLE' | 'SHARED';
    furnitureStatus?: string;
    direction?: string;
    numBedrooms?: number;
    numBathrooms?: number;
    capacity?: number;
    genderConstraint?: 'MALE_ONLY' | 'FEMALE_ONLY' | 'MIXED';
    amenities?: string[];
    images: string[];
    videoUrl?: string;
}

// Notification Types
export interface Notification {
    id: number;
    userId: number;
    title: string;
    message: string;
    type: 'CHAT' | 'APPOINTMENT' | 'APPOINTMENT_REMINDER' | 'REVIEW' | 'ROOM_APPROVED' | 'ROOM_REJECTED' | 'SYSTEM';
    data?: {
        roomId?: number;
        chatPartnerId?: number;
        appointmentId?: number;
        [key: string]: any;
    };
    isRead: boolean;
    createdAt: string;
}

// Push Notification Types
export interface PushTokenRequest {
    token: string;
    platform: 'ios' | 'android';
}

// KYC Types
export type KYCStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface KYCSubmitData {
    citizenId: string;
    fullName: string;
    dateOfBirth: string;
    frontImageBase64: string;
    backImageBase64: string;
}

export interface KYCStatusResponse {
    kycStatus: KYCStatus;
    citizenId?: string;
    fullName?: string;
    rejectedReason?: string;
    updatedAt?: string;
}

// Wallet & Transaction Types
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

// Contract Types
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

// Service Package Types
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
