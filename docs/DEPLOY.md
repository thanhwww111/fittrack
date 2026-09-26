# Deploy FitTrack

```
App Android (EAS build)  ──HTTPS──▶  API trên Render  ──▶  MongoDB Atlas
```

Làm theo thứ tự: **Atlas → Render → EAS**. Mỗi bước cần URL/secret của bước trước.

> Không commit secret nào vào git. Connection string, JWT secret chỉ nằm trong dashboard của Render.

---

## 1. MongoDB Atlas (database)

1. Đăng ký tại https://www.mongodb.com/cloud/atlas/register.
2. **Create cluster** → chọn **M0 (Free)**, provider AWS, region **Singapore** (gần Việt Nam, cùng region với Render).
3. **Database Access → Add New Database User**
   - Authentication: Password. Đặt username `fittrack`, bấm **Autogenerate Secure Password** rồi **lưu mật khẩu lại**.
   - Role: *Read and write to any database*.
4. **Network Access → Add IP Address → Allow access from anywhere** (`0.0.0.0/0`).
   Render gói free không có IP cố định nên phải mở cho mọi IP. DB vẫn được bảo vệ bằng user và mật khẩu.
5. **Database → Connect → Drivers** → copy connection string, dạng:
   ```
   mongodb+srv://fittrack:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Thay `<password>` bằng mật khẩu ở bước 3 và **thêm tên database `fittrack` trước dấu `?`**:
   ```
   mongodb+srv://fittrack:MAT_KHAU@cluster0.xxxxx.mongodb.net/fittrack?retryWrites=true&w=majority
   ```
   Nếu mật khẩu có ký tự đặc biệt (`@ : / ? #`) thì phải URL-encode, hoặc đơn giản là tạo lại mật khẩu chỉ gồm chữ và số.

## 2. Render (backend API)

Repo đã có sẵn `render.yaml` (Blueprint) ở thư mục gốc. Render đọc file này để tự cấu hình service.

1. Đăng ký tại https://render.com bằng tài khoản GitHub.
2. **New + → Blueprint** → chọn repo `fittrack` → Render đọc `render.yaml` và hiện service `fittrack-api`.
   Blueprint đang trỏ nhánh `main`, nên code cần được merge vào `main` trước.
3. Render hỏi giá trị cho `MONGO_URI` → dán connection string ở bước 1.5.
   `JWT_SECRET` và `JWT_REFRESH_SECRET` do Render tự sinh, không cần nhập.
4. Bấm **Apply**. Chờ build xong (khoảng 2–4 phút), log phải có:
   ```
   ✅ MongoDB connected: fittrack
   🚀 Server running on port 10000 (production)
   ```
5. **Seed dữ liệu** (món ăn + bài tập hệ thống):
   - Gói free của Render **không có Shell**, nên chạy seed từ máy mình, trỏ vào Atlas (PowerShell, trong thư mục `server/`):
     ```powershell
     $env:MONGO_URI = "mongodb+srv://...chuỗi ở bước 1.5..."
     npm run seed
     Remove-Item Env:MONGO_URI
     ```
   - Có gói trả phí thì vào tab **Shell** của service và chạy `npm run seed:prod`.
   - Seed dùng upsert, chạy lại nhiều lần cũng không bị trùng.
6. **Bật AI (tuỳ chọn):** lấy API key tại https://aistudio.google.com/apikey, vào service trên Render → **Environment** → sửa `GEMINI_API_KEY` → Save (Render tự deploy lại). Không có key thì app vẫn chạy bình thường, chỉ 2 màn AI báo "chưa được bật".
7. Kiểm tra: mở `https://fittrack-api.onrender.com/api/health` → phải thấy `"db":"connected"`.
   Nếu tên `fittrack-api` đã bị người khác dùng, Render sẽ gán URL khác. Khi đó sửa URL trong `mobile/eas.json` cho khớp.

**Lưu ý về gói free:** service ngủ sau 15 phút không có request. Request đầu tiên sau đó mất khoảng 30–60 giây để server khởi động lại. App có timeout 30 giây; nếu vẫn báo "Server phản hồi quá lâu" thì kéo để tải lại.

## 3. EAS (build app Android)

`mobile/eas.json` đã có 3 profile:

| Profile | Dùng để | API |
|---|---|---|
| `development` | Development build (khi thêm thư viện native không có trong Expo Go) | theo `.env` |
| `preview` | File **APK** cài thẳng lên điện thoại, gửi bạn bè test | Render |
| `production` | File AAB để đưa lên Google Play | Render |

Trong thư mục `mobile/`:

```powershell
npx eas-cli@latest login            # đăng nhập tài khoản Expo (tạo ở https://expo.dev/signup)
npx eas-cli@latest init             # tạo project trên EAS, tự ghi projectId vào app.json
npx eas-cli@latest build -p android --profile preview
```

- Lần build đầu EAS hỏi có tạo Android keystore không → chọn **Yes** để EAS quản lý.
- Build chạy trên cloud của Expo (gói free có hàng đợi, thường 10–30 phút). Xong sẽ có link và mã QR để tải file APK.
- Cài APK trên Android: mở link trên điện thoại, cho phép "Cài ứng dụng không rõ nguồn gốc".

Muốn đổi URL API cho bản build: sửa `EXPO_PUBLIC_API_URL` trong `eas.json` rồi build lại. Biến `EXPO_PUBLIC_*` được **gắn cứng vào app lúc build**, nên đổi trên Render không có tác dụng với app đã build.

iOS: cần tài khoản Apple Developer (99 USD/năm) mới build được bản cài trên máy thật. Trong lúc chưa có thì dùng Expo Go để test.

## 4. Thông báo đẩy (Firebase Cloud Messaging)

Có 2 loại thông báo:

| Loại | Cần làm gì |
|---|---|
| **Lịch nhắc** tập / ghi bữa ăn | Không cần gì thêm: máy tự đặt lịch, chạy được cả trong Expo Go |
| **Push từ server** (🏆 PR mới, 🎯 đạt mục tiêu, 📊 tổng kết tuần) | Các bước 4.1 → 4.3 bên dưới; chỉ hoạt động trên bản build (APK), Expo Go trên Android không nhận được |

App dùng Expo Push Service; trên Android, Expo gửi tiếp qua FCM nên cần credential của Firebase.

### 4.1. Tạo Firebase project và file `google-services.json`

1. Vào https://console.firebase.google.com → **Add project** → đặt tên `fittrack` (có thể tắt Google Analytics).
2. **Add app → Android**, package name: `com.thanhwww111.fittrack` (phải khớp `android.package` trong `app.json`).
3. Tải **`google-services.json`**, đặt vào `mobile/google-services.json`.
4. Thêm vào `mobile/app.json`, trong mục `android`:
   ```json
   "googleServicesFile": "./google-services.json"
   ```
5. Commit file này. Nó chỉ định danh project Firebase, không phải secret, và EAS chỉ upload những file được git theo dõi.

### 4.2. Upload FCM V1 key lên EAS

1. Firebase Console → ⚙️ **Project settings → Service accounts → Generate new private key** → tải file JSON.
   **File này là secret: không commit, không gửi cho ai.**
2. Trong `mobile/`:
   ```powershell
   npx eas-cli@latest credentials
   ```
   Chọn Android → profile `preview` (sau đó làm lại cho `production`) → **Google Service Account** → **Manage your Google Service Account Key for Push Notifications (FCM V1)** → **Upload** file JSON vừa tải.
3. Build lại app: `npx eas-cli@latest build -p android --profile preview`.
4. Mở app → Hồ sơ → **Cài đặt thông báo**. Nếu không có dòng cảnh báo màu xanh ở đầu màn, máy đã đăng ký nhận push thành công.

### 4.3. Cron gửi "Tổng kết tuần"

Server Render gói free ngủ khi không có request, nên cron chạy bên trong server không đáng tin. Thay vào đó, GitHub Actions (`.github/workflows/weekly-report.yml`) gọi server mỗi **thứ Hai 08:00 giờ Việt Nam**.

1. Render → service → **Environment** → copy giá trị `CRON_SECRET` (Render tự sinh).
2. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:
   - `CRON_SECRET` = giá trị vừa copy
   - `FITTRACK_API_URL` = `https://fittrack-api.onrender.com/api`
3. Thử ngay: tab **Actions → Weekly report push → Run workflow**. Log phải có dạng `{"success":true,"data":{"users":1,"skipped":0,"sent":1}}`.
   User không có hoạt động nào trong tuần trước sẽ bị bỏ qua (`skipped`).

## 5. Checklist sau khi deploy

- [ ] `GET /api/health` trên Render trả `"db":"connected"`
- [ ] Đăng ký tài khoản mới trong app APK
- [ ] Tìm món "chicken" có kết quả (đã seed)
- [ ] Bắt đầu buổi tập, chọn bài tập có danh sách (đã seed)
- [ ] Tắt hẳn app rồi mở lại vẫn còn đăng nhập (refresh token trong SecureStore)
- [ ] Bật nhắc tập với giờ sắp tới trong vài phút → thông báo hiện đúng giờ
- [ ] Hoàn thành một buổi tập có PR → nhận push "🏆 Kỷ lục mới!", bấm vào mở đúng buổi tập

## Biến môi trường của server

| Biến | Bắt buộc | Ghi chú |
|---|---|---|
| `MONGO_URI` | ✅ | Connection string Atlas, có tên DB `fittrack` |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | ✅ | ≥ 32 ký tự, hai giá trị khác nhau |
| `NODE_ENV` | | `production` trên Render |
| `PORT` | | Render tự đặt |
| `TRUST_PROXY` | | `1` khi chạy sau proxy của Render/Railway, để rate limit lấy đúng IP |
| `CORS_ORIGINS` | | Chỉ cần nếu có web app gọi API; app mobile không bị CORS chặn |
| `GEMINI_API_KEY` | | Bật tính năng AI; thiếu thì /api/ai trả 503 |
| `GEMINI_MODEL` | | Mặc định `gemini-3.8-flash` |
| `CRON_SECRET` | | ≥ 32 ký tự; bật `POST /api/internal/weekly-report` (thiếu thì endpoint trả 404) |
| `EXPO_ACCESS_TOKEN` | | Chỉ cần khi bật "Enhanced push security" trên EAS |
| `ACCESS_TOKEN_TTL_SECONDS`, `REFRESH_TOKEN_TTL_SECONDS`, `BCRYPT_ROUNDS` | | Có giá trị mặc định |
