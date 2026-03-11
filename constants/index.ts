// API Base URL
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.1.100:8080/api';
export const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://192.168.1.100:8080/ws';

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

// API Endpoints
export const API_ENDPOINTS = {
    // Auth
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',

    // Rooms
    ROOMS: '/rooms',
    ROOMS_SEARCH: '/rooms/search',
    ROOMS_VIDEOS: '/rooms/videos',
    ROOMS_MY: '/rooms/my-rooms',
    ROOM_DETAIL: (id: number) => `/rooms/${id}`,
    ROOM_PUSH: (id: number) => `/rooms/${id}/push`,
    ROOM_STATUS: (id: number) => `/rooms/${id}/status`,
    ROOM_VIEW: (id: number) => `/rooms/${id}/view`,

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

    // User
    USER_PROFILE: '/users/profile',
    USER_UPDATE: '/users/profile',

    // Appointments
    APPOINTMENTS: '/appointments',
    APPOINTMENT_BY_ID: (id: number) => `/appointments/${id}`,

    // Files
    FILE_UPLOAD: '/files/upload',

    // Notifications
    NOTIFICATIONS: '/notifications',
    NOTIFICATION_READ: (id: number) => `/notifications/${id}/read`,
    NOTIFICATION_READ_ALL: '/notifications/read-all',
    NOTIFICATION_UNREAD_COUNT: '/notifications/unread-count',
    PUSH_TOKEN: '/notifications/push-token',
};
