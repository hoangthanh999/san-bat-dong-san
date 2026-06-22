// API Base URL - Gateway (nginx)
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://homeverse-bds.duckdns.org';
export const API_FALLBACK_BASE_URL = process.env.EXPO_PUBLIC_API_FALLBACK_BASE_URL || '';
export const ENABLE_API_FALLBACK = process.env.EXPO_PUBLIC_ENABLE_API_FALLBACK === 'true';

// Property Service - nginx đã route /properties, /public/properties, /admin/properties → 8086
export const PROPERTY_API_BASE_URL = process.env.EXPO_PUBLIC_PROPERTY_API_BASE_URL || 'https://homeverse-bds.duckdns.org';

// Payment Service - nginx chỉ route /api/payment/, các endpoint khác cần gọi trực tiếp
export const PAYMENT_API_BASE_URL = process.env.EXPO_PUBLIC_PAYMENT_API_BASE_URL || 'https://homeverse-bds.duckdns.org';

// WebSocket Notification (STOMP/SockJS — notification-service)
export const WS_URL = process.env.EXPO_PUBLIC_WS_URL
    || 'https://homeverse-bds.duckdns.org/ws-notifier';

// WebSocket Chat (STOMP/SockJS — chat-service)
export const WS_CHAT_URL = process.env.EXPO_PUBLIC_WS_CHAT_URL
    || 'https://homeverse-bds.duckdns.org/ws-chat';

// ✅ WebSocket AI Chat (STOMP/SockJS — ai-worker-service) - THÊM MỚI
export const WS_AI_URL = process.env.EXPO_PUBLIC_WS_AI_URL
    || 'https://homeverse-bds.duckdns.org/ws-ai';

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
    REFRESH_TOKEN: 'refresh_token',
    USER_DATA: 'user_data',
    THEME: 'theme_mode',
    LANGUAGE: 'language',
    ONBOARDING_COMPLETED: 'onboarding_completed',
    SEARCH_HISTORY: 'search_history',
    FILTERS: 'saved_filters',
    PUSH_TOKEN: 'push_token',
    NOTIFICATIONS_ENABLED: 'notifications_enabled',
    API_ENVIRONMENT_BASE_URL: 'api_environment_base_url',
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
    // ============================================================
    // AUTH (identity-service qua nginx /auth)
    // ============================================================
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    CHANGE_PASSWORD: '/auth/change-password',
    CHANGE_EMAIL: '/auth/change-email',

    // ============================================================
    // ADMIN - USERS (identity-service qua nginx /admin)
    // ============================================================
    ADMIN_TOGGLE_STATUS: (id: number) => `/admin/users/${id}/status`,
    ADMIN_PROMOTE: (id: number) => `/admin/users/${id}/promote`,
    ADMIN_DELETE_USER: (id: number) => `/admin/users/${id}`,
    ADMIN_KYC_PENDING: '/admin/users/kyc/pending',
    ADMIN_KYC_APPROVE: (id: number) => `/admin/users/${id}/kyc/approve`,
    ADMIN_KYC_REJECT: (id: number) => `/admin/users/${id}/kyc/reject`,

    // ============================================================
    // CUSTOMER (customer-service qua nginx /customers)
    // ============================================================
    CUSTOMER_PROFILE: '/customers/profile',
    CUSTOMER_PUBLIC_PROFILE: (slug: string) => `/customers/${slug}/public-profile`,
    CUSTOMER_PUBLIC_BANNER: (slug: string) => `/customers/${slug}/public-banner`,
    CUSTOMER_SUMMARY: (id: number) => `/customers/${id}/summary`,
    CUSTOMER_AVATAR: '/customers/avatar',
    CUSTOMER_BANNER: '/customers/banner',
    CUSTOMER_KYC_SCAN: '/customers/kyc/scan',
    CUSTOMER_KYC_SUBMIT: '/customers/kyc',
    CUSTOMER_UPDATE_EMAIL: (id: number) => `/customers/${id}/email`,

    // ============================================================
    // PROPERTY - PUBLIC
    // ============================================================
    PUBLIC_PROPERTIES: '/public/properties',
    PUBLIC_PROPERTY_DETAIL: (id: number) => `/public/properties/${id}`,
    PUBLIC_PROPERTIES_PROMOTED: '/public/properties/promoted',
    PUBLIC_PROPERTIES_TRENDING: '/public/properties/trending',
    PUBLIC_PROPERTIES_RANDOM: '/public/properties/random',
    PUBLIC_PROPERTIES_REELS: '/public/properties/reels',
    PUBLIC_PROPERTIES_REEL_DETAIL: (id: number) => `/public/properties/reels/${id}`,
    PUBLIC_PROPERTIES_REELS_PROMOTED: '/public/properties/reels/promoted',
    PUBLIC_PROPERTIES_REELS_TRENDING: '/public/properties/reels/trending',
    PUBLIC_PROPERTIES_REELS_RANDOM: '/public/properties/reels/random',
    PUBLIC_PROPERTIES_BY_OWNER: (ownerId: number) => `/public/properties/owners/${ownerId}`,
    PUBLIC_OWNER_TRUST_SCORE: (ownerId: number) => `/public/properties/owners/${ownerId}/trust-score`,

    // ============================================================
    // RECOMMENDATION
    // ============================================================
    RECOMMEND_PROPERTIES_FINAL: (userId: number) => `/recommend/users/${userId}/properties/final`,
    RECOMMEND_REELS_FINAL: (userId: number) => `/recommend/users/${userId}/reels/final`,
    RECOMMEND_PROPERTIES: (userId: number) => `/recommend/users/${userId}/properties`,
    RECOMMEND_REELS: (userId: number) => `/recommend/users/${userId}/reels`,
    RECOMMEND_TRACK: '/recommend/track',

    // ============================================================
    // PROPERTY - OWNER
    // ============================================================
    OWNER_PROPERTIES: '/properties',
    OWNER_PROPERTY_DETAIL: (id: number) => `/properties/${id}`,
    OWNER_PROPERTY_TRASH: '/properties/trash',
    OWNER_PROPERTY_RESTORE: (id: number) => `/properties/${id}/restore`,
    OWNER_PROPERTY_HARD_DELETE: (id: number) => `/properties/${id}/force`,

    // ============================================================
    // PROPERTY - INTERACTION
    // ============================================================
    PROPERTY_LIKE: (id: number) => `/properties/${id}/like`,
    PROPERTY_SAVE: (id: number) => `/properties/${id}/save`,
    PROPERTY_VIEW: (id: number) => `/properties/${id}/view`,  // ✅ THÊM: track view endpoint
    PROPERTY_ME_LIKED: '/properties/me/liked',
    PROPERTY_ME_SAVED: '/properties/me/saved',

    // ============================================================
    // PROPERTY - ADMIN
    // ============================================================
    ADMIN_PROPERTIES: '/admin/properties',
    ADMIN_PROPERTY_DETAIL: (id: number) => `/admin/properties/${id}`,
    ADMIN_PROPERTY_STATUS: (id: number) => `/admin/properties/${id}/status`,
    ADMIN_PROPERTY_DELETE: (id: number) => `/admin/properties/${id}`,
    ADMIN_PROPERTY_TRASH: '/admin/properties/trash',
    ADMIN_PROPERTY_RESTORE: (id: number) => `/admin/properties/${id}/restore`,
    ADMIN_PROPERTY_HARD_DELETE: (id: number) => `/admin/properties/${id}/force`,

    // ============================================================
    // AMENITIES
    // ============================================================
    AMENITIES: '/amenities',
    ADMIN_AMENITIES: '/admin/amenities',         // POST tạo mới amenity
    ADMIN_AMENITIES_LIST: '/admin/amenities/all', // ✅ FIX: GET danh sách admin → /admin/amenities/all
    ADMIN_AMENITY_DETAIL: (id: number) => `/admin/amenities/${id}`,

    // ============================================================
    // PROJECTS
    // ============================================================
    PUBLIC_PROJECTS: '/public/projects',
    PUBLIC_PROJECT_DETAIL: (id: number) => `/public/projects/${id}`,
    ADMIN_PROJECTS: '/admin/projects',
    ADMIN_PROJECT_DETAIL: (id: number) => `/admin/projects/${id}`,
    ADMIN_PROJECT_TRASH: '/admin/projects/trash',
    ADMIN_PROJECT_RESTORE: (id: number) => `/admin/projects/${id}/restore`,
    ADMIN_PROJECT_HARD_DELETE: (id: number) => `/admin/projects/${id}/force`,

    // ============================================================
    // MEDIA
    // ============================================================
 MEDIA_UPLOAD: '/media/api/v1/media/upload',
MEDIA_UPLOAD_MULTIPLE: '/media/api/v1/media/upload-multiple',


    // ============================================================
    // NOTIFICATIONS
    // ============================================================
    NOTIFICATIONS: '/api/notifications',
    NOTIFICATIONS_UNREAD: '/api/notifications/unread',
    NOTIFICATION_READ: (id: number) => `/api/notifications/${id}/read`,
    NOTIFICATION_READ_ALL: '/api/notifications/read-all',
    NOTIFICATION_UNREAD_COUNT: '/api/notifications/unread-count',

    // ============================================================
    // PAYMENT
    // ============================================================
    PAYMENT_CREATE: '/api/payment/create-payment',
    TRANSACTION_HISTORY: (userId: number) => `/api/transactions/my-history/${userId}`,
    PACKAGE_BUY_MEMBERSHIP: '/api/packages/buy-membership',
    PACKAGE_BUY_PROMOTION: '/api/packages/buy-promotion',
    BILLS_CREATE: '/api/bills',

    // ============================================================
    // SEARCH
    // ============================================================
    SEARCH_PROPERTIES: '/search/properties',
    SEARCH_PROPERTIES_BY_IDS: '/search/properties/by-ids',
    ANALYTICS_PRICE_TRENDS: '/api/v1/analytics/price-trends',
    ANALYTICS_WARD_PRICES: '/api/v1/analytics/ward-prices',
    ANALYTICS_TOP_REGIONS: '/api/v1/analytics/top-regions',

    // ============================================================
    // WALLET
    // ============================================================
    WALLET_ME: '/api/wallets/me',
    WALLET_TRANSACTIONS: '/api/wallets/transactions',
    WALLET_HOLD: '/api/wallets/hold',
    WALLET_RELEASE: '/api/wallets/release',
    WALLET_DEBIT: '/api/wallets/debit',

    // ============================================================
    // CHAT
    // ============================================================
    CHAT_CONVERSATIONS: '/api/chat/conversations',
    CHAT_HISTORY: (partnerId: number) => `/api/chat/history/${partnerId}`,
    CHAT_SEND: '/api/chat/send',
    CHAT_START: '/api/chat/start',
    CHAT_READ: (partnerId: number) => `/api/chat/read/${partnerId}`,
    CHAT_AI_TEST: '/api/chat/test-ai-flow',  // ✅ FIX: path bị duplicate trước đây

    // ============================================================
    // AUTH - LOGOUT & REFRESH
    // ============================================================
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
};
