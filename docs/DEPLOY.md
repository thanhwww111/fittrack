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
6. Kiểm tra: mở `https://fittrack-api.onrender.com/api/health` → phải thấy `"db":"connected"`.
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

## 4. Checklist sau khi deploy

- [ ] `GET /api/health` trên Render trả `"db":"connected"`
- [ ] Đăng ký tài khoản mới trong app APK
- [ ] Tìm món "chicken" có kết quả (đã seed)
- [ ] Bắt đầu buổi tập, chọn bài tập có danh sách (đã seed)
- [ ] Tắt hẳn app rồi mở lại vẫn còn đăng nhập (refresh token trong SecureStore)

## Biến môi trường của server

| Biến | Bắt buộc | Ghi chú |
|---|---|---|
| `MONGO_URI` | ✅ | Connection string Atlas, có tên DB `fittrack` |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | ✅ | ≥ 32 ký tự, hai giá trị khác nhau |
| `NODE_ENV` | | `production` trên Render |
| `PORT` | | Render tự đặt |
| `TRUST_PROXY` | | `1` khi chạy sau proxy của Render/Railway, để rate limit lấy đúng IP |
| `CORS_ORIGINS` | | Chỉ cần nếu có web app gọi API; app mobile không bị CORS chặn |
| `ACCESS_TOKEN_TTL_SECONDS`, `REFRESH_TOKEN_TTL_SECONDS`, `BCRYPT_ROUNDS` | | Có giá trị mặc định |
