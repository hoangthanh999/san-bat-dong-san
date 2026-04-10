# BÁO CÁO ĐỒ ÁN TỐT NGHIỆP
# Ứng dụng Mobile: Sàn Giao Dịch Bất Động Sản Thông Minh (HomeSwipe)

**Phiên bản:** 1.1 | **Ngày:** 03/2026  
**Nền tảng:** React Native (Android & iOS)  
**Vai trò:** Frontend Mobile Developer

---

## MỤC LỤC

1. [Tổng quan dự án](#1-tổng-quan-dự-án)
2. [Công nghệ và thư viện sử dụng](#2-công-nghệ-và-thư-viện-sử-dụng)
3. [Kiến trúc ứng dụng](#3-kiến-trúc-ứng-dụng)
4. [Cấu trúc thư mục chi tiết](#4-cấu-trúc-thư-mục-chi-tiết)
5. [Hệ thống Types — Định nghĩa kiểu dữ liệu](#5-hệ-thống-types)
6. [API Client — Kết nối Backend](#6-api-client)
7. [Hệ thống Store (Zustand) — Quản lý State](#7-hệ-thống-store-zustand)
8. [Hệ thống API Service — Gọi API Backend](#8-hệ-thống-api-service)
9. [Hệ thống Routing — Điều hướng màn hình](#9-hệ-thống-routing)
10. [Chi tiết từng màn hình](#10-chi-tiết-từng-màn-hình)
11. [Hệ thống Components tái sử dụng](#11-hệ-thống-components)
12. [Push Notifications — Thông báo đẩy](#12-push-notifications)
13. [Bảo mật và xác thực](#13-bảo-mật-và-xác-thực)
14. [Xử lý ngoại lệ](#14-xử-lý-ngoại-lệ)
15. [Constants — Hằng số và cấu hình](#15-constants)

---

## 1. TỔNG QUAN DỰ ÁN

### 1.1. Mô tả
HomeSwipe là ứng dụng di động cho phép người dùng **tìm kiếm, đăng tin cho thuê, đặt lịch xem, ký hợp đồng** bất động sản (phòng trọ, căn hộ). Ứng dụng hỗ trợ hai vai trò chính:

- **Tenant (Người thuê):** Tìm kiếm phòng, đặt lịch xem, ký hợp đồng, đánh giá
- **Landlord (Chủ nhà):** Đăng tin, quản lý lịch hẹn, xác nhận hợp đồng, phản hồi đánh giá

### 1.2. Tính năng chính
| # | Tính năng | Mô tả |
|---|-----------|-------|
| 1 | Feed BĐS | Danh sách bất động sản dạng scroll, tìm kiếm, lọc |
| 2 | Bản đồ | Xem BĐS trên bản đồ Google Maps, tìm gần vị trí |
| 3 | Đăng tin | Tạo bài đăng qua 3 bước (cơ bản, chi tiết, ảnh/video) |
| 4 | Chat | Nhắn tin real-time qua WebSocket |
| 5 | KYC | Xác minh danh tính bằng CCCD (3 bước) |
| 6 | Ví & VNPay | Nạp tiền, thanh toán, xem lịch sử qua VNPay Sandbox |
| 7 | Lịch hẹn | Đặt lịch xem phòng, xác nhận/đề xuất lại giờ |
| 8 | Hợp đồng | Xem, quản lý hợp đồng, tải PDF |
| 9 | Gói dịch vụ | Mua gói hội viên, boost tin đăng |
| 10 | Đánh giá | Đánh giá sao, viết bình luận, upload ảnh |
| 11 | Thông báo | Push notification + in-app notification center |
| 12 | Profile | Quản lý thông tin cá nhân, avatar, yêu thích |

### 1.3. Kiến trúc hệ thống tổng quan

```
┌────────────────────┐     REST API (HTTPS)      ┌─────────────────────┐
│                    │ ◄──────────────────────►  │                     │
│   React Native     │     WebSocket (WS)        │   Spring Boot       │
│   Mobile App       │ ◄──────────────────────►  │   API Gateway       │
│   (Frontend)       │                           │   (Backend)         │
│                    │     VNPay Redirect         │                     │
│                    │ ──────────────────────►   │   PostgreSQL +      │
└────────────────────┘                           │   PostGIS           │
                                                 └─────────────────────┘
```

**Frontend** (project này) giao tiếp với **Backend Spring Boot** qua:
- **REST API (axios):** Tất cả CRUD operations
- **WebSocket (native):** Chat real-time
- **VNPay WebView:** Thanh toán trực tuyến

---

## 2. CÔNG NGHỆ VÀ THƯ VIỆN SỬ DỤNG

### 2.1. Core Framework

| Thư viện | Phiên bản | Vai trò |
|----------|-----------|---------|
| `react` | 19.1.0 | Thư viện UI chính, cung cấp hệ thống component, hooks, virtual DOM |
| `react-native` | 0.81.5 | Framework biên dịch React thành ứng dụng native iOS/Android |
| `expo` | 54.0.33 | Nền tảng phát triển giúp đơn giản hóa build và deploy React Native |
| `typescript` | 5.9.2 | Ngôn ngữ lập trình có kiểu tĩnh, giúp phát hiện lỗi trước khi chạy |

### 2.2. Navigation & Routing

| Thư viện | Vai trò |
|----------|---------|
| `expo-router` 6.0.23 | Hệ thống routing file-based (tương tự Next.js), mỗi file trong `app/` tự động thành một route |
| `react-native-screens` | Tối ưu hiệu suất navigation bằng cách sử dụng native screen containers |
| `react-native-gesture-handler` | Xử lý vuốt, nhấn, kéo thả bằng native gesture system |

### 2.3. State Management

| Thư viện | Vai trò |
|----------|---------|
| `zustand` 5.0.11 | Thư viện quản lý state toàn cục, nhẹ hơn Redux. Mỗi store quản lý một "lĩnh vực" dữ liệu (auth, property, chat...) |
| `@react-native-async-storage/async-storage` | Lưu trữ dữ liệu trên thiết bị (JWT token, user data, preferences) |

### 2.4. Networking

| Thư viện | Vai trò |
|----------|---------|
| `axios` 1.13.5 | Thư viện HTTP client gọi REST API. Có interceptors tự động đính JWT token |
| **Native WebSocket** | Kết nối real-time cho chat. React Native cung cấp sẵn `WebSocket` API |

### 2.5. UI & Media

| Thư viện | Vai trò |
|----------|---------|
| `expo-image` | Hiển thị ảnh tối ưu, caching tự động, hỗ trợ lazy loading |
| `expo-video` | Phát video trong bài đăng BĐS |
| `expo-blur` | Hiệu ứng blur (làm mờ) cho background |
| `expo-linear-gradient` | Tạo gradient cho UI (header, cards) |
| `expo-haptics` | Rung phản hồi khi người dùng tương tác (like, swipe) |
| `@expo/vector-icons` | Bộ icon Ionicons cho UI |
| `lottie-react-native` | Animation Lottie (onboarding, loading) |
| `nativewind` + `tailwindcss` | Utility CSS classes trong React Native |

### 2.6. Maps & Location

| Thư viện | Vai trò |
|----------|---------|
| `react-native-maps` 1.20.1 | Hiển thị bản đồ Google Maps, markers, vùng tìm kiếm |
| `expo-location` | Lấy vị trí GPS của người dùng |
| `react-native-google-places-autocomplete` | Gợi ý địa chỉ khi nhập |

### 2.7. Camera & Files

| Thư viện | Vai trò |
|----------|---------|
| `expo-image-picker` | Chọn ảnh từ thư viện hoặc chụp camera |
| `expo-camera` | Truy cập camera để chụp CCCD (KYC) |
| `expo-image-manipulator` | Xoay, cắt, resize ảnh trước khi upload |

### 2.8. Notifications

| Thư viện | Vai trò |
|----------|---------|
| `expo-notifications` | Push notification (nhận từ server), local notification (nhắc lịch hẹn) |
| `expo-device` | Kiểm tra thiết bị thật để đăng ký push token |

### 2.9. Other

| Thư viện | Vai trò |
|----------|---------|
| `react-native-webview` | Hiển thị trang VNPay để thanh toán |
| `react-native-reanimated` | Animation mượt mà cho UI transitions |
| `react-native-safe-area-context` | Xử lý notch, status bar, home indicator |
| `date-fns` | Xử lý ngày tháng (format, so sánh) |
| `expo-linking` | Deep linking giữa các ứng dụng |

---

## 3. KIẾN TRÚC ỨNG DỤNG

### 3.1. Mô hình kiến trúc

Ứng dụng sử dụng kiến trúc **3 lớp (3-Layer Architecture)**:

```
┌─────────────────────────────────────────────┐
│              PRESENTATION LAYER             │
│   (Screens/Components trong thư mục app/)   │
│   Hiển thị UI, nhận input từ người dùng     │
├─────────────────────────────────────────────┤
│              STATE MANAGEMENT LAYER         │
│   (Zustand Stores trong thư mục store/)     │
│   Quản lý dữ liệu, logic nghiệp vụ        │
├─────────────────────────────────────────────┤
│              DATA ACCESS LAYER              │
│   (API Services trong thư mục services/)    │
│   Gọi API HTTP, kết nối WebSocket          │
└─────────────────────────────────────────────┘
```

### 3.2. Luồng dữ liệu (Data Flow)

```
User Action → Screen Component → Zustand Store → API Service → Backend
                ↑                      |
                └──────────────────────┘
                   (State cập nhật → UI re-render)
```

**Cụ thể:**
1. Người dùng thao tác trên UI (nhấn nút, nhập text...)
2. Component gọi hàm action từ Zustand Store
3. Store gọi API Service để gửi request lên Backend
4. Backend phản hồi data → Store cập nhật state
5. React tự động re-render UI khi state thay đổi

### 3.3. Giải thích Zustand Store

Zustand là thư viện quản lý state tương tự Redux nhưng đơn giản hơn:

```typescript
// Ví dụ: authStore.ts
import { create } from 'zustand';

// 1. Định nghĩa interface (kiểu dữ liệu của store)
interface AuthState {
    user: User | null;        // Dữ liệu user đang đăng nhập
    isAuthenticated: boolean; // Đã đăng nhập chưa?
    isLoading: boolean;       // Đang xử lý chưa?
    login: (data) => Promise<void>;  // Hàm đăng nhập
}

// 2. Tạo store với create()
export const useAuthStore = create<AuthState>((set) => ({
    // Giá trị khởi tạo
    user: null,
    isAuthenticated: false,
    isLoading: false,

    // Hàm action
    login: async (credentials) => {
        set({ isLoading: true });           // Bật loading
        const response = await api.login(); // Gọi API
        set({ user: response.user, isAuthenticated: true });  // Cập nhật state
    },
}));

// 3. Sử dụng trong component
function LoginScreen() {
    const { login, isLoading } = useAuthStore();  // Lấy state và action
    // ...
}
```

---

## 4. CẤU TRÚC THƯ MỤC CHI TIẾT

```
real-estate-mobile/
│
├── app/                          ← Tất cả màn hình (file-based routing)
│   ├── _layout.tsx               ← Layout gốc: khởi tạo auth, WebSocket, push notification
│   ├── index.tsx                 ← Entry point, redirect tới (tabs)
│   │
│   ├── (tabs)/                   ← 5 tab chính (bottom navigation)
│   │   ├── _layout.tsx           ← Cấu hình tab bar (icon, label, badge)
│   │   ├── index.tsx             ← 🏠 Feed: danh sách tin BĐS
│   │   ├── map.tsx               ← 🗺️ Map: bản đồ tìm kiếm
│   │   ├── post.tsx              ← ➕ Post: đăng tin cho thuê (có KYC guard)
│   │   ├── chat.tsx              ← 💬 Chat: danh sách cuộc hội thoại
│   │   └── profile.tsx           ← 👤 Profile: thông tin cá nhân, cài đặt
│   │
│   ├── (auth)/                   ← Xác thực
│   │   ├── login.tsx             ← Đăng nhập (email + password)
│   │   ├── register.tsx          ← Đăng ký tài khoản
│   │   └── onboarding.tsx        ← Giới thiệu app lần đầu (3 slides Lottie)
│   │
│   ├── property/
│   │   └── [id].tsx              ← Chi tiết BĐS (gallery, map, đánh giá, booking)
│   │
│   ├── kyc/                      ← Xác minh danh tính (5 bước)
│   │   ├── index.tsx             ← Intro: giải thích lợi ích KYC
│   │   ├── upload-front.tsx      ← Upload mặt trước CCCD
│   │   ├── upload-back.tsx       ← Upload mặt sau CCCD
│   │   ├── info.tsx              ← Nhập số CCCD, họ tên, ngày sinh
│   │   └── pending.tsx           ← Chờ admin duyệt
│   │
│   ├── wallet/                   ← Ví điện tử (6 màn hình)
│   │   ├── index.tsx             ← Tổng quan: số dư, giao dịch gần đây
│   │   ├── deposit.tsx           ← Chọn số tiền nạp
│   │   ├── vnpay.tsx             ← WebView thanh toán VNPay
│   │   ├── success.tsx           ← Kết quả: thành công
│   │   ├── failed.tsx            ← Kết quả: thất bại
│   │   └── history.tsx           ← Lịch sử giao dịch (filter theo loại)
│   │
│   ├── appointments/             ← Lịch hẹn xem phòng
│   │   ├── index.tsx             ← Danh sách: tabs Sắp tới / Đã qua / Đã hủy
│   │   └── [id].tsx              ← Chi tiết: xác nhận, đề xuất giờ, hủy
│   │
│   ├── contracts/                ← Hợp đồng điện tử
│   │   ├── index.tsx             ← Danh sách: tabs theo trạng thái
│   │   └── [id].tsx              ← Chi tiết: tài chính, tải PDF
│   │
│   ├── packages/                 ← Gói dịch vụ
│   │   ├── index.tsx             ← Danh sách: tabs Hội viên / Đẩy tin
│   │   └── boost/[roomId].tsx    ← Boost tin cụ thể
│   │
│   ├── chat/[id].tsx             ← Chat 1-1 với đối phương
│   ├── notifications.tsx         ← Trung tâm thông báo (SectionList theo ngày)
│   ├── edit-profile.tsx          ← Sửa thông tin cá nhân
│   └── filter.tsx                ← Bộ lọc nâng cao cho tìm kiếm
│
├── store/                        ← Zustand Stores (quản lý state)
│   ├── authStore.ts              ← Xác thực: login, register, logout, checkAuth
│   ├── propertyStore.ts          ← BĐS: fetch, search, filter, favorites
│   ├── chatStore.ts              ← Chat: messages, WebSocket, conversations
│   ├── userStore.ts              ← User: profile, update, avatar
│   ├── reviewStore.ts            ← Đánh giá: thêm, phản hồi, xóa
│   ├── appointmentStore.ts       ← Lịch hẹn: tạo, xác nhận, hủy, đề xuất lại
│   ├── contractStore.ts          ← Hợp đồng: danh sách, chi tiết
│   ├── walletStore.ts            ← Ví: số dư, nạp tiền VNPay
│   ├── kycStore.ts               ← KYC: submit, kiểm tra trạng thái
│   ├── packageStore.ts           ← Gói dịch vụ: mua hội viên, boost tin
│   └── notificationStore.ts      ← Thông báo: fetch, đánh dấu đã đọc, push
│
├── services/                     ← Gọi API Backend
│   ├── api/
│   │   ├── client.ts             ← Cấu hình Axios (JWT interceptor, error handler)
│   │   ├── auth.ts               ← API đăng nhập, đăng ký, đăng xuất
│   │   ├── rooms.ts              ← API phòng: CRUD, search, nearby
│   │   ├── chat.ts               ← API chat: conversations, messages
│   │   ├── reviews.ts            ← API đánh giá: thêm, phản hồi
│   │   ├── appointments.ts       ← API lịch hẹn: CRUD, confirm, reschedule
│   │   ├── contracts.ts          ← API hợp đồng: list, detail, PDF
│   │   ├── wallet.ts             ← API ví: balance, VNPay create, transactions
│   │   ├── kyc.ts                ← API KYC: submit, check status
│   │   ├── packages.ts           ← API gói dịch vụ: list, purchase, boost
│   │   ├── notifications.ts      ← API thông báo: list, read, unread count
│   │   └── user.ts               ← API user: profile, update
│   │
│   └── pushNotificationService.ts ← Quản lý push notification end-to-end
│
├── components/                   ← Components tái sử dụng
│   ├── property/
│   │   ├── PropertyCard.tsx      ← Card hiển thị tin BĐS (ảnh, giá, vị trí)
│   │   ├── ImageGallery.tsx      ← Bộ sưu tập ảnh BĐS (swipe, fullscreen)
│   │   └── ReviewCard.tsx        ← Card đánh giá (sao, comment, ảnh, reply)
│   ├── map/
│   │   └── PropertyMarker.tsx    ← Marker BĐS trên bản đồ
│   └── ui/
│       ├── Button.tsx            ← Nút bấm chuẩn hóa
│       ├── Input.tsx             ← Ô nhập liệu chuẩn hóa
│       └── Skeleton.tsx          ← Loading skeleton animation
│
├── types/
│   └── index.ts                  ← Tất cả TypeScript interfaces (17 types)
│
├── constants/
│   └── index.ts                  ← Hằng số: API URL, endpoints, config
│
├── app.json                      ← Cấu hình Expo (permissions, plugins)
├── package.json                  ← Dependencies và scripts
├── tsconfig.json                 ← Cấu hình TypeScript
└── tailwind.config.js            ← Cấu hình NativeWind/Tailwind
```

---

## 5. HỆ THỐNG TYPES

File `types/index.ts` định nghĩa **17 TypeScript interfaces** cho toàn bộ ứng dụng:

### 5.1. Các type chính

| Interface | Mô tả | Các trường quan trọng |
|-----------|--------|----------------------|
| `Room` | Tin BĐS | `id`, `title`, `price`, `area`, `images[]`, `location{lat,lng}`, `landlord`, `status`, `amenities[]` |
| `User` | Người dùng | `id`, `email`, `fullName`, `role` (ADMIN/LANDLORD/TENANT), `walletBalance`, `kycStatus` |
| `ChatMessage` | Tin nhắn | `senderId`, `receiverId`, `content`, `type` (TEXT/IMAGE/VOICE/LOCATION), `metadata` |
| `Conversation` | Cuộc hội thoại | `partnerId`, `partnerName`, `lastMessage`, `unreadCount`, `isOnline` |
| `Review` | Đánh giá | `rating` (1-5), `comment`, `reviewImages[]`, `landlordReply`, `userName` |
| `Appointment` | Lịch hẹn | `roomId`, `tenantId`, `landlordId`, `scheduledAt`, `suggestedMeetTime`, `status` |
| `Contract` | Hợp đồng | `startDate`, `endDate`, `monthlyRent`, `deposit`, `electricityPrice`, `waterPrice`, `status` |
| `Transaction` | Giao dịch | `type` (DEPOSIT/POST_FEE/MEMBERSHIP/BOOST), `amount`, `status`, `referenceCode` |
| `Notification` | Thông báo | `type` (9 loại), `data{roomId, appointmentId, contractId...}`, `isRead` |
| `ServicePackage` | Gói dịch vụ | `type` (MEMBERSHIP/ROOM_PROMOTION), `price`, `durationDays`, `features[]` |
| `KYCSubmitData` | Dữ liệu KYC | `citizenId`, `fullName`, `dateOfBirth`, `frontImageBase64`, `backImageBase64` |

### 5.2. Giải thích TypeScript

```typescript
// Interface = bản thiết kế cho dữ liệu
export interface Room {
    id: number;          // Kiểu số nguyên
    title: string;       // Kiểu chuỗi
    images: string[];    // Mảng chuỗi (danh sách URL ảnh)
    price: number;       // Giá thuê
    location: {          // Object lồng nhau
        latitude: number;
        longitude: number;
    };
    amenities?: string[]; // Dấu ? = không bắt buộc (optional)
    status: 'PENDING' | 'ACTIVE' | 'FULL'; // Union type = chỉ nhận 1 trong các giá trị này
}
```

---

## 6. API CLIENT

File `services/api/client.ts` — Cấu hình kết nối Backend:

### 6.1. Axios Instance
```typescript
const apiClient = axios.create({
    baseURL: API_BASE_URL,  // Spring Boot server URL
    timeout: 30000,          // Timeout 30 giây
    headers: { 'Content-Type': 'application/json' },
});
```

### 6.2. Request Interceptor — Tự động đính JWT Token
Mỗi lần gọi API, interceptor **tự động** lấy JWT token từ AsyncStorage và gắn vào header:

```
User gửi request → Interceptor đọc token từ bộ nhớ → Gắn "Authorization: Bearer {token}" → Gửi lên server
```

### 6.3. Response Interceptor — Xử lý lỗi
- **401 Unauthorized:** Token hết hạn → xóa token, yêu cầu đăng nhập lại
- **Network Error:** Mất kết nối → hiển thị thông báo lỗi mạng
- **Lỗi khác:** Trích xuất message lỗi từ backend → hiển thị cho người dùng

---

## 7. HỆ THỐNG STORE (ZUSTAND)

### 7.1. Bảng tổng hợp 11 Stores

| Store | File | State chính | Actions |
|-------|------|-------------|---------|
| **authStore** | `authStore.ts` | `user`, `token`, `isAuthenticated` | `login()`, `register()`, `logout()`, `checkAuth()` |
| **propertyStore** | `propertyStore.ts` | `rooms[]`, `selectedRoom`, `filters` | `fetchRooms()`, `searchRooms()`, `toggleFavorite()` |
| **chatStore** | `chatStore.ts` | `conversations[]`, `messages{}`, `wsConnection` | `connectWebSocket()`, `sendMessage()`, `fetchMessages()` |
| **userStore** | `userStore.ts` | `profile`, `myRooms[]`, `favorites[]` | `fetchProfile()`, `updateProfile()`, `uploadAvatar()` |
| **reviewStore** | `reviewStore.ts` | `reviewsByRoom{}`, `isSubmitting` | `fetchReviews()`, `addReview()`, `replyReview()` |
| **appointmentStore** | `appointmentStore.ts` | `appointments[]`, `selectedAppointment` | `createAppointment()`, `confirmAppointment()`, `cancelAppointment()` |
| **contractStore** | `contractStore.ts` | `contracts[]`, `selectedContract` | `fetchContracts()`, `fetchContractDetail()` |
| **walletStore** | `walletStore.ts` | `balance`, `transactions[]` | `fetchBalance()`, `createPayment()`, `fetchTransactions()` |
| **kycStore** | `kycStore.ts` | `kycStatus`, `statusData` | `fetchKYCStatus()`, `submitKYC()` |
| **packageStore** | `packageStore.ts` | `packages[]` | `fetchPackages()`, `purchaseMembership()`, `boostRoom()` |
| **notificationStore** | `notificationStore.ts` | `notifications[]`, `unreadCount` | `fetchNotifications()`, `markAsRead()`, `markAllAsRead()` |

### 7.2. Giải thích luồng hoạt động (ví dụ Login)

```
1. User nhập email+password → nhấn "Đăng nhập"
2. LoginScreen gọi: authStore.login({email, password})
3. authStore.login():
   a. set({ isLoading: true })        → UI hiển thị loading spinner
   b. authService.login(credentials)   → Gọi POST /api/auth/login
   c. Backend trả về: { token: "jwt...", user: {...} }
   d. AsyncStorage.setItem('auth_token', token)  → Lưu token
   e. set({ user, token, isAuthenticated: true })  → Cập nhật state
4. React detect state thay đổi → Re-render UI → Chuyển về Home
```

---

## 8. HỆ THỐNG API SERVICE

### 8.1. Bảng tổng hợp 12 API Services

| Service | File | Endpoints chính |
|---------|------|----------------|
| `client.ts` | Cấu hình Axios | JWT interceptor, error handler |
| `auth.ts` | Xác thực | `POST /auth/login`, `POST /auth/register`, `POST /auth/logout` |
| `rooms.ts` | Phòng | `GET /rooms`, `GET /rooms/search`, `POST /rooms`, `GET /rooms/{id}` |
| `chat.ts` | Chat | `GET /chat/conversations`, `GET /chat/history/{id}`, `POST /chat/send` |
| `reviews.ts` | Đánh giá | `GET /reviews/room/{id}`, `POST /reviews`, `POST /reviews/{id}/reply` |
| `appointments.ts` | Lịch hẹn | `POST /appointments`, `PATCH confirm/cancel/reschedule` |
| `contracts.ts` | Hợp đồng | `GET /contracts`, `GET /contracts/{id}`, `GET /contracts/{id}/pdf` |
| `wallet.ts` | Ví | `GET /wallet/balance`, `POST /wallet/vnpay/create`, `GET /wallet/transactions` |
| `kyc.ts` | KYC | `GET /kyc/status`, `POST /kyc/submit` |
| `packages.ts` | Gói dịch vụ | `GET /service-packages`, `POST /service-packages/{id}/purchase` |
| `notifications.ts` | Thông báo | `GET/PUT /notifications`, `GET /notifications/unread-count` |
| `user.ts` | User | `GET/PUT /users/profile` |

---

## 9. HỆ THỐNG ROUTING

### 9.1. File-based Routing (Expo Router)

Expo Router tự động tạo route từ cấu trúc file:

| File path | URL route | Giải thích |
|-----------|-----------|------------|
| `app/(tabs)/index.tsx` | `/` | Trang chủ (Feed) |
| `app/(tabs)/map.tsx` | `/map` | Bản đồ |
| `app/(tabs)/post.tsx` | `/post` | Đăng tin |
| `app/(auth)/login.tsx` | `/(auth)/login` | Đăng nhập |
| `app/property/[id].tsx` | `/property/123` | Chi tiết phòng (id=123) |
| `app/chat/[id].tsx` | `/chat/45` | Chat với partner (id=45) |
| `app/kyc/upload-front.tsx` | `/kyc/upload-front` | Upload CCCD mặt trước |
| `app/wallet/vnpay.tsx` | `/wallet/vnpay` | Thanh toán VNPay |
| `app/appointments/[id].tsx` | `/appointments/7` | Chi tiết lịch hẹn |
| `app/packages/boost/[roomId].tsx` | `/packages/boost/99` | Boost tin số 99 |

### 9.2. Cú pháp `[id]` — Dynamic Route

```typescript
// File: app/property/[id].tsx
// URL: /property/123 → id = "123"
const { id } = useLocalSearchParams();  // Lấy id từ URL
```

### 9.3. Auth Guard

`_layout.tsx` chứa component `AuthGuard` kiểm tra quyền truy cập:

```
User truy cập tab "Post" hoặc "Chat" hoặc "Profile"
  → AuthGuard kiểm tra: isAuthenticated === false?
    → Có: Redirect đến màn hình Login
    → Không: Cho phép truy cập bình thường
```

---

## 10. CHI TIẾT TỪNG MÀN HÌNH

### 10.1. Feed (`(tabs)/index.tsx`)
- Hiển thị danh sách BĐS dạng `FlatList` (cuộn vô hạn)
- Hỗ trợ pull-to-refresh (kéo xuống để tải lại)
- Thanh tìm kiếm ở đầu trang
- Mỗi item là `PropertyCard` component

### 10.2. Map (`(tabs)/map.tsx`)
- Google Maps fullscreen với markers BĐS
- Nút "Vị trí của tôi" (lấy GPS)
- Tìm kiếm phòng gần vị trí (PostGIS `ST_DWithin`)

### 10.3. Post (`(tabs)/post.tsx`)
- **KYC Guard:** Kiểm tra `kycStatus` từ `kycStore` — chỉ cho đăng khi VERIFIED
- **3 bước:** Cơ bản → Chi tiết → Ảnh/Video
- AI generate mô tả (giả lập)
- Upload ảnh (max 10) + video (max 120s)

### 10.4. Chat (`(tabs)/chat.tsx` + `chat/[id].tsx`)
- Danh sách conversations với unreadCount badge
- Chat 1-1 real-time qua **WebSocket**
- Hỗ trợ tin nhắn: TEXT, IMAGE, VOICE, LOCATION, PROPERTY

### 10.5. Profile (`(tabs)/profile.tsx`)
- Hiển thị avatar, thông tin, role badge
- Menu navigation: KYC, Ví, Lịch hẹn, Hợp đồng, Gói dịch vụ
- Quản lý tin đã đăng (`myRooms[]`)
- Danh sách yêu thích (`favorites[]`)

### 10.6. Property Detail (`property/[id].tsx`)
- **Image Gallery:** Swipe ảnh, fullscreen
- **Map tĩnh:** Vị trí phòng trên bản đồ
- **Section đánh giá:** Biểu đồ sao, danh sách reviews, upload ảnh review
- **Modal đặt lịch:** Chọn ngày/giờ xem phòng
- **Nút liên hệ:** Gọi điện, nhắn tin, chia sẻ

### 10.7. KYC (5 màn hình)
```
Intro → Upload mặt trước → Upload mặt sau → Nhập thông tin → Chờ duyệt
```
- Ảnh CCCD lưu tạm bằng AsyncStorage (base64)
- Submit gửi toàn bộ lên API `/kyc/submit`
- Trạng thái: UNVERIFIED → PENDING → VERIFIED / REJECTED

### 10.8. Wallet (6 màn hình)
```
Tổng quan (số dư + giao dịch gần đây)
  → Nạp tiền (chọn mệnh giá / nhập tay)
    → VNPay WebView (thanh toán)
      → Thành công / Thất bại
Lịch sử (filter: Tất cả / Nạp tiền / Chi tiêu)
```

### 10.9. Notifications (`notifications.tsx`)
- **SectionList** nhóm theo ngày: "Hôm nay", "Hôm qua", ngày cụ thể
- 9 loại thông báo với icon khác nhau
- Điều hướng thông minh khi nhấn (dựa trên `data.appointmentId`, `contractId`, v.v.)
- Nút "Đọc tất cả"

---

## 11. HỆ THỐNG COMPONENTS

### 11.1. PropertyCard (`components/property/PropertyCard.tsx`)
- Card hiển thị tin BĐS trong Feed
- Bao gồm: ảnh (swipe), giá, diện tích, địa chỉ, nút yêu thích
- Sử dụng `expo-image` cho loading tối ưu

### 11.2. ImageGallery (`components/property/ImageGallery.tsx`)
- Bộ sưu tập ảnh BĐS trong trang chi tiết
- Hỗ trợ swipe ngang, indicator dots
- Nhấn để xem fullscreen

### 11.3. ReviewCard (`components/property/ReviewCard.tsx`)
- Card đánh giá: avatar, tên, ngày, sao, comment
- Hiển thị `reviewImages[]` dạng horizontal scroll, nhấn xem fullscreen
- Nút phản hồi cho landlord (đóng/mở input)
- `onReply(reviewId, replyText)` truyền nội dung phản hồi

### 11.4. UI Components (`components/ui/`)
- `Button.tsx` — Nút bấm chuẩn hóa (primary, secondary, outline)
- `Input.tsx` — Ô nhập liệu với label và error state
- `Skeleton.tsx` — Loading skeleton animation (hiệu ứng sáng chạy)

---

## 12. PUSH NOTIFICATIONS

File `services/pushNotificationService.ts` — 329 dòng, quản lý toàn bộ push notification:

### 12.1. Các chức năng chính

| Hàm | Mô tả |
|-----|-------|
| `registerForPushNotifications()` | Xin quyền thông báo + lấy Expo Push Token |
| `savePushTokenToServer()` | Gửi token lên backend để server có thể gửi push |
| `setupNotificationHandlers()` | Listener foreground (app đang mở) + response (user nhấn notification) |
| `handleNotificationNavigation()` | Điều hướng đến màn hình phù hợp khi nhấn notification |
| `handleInitialNotification()` | Xử lý khi app được mở từ killed state bằng notification |
| `scheduleAppointmentReminder()` | Đặt local notification nhắc lịch hẹn trước 1 giờ |

### 12.2. Luồng Push Notification

```
1. App khởi động → registerForPushNotifications()
2. Xin quyền từ user → OK
3. Lấy Expo Push Token → "ExponentPushToken[xxx]"
4. Gửi token lên Backend: POST /notifications/push-token
5. Backend lưu token vào DB

--- Khi có sự kiện ---

6. Backend gửi push qua Expo Push Service
7. App nhận notification:
   - Foreground: hiện alert + cập nhật badge
   - Background/Killed: hiện native notification
8. User nhấn notification → handleNotificationNavigation()
   → Route đến /appointments/{id}, /contracts/{id}, /wallet/history...
```

---

## 13. BẢO MẬT VÀ XÁC THỰC

### 13.1. JWT Authentication Flow

```
1. User login → Backend trả JWT token
2. Token lưu vào AsyncStorage (encrypted storage trên thiết bị)
3. Mỗi API call → Axios interceptor tự động gắn "Authorization: Bearer {token}"
4. Token hết hạn → Backend trả 401 → Interceptor xóa token → Redirect login
```

### 13.2. Auth Guard
- `_layout.tsx` có component `AuthGuard` bảo vệ các tab: Post, Chat, Profile
- User chưa đăng nhập → tự động redirect về Login

### 13.3. KYC Guard
- `post.tsx` kiểm tra `kycStatus` trước khi cho đăng tin
- Chỉ user có `kycStatus === 'VERIFIED'` mới được đăng tin
- PENDING → hiện thông báo "đang chờ duyệt"
- UNVERIFIED/REJECTED → redirect đến `/kyc` để xác minh

---

## 14. XỬ LÝ NGOẠI LỆ

### 14.1. Tầng API Client
- Network Error → thông báo "Không thể kết nối server"
- 401 → xóa token, yêu cầu đăng nhập lại
- Lỗi khác → trích xuất message backend

### 14.2. Tầng Store
Tất cả 11 stores đều re-throw errors, cho phép UI hiển thị thông báo lỗi:

```typescript
// Pattern chung trong store:
try {
    const result = await apiService.doSomething();
    set({ data: result });
} catch (error) {
    set({ error: error.message });
    throw error;  // ← Re-throw để UI catch được
}

// Pattern chung trong screen:
try {
    await store.doSomething();
    Alert.alert('Thành công', '...');
} catch (e) {
    Alert.alert('Lỗi', e.message);  // ← Hiển thị lỗi cho user
}
```

---

## 15. CONSTANTS — HẰNG SỐ VÀ CẤU HÌNH

File `constants/index.ts` chứa toàn bộ configuration:

| Hằng số | Giá trị | Mô tả |
|---------|---------|-------|
| `API_BASE_URL` | `http://192.168.1.100:8080/api` | URL Backend Spring Boot |
| `WS_URL` | `ws://192.168.1.100:8080/ws` | URL WebSocket |
| `DEFAULT_PAGE_SIZE` | 10 | Số items mỗi trang |
| `DEFAULT_SEARCH_RADIUS` | 20000 (20km) | Bán kính tìm kiếm mặc định |
| `DEFAULT_MAP_REGION` | HCM City | Vị trí mặc định bản đồ |
| `STORAGE_KEYS` | 8 keys | Tên key lưu AsyncStorage |
| `API_ENDPOINTS` | 30+ endpoints | Tập trung quản lý tất cả API paths |

---

## PHỤ LỤC: BẢNG TÓM TẮT SỐ LIỆU

| Hạng mục | Số lượng |
|----------|----------|
| Tổng số file source code | ~60 files |
| Màn hình (screens) | 30 màn hình |
| Zustand Stores | 11 stores |
| API Services | 12 services |
| TypeScript Interfaces | 17 types |
| API Endpoints | 30+ endpoints |
| Push Notification types | 9 loại |
| Thư viện dependencies | 31 packages |
| Ngôn ngữ | TypeScript (TSX) |

---

*Tài liệu này được tạo tự động từ phân tích mã nguồn project ngày 25/03/2026.*
