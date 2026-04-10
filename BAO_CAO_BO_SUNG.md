# BÁO CÁO BỔ SUNG CHI TIẾT — GIẢI THÍCH TỪ CĂN BẢN
# Dành cho người mới học React Native

> Tài liệu này giải thích **từng khái niệm từ đầu**, từ React Native là gì, đến cách đọc hiểu từng dòng code trong project.
> Đọc file này TRƯỚC, sau đó mới đọc `BAO_CAO_DO_AN.md` để hiểu tổng quan.

---

## PHẦN A: KIẾN THỨC NỀN TẢNG

### A1. React Native là gì?

**Vấn đề:** Muốn làm ứng dụng điện thoại, bạn phải viết:
- **Android:** Java/Kotlin
- **iOS:** Swift/Objective-C

→ Viết 2 lần, 2 ngôn ngữ, 2 codebase → **tốn gấp đôi công sức**.

**Giải pháp:** React Native cho phép bạn viết **1 lần bằng JavaScript/TypeScript**, rồi nó **biên dịch ra cả Android lẫn iOS**.

```
Bạn viết: <Text>Xin chào</Text>   (React Native)
    ↓
Android: android.widget.TextView("Xin chào")   (tự động)
iOS:     UILabel("Xin chào")                     (tự động)
```

**Khác với Web:** Trong web bạn dùng `<div>`, `<span>`, `<p>`. Trong React Native bạn dùng:

| Web (HTML) | React Native | Giải thích |
|------------|-------------|------------|
| `<div>` | `<View>` | Khung chứa, giống cái hộp |
| `<p>`, `<span>` | `<Text>` | Hiển thị chữ |
| `<img>` | `<Image>` | Hiển thị ảnh |
| `<input>` | `<TextInput>` | Ô nhập liệu |
| `<button>` | `<TouchableOpacity>` | Nút bấm (có hiệu ứng mờ khi nhấn) |
| `<ul>` + `<li>` | `<FlatList>` | Danh sách cuộn (tối ưu cho nhiều item) |
| `<a href>` | `router.push()` | Chuyển trang |

---

### A2. TypeScript là gì? Tại sao không dùng JavaScript thường?

JavaScript bình thường:
```javascript
let price = 5000000;     // OK
price = "năm triệu";     // Cũng OK → nhưng gây lỗi khi tính toán!
```

TypeScript bổ sung **kiểu dữ liệu** bắt buộc:
```typescript
let price: number = 5000000;     // OK
price = "năm triệu";             // ❌ LỖI NGAY khi viết code, chưa cần chạy thử!
```

**Lợi ích:** Phát hiện bug TRƯỚC khi chạy, IDE gợi ý thông minh hơn.

**Trong project này**, mọi file đều dùng `.ts` (TypeScript) hoặc `.tsx` (TypeScript + JSX).

---

### A3. JSX là gì?

JSX = viết **giao diện (HTML-like)** ngay bên trong file JavaScript/TypeScript.

```tsx
// KHÔNG CÓ JSX (khó đọc):
React.createElement('View', null,
    React.createElement('Text', null, 'Xin chào')
);

// CÓ JSX (dễ đọc, giống HTML):
<View>
    <Text>Xin chào</Text>
</View>
```

**File `.tsx`** = TypeScript + JSX. Đây là lý do project dùng đuôi `.tsx` cho screens và components.

---

### A4. Component là gì?

Component = **một "khối" giao diện có thể tái sử dụng**, giống LEGO.

```tsx
// 1. Tạo component (function trả về giao diện)
function WelcomeCard() {
    return (
        <View>
            <Text>Chào mừng!</Text>
        </View>
    );
}

// 2. Sử dụng component (gọi như HTML tag)
function App() {
    return (
        <View>
            <WelcomeCard />    {/* Dùng lần 1 */}
            <WelcomeCard />    {/* Dùng lần 2 — tái sử dụng! */}
        </View>
    );
}
```

**Trong project:**
- `PropertyCard` = component hiển thị 1 tin BĐS
- `ReviewCard` = component hiển thị 1 đánh giá
- `ImageGallery` = component hiển thị bộ ảnh

---

### A5. Props là gì?

Props = **dữ liệu truyền VÀO component** (giống tham số hàm).

```tsx
// Component nhận props
function HelloCard({ name, age }: { name: string; age: number }) {
    return (
        <Text>Xin chào {name}, bạn {age} tuổi!</Text>
    );
}

// Truyền props khi sử dụng
<HelloCard name="Minh" age={22} />
// Kết quả: "Xin chào Minh, bạn 22 tuổi!"

<HelloCard name="Lan" age={25} />
// Kết quả: "Xin chào Lan, bạn 25 tuổi!"
```

**Trong project, ví dụ `ReviewCard`:**
```tsx
<ReviewCard
    review={reviewData}       // Dữ liệu đánh giá 
    isMyReview={true}          // Có phải đánh giá của mình?
    onReply={(id, text) => {}} // Hàm xử lý khi nhấn "Phản hồi"
    onDelete={(id) => {}}      // Hàm xử lý khi nhấn "Xóa"
/>
```

---

### A6. State là gì? (Quan trọng nhất!)

**State = dữ liệu CÓ THỂ THAY ĐỔI** → Khi thay đổi → Giao diện TỰ ĐỘNG cập nhật.

```tsx
function Counter() {
    // useState tạo ra 1 biến đặc biệt:
    // count = giá trị hiện tại (ban đầu = 0)
    // setCount = hàm để thay đổi giá trị
    const [count, setCount] = useState(0);

    return (
        <View>
            <Text>Đã nhấn: {count} lần</Text>
            <TouchableOpacity onPress={() => setCount(count + 1)}>
                <Text>Nhấn tôi</Text>
            </TouchableOpacity>
        </View>
    );
}
```

**Khi nhấn nút:**
1. `setCount(count + 1)` → count thay đổi từ 0 → 1
2. React thấy state thay đổi → **tự động render lại** giao diện
3. Text hiển thị: "Đã nhấn: 1 lần"

**Nếu KHÔNG dùng state:**
```tsx
let count = 0;           // biến bình thường
count = count + 1;        // thay đổi rồi nhưng...
// → Giao diện KHÔNG CẬP NHẬT! Vẫn hiển thị 0!
```

**Trong project:**
```tsx
// login.tsx
const [email, setEmail] = useState('');        // Nội dung ô email
const [password, setPassword] = useState('');   // Nội dung ô password

// Khi user gõ → setEmail cập nhật → ô input hiển thị ký tự mới
<TextInput value={email} onChangeText={setEmail} />
```

---

### A7. Hooks — Các "móc nối" của React

Hooks là những hàm đặc biệt bắt đầu bằng `use`. Dưới đây là **TẤT CẢ hooks dùng trong project**:

#### `useState` — Tạo biến state
```tsx
const [value, setValue] = useState(initialValue);
// value: giá trị hiện tại
// setValue: hàm để thay đổi
// initialValue: giá trị ban đầu

// Ví dụ cụ thể trong project:
const [refreshing, setRefreshing] = useState(false);  // Đang kéo refresh?
const [activeId, setActiveId] = useState<number | null>(null);  // ID phòng đang xem
const [reviewRating, setReviewRating] = useState(5);  // Số sao đánh giá
```

#### `useEffect` — Chạy code tại thời điểm đặc biệt

```tsx
// Chạy 1 LẦN DUY NHẤT khi component vừa hiển thị lên màn hình
useEffect(() => {
    fetchRooms();    // Tải danh sách phòng từ server
}, []);              // [] = chỉ chạy lần đầu

// Chạy MỖI KHI isAuthenticated thay đổi
useEffect(() => {
    if (isAuthenticated) {
        connectWebSocket();  // Kết nối chat khi đăng nhập
    }
}, [isAuthenticated]);       // [isAuthenticated] = chạy lại khi biến này đổi
```

**Giải thích `[]` (dependency array):**
- `[]` rỗng → chạy 1 lần duy nhất khi hiển thị
- `[biến]` → chạy lại mỗi khi biến thay đổi
- Không có `[]` → chạy mỗi lần render (TRÁNH dùng)

#### `useRef` — Tham chiếu đến DOM element
```tsx
const flatListRef = useRef<FlatList>(null);
// Giống như đặt tên cho 1 thẻ HTML: <div id="myList">
// Sau đó có thể gọi: flatListRef.current.scrollToTop()
```

#### `useCallback` — Ghi nhớ hàm, tránh tạo lại
```tsx
const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRooms();
    setRefreshing(false);
}, []);
// Hàm này chỉ được TẠO 1 LẦN, không tạo lại mỗi khi render
// → Tối ưu hiệu suất
```

#### `useMemo` — Ghi nhớ kết quả tính toán
```tsx
const sections = useMemo(() => {
    // Nhóm notifications theo ngày — chỉ tính lại khi notifications thay đổi
    return groupByDay(notifications);
}, [notifications]);
```

#### `useRouter` — Điều hướng giữa các màn hình
```tsx
const router = useRouter();
router.push('/property/123');     // Chuyển đến trang chi tiết phòng 123
router.push('/(auth)/login');     // Chuyển đến trang đăng nhập
router.back();                    // Quay lại trang trước
router.replace('/(tabs)');        // Thay thế trang hiện tại (không quay lại được)
```

#### `useLocalSearchParams` — Lấy tham số từ URL
```tsx
// File: app/property/[id].tsx
// URL: /property/42
const { id } = useLocalSearchParams();  // id = "42"
```

---

### A8. async/await — Xử lý bất đồng bộ

Khi gọi API, phải **ĐỢI** server phản hồi. `async/await` giúp viết code "chờ đợi" dễ đọc:

```tsx
// KHÔNG CÓ async/await (khó đọc):
login(data).then(result => {
    saveToken(result.token).then(() => {
        navigateHome();
    });
}).catch(error => {
    showError(error);
});

// CÓ async/await (dễ đọc, như code bình thường):
const handleLogin = async () => {
    try {
        const result = await login(data);     // Chờ login xong
        await saveToken(result.token);         // Chờ lưu token xong
        navigateHome();                        // Chuyển về Home
    } catch (error) {
        showError(error);                      // Xử lý lỗi
    }
};
```

**Quy tắc:**
- `async` = đánh dấu hàm này CÓ chứa code chờ đợi
- `await` = DỪNG LẠI chờ cho hành động này xong mới tiếp tục
- `try/catch` = bọc code có thể gõi lỗi (mất mạng, server lỗi...)

---

### A9. Cú pháp đặc biệt trong project

#### Destructuring — Tách biến từ object
```tsx
// KHÔNG CÓ destructuring:
const store = useAuthStore();
const user = store.user;
const isLoading = store.isLoading;
const login = store.login;

// CÓ destructuring (gọn hơn):
const { user, isLoading, login } = useAuthStore();
// Lấy 3 thứ cùng lúc từ store!
```

#### Conditional Rendering — Hiển thị có điều kiện
```tsx
// Nếu isLoading === true → hiển thị loading spinner
// Nếu isLoading === false → không hiển thị gì
{isLoading && <ActivityIndicator />}

// Nếu error có giá trị → hiển thị lỗi
{error && <Text style={styles.errorText}>{error}</Text>}

// Nếu count > 9 → hiển thị "9+", ngược lại hiển thị count
{count > 9 ? '9+' : count}
```

#### Spread Operator — Sao chép và mở rộng
```tsx
const oldData = { name: 'Minh', age: 22 };

// Sao chép oldData + thêm/thay đổi trường
const newData = { ...oldData, age: 23 };
// Kết quả: { name: 'Minh', age: 23 }

// Trong project (store):
set({ ...state, isLoading: true });
// Sao chép toàn bộ state cũ, chỉ đổi isLoading
```

#### Optional Chaining — Truy cập an toàn
```tsx
// Bình thường: nếu review là null → LỖI!
const name = review.userName;

// Optional chaining: nếu review là null → trả về undefined (không lỗi)
const name = review?.userName;

// Trong project:
const phone = room?.landlord?.phone;
// Nếu room hoặc landlord là null → undefined, không crash app
```

#### Arrow Function — Hàm mũi tên
```tsx
// Hàm bình thường:
function add(a, b) { return a + b; }

// Arrow function (gọn hơn):
const add = (a, b) => a + b;

// Trong project, callback:
onPress={() => router.push('/login')}
// Khi nhấn nút → chạy hàm router.push('/login')
```

---

## PHẦN B: GIẢI THÍCH TỪNG FILE QUAN TRỌNG (DÒNG-THEO-DÒNG)

---

### B1. `app/_layout.tsx` — File QUAN TRỌNG NHẤT

Đây là file **chạy đầu tiên** khi mở app. Nó làm 6 việc:

```tsx
// Dòng 1-12: IMPORT — Nhập các thư viện cần dùng
import { Stack, useRouter, useSegments } from 'expo-router';
// Stack: component điều hướng dạng "chồng màn hình"
// useRouter: hook để chuyển trang
// useSegments: hook để biết user đang ở trang nào

import { useAuthStore } from '../store/authStore';
// Lấy store quản lý trạng thái đăng nhập

import { useChatStore } from '../store/chatStore';
// Lấy store quản lý chat (WebSocket)
```

```tsx
// Dòng 16-33: AUTH GUARD — Bảo vệ trang riêng tư
const PROTECTED_SEGMENTS = ['post', 'chat', 'profile'];
// Danh sách tab CẦN ĐĂNG NHẬP mới được vào

function AuthGuard() {
    const { isAuthenticated } = useAuthStore();  // Đã đăng nhập chưa?
    const segments = useSegments();               // User đang ở tab nào?

    useEffect(() => {
        const currentTab = segments[1];           // Ví dụ: 'post'
        // Nếu ở tab cần bảo vệ VÀ chưa đăng nhập:
        if (PROTECTED_SEGMENTS.includes(currentTab) && !isAuthenticated) {
            router.replace('/(auth)/login');       // → Đá về trang Login
        }
    }, [isAuthenticated, segments]);
    // Chạy lại mỗi khi trạng thái login hoặc trang thay đổi
}
```

```tsx
// Dòng 35-94: ROOT LAYOUT — Khởi tạo toàn bộ app
export default function RootLayout() {
    // BƯỚC 1: Kiểm tra token cũ (đã login trước đó chưa?)
    useEffect(() => {
        checkAuth();  // Đọc token từ AsyncStorage
    }, []);

    // BƯỚC 2: Khi đã đăng nhập, khởi tạo các dịch vụ
    useEffect(() => {
        if (!isAuthenticated) return;  // Chưa login → bỏ qua

        // 2a. Load cài đặt thông báo
        loadNotificationSettings();

        // 2b. Lấy số thông báo chưa đọc
        fetchUnreadCount();
        fetchNotifications(true);

        // 2c. Kết nối WebSocket cho chat real-time
        connectWebSocket();

        // 2d. Đăng ký push notification
        initPush();

        // 2e. Xử lý nếu app được mở từ notification
        handleInitialNotification(router);

        // 2f. Lắng nghe notification khi app đang mở
        const cleanup = setupNotificationHandlers(router, () => {
            fetchUnreadCount();  // Cập nhật badge khi có thông báo mới
        });

        return () => cleanup();  // Dọn dẹp khi component bị hủy
    }, [isAuthenticated]);
```

```tsx
    // BƯỚC 3: Cấu hình tất cả các màn hình
    return (
        <GestureHandlerRootView>
            <Stack>
                {/* 5 tab chính */}
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                {/* Màn hình auth */}
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                {/* Và 20+ màn hình khác... */}
            </Stack>
            <AuthGuard />  {/* Bảo vệ trang riêng tư */}
        </GestureHandlerRootView>
    );
}
```

**Tóm tắt `_layout.tsx` như "cửa chính" của app:**
```
Mở app
  → checkAuth() kiểm tra token cũ
  → Nếu đã login:
      → Kết nối WebSocket (chat)
      → Đăng ký Push Notification
      → Tải thông báo
  → Hiển thị Stack Navigator (điều hướng)
  → AuthGuard bảo vệ các tab riêng tư
```

---

### B2. `app/(tabs)/index.tsx` — Màn hình Feed (Trang chủ)

Giải thích từng phần:

```tsx
// BƯỚC 1: Lấy dữ liệu từ store
const { rooms, fetchRooms, isLoading, loadMoreRooms } = usePropertyStore();
// rooms: mảng các tin BĐS đã tải
// fetchRooms: hàm gọi API lấy danh sách
// isLoading: true khi đang tải
// loadMoreRooms: hàm tải thêm khi cuộn xuống cuối

const { unreadCount } = useNotificationStore();
// unreadCount: số thông báo chưa đọc (hiện badge đỏ)
```

```tsx
// BƯỚC 2: Tải dữ liệu khi mở app
useEffect(() => {
    fetchRooms();  // Gọi API: GET /api/rooms → lấy danh sách phòng
}, []);  // [] = chỉ chạy 1 lần khi mở app
```

```tsx
// BƯỚC 3: Xử lý kéo refresh (pull-to-refresh)
const onRefresh = useCallback(async () => {
    setRefreshing(true);   // Hiện loading spinner
    await fetchRooms();     // Tải lại dữ liệu từ server
    setRefreshing(false);   // Tắt loading spinner
}, []);
```

```tsx
// BƯỚC 4: Hiển thị danh sách BĐS
<FlatList
    data={displayRooms}           // Mảng dữ liệu phòng
    keyExtractor={(item) => item.id.toString()}   // Key duy nhất cho mỗi item
    renderItem={({ item }) => (   // Mỗi item → render 1 PropertyCard
        <PropertyCard item={item} isActive={item.id === activeId} />
    )}
    pagingEnabled                 // Cuộn trang-trang (như TikTok)
    snapToInterval={height - BOTTOM_TAB_HEIGHT}  // Mỗi trang = chiều cao màn hình
    onEndReached={() => loadMoreRooms()}          // Cuộn đến cuối → tải thêm
    onEndReachedThreshold={0.5}   // Khi còn 50% cuối → bắt đầu tải
    refreshControl={              // Kéo xuống để refresh
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
    }
    windowSize={3}                // Chỉ render 3 item (tối ưu bộ nhớ)
    initialNumToRender={1}        // Ban đầu chỉ render 1 item
    removeClippedSubviews         // Xóa item ngoài màn hình khỏi bộ nhớ
/>
```

---

### B3. `app/(auth)/login.tsx` — Màn hình Đăng nhập

```tsx
// BƯỚC 1: Khai báo state cho form
const [email, setEmail] = useState('');       // Ô email — ban đầu rỗng
const [password, setPassword] = useState(''); // Ô password — ban đầu rỗng

// BƯỚC 2: Lấy hàm login từ store
const { login, isLoading, error } = useAuthStore();
// login: hàm gọi API đăng nhập
// isLoading: true khi đang gửi request
// error: chuỗi lỗi (nếu có)
```

```tsx
// BƯỚC 3: Xử lý khi nhấn "Đăng nhập"
const handleLogin = async () => {
    if (!email || !password) return;  // Chưa nhập đủ → bỏ qua

    try {
        await login({ email, password });  // Gọi API: POST /auth/login
        // Nếu thành công (không throw error):
        router.replace('/(tabs)');          // Chuyển về trang chủ
    } catch (err) {
        // Nếu thất bại (sai mật khẩu, mất mạng...):
        // Error đã được lưu vào store.error → hiển thị bên dưới
    }
};
```

```tsx
// BƯỚC 4: Giao diện
<Input
    label="Email"                      // Tiêu đề ô input
    placeholder="nhap@email.com"        // Chữ mờ gợi ý
    value={email}                       // Giá trị hiện tại = state email
    onChangeText={setEmail}             // Khi gõ → cập nhật state email
    keyboardType="email-address"        // Bàn phím kiểu email (có @)
/>

{/* Hiển thị lỗi nếu có */}
{error && <Text style={styles.errorText}>{error}</Text>}
// Nếu error = "Sai mật khẩu" → hiện dòng chữ đỏ
// Nếu error = null → không hiện gì

<Button
    title="Đăng nhập"
    onPress={handleLogin}               // Nhấn → chạy handleLogin
    isLoading={isLoading}               // Đang gửi → hiện loading spinner
/>
```

---

### B4. `store/authStore.ts` — Trung tâm quản lý đăng nhập

```tsx
// Tạo store bằng Zustand
export const useAuthStore = create<AuthState>((set, get) => ({
    // ──────── STATE (dữ liệu) ────────
    user: null,                    // Object user đang đăng nhập (ban đầu: chưa có)
    token: null,                   // JWT token (ban đầu: chưa có)
    isLoading: true,               // Đang xử lý? (ban đầu: true vì đang check token cũ)
    error: null,                   // Thông báo lỗi (ban đầu: không có)
    isAuthenticated: false,        // Đã đăng nhập? (ban đầu: chưa)

    // ──────── ACTIONS (hàm xử lý) ────────

    // Hàm ĐĂNG NHẬP:
    login: async (credentials) => {
        set({ isLoading: true, error: null });
        //   ↑ Bật loading, xóa lỗi cũ

        try {
            const response = await authService.login(credentials);
            //   ↑ Gọi API: POST /auth/login { email, password }
            //   response = { token: "eyJ...", user: { id: 1, fullName: "Minh", ... } }

            set({
                user: response.user,           // Lưu thông tin user
                token: response.token,         // Lưu JWT token
                isAuthenticated: true,         // Đánh dấu đã đăng nhập
                isLoading: false               // Tắt loading
            });
        } catch (error) {
            set({
                error: error.message || 'Đăng nhập thất bại',  // Lưu lỗi
                isLoading: false
            });
            throw error;  // Ném lỗi ra ngoài để LoginScreen bắt được
        }
    },

    // Hàm ĐĂNG XUẤT:
    logout: async () => {
        await removePushToken();       // Xóa push token khỏi server
        await authService.logout();     // Gọi API logout
        set({
            user: null,                 // Xóa user
            token: null,                // Xóa token
            isAuthenticated: false      // Đánh dấu chưa đăng nhập
        });
    },

    // Hàm KIỂM TRA TOKEN CŨ (chạy khi mở app):
    checkAuth: async () => {
        const token = await AsyncStorage.getItem('auth_token');
        const userData = await AsyncStorage.getItem('user_data');
        //   ↑ Đọc token đã lưu trước đó từ bộ nhớ điện thoại

        if (token && userData) {
            // Có token → user đã login trước đó → khôi phục session
            set({ token, user: JSON.parse(userData), isAuthenticated: true });
        } else {
            // Không có → chưa login
            set({ isAuthenticated: false });
        }
    },
}));
```

---

### B5. `store/propertyStore.ts` — Quản lý danh sách BĐS

```tsx
// STATE:
rooms: [],               // Mảng các phòng đã tải (ban đầu rỗng)
currentRoom: null,        // Phòng đang xem chi tiết
filters: {},              // Bộ lọc (giá, diện tích...)
page: 0,                  // Trang hiện tại (phân trang)
hasMore: true,            // Còn dữ liệu để tải tiếp?

// PHÂN TRANG hoạt động thế nào:
// Trang 0: phòng 1-10
// Trang 1: phòng 11-20
// Trang 2: phòng 21-30...

// Hàm TẢI THÊM (cuộn đến cuối):
loadMoreRooms: async () => {
    if (!hasMore || isLoadingMore) return;
    //     ↑ Hết dữ liệu hoặc đang tải → bỏ qua

    const nextPage = page + 1;            // Tính trang tiếp theo
    const response = await roomService.getRooms({ page: nextPage });
    //   ↑ Gọi API: GET /rooms?page=1

    set({
        rooms: [...rooms, ...response.content],   // Nối dữ liệu mới vào cuối
        //         ↑ cũ     ↑ mới
        // Ví dụ: [phòng1,...10] + [phòng11,...20] = [phòng1,...20]
        hasMore: !response.last   // Backend trả "last: true" khi hết dữ liệu
    });
},
```

---

### B6. `services/api/client.ts` — Cấu hình kết nối Backend

```tsx
// TẠO "kênh liên lạc" với Backend:
const apiClient = axios.create({
    baseURL: 'http://192.168.1.100:8080/api',  // URL server Spring Boot
    timeout: 30000,                              // Đợi tối đa 30 giây
});

// INTERCEPTOR REQUEST — Chạy TRƯỚC MỖI REQUEST:
apiClient.interceptors.request.use(async (config) => {
    // Đọc JWT token từ bộ nhớ điện thoại
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
        // Gắn token vào header (Backend kiểm tra token này)
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Hiểu đơn giản:
// Mỗi lần gọi API kiểu: apiClient.get('/rooms')
// → Interceptor TỰ ĐỘNG thêm: "Authorization: Bearer eyJ..." vào header
// → Backend nhận được token → biết user nào đang gọi
```

---

## PHẦN C: STYLE — CÁCH LÀM GIAO DIỆN

### C1. StyleSheet vs CSS

| CSS Web | React Native StyleSheet | Khác biệt |
|---------|------------------------|------------|
| `font-size: 16px` | `fontSize: 16` | camelCase, không có `px` |
| `background-color: red` | `backgroundColor: 'red'` | camelCase, giá trị là string |
| `display: flex` | Mặc định là flex | Không cần khai báo |
| `padding: 10px 20px` | `paddingVertical: 10, paddingHorizontal: 20` | Tách riêng |
| Cascade (kế thừa) | Không cascade | Mỗi component tự style |

```tsx
// Khai báo styles:
const styles = StyleSheet.create({
    container: {
        flex: 1,                    // Chiếm toàn bộ không gian
        backgroundColor: 'white',  // Nền trắng
        padding: 16,               // Padding 4 phía 16 point
    },
    title: {
        fontSize: 24,              // Cỡ chữ
        fontWeight: 'bold',        // Đậm
        color: '#333',             // Màu chữ
        marginBottom: 8,           // Khoảng cách bên dưới
    },
});

// Sử dụng:
<View style={styles.container}>
    <Text style={styles.title}>Tiêu đề</Text>
</View>

// Kết hợp nhiều style:
<View style={[styles.base, styles.active, { opacity: 0.5 }]}>
//         ↑ style 1    ↑ style 2    ↑ inline style
```

### C2. Flexbox — Bố cục

React Native dùng **Flexbox** để sắp xếp vị trí:

```tsx
// Sắp HÀNG NGANG (mặc định React Native sắp DỌC):
flexDirection: 'row',

// Căn GIỮA theo trục chính:
justifyContent: 'center',     // center | space-between | flex-end

// Căn GIỮA theo trục phụ:
alignItems: 'center',

// Ví dụ: Header có logo bên trái, nút bên phải
headerStyle: {
    flexDirection: 'row',              // Sắp ngang
    justifyContent: 'space-between',   // Logo ← → Nút (hai đầu)
    alignItems: 'center',             // Căn giữa theo chiều dọc
    paddingHorizontal: 16,
}
```

---

## PHẦN D: WEBSOCKET — CHAT REAL-TIME

### D1. Tại sao cần WebSocket?

```
REST API (HTTP):
  App gửi yêu cầu → Server phản hồi → Kết nối ĐÓNG
  (Giống gửi thư: gửi 1 lá → nhận 1 lá → xong)

WebSocket:
  App ↔ Server giữ kết nối MỞ LIÊN TỤC
  Server có thể GỬI dữ liệu bất kỳ lúc nào
  (Giống gọi điện: 2 bên nói chuyện liên tục)
```

**Chat cần WebSocket vì:** Khi người A gửi tin nhắn, người B phải nhận **NGAY LẬP TỨC**, không cần refresh.

### D2. Cách hoạt động trong project

```
1. User đăng nhập
2. _layout.tsx gọi: connectWebSocket()
3. chatStore mở kết nối: ws://192.168.1.100:8080/ws
4. Server ghi nhận: "User 15 đã online"

--- Khi có tin nhắn mới ---

5. User A gửi: "Phòng này còn không?"
6. App A gọi API: POST /chat/send { receiverId: 42, content: "..." }
7. Server lưu tin nhắn vào DB
8. Server gửi qua WebSocket đến User B (nếu online)
9. chatStore của User B nhận được → cập nhật messages → UI tự render
```

---

## PHẦN E: PUSH NOTIFICATION — THÔNG BÁO ĐẨY

```
BƯỚC 1: App đăng ký token
  App → Expo Push Service → trả về Token: "ExponentPushToken[abc123]"
  App → Backend: POST /notifications/push-token { token: "...", platform: "android" }
  → Backend lưu token vào bảng user

BƯỚC 2: Khi có sự kiện (ví dụ: lịch hẹn mới)
  Backend → Expo Push Service: "Gửi cho token abc123, nội dung: Bạn có lịch hẹn mới"
  Expo Push → Google FCM (Android) / Apple APNS (iOS)
  FCM/APNS → Hiện thông báo trên điện thoại

BƯỚC 3: User nhấn thông báo
  App xử lý data trong notification:
  - Có appointmentId? → mở /appointments/{id}
  - Có contractId? → mở /contracts/{id}
  - Có roomId? → mở /property/{id}
```

---

## PHẦN F: CÁC PATTERN (MẪU) LẶP LẠI TRONG PROJECT

### F1. Pattern "Fetch Data on Mount"
Mọi màn hình đều tải dữ liệu khi hiển thị:
```tsx
useEffect(() => {
    store.fetchSomething();  // Gọi API lấy dữ liệu
}, []);  // [] = chỉ chạy 1 lần
```

### F2. Pattern "Loading → Data → Error"
Mỗi màn hình xử lý 3 trạng thái:
```tsx
if (isLoading) return <Skeleton />;                     // Đang tải
if (error) return <Text>Lỗi: {error}</Text>;            // Có lỗi
return <FlatList data={rooms} ... />;                    // Có dữ liệu
```

### F3. Pattern "Store → Service → API"
Luồng gọi API luôn là: Screen → Store → Service → Backend
```
Button onPress → store.createAppointment()       (store/)
                    → appointmentService.create() (services/api/)
                        → apiClient.post(url)     (services/api/client.ts)
                            → Backend Spring Boot
```

### F4. Pattern "Try-Catch-Alert"
Xử lý lỗi thống nhất:
```tsx
try {
    await store.doAction();
    Alert.alert('Thành công', 'Đã thực hiện xong!');
} catch (e: any) {
    Alert.alert('Lỗi', e.message || 'Có lỗi xảy ra');
}
```

---

## PHẦN G: THUẬT NGỮ TỔNG HỢP

| Thuật ngữ | Nghĩa tiếng Việt | Giải thích |
|-----------|-------------------|------------|
| **Component** | Thành phần | 1 khối UI tái sử dụng |
| **Props** | Thuộc tính | Dữ liệu truyền vào component |
| **State** | Trạng thái | Dữ liệu thay đổi được → UI tự cập nhật |
| **Hook** | Móc nối | Hàm đặc biệt `use...` của React |
| **Store** | Kho lưu trữ | Nơi quản lý state toàn cục (Zustand) |
| **Service** | Dịch vụ | Lớp gọi API (services/) |
| **Route** | Đường dẫn | URL màn hình (/property/123) |
| **Render** | Vẽ/hiển thị | React vẽ UI lên màn hình |
| **Re-render** | Vẽ lại | React vẽ lại khi state thay đổi |
| **Mount** | Gắn kết | Component lần đầu hiển thị |
| **Unmount** | Tháo gỡ | Component bị xóa khỏi màn hình |
| **Callback** | Hàm gọi lại | Hàm được truyền qua props, gọi khi có sự kiện |
| **Interceptor** | Bộ chặn | Code chạy tự động trước/sau mỗi API call |
| **JWT** | JSON Web Token | Chuỗi mã hóa xác thực người dùng |
| **AsyncStorage** | Bộ nhớ bất đồng bộ | Lưu dữ liệu trên thiết bị (giống localStorage) |
| **WebSocket** | Kết nối 2 chiều | Kênh liên lạc liên tục giữa app và server |
| **Deep Linking** | Liên kết sâu | Mở đúng màn hình cụ thể từ notification/URL |
| **Pagination** | Phân trang | Tải dữ liệu từng phần (trang 1, 2, 3...) |
| **Pull-to-refresh** | Kéo để tải lại | Kéo xuống trên FlatList để refresh dữ liệu |
| **Skeleton** | Khung xương | UI loading giả lập hình dáng nội dung |
| **Badge** | Huy hiệu | Số đỏ nhỏ trên icon (số thông báo chưa đọc) |
| **CRUD** | Tạo/Đọc/Sửa/Xóa | 4 thao tác cơ bản với dữ liệu |
| **KYC** | Know Your Customer | Xác minh danh tính khách hàng |
| **VNPay** | Cổng thanh toán | Dịch vụ thanh toán trực tuyến Việt Nam |

---

*Tài liệu bổ sung này giải thích từng khái niệm từ cơ bản nhất, kết hợp với code thực tế trong project.*
*Đọc file này TRƯỚC, sau đó đọc `BAO_CAO_DO_AN.md` để hiểu tổng quan.*
