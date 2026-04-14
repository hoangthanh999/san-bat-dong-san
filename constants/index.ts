// API Base URL - Gateway (nginx)
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.30.248.25:8080';

// Property Service - nginx đã route /properties, /public/properties, /admin/properties → 8086
// Giữ lại cho trường hợp cần gọi trực tiếp (bypass nginx)
export const PROPERTY_API_BASE_URL = process.env.EXPO_PUBLIC_PROPERTY_API_BASE_URL || 'http://10.30.248.25:8086';

// Payment Service - nginx chỉ route /api/payment/, các endpoint khác cần gọi trực tiếp
export const PAYMENT_API_BASE_URL = process.env.EXPO_PUBLIC_PAYMENT_API_BASE_URL || 'http://10.30.248.25:8087';

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
    // ============================================================
    // AUTH (identity-service qua nginx /auth)
    // ============================================================
    LOGIN: '/auth/login',                                           // POST - body: {email, password}
    REGISTER: '/auth/register',                                     // POST - body: {email, password, fullName, phone}
    FORGOT_PASSWORD: '/auth/forgot-password',                       // POST - body: {email}
    RESET_PASSWORD: '/auth/reset-password',                         // POST - body: {token, newPassword}
    CHANGE_PASSWORD: '/auth/change-password',                       // POST - body: {oldPassword, newPassword}
    CHANGE_EMAIL: '/auth/change-email',                             // PUT  - body: {password, newEmail}

    // ============================================================
    // ADMIN - USERS (identity-service qua nginx /admin)
    // ============================================================
    ADMIN_TOGGLE_STATUS: (id: number) => `/admin/users/${id}/status`,     // PUT
    ADMIN_PROMOTE: (id: number) => `/admin/users/${id}/promote`,          // PUT
    ADMIN_DELETE_USER: (id: number) => `/admin/users/${id}`,              // DELETE
    ADMIN_KYC_PENDING: '/admin/users/kyc/pending',                        // GET
    ADMIN_KYC_APPROVE: (id: number) => `/admin/users/${id}/kyc/approve`,  // PUT
    ADMIN_KYC_REJECT: (id: number) => `/admin/users/${id}/kyc/reject`,    // PUT - param: reason

    // ============================================================
    // CUSTOMER (customer-service qua nginx /customers)
    // ============================================================
    CUSTOMER_PROFILE: '/customers/profile',                                    // GET / PUT
    CUSTOMER_PUBLIC_PROFILE: (slug: string) => `/customers/${slug}/public-profile`, // GET
    CUSTOMER_AVATAR: '/customers/avatar',                                      // POST multipart
    CUSTOMER_BANNER: '/customers/banner',                                      // POST multipart
    CUSTOMER_KYC_SCAN: '/customers/kyc/scan',                                  // POST multipart (field: image)
    CUSTOMER_KYC_SUBMIT: '/customers/kyc',                                     // POST multipart
    CUSTOMER_UPDATE_EMAIL: (id: number) => `/customers/${id}/email`,           // PUT - param: newEmail

    // ============================================================
    // PROPERTY - PUBLIC (qua nginx /public/properties → property-service:8086)
    // Không cần auth
    // ============================================================
    PUBLIC_PROPERTIES: '/public/properties',                                    // GET - params: page, size
    PUBLIC_PROPERTY_DETAIL: (id: number) => `/public/properties/${id}`,        // GET
    PUBLIC_PROPERTIES_REELS: '/public/properties/reels',                       // GET - header: X-Guest-Id, params: cursor, size
    PUBLIC_PROPERTIES_BY_OWNER: (ownerId: number) => `/public/properties/owners/${ownerId}`, // GET - params: page, size

    // ============================================================
    // PROPERTY - OWNER (qua nginx /properties → property-service:8086)
    // Yêu cầu JWT + role OWNER
    // ============================================================
    OWNER_PROPERTIES: '/properties',                                            // POST - body: PropertyCreateDTO
    OWNER_PROPERTY_DETAIL: (id: number) => `/properties/${id}`,                // PUT / DELETE
    OWNER_PROPERTY_TRASH: '/properties/trash',                                  // GET - params: page, size
    OWNER_PROPERTY_RESTORE: (id: number) => `/properties/${id}/restore`,       // PUT
    OWNER_PROPERTY_HARD_DELETE: (id: number) => `/properties/${id}/force`,     // DELETE

    // ============================================================
    // PROPERTY - INTERACTION (qua nginx /properties → property-service:8086)
    // Cần userId (JWT) hoặc guestId (header)
    // ============================================================
    PROPERTY_LIKE: (id: number) => `/properties/${id}/like`,                   // POST - header: X-Guest-Id (optional)
    PROPERTY_SAVE: (id: number) => `/properties/${id}/save`,                   // POST - header: X-Guest-Id (optional)

    // ============================================================
    // PROPERTY - ADMIN (qua nginx /admin/properties → property-service:8086)
    // Yêu cầu JWT + role ADMIN
    // ============================================================
    ADMIN_PROPERTIES: '/admin/properties',                                      // GET - params: page, size, status?
    ADMIN_PROPERTY_DETAIL: (id: number) => `/admin/properties/${id}`,          // GET
    ADMIN_PROPERTY_STATUS: (id: number) => `/admin/properties/${id}/status`,   // PATCH - param: status
    ADMIN_PROPERTY_DELETE: (id: number) => `/admin/properties/${id}`,          // DELETE
    ADMIN_PROPERTY_TRASH: '/admin/properties/trash',                            // GET - params: page, size
    ADMIN_PROPERTY_RESTORE: (id: number) => `/admin/properties/${id}/restore`, // PUT
    ADMIN_PROPERTY_HARD_DELETE: (id: number) => `/admin/properties/${id}/force`, // DELETE

    // ============================================================
    // AMENITIES (qua nginx /amenities → property-service:8086)
    // ============================================================
    AMENITIES: '/amenities',                                                    // GET - public
    ADMIN_AMENITIES: '/admin/amenities',                                        // POST - admin
    ADMIN_AMENITY_DETAIL: (id: number) => `/admin/amenities/${id}`,            // PUT / DELETE - admin

    // ============================================================
    // PROJECTS (qua nginx /public/projects, /admin/projects → property-service:8086)
    // ============================================================
    PUBLIC_PROJECTS: '/public/projects',                                        // GET - params: page, size
    PUBLIC_PROJECT_DETAIL: (id: number) => `/public/projects/${id}`,           // GET
    ADMIN_PROJECTS: '/admin/projects',                                          // GET / POST - admin
    ADMIN_PROJECT_DETAIL: (id: number) => `/admin/projects/${id}`,             // GET / PUT / DELETE
    ADMIN_PROJECT_TRASH: '/admin/projects/trash',                               // GET - params: page, size
    ADMIN_PROJECT_RESTORE: (id: number) => `/admin/projects/${id}/restore`,    // PUT
    ADMIN_PROJECT_HARD_DELETE: (id: number) => `/admin/projects/${id}/force`,  // DELETE

    // ============================================================
    // MEDIA (media-service qua nginx /media → rewrite /api/v1/media)
    // ============================================================
    MEDIA_UPLOAD: '/api/v1/media/upload',                                       // POST multipart - field: file, param: folder
    MEDIA_UPLOAD_MULTIPLE: '/api/v1/media/upload-multiple',                     // POST multipart - field: files, param: folder

    // ============================================================
    // NOTIFICATIONS (notification-service qua nginx /api/notifications)
    // ============================================================
    NOTIFICATIONS: '/api/notifications',                                        // GET - params: page, size
    NOTIFICATIONS_UNREAD: '/api/notifications/unread',                          // GET - params: page, size
    NOTIFICATION_READ: (id: number) => `/api/notifications/${id}/read`,        // PUT
    NOTIFICATION_READ_ALL: '/api/notifications/read-all',                       // PUT
    NOTIFICATION_UNREAD_COUNT: '/api/notifications/unread-count',               // GET

    // ============================================================
    // PAYMENT (payment-service - /api/payment qua nginx, còn lại trực tiếp :8087)
    // ============================================================
    PAYMENT_CREATE: '/api/payment/create-payment',                              // POST - params: amount, userId (qua nginx)
    // Các endpoint dưới đây KHÔNG qua nginx, dùng paymentClient (trực tiếp :8087)
    TRANSACTION_HISTORY: (userId: number) => `/api/transactions/my-history/${userId}`, // GET
    PACKAGE_BUY_MEMBERSHIP: '/api/packages/buy-membership',                     // POST - params: userId, packageId
    BILLS_CREATE: '/api/bills',                                                  // POST - body: BillCreateDTO

    // ============================================================
    // FEATURES ĐANG PHÁT TRIỂN (Backend chưa có API - giữ stub)
    // ============================================================

    // Favorites (chưa có backend)
    FAVORITES: '/favorites',
    FAVORITE_TOGGLE: (roomId: number) => `/favorites/${roomId}`,
    FAVORITE_CHECK: (roomId: number) => `/favorites/check/${roomId}`,

    // Chat (chưa có backend)
    CHAT_CONVERSATIONS: '/chat/conversations',
    CHAT_HISTORY: (partnerId: number) => `/chat/history/${partnerId}`,
    CHAT_SEND: '/chat/send',
    CHAT_START: '/chat/start',

    // Reviews (chưa có backend)
    REVIEWS: '/reviews',
    REVIEWS_ROOM: (roomId: number) => `/reviews/room/${roomId}`,
    REVIEW_REPLY: (id: number) => `/reviews/${id}/reply`,

    // Appointments (chưa có backend)
    APPOINTMENTS: '/appointments',
    APPOINTMENT_BY_ID: (id: number) => `/appointments/${id}`,

    // Contracts (chưa có backend)
    CONTRACTS: '/contracts',
    CONTRACT_BY_ID: (id: number) => `/contracts/${id}`,
    CONTRACT_PDF: (id: number) => `/contracts/${id}/pdf`,

    // Push Token (chưa có backend)
    PUSH_TOKEN: '/notifications/push-token',
};
