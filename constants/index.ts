// API Base URL - Gateway (nginx)
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.30.248.25:8080';

// Property Service - chạy riêng vì chưa có trong nginx (port 8086)
export const PROPERTY_API_BASE_URL = process.env.EXPO_PUBLIC_PROPERTY_API_BASE_URL || 'http://10.30.248.25:8086';

// WebSocket (STOMP over SockJS cho notification-service)
export const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://10.30.248.25:8080/ws-notifier';

// Google Maps
export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// Cloudinary
export const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
export const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '';

// App Info
export const APP_NAME = 'HomeSwipe';
export const APP_VERSION = '1.0.0';

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const FEED_PAGE_SIZE = 8;
export const MAP_PAGE_SIZE = 20;

// Default Search Radius (meters)
export const DEFAULT_SEARCH_RADIUS = 20000; // 20km
export const NEARBY_RADIUS = 2000; // 2km

// Video Constraints
export const MAX_VIDEO_DURATION = 60; // seconds
export const MAX_IMAGE_COUNT = 20;

// Map Default Region (Ho Chi Minh City)
export const DEFAULT_MAP_REGION = {
    latitude: 10.762622,
    longitude: 106.660172,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
};

// Storage Keys
export const STORAGE_KEYS = {
    AUTH_TOKEN: 'auth_token',
    USER_DATA: 'user_data',
    THEME: 'theme_mode',
    LANGUAGE: 'language',
    ONBOARDING_COMPLETED: 'onboarding_completed',
    SEARCH_HISTORY: 'search_history',
    FILTERS: 'saved_filters',
    PUSH_TOKEN: 'push_token',
    NOTIFICATIONS_ENABLED: 'notifications_enabled',
};

// Animation Durations
export const ANIMATION_DURATION = {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
};

// ============================
// API Endpoints (khớp với backend microservices)
// ============================
export const API_ENDPOINTS = {
    // === Auth (identity-service qua nginx /auth) ===
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    CHANGE_PASSWORD: '/auth/change-password',
    CHANGE_EMAIL: '/auth/change-email',

    // === Admin (identity-service qua nginx /admin) ===
    ADMIN_TOGGLE_STATUS: (id: number) => `/admin/users/${id}/status`,
    ADMIN_PROMOTE: (id: number) => `/admin/users/${id}/promote`,
    ADMIN_DELETE_USER: (id: number) => `/admin/users/${id}`,
    ADMIN_KYC_PENDING: '/admin/users/kyc/pending',
    ADMIN_KYC_APPROVE: (id: number) => `/admin/users/${id}/kyc/approve`,
    ADMIN_KYC_REJECT: (id: number) => `/admin/users/${id}/kyc/reject`,

    // === Properties (property-service - dùng propertyClient) ===
    PROPERTIES: '/properties',
    PROPERTIES_SEARCH: '/properties/search',
    PROPERTY_DETAIL: (id: number) => `/properties/${id}`,
    PROPERTY_STATUS: (id: number) => `/properties/${id}/status`,
    PROPERTIES_BY_LANDLORD: (landlordId: number) => `/properties/landlord/${landlordId}`,
    PROPERTIES_ADMIN_PENDING: '/properties/admin/pending',

    // === Customer (customer-service qua nginx /customers) ===
    CUSTOMER_PROFILE: '/customers/profile',
    CUSTOMER_PUBLIC_PROFILE: (slug: string) => `/customers/${slug}/public-profile`,
    CUSTOMER_AVATAR: '/customers/avatar',
    CUSTOMER_BANNER: '/customers/banner',
    CUSTOMER_KYC_SCAN: '/customers/kyc/scan',
    CUSTOMER_KYC_SUBMIT: '/customers/kyc',
    CUSTOMER_UPDATE_EMAIL: (id: number) => `/customers/${id}/email`,

    // === Media (media-service qua nginx /media -> rewrite /api/v1/media) ===
    MEDIA_UPLOAD: '/api/v1/media/upload',

    // === Notifications (notification-service qua nginx /api/notifications) ===
    NOTIFICATIONS: '/api/notifications',
    NOTIFICATIONS_UNREAD: '/api/notifications/unread',
    NOTIFICATION_READ: (id: number) => `/api/notifications/${id}/read`,
    NOTIFICATION_READ_ALL: '/api/notifications/read-all',
    NOTIFICATION_UNREAD_COUNT: '/api/notifications/unread-count',

    // === Các tính năng chưa có backend (giữ nguyên cho tương lai) ===
    // Favorites
    FAVORITES: '/favorites',
    FAVORITE_TOGGLE: (roomId: number) => `/favorites/${roomId}`,
    FAVORITE_CHECK: (roomId: number) => `/favorites/check/${roomId}`,

    // Chat
    CHAT_CONVERSATIONS: '/chat/conversations',
    CHAT_HISTORY: (partnerId: number) => `/chat/history/${partnerId}`,
    CHAT_SEND: '/chat/send',
    CHAT_START: '/chat/start',

    // Reviews
    REVIEWS: '/reviews',
    REVIEWS_ROOM: (roomId: number) => `/reviews/room/${roomId}`,
    REVIEW_REPLY: (id: number) => `/reviews/${id}/reply`,

    // Appointments
    APPOINTMENTS: '/appointments',
    APPOINTMENT_BY_ID: (id: number) => `/appointments/${id}`,

    // Wallet
    WALLET_BALANCE: '/wallet/balance',
    WALLET_VNPAY_CREATE: '/wallet/vnpay/create',
    WALLET_TRANSACTIONS: '/wallet/transactions',

    // Contracts
    CONTRACTS: '/contracts',
    CONTRACT_BY_ID: (id: number) => `/contracts/${id}`,
    CONTRACT_PDF: (id: number) => `/contracts/${id}/pdf`,

    // Service Packages
    PACKAGES: '/service-packages',
    PACKAGE_PURCHASE: (id: number) => `/service-packages/${id}/purchase`,
    PACKAGE_BOOST: '/properties/boost',

    // Push Token (chưa có backend)
    PUSH_TOKEN: '/notifications/push-token',
};
