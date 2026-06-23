# 🏠 HomeSwipe Mobile

Ứng dụng mobile hỗ trợ tìm kiếm, xem, lưu và tương tác với bất động sản (BĐS).  
Kết nối backend **HomeVerse / HomeSwipe** qua API production.  
Được xây dựng bằng **React Native + Expo** (SDK 54), sử dụng **Expo Router** (file-based routing).

---

## Mục lục

1. [Công nghệ sử dụng](#1-công-nghệ-sử-dụng)
2. [Chức năng chính](#2-chức-năng-chính)
3. [Cấu trúc thư mục](#3-cấu-trúc-thư-mục)
4. [Cấu hình môi trường](#4-cấu-hình-môi-trường)
5. [Cài đặt và chạy dev](#5-cài-đặt-và-chạy-dev)
6. [Build APK Android](#6-build-apk-android)
7. [Cài APK test trên Android](#7-cài-apk-test-trên-android)
8. [Checklist test nhanh](#8-checklist-test-nhanh)
9. [Lưu ý demo](#9-lưu-ý-demo)
10. [Bảo mật](#10-bảo-mật)
11. [Thông tin build hiện tại](#11-thông-tin-build-hiện-tại)

---

## 1. Công nghệ sử dụng

| Nhóm | Thư viện / Công nghệ |
|------|----------------------|
| Framework | React Native `0.81.5`, Expo `54` (New Architecture) |
| Routing | Expo Router `6` (file-based, typed routes) |
| Ngôn ngữ | TypeScript `5.9` |
| State management | Zustand `5` |
| HTTP client | Axios `1.13` |
| Local storage | `@react-native-async-storage/async-storage` |
| WebSocket | `@stomp/stompjs`, `sockjs-client` (chat + notification + AI) |
| Video | `expo-video` (Reels BĐS) |
| Bản đồ | `react-native-maps`, Leaflet/OpenStreetMap (WebView) |
| Hình ảnh | `expo-image`, `expo-image-picker`, `expo-image-manipulator` |
| Camera | `expo-camera` |
| Push notifications | `expo-notifications`, `expo-device` |
| Location | `expo-location` |
| Animation | `react-native-reanimated`, `lottie-react-native` |
| UI | `expo-blur`, `expo-linear-gradient`, `expo-haptics`, `@expo/vector-icons` |
| Auth | JWT (`jwt-decode`), refresh token tự động qua interceptor |
| Thanh toán | VNPay (WebView), ví điện tử nội bộ |
| Upload media | Cloudinary (unsigned upload preset từ mobile) |
| WebView | `react-native-webview` (bản đồ Leaflet, VNPay) |
| Places autocomplete | `react-native-google-places-autocomplete` |
| Styling | NativeWind / TailwindCSS `3.3` + StyleSheet |
| Gesture | `react-native-gesture-handler` |

---

## 2. Chức năng chính

### 🔐 Xác thực người dùng
- Đăng nhập bằng email / mật khẩu
- Đăng nhập bằng Google (JWT)
- Đăng ký tài khoản
- Quên mật khẩu / đặt lại mật khẩu
- Đổi mật khẩu, đổi email
- Tự động refresh token khi hết hạn (interceptor)
- Logout + xóa push token

### 🏠 Trang chủ (HomeSwipe Feed)
- Feed dạng full-screen (TikTok-style), vuốt dọc để xem từng BĐS
- Phân loại: Tất cả, Cho thuê, Bán, Căn hộ, Nhà phố, Đất nền
- Lọc nâng cao: loại BĐS, khoảng giá, diện tích, số phòng ngủ, sắp xếp
- Pull-to-refresh, infinite scroll (phân trang)
- Hiển thị dự án BĐS nổi bật

### 🔍 Tìm kiếm & Lọc
- Màn hình lọc riêng (`/filter`)
- Tìm kiếm từ khóa, lọc theo loại BĐS, giá, diện tích, phòng ngủ
- Kết quả tìm kiếm hiển thị trong feed

### 📋 Chi tiết bất động sản
- Gallery ảnh
- Thông tin giá, diện tích, phòng ngủ, phòng tắm, sức chứa
- Mô tả, chi tiết (nội thất, tiền điện/nước/internet, ban công)
- Danh sách tiện ích (amenities)
- Bản đồ vị trí (Leaflet/OpenStreetMap WebView, chỉ đường Google Maps/Waze)
- Tính khoảng cách từ vị trí người dùng
- Thông tin chủ nhà + liên hệ (gọi, chat)
- Đặt lịch xem phòng
- Like / Save / Chia sẻ
- Tab bình luận + Tab đánh giá chủ nhà
- Chủ nhà có thể xóa tin đăng

### 🎬 Reels BĐS
- Video ngắn dạng Reels (full-screen, vuốt dọc)
- Auto-play video, mute/unmute
- Like, Save, Share
- Hiển thị giá, diện tích, địa chỉ
- Bấm "Xem chi tiết" để chuyển sang trang chi tiết
- Badge: Cho thuê / Bán, Nổi bật (promoted)

### 🗺️ Bản đồ
- Xem BĐS trên bản đồ (`react-native-maps`)
- Truy cập từ header trang chủ

### 💬 Chat
- Chat real-time giữa người dùng và chủ nhà (WebSocket STOMP/SockJS)
- Danh sách cuộc hội thoại, badge tin nhắn chưa đọc
- Lịch sử tin nhắn theo partner

### 🤖 Chat AI
- Chat với AI hỗ trợ tìm kiếm BĐS (`app/chat/ai.tsx`)
- Kết nối WebSocket AI riêng (`ws-ai`)

### 💰 Ví điện tử
- Xem số dư ví
- Nạp tiền qua VNPay (WebView)
- Rút tiền
- Lịch sử giao dịch
- Hold / Release / Debit (nội bộ)

### 📦 Gói dịch vụ & Boost
- Mua gói thành viên (membership)
- Mua gói đẩy tin (promotion/boost) cho từng BĐS
- Thanh toán từ ví

### 📝 Đăng tin BĐS
- Tạo / chỉnh sửa tin đăng (tab Post + `property/edit`)
- Upload ảnh/video qua Cloudinary
- Quản lý tin đã đăng, thùng rác

### 📊 Phân tích thị trường
- Xu hướng giá BĐS theo thời gian
- Giá theo phường/khu vực
- Top khu vực nổi bật

### 🔔 Thông báo
- Push notification (FCM qua Expo)
- WebSocket real-time notification (STOMP)
- Badge chưa đọc, đánh dấu đã đọc / đọc tất cả

### 👤 Hồ sơ cá nhân
- Xem / chỉnh sửa profile, avatar, banner
- Cài đặt lifestyle preferences
- Xem hồ sơ chủ nhà (landlord profile) + trust score

### 🆔 KYC (Xác minh danh tính)
- Chụp / upload CCCD mặt trước + mặt sau
- OCR scan thông tin
- Gửi xác minh, trạng thái chờ duyệt

### 📅 Lịch hẹn & Hợp đồng
- Đặt lịch xem phòng
- Quản lý lịch hẹn
- Quản lý hợp đồng thuê/mua

### 🏗️ Dự án BĐS
- Danh sách dự án
- Chi tiết dự án

### 🔒 Bảo mật tài khoản
- Đổi mật khẩu (`settings/security`)

> **Lưu ý:** Các chức năng chat, ví, KYC, hợp đồng, gói dịch vụ phụ thuộc vào backend đang hoạt động. Nếu backend offline, các chức năng này sẽ báo lỗi kết nối.

---

## 3. Cấu trúc thư mục

```
real-estate-mobile/
├── app/                        # Màn hình (Expo Router file-based routing)
│   ├── (auth)/                 #   Onboarding, Login, Register
│   ├── (tabs)/                 #   Tab bar: Home, Reels, Post, Chat, Profile
│   │   ├── index.tsx           #     Trang chủ (HomeSwipe feed)
│   │   ├── reels.tsx           #     Reels video BĐS
│   │   ├── post.tsx            #     Đăng tin BĐS
│   │   ├── chat.tsx            #     Danh sách chat
│   │   ├── profile.tsx         #     Hồ sơ cá nhân
│   │   └── map.tsx             #     Bản đồ BĐS
│   ├── property/               #   Chi tiết BĐS, chỉnh sửa, thùng rác
│   ├── chat/                   #   Chat [id], Chat AI
│   ├── wallet/                 #   Ví: nạp, rút, lịch sử, VNPay
│   ├── analytics/              #   Phân tích thị trường
│   ├── kyc/                    #   Xác minh danh tính
│   ├── packages/               #   Gói dịch vụ, boost tin
│   ├── appointments/           #   Lịch hẹn xem phòng
│   ├── contracts/              #   Hợp đồng
│   ├── bills/                  #   Hóa đơn
│   ├── projects/               #   Dự án BĐS
│   ├── profile/                #   Lifestyle preferences
│   ├── settings/               #   Bảo mật
│   ├── filter.tsx              #   Màn hình lọc/tìm kiếm
│   ├── notifications.tsx       #   Thông báo
│   └── landlord-profile.tsx    #   Hồ sơ chủ nhà
├── components/                 # Components tái sử dụng
│   ├── auth/                   #   Login, Register forms
│   ├── property/               #   PropertyCard, ImageGallery, ReviewCard
│   ├── map/                    #   Map components
│   ├── ui/                     #   Toast, Skeleton, common UI
│   └── startup/                #   AppStartupScreen (splash)
├── services/api/               # API services (gọi backend)
│   ├── client.ts               #   Axios instance + interceptors (JWT, refresh)
│   ├── environment.ts          #   Auto-detect production/fallback server
│   ├── auth.ts                 #   Login, register, logout, refresh
│   ├── rooms.ts                #   CRUD bất động sản
│   ├── reels.ts                #   Reels BĐS
│   ├── chat.ts                 #   Chat API
│   ├── wallet.ts               #   Ví điện tử
│   ├── kyc.ts                  #   KYC
│   ├── media.ts                #   Upload media (Cloudinary)
│   ├── notifications.ts        #   Notification API
│   ├── search.ts               #   Tìm kiếm
│   ├── analytics.ts            #   Phân tích thị trường
│   ├── interaction.ts          #   Like, Save, View
│   ├── reviews.ts              #   Đánh giá chủ nhà
│   ├── comments.ts             #   Bình luận BĐS
│   ├── appointments.ts         #   Lịch hẹn
│   ├── contracts.ts            #   Hợp đồng
│   ├── packages.ts             #   Gói dịch vụ
│   ├── projects.ts             #   Dự án BĐS
│   └── ...
├── store/                      # Zustand stores (state management)
│   ├── authStore.ts            #   Auth state
│   ├── propertyStore.ts        #   Property/room state
│   ├── chatStore.ts            #   Chat + WebSocket
│   ├── walletStore.ts          #   Ví điện tử
│   ├── reelsStore.ts           #   Reels state
│   ├── notificationStore.ts    #   Notification + WS
│   ├── aiChatStore.ts          #   AI chat state
│   ├── analyticsStore.ts       #   Phân tích thị trường
│   ├── interactionStore.ts     #   Like/Save state
│   ├── kycStore.ts             #   KYC state
│   └── ...
├── types/                      # TypeScript types/interfaces
│   └── index.ts
├── constants/                  # Hằng số, API endpoints, env config
│   └── index.ts
├── hooks/                      # Custom hooks
│   ├── useSafeRouter.ts        #   Chống double-tap navigation
│   └── useResponsive.ts        #   Responsive layout
├── utils/                      # Utility functions
├── assets/                     # Icon, splash, images
├── android/                    # Android native project (bare workflow)
└── ...
```

---

## 4. Cấu hình môi trường

Tạo file `.env` ở thư mục gốc (copy từ `.env.example`):

```env
# Backend API Gateway
EXPO_PUBLIC_API_BASE_URL=
EXPO_PUBLIC_API_FALLBACK_BASE_URL=
EXPO_PUBLIC_ENABLE_API_FALLBACK=

# Property Service
EXPO_PUBLIC_PROPERTY_API_BASE_URL=

# Payment Service
EXPO_PUBLIC_PAYMENT_API_BASE_URL=

# WebSocket Notification
EXPO_PUBLIC_WS_URL=

# WebSocket Chat
EXPO_PUBLIC_WS_CHAT_URL=

# WebSocket AI Chat
EXPO_PUBLIC_WS_AI_URL=

# Google Maps API Key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=

# Cloudinary (unsigned upload)
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=

# App Info
EXPO_PUBLIC_APP_NAME=HomeSwipe
EXPO_PUBLIC_APP_VERSION=1.0.0
```

> **Quan trọng:**
> - **Không commit** file `.env` lên git.
> - **Không commit** file `*.jks`, `*.keystore`.
> - **Không đưa** API secret, password, token vào source mobile.
> - Cloudinary trên mobile **phải dùng unsigned upload preset**, không dùng API secret.
> - Nếu không cấu hình `.env`, app sẽ mặc định kết nối tới server production (`https://homeverse-bds.duckdns.org`).

---

## 5. Cài đặt và chạy dev

### Yêu cầu

- Node.js >= 18
- npm hoặc yarn
- Expo CLI: `npm install -g expo-cli` (nếu chưa có)
- Android Studio + emulator hoặc thiết bị Android thật
- JDK 17 (cho build native Android)

### Cài đặt

```powershell
cd G:\vs10\real-estate-mobile
npm install
```

### Chạy dev (Expo Go)

```powershell
npx expo start -c
```

> **Lưu ý:** Khi chạy bằng Expo Go, icon app ngoài launcher sẽ là icon Expo Go, không phải icon HomeSwipe.

### Chạy dev (Dev Client — khuyên dùng)

```powershell
npx expo start -c --dev-client
```

### TypeScript check

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
```

### Xem config Expo đang dùng

```powershell
npx expo config --type public
```

---

## 6. Build APK Android

### Build local với Gradle (nhanh, không cần EAS)

```powershell
cd G:\vs10\real-estate-mobile\android
.\gradlew assembleRelease
```

APK release nằm tại:

```
android/app/build/outputs/apk/release/app-release.apk
```

Mở thư mục APK:

```powershell
explorer G:\vs10\real-estate-mobile\android\app\build\outputs\apk\release
```

### Build AAB cho Google Play

```powershell
cd G:\vs10\real-estate-mobile\android
.\gradlew bundleRelease
```

### Build bằng EAS (Expo Application Services)

```powershell
# Development (APK, internal)
eas build --platform android --profile development

# Preview (APK, internal)
eas build --platform android --profile preview

# Production (AAB, auto-increment version)
eas build --platform android --profile production --clear-cache
```

> **`--clear-cache`** bắt buộc khi đã thay đổi icon hoặc assets để đảm bảo EAS không dùng cache cũ.

---

## 7. Cài APK test trên Android

### Cài bằng ADB

```powershell
adb install android/app/build/outputs/apk/release/app-release.apk
```

### Nếu cần gỡ bản cũ trước

```powershell
adb uninstall com.smartrental.homeswipe
adb install android/app/build/outputs/apk/release/app-release.apk
```

### Cài trực tiếp trên điện thoại

1. Copy file `app-release.apk` sang điện thoại.
2. Mở file APK → cho phép cài từ nguồn không xác định nếu được hỏi.
3. Cài đặt xong → mở app HomeSwipe.

---

## 8. Checklist test nhanh

Kiểm tra trước khi gửi APK:

```
[ ] Cài APK thành công
[ ] Icon app hiển thị đúng trên launcher
[ ] Mở app → hiện splash → vào Onboarding hoặc Home
[ ] Đăng nhập thành công
[ ] Xem danh sách BĐS (vuốt dọc)
[ ] Xem chi tiết BĐS
[ ] Like / Save BĐS
[ ] Tìm kiếm / lọc BĐS
[ ] Mở Reels (vuốt dọc, video tự chạy)
[ ] Mở tab Chat
[ ] Mở tab Profile
[ ] Mở Bản đồ từ header
[ ] Mở Phân tích thị trường từ header
[ ] Mở Ví điện tử từ Profile
[ ] Back từ Ví về Profile đúng
[ ] Mở Thông báo
[ ] Đặt lịch xem phòng từ chi tiết BĐS
[ ] Đăng tin BĐS (tab Post)
[ ] Không bị double-tap navigation
[ ] Không crash khi mất mạng (hiện thông báo lỗi)
```

---

## 9. Lưu ý demo

- **Nên demo các luồng ổn định:** Trang chủ → Chi tiết → Like/Save → Reels → Chat → Profile.
- **Các chức năng phụ thuộc backend:** Chat, Ví, KYC, Hợp đồng, Gói dịch vụ, Thông báo push — cần kiểm tra backend đang hoạt động trước khi demo.
- **Nếu cài APK bị chặn:** Vào Cài đặt → Bảo mật → Cho phép cài app từ nguồn không xác định.
- **Nếu icon chưa đổi sau cài đặt:** Gỡ app cũ → Cài lại APK mới → Restart launcher hoặc restart điện thoại.
- **Expo Go không hiển thị icon app riêng** — chỉ bản build native (APK/AAB) mới có icon HomeSwipe.
- **Fallback server:** App tự động detect server production. Nếu production offline và có cấu hình `EXPO_PUBLIC_ENABLE_API_FALLBACK=true` + `EXPO_PUBLIC_API_FALLBACK_BASE_URL`, app sẽ chuyển sang server backup.

---

## 10. Bảo mật

| Quy tắc | Mô tả |
|---------|-------|
| ❌ Không commit `.env` | File chứa API URL, key riêng cho từng môi trường |
| ❌ Không commit `*.jks`, `*.keystore` | Keystore dùng để ký APK release |
| ❌ Không đưa API secret vào source | Cloudinary chỉ dùng unsigned upload preset |
| ❌ Không log token trong production | Tránh lộ JWT access token |
| ❌ Không hardcode password / secret | Dùng biến môi trường `.env` |
| ✅ `.gitignore` đã cấu hình | Loại trừ `.env`, `.env.*`, `*.jks`, `*.keystore` |

---

## 11. Thông tin build hiện tại

| Thông tin | Giá trị |
|-----------|---------|
| App name | **HomeSwipe** |
| Android package | `com.smartrental.homeswipe` |
| iOS bundle ID | `com.smartrental.homeswipe` |
| Version | `1.0.0` |
| Version code | `1` |
| Expo SDK | `54` |
| React Native | `0.81.5` |
| API production | `https://homeverse-bds.duckdns.org` |
| Deep link scheme | `homeswipe://` |
| EAS project ID | `02500ffe-d6bd-4cd1-9073-75858fa35112` |
| EAS owner | `hoangthanhhong` |

---

## Tab bar chính

| Vị trí | Tab | Mô tả |
|--------|-----|-------|
| 1 | 🏠 Trang chủ | Feed BĐS full-screen |
| 2 | 🎬 Reels | Video ngắn BĐS |
| 3 | ➕ Post | Đăng tin BĐS (FAB) |
| 4 | 💬 Chat | Danh sách hội thoại |
| 5 | 👤 Tôi | Hồ sơ cá nhân |

> Bản đồ (`map`) ẩn khỏi tab bar, truy cập từ nút bản đồ trên header trang chủ.

---

*README được tạo tự động dựa trên source code thực tế. Không chứa secret, password, token, hoặc API key.*
