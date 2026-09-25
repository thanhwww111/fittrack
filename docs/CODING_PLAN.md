# FitTrack — Coding Plan

**Mục tiêu MVP:** app mobile giúp người dùng quản lý workout + nutrition + body progress, có backend riêng và authentication.

## Tiến độ

| Phase | Nội dung | Trạng thái |
|---|---|---|
| 0 | Định nghĩa sản phẩm, repo, branch | ✅ |
| 1 | Database design | ✅ `server/src/models/` |
| 2 | Backend foundation | ✅ `cedc200` |
| 3 | Authentication | ✅ Backend xong + 12 API test (mobile làm ở Phase 8–11) |
| 4 | Profile + Goal | ✅ Backend xong + test |
| 5 | Food system + Nutrition | ✅ Backend xong + test (MealTemplate API chưa làm) |
| 6 | Workout | ✅ Backend xong + test |
| 7 | Progress | ✅ Backend xong + test |
| 8 | Mobile foundation | ✅ Route `(auth)`, `(tabs)`, `profile` + `Stack.Protected` |
| 9 | State management (Zustand) | ✅ `authStore`, `profileStore`, `nutritionStore`, `workoutStore` (+ `exercisePickerStore`) |
| 10 | API layer mobile | ✅ `client.ts` tự refresh token; `authApi`, `profileApi`, `foodApi`, `nutritionApi`, `workoutApi`, `progressApi` |
| 11 | UI screens (4 sprint) | ✅ Sprint 1–4 xong (Auth, Home, Profile, Nutrition, Food, Workout, Progress) |
| 12 | Dashboard | ✅ Home: nutrition hôm nay + buổi tập hôm nay (`/workout-sessions/today`) + tổng kết tuần |
| 13 | Validation & error handling | ✅ Zod ở mọi route + validate form ở mobile, lỗi server map về từng field |
| 14 | Service layer | ✅ Controller → Service → Model cho mọi module |
| 15 | Testing | ✅ 181 test backend (Vitest + Supertest) + 24 test mobile (jest-expo + Testing Library) + CI GitHub Actions |
| 16 | Security | 🟡 Có helmet, cors, env validation, bcrypt, JWT + refresh rotation, rate limit auth |
| 17 | Deployment | 🟡 Code + `render.yaml` + `eas.json` + `docs/DEPLOY.md` sẵn sàng; chờ tạo Atlas/Render/EAS và build |
| 18 | AI (Gemini) | ✅ Gợi ý món + phân tích tập luyện (backend + mobile + test); cần `GEMINI_API_KEY` để chạy thật |
| 19 | Firebase notification | ✅ Lịch nhắc cục bộ + push PR/mục tiêu/tổng kết tuần (backend + mobile + test); cần Firebase + FCM key trên EAS để push chạy thật |
| 20 | Bổ sung chức năng (`feature/missing-ui`) | ✅ Sửa/xoá món & bài tập custom, số đo cơ thể, mục tiêu thủ công, bữa mẫu, chép bữa, món gần đây, nước uống, tài khoản (đổi tên / mật khẩu / xoá), sửa/xoá buổi tập + ghi chú, tiến bộ từng bài, nhân bản template, thao tác nhanh trên Home |

## Điều chỉnh so với plan gốc (theo code thực tế)

- **Mobile routes nằm ở `mobile/src/app/`**, không phải `mobile/app/` (quy ước Expo Router trong `mobile/AGENTS.md`). Code không phải route (`api/`, `stores/`, `hooks/`, `components/`, `types/`) nằm trong `mobile/src/`. Alias `@/*` → `mobile/src/*`, nên import `@/api/...`, **không** viết `@/src/...`.
- **Mobile đang dùng Expo SDK 57**: trước khi dùng API Expo nào, đọc docs theo đúng version. Cài package bằng `npx expo install`.
- **Server dùng `tsx watch`** thay cho `ts-node-dev`, Express 5 (tự bắt lỗi async, không cần `asyncHandler`), Mongoose 9, Zod 4.
- **Base URL của API**: `EXPO_PUBLIC_API_URL=http://<LAN_IP>:4000/api` trong `mobile/.env`.

### Quyết định thiết kế đã chốt

- **Cấu trúc server:** `routes → middlewares (authenticate, validateBody) → controllers → services → models`. Zod schema của request đặt ở `server/src/schemas/`, enum dùng chung ở `server/src/constants/enums.ts`.
- **Response:** `{ success: true, data }` hoặc `{ success: false, error: { message, details? } }`.
- **Ngày của FoodLog và BodyMeasurement** lưu dạng chuỗi `YYYY-MM-DD` theo ngày của user, để tránh lệch múi giờ.
- **FoodLog** có thêm `foodName` trong snapshot. **PersonalRecord** có thêm `sessionId`. **BodyMeasurement** unique theo `(userId, date)`, mỗi ngày một bản ghi.
- **Auth:**
  - Access token sống 15 phút. Refresh token sống 7 ngày, được gửi trong body (mobile không dùng cookie).
  - Refresh token lưu dạng hash SHA-256 trong collection `refreshtokens`, có TTL index để tự xoá khi hết hạn.
  - **Rotation:** mỗi refresh token chỉ dùng được 1 lần. Nếu một token cũ bị dùng lại thì thu hồi mọi phiên của user đó.
  - Login sai email và sai mật khẩu trả về cùng một thông báo 401.
  - Rate limit 10 request / 15 phút cho `register` và `login`.
- **"Hôm nay" của user:** `UserProfile.timezone` (IANA, mặc định `Asia/Ho_Chi_Minh`) + `todayInTimezone()`. Không dùng giờ của server.
- **Goals = NutritionTarget** (không có model Goal riêng; `goalType`/`goalWeight` nằm trong profile):
  - `GET /api/goals` trả `{ today, current, history }`.
  - `GET /api/goals/suggestion` xem trước target tính từ profile, không lưu.
  - `POST /api/goals` nhận `{ mode: "AUTO" }` hoặc `{ mode: "MANUAL", calories, protein, carbs, fat }`, kèm `effectiveFrom?`. Không cho lùi ngày, mỗi ngày tối đa 1 target.
  - `PUT /api/goals/:id` chỉ sửa được target có `effectiveFrom >= hôm nay`. Target trong quá khứ là bất biến (409).
  - Công thức AUTO (`utils/nutritionCalculator.ts`): BMR Mifflin-St Jeor × hệ số vận động. Giảm cân −500 kcal, tăng cơ +300 kcal, tối thiểu 1200 kcal. Protein 2.0 / 1.6 / 1.8 g/kg, fat 25% calo, carbs lấy phần còn lại.
- **Profile:** `goalWeight` phải khớp với `goalType` (WEIGHT_LOSS thì nhỏ hơn cân hiện tại, MUSCLE_GAIN thì lớn hơn).
- **Foods:**
  - User thấy food hệ thống (`createdBy = null`) và food của chính mình. Sửa/xoá food hệ thống trả 403. Food custom của người khác trả 404.
  - Tìm kiếm không phân biệt hoa thường, khớp một phần tên, có escape ký tự regex. Có `scope=all|system|custom` và phân trang `page`/`limit` (tối đa 50).
  - Seed bằng `npm run seed`, dùng upsert theo tên nên chạy lại nhiều lần không bị trùng.
- **Food logs:**
  - Snapshot gồm `foodName`, `servingUnit`, `quantity` và các giá trị dinh dưỡng làm tròn 1 chữ số thập phân.
  - Khi đổi `quantity`, server scale lại **từ snapshot cũ**, không đọc lại Food.
  - Không cho log vào ngày tương lai, nhưng cho log bù ngày đã qua.
- **Nutrition:** `GET /api/nutrition/today` và `GET /api/nutrition/daily?date=` trả `{ date, target, consumed, remaining, meals, logCount }`.
  - Target lấy theo bản đang áp dụng **vào đúng ngày đó**.
  - `remaining` âm nghĩa là ăn vượt target. Chưa có target thì `target` và `remaining` là `null`.
- **Workout:**
  - **Exercises:** gồm bài hệ thống (seed 18 bài) và bài custom của user. Lọc bằng `?muscleGroup=&search=&scope=`.
  - **Templates:** thứ tự bài tập lấy theo vị trí trong mảng (server tự gán `order`). Mọi `exerciseId` phải là bài user được phép dùng, nếu không trả 400 kèm `missingExerciseIds`.
  - **Sessions:**
    - Mỗi user tối đa 1 buổi `IN_PROGRESS`, được đảm bảo bằng partial unique index. Nếu đang có buổi khác thì trả 409 kèm `activeSessionId`.
    - Session copy tên bài tập (`exerciseName`) và target từ template, nên xoá template hay exercise cũng không làm hỏng lịch sử.
  - **Set:** `POST /:id/sets` với `setNumber` bỏ trống thì thêm set mới, có `setNumber` thì sửa set đó.
    - Xoá set bằng `DELETE /:id/exercises/:exerciseId/sets/:setNumber`, các set còn lại được đánh số lại.
    - `totalVolume` được cập nhật ngay. Response có `prCheck` báo set vừa ghi có phá PR hay không.
  - **Complete:**
    - Chuyển trạng thái nguyên tử bằng `findOneAndUpdate` với điều kiện `status: IN_PROGRESS`, nên complete 2 lần hoặc 2 request cùng lúc chỉ 1 lần thành công (lần sau 409).
    - Bỏ các bài không có set nào. Không cho complete buổi trống (400).
    - Tính `duration` và `totalVolume`, rồi upsert `PersonalRecord`.
  - **PR:** `maxWeight`, `maxReps` và `estimatedOneRepMax` (công thức Epley, 1 rep thì lấy đúng mức tạ). Mỗi chỉ số so sánh độc lập. Buổi tập bị cancel không tính PR. Xem danh sách bằng `GET /api/personal-records`.
  - Seed chung bằng `npm run seed` (foods + exercises).
- **Progress:**
  - **Body measurements:** `POST /api/body-measurements` upsert theo `(userId, date)`. Field không gửi lên thì về `null` (mỗi ngày là một lần đo hoàn chỉnh). Không cho nhập ngày tương lai. Xem bằng `GET ?from=&to=`, xoá bằng `DELETE /:id`.
  - **Đồng bộ cân nặng:** `profile.currentWeight` luôn bằng cân nặng của lần đo mới nhất, kể cả khi nhập bù ngày cũ hoặc xoá bản ghi.
  - **Tính theo ngày địa phương:** mọi thống kê tính theo ngày của user (timezone trong profile). Tuần bắt đầu từ thứ Hai. Ngày/tuần không có dữ liệu vẫn được trả về (giá trị 0) để vẽ biểu đồ liền mạch. Khoảng ngày tối đa 366 ngày.
  - **Các endpoint:**
    - `GET /api/progress/weight` (mặc định 90 ngày): `points` + `summary { start, current, change }`.
    - `GET /api/progress/workout?weeks=8`: volume, số buổi, số set, thời gian theo từng tuần. Chỉ tính buổi COMPLETED.
    - `GET /api/progress/nutrition` (mặc định 7 ngày): từng ngày gồm `consumed` và target áp dụng ngày đó.
      - Trung bình chỉ tính trên các ngày có log.
      - `daysOnCalorieTarget` là số ngày ăn trong khoảng ±10% target calo, `daysProteinGoalMet` là số ngày ăn đủ protein.
    - `GET /api/progress/weekly`: tổng kết tuần hiện tại gồm workout, nutrition, thay đổi cân nặng (so với lần đo gần nhất trước tuần) và số PR mới.
- **Mobile (Expo SDK 57):**
  - **Điều hướng:**
    - Root `_layout.tsx` dùng `Stack.Protected guard={isAuthenticated}`. SDK 57 chưa có `redirectTo` (có từ SDK 58); khi guard là false, Router tự đưa user về route đầu tiên còn truy cập được.
    - Splash được giữ cho đến khi `authStore.bootstrap()` xong, để không nháy màn Login.
    - Tabs import từ `expo-router/js-tabs` (import từ `expo-router` đã deprecated). Icon dùng `@expo/vector-icons/Ionicons`.
  - **Token:**
    - Refresh token lưu trong `expo-secure-store` (bản web dùng `localStorage`, chỉ để dev). Access token chỉ giữ trong bộ nhớ (Zustand).
    - `api/client.ts` nhận các hàm xử lý token qua `configureAuth()`, không import store, để tránh vòng import.
    - Gặp 401 thì refresh một lần rồi gửi lại request. Nhiều request 401 cùng lúc dùng chung một lần refresh.
    - Không refresh cho `/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/logout`. **`/auth/me` vẫn phải refresh**, vì bootstrap gọi nó khi chưa có access token.
  - **Đăng xuất:** xoá phiên ở máy trước, gọi server thu hồi token sau, nên mất mạng vẫn đăng xuất được.
  - **Luồng dữ liệu:** Screen → Hook (`useDashboard` dùng `useFocusEffect` để tải lại khi quay về màn) → API.
  - **Validate form:** giới hạn ở client khớp với Zod ở server. Lỗi `details` từ server được map về từng field qua `lib/formErrors.ts`.
  - **Reset khi rời phiên:** `stores/resetOnLogout.ts` subscribe `authStore` và reset mọi store khi user rời phiên, kể cả khi refresh token hết hạn. Store mới phải được thêm vào file này.
  - **Sprint 2 (Nutrition):**
    - **Tab Dinh dưỡng** (kiêm Meal History): chuyển ngày ‹ ›, không đi quá hôm nay (ngày "hôm nay" lấy theo server). Có tổng kcal còn lại hoặc vượt, `MacroBars`, và 4 bữa với nút "+ Thêm món".
    - **Luồng thêm món:** `food/search` (debounce 300 ms, phân trang khi cuộn) → `food/add` (xem trước macro ở client, số chính thức do server tính) → `router.dismissTo("/nutrition")`.
    - **`food/detail`:** sửa khối lượng hoặc bữa (xem trước bằng cách scale từ snapshot của log), xoá có hộp thoại xác nhận.
    - **`food/create`:** tạo món custom, xong chuyển thẳng sang `food/add` bằng `router.replace`.
    - **`nutritionStore`:** sau mỗi lần thêm/sửa/xoá thì tải lại tổng hợp từ server, không tự cộng trừ ở client.
  - **Sprint 3 (Workout):**
    - **Tab Tập luyện:** thẻ "Đang tập" (nếu có buổi dở) hoặc bắt đầu nhanh từ template / buổi trống; 3 buổi gần nhất; danh sách PR.
    - **`workout/templates` và `workout/template?id=`:** tạo/sửa template (thêm bài qua picker, set/rep/nghỉ, đổi thứ tự ↑↓, xoá).
    - **`workout/exercises`** (modal): chọn bài theo nhóm cơ và tìm kiếm. Màn gọi đăng ký callback qua `exercisePickerStore.open(onPick, selectedIds)`.
    - **`workout/start`** (buổi đang tập):
      - Đồng hồ chạy theo `startedAt`. Mỗi bài có ô kg × rep, tự điền theo set trước hoặc theo rep mục tiêu.
      - Bấm vào set để sửa (gửi kèm `setNumber`), bấm × để xoá.
      - Banner "🏆 PR mới" lấy từ `prCheck`, tự ẩn sau 4 giây. Hẹn giờ nghỉ 90 giây (±15 giây), rung khi hết giờ.
      - Hoàn thành hoặc huỷ đều hỏi xác nhận.
    - **Bài vừa thêm chưa có set** nằm trong `pendingExercises` ở client, vì server chỉ thêm bài vào session khi có set đầu tiên.
    - **Bắt đầu khi đang có buổi khác:** server trả 409, store tự mở lại buổi đang tập.
    - **`workout/history` và `workout/session?id=`:** lịch sử có phân trang và chi tiết buổi tập. Ngay sau khi hoàn thành, màn chi tiết hiện danh sách PR mới (`lastCompletion`).
    - **Thời gian nghỉ:** session copy `restSeconds` từ template. Bài thêm ngoài template dùng mặc định 90 giây; `restSeconds = 0` thì không hẹn giờ.
  - **Sprint 4 (Progress):**
    - **Tab Tiến độ:** chọn khoảng 1 / 3 / 6 tháng (30/90/180 ngày cho cân nặng; 4/12/26 tuần cho volume).
    - Cân nặng: con số lớn + mức thay đổi trong kỳ, kèm biểu đồ đường và ô nhập cân nặng hôm nay (nhập lại trong ngày thì ghi đè).
    - Volume theo tuần: biểu đồ cột.
    - Calo 7 ngày: biểu đồ cột, có đường kẻ mục tiêu và 3 chỉ số (trung bình kcal, trung bình protein, số ngày đủ protein).
    - **Biểu đồ** tự vẽ bằng `react-native-svg` (`components/charts/`), theo quy chuẩn trong skill dataviz:
      - Chỉ 1 chuỗi dữ liệu nên không có legend, màu primary `#2563eb` đã qua script kiểm tra màu.
      - Đường dày 2px, vùng nền 10%, điểm cuối có viền trắng 2px. Cột rộng tối đa 24px (≤ 60% ô), bo đầu 4px.
      - Lưới mảnh nét liền. Chỉ ghi giá trị ở điểm cuối (biểu đồ đường); nhãn trục x được thưa bớt để không chồng nhau.
      - Chạm vào biểu đồ để xem giá trị ở dòng phía trên. Mỗi biểu đồ có nút chuyển sang **dạng bảng**.
    - Đường mục tiêu calo không có chữ trong biểu đồ (vì dễ đè lên cột); phụ đề giải thích đường kẻ.
- **AI (Phase 18, Gemini):**
  - **SDK:** `@google/genai` 2.x dùng **Interactions API**: `ai.interactions.create({ model, system_instruction, input, response_format: { type: "text", mime_type: "application/json", schema }, store: false })`, đọc kết quả ở `output_text`. Model mặc định `gemini-3.8-flash` (`GEMINI_MODEL`).
  - **`services/ai/llm.ts`:**
    - Schema lấy từ `z.toJSONSchema(zodSchema)`, bỏ `$schema` và `additionalProperties` ở mọi cấp. Output **luôn được validate lại bằng Zod**.
    - Không có key thì trả 503. SDK lỗi hoặc JSON sai dạng thì trả 502.
  - **`POST /api/ai/meal-suggestions { mealType, preferences? }`:**
    - Cần có target. Prompt gồm calo/macro **còn lại** hôm nay và mục tiêu. `preferences` (tối đa 200 ký tự) được đặt trong `"""..."""` và prompt nói rõ đó là dữ liệu, không phải chỉ dẫn.
    - AI trả 3 món. Server tự gắn `fitsRemaining` (≤ còn lại × 1.1 + 50 kcal), không tin số của AI.
  - **`POST /api/ai/workout-analysis`:**
    - Cần ≥ 2 buổi COMPLETED trong 4 tuần. `summarizeWorkoutHistory` lấy set tốt nhất (1RM ước tính cao nhất, bài bodyweight thì theo rep) cho mỗi bài mỗi tuần; chỉ giữ 10 bài tập nhiều nhất.
    - AI trả `{ summary, highlights[], suggestions[] }`.
  - **Giới hạn và quyền riêng tư:** `aiLimiter` 10 request/giờ/user (theo `req.user.id`). Chỉ gửi số liệu tổng hợp và tên bài/món, không gửi tên hay email.
  - **Test:** không bao giờ gọi Gemini thật. `vitest.config.mts` ép `GEMINI_API_KEY=""`, test API mock `llm.generateJson`, test `llm.test.ts` mock `@google/genai`.
  - **Mobile:** `ai/meal` (mở từ tab Dinh dưỡng, chỉ khi xem hôm nay và đã có target) và `ai/workout` (mở từ tab Tập luyện khi đã có buổi tập). Lỗi 503/429/502 có thông báo tiếng Việt riêng (`lib/aiErrors.ts`).
- **Thông báo (Phase 19):**
  - **Lịch nhắc tập (theo thứ + giờ) và nhắc ghi bữa ăn:** là **local notification** do app tự đặt lịch (`lib/notifications.ts`, trigger `WEEKLY`/`DAILY`, id có tiền tố `fittrack-reminder-`).
    - Chạy được trong Expo Go và không phụ thuộc server Render đang ngủ.
    - Đặt lại toàn bộ lịch mỗi khi mở app hoặc lưu cài đặt. Huỷ hết khi rời phiên.
    - Server lưu ngày trong tuần 0 = CN … 6 = T7, Expo dùng 1 = CN … 7 = T7.
  - **Push từ server:** qua Expo Push Service (`expo-server-sdk`, trên Android đi qua FCM).
    - App lấy Expo push token rồi gọi `POST /api/notifications/devices`. Bỏ qua khi chạy web, máy ảo, Expo Go trên Android (không nhận remote push từ SDK 53), hoặc chưa có `projectId` của EAS.
    - Token là của máy: upsert theo token, nên đăng nhập user khác trên cùng máy thì token chuyển chủ.
    - Đăng xuất gọi `DELETE /api/notifications/devices` **trước** khi xoá phiên.
    - Token bị báo `DeviceNotRegistered` được xoá khỏi DB.
  - **Các sự kiện gửi push:**
    - PR mới sau khi complete buổi tập.
    - Cân nặng vừa vượt mốc `goalWeight` (`crossedGoal`, chỉ báo đúng một lần).
    - Tổng kết tuần trước, qua `POST /api/internal/weekly-report` (bảo vệ bằng `CRON_SECRET`, so sánh thời gian hằng số; không cấu hình thì trả 404). GitHub Actions gọi endpoint này mỗi thứ Hai 01:00 UTC; user không có hoạt động thì bỏ qua.
    - Push là **fire-and-forget và không bao giờ throw**, nên lỗi gửi push không làm hỏng request chính.
  - **Cài đặt:** `GET/PUT /api/notifications/settings` (gộp từng phần, ngày được khử trùng và sắp xếp). Mặc định bật PR/mục tiêu/tổng kết tuần, tắt lịch nhắc.
  - **Bấm vào thông báo:** `data.url` là route trong app. `useNotificationNavigation` mở đúng màn, kể cả khi app đang tắt hẳn (`getLastNotificationResponseAsync`).
  - **Tính lại target:** "Tính lại từ hồ sơ" khi hôm nay đã có target thì gọi `PUT /goals/:id { mode: "AUTO" }`; server tính lại từ profile và giữ `source = AUTO`.
- **Test mobile (Phase 15):** `npm test` trong `mobile/` (jest-expo). Test đặt trong `mobile/__tests__/` (không đặt trong `src/app`), tên file `*-test.ts(x)`.
  - `lib-test.ts`: trục biểu đồ, dinh dưỡng, workout, validate form.
  - `api-client-test.ts`: dùng adapter axios giả (gắn vào `axios.defaults.adapter` **trước** khi import client). Kiểm tra refresh 1 lần cho nhiều 401 cùng lúc, `/auth/me` vẫn refresh, sai mật khẩu không refresh, refresh bị từ chối thì hết phiên. Test này đã được xác nhận là fail khi đưa lại bug cũ.
  - `exercise-logger-test.tsx`: Testing Library **v14 có `render`/`fireEvent` là async**, luôn phải `await`.
- **CI** (`.github/workflows/ci.yml`): mỗi lần push lên `main`/`develop` hoặc mở PR. Server: typecheck + test (MongoDB service) + build. Mobile: tsc + lint + jest.
- **Test:** `npm test` chạy trên DB `fittrack_test` (ghi đè bằng `MONGO_URI_TEST`). Helper test từ chối chạy nếu tên DB không kết thúc bằng `_test`.

---

## Stack

- **Mobile:** React Native, Expo, TypeScript, Expo Router, Zustand
- **Backend:** Node.js, Express, TypeScript, MongoDB, Mongoose
- **Auth:** JWT + Refresh Token
- **External:** Firebase Cloud Messaging, Gemini API (Phase 18)
- **Deploy:** Expo EAS (mobile), Render / Railway (backend), MongoDB Atlas (DB)

## Thứ tự code mỗi feature

```
BUSINESS RULE → DATABASE → API → TEST → MOBILE → UI POLISH
```

Ví dụ với Add Food: xác định Food/FoodLog → schema → tính nutrition → `POST /food-logs` → test API → food API client → Zustand → màn Add Food → Nutrition Dashboard.

## Git workflow

- Nhánh: `main` ← `develop` ← `feature/*` (`feature/auth`, `feature/profile`, `feature/food`, `feature/nutrition`, `feature/workout`, `feature/progress`)
- Mỗi feature: code → test → commit → merge vào `develop`
- Commit theo Conventional Commits: `feat: add food logging API`, `fix: prevent duplicate workout completion`, `refactor: move nutrition logic to service layer`, `test: add workout volume tests`. Tránh `update`, `fix`, `done`, `final2`.

---

## Phase 0 — Định nghĩa sản phẩm

Cấu trúc repo `fittrack/{mobile, server, README.md, .gitignore}`. README gốc:

```md
# FitTrack
Personal Fitness & Nutrition Tracker

## Core Features
- Authentication
- Nutrition Tracking
- Workout Tracking
- Body Progress
- Personal Records
- Dashboard
```

## Phase 1 — Database Design (làm trước UI)

1. **User**: `_id, name, email, passwordHash, avatar, createdAt, updatedAt`
2. **UserProfile**: `userId, gender, age, height, currentWeight, activityLevel, goalType, goalWeight, trainingDaysPerWeek`
   - `goalType`: `WEIGHT_LOSS | MAINTENANCE | MUSCLE_GAIN`
3. **NutritionTarget**: `userId, calories, protein, carbs, fat, effectiveFrom, createdAt`
   - **Không sửa target cũ**, mỗi lần đổi thì tạo bản ghi mới để giữ lịch sử (ví dụ tháng 9: 2500 kcal, tháng 10: 2700 kcal).
4. **Food**: `_id, name, servingSize, servingUnit, calories, protein, carbs, fat, fiber, isCustom, createdBy, createdAt`
   - Ví dụ Chicken Breast: 100 g, 165 kcal, 31 P / 0 C / 3.6 F
5. **FoodLog**: `_id, userId, date, mealType, foodId, quantity, calories, protein, carbs, fat, fiber, createdAt`
   - `mealType`: `BREAKFAST | LUNCH | DINNER | SNACK`
   - **Lưu snapshot dinh dưỡng**: nếu sau này sửa Food thì lịch sử ăn của user vẫn không đổi.
6. **MealTemplate**: `_id, userId, name, items: [{ foodId, quantity }]`. Bấm "Add Meal" thì tạo nhiều FoodLog cùng lúc.
7. **Exercise**: `_id, name, muscleGroup, equipment, description, isCustom, createdBy`
8. **WorkoutTemplate**: `_id, userId, name, exercises: [{ exerciseId, order, targetSets, targetReps, restSeconds }]`
9. **WorkoutSession**: `_id, userId, templateId, name, startedAt, completedAt, exercises: [{ exerciseId, sets: [{ setNumber, weight, reps, completed }] }], totalVolume, duration, status`
   - `status`: `IN_PROGRESS | COMPLETED | CANCELLED`
10. **BodyMeasurement**: `_id, userId, date, weight, bodyFat, chest, waist, arm, thigh`. MVP chỉ cần `date` và `weight`.
11. **PersonalRecord** (tối ưu sau, ban đầu tính từ WorkoutSession): `userId, exerciseId, maxWeight, maxReps, estimatedOneRepMax, achievedAt`

## Phase 2 — Backend Foundation ✅

`server/src/{config, controllers, middlewares, models, routes, services, utils, types, app.ts, server.ts}`

## Phase 3 — Authentication

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
```

- Register: validate → hash password → create User → create Profile → trả token
- Login: tìm user → `bcrypt.compare()` → tạo access token + refresh token
- Middleware `authenticate` bảo vệ `/api/profile`, `/api/foods`, `/api/nutrition`, `/api/workouts`, `/api/progress`

## Phase 4 — Profile + Goal

```
GET  /api/profile
PUT  /api/profile
GET  /api/goals
POST /api/goals
PUT  /api/goals/:id
```

Luồng: Profile → Goal → NutritionTarget (ví dụ: MUSCLE_GAIN, 54 kg lên 60 kg, rồi tạo target).

## Phase 5 — Food System

- Seed: Egg, Chicken Breast, Rice, Tofu, Milk, Banana, Salmon, Pork, Potato, Oats
- Foods: `GET/POST /api/foods`, `GET/PUT/DELETE /api/foods/:id`, tìm kiếm bằng `GET /api/foods?search=chicken`
- Food logs: `GET /api/food-logs?date=YYYY-MM-DD`, `POST /api/food-logs`, `PUT/DELETE /api/food-logs/:id`
- **Backend tự tính nutrition từ `quantity`**, lưu snapshot vào FoodLog. Không tin calories/protein do frontend gửi lên.
- `GET /api/nutrition/today`, response mẫu:

```json
{
  "date": "2026-09-24",
  "target":    { "calories": 2500, "protein": 130, "carbs": 300, "fat": 70 },
  "consumed":  { "calories": 2180, "protein": 124, "carbs": 280, "fat": 65 },
  "remaining": { "calories": 320,  "protein": 6,   "carbs": 20,  "fat": 5 }
}
```

## Phase 6 — Workout

- Exercises: `GET /api/exercises`, `GET /api/exercises/:id`, `POST /api/exercises`, lọc bằng `?muscleGroup=CHEST`
- Templates: CRUD `/api/workout-templates` và `/api/workout-templates/:id` (ví dụ Push Day: Bench Press 3×8, Incline DB Press 3×10, Cable Fly 3×12)
- Start workout: tạo WorkoutSession với `status = IN_PROGRESS`
- `POST /api/workout-sessions/:id/sets` body `{ exerciseId, setNumber, weight, reps }`: validate → lưu set → tính volume (`weight × reps`) → check PR
- `POST /api/workout-sessions/:id/complete`: kiểm tra đang IN_PROGRESS → validate exercises → tính duration → tính total volume → detect PR → chuyển COMPLETED

## Phase 7 — Progress

```
POST /api/body-measurements
GET  /api/body-measurements
GET  /api/progress/weight
GET  /api/progress/workout
GET  /api/progress/nutrition
GET  /api/progress/weekly
```

- Weight: trả mảng `[{ date, weight }]` để vẽ chart
- Workout: backend tính weekly volume

## Phase 8 — Mobile Foundation

Routes (trong `mobile/src/app/`):

```
(auth)/login.tsx, register.tsx
(tabs)/index.tsx, nutrition.tsx, workout.tsx, progress.tsx
food/search.tsx, add.tsx, detail.tsx
workout/templates.tsx, start.tsx, history.tsx
profile/index.tsx
```

## Phase 9 — State Management (Zustand)

Tách store riêng, không dồn chung một store: `src/stores/{authStore, profileStore, nutritionStore, workoutStore}.ts`

- `authStore`: `user, accessToken, isAuthenticated, login(), logout()`
- `workoutStore`: `currentSession, startWorkout(), addSet(), removeSet(), completeWorkout()`

## Phase 10 — API Layer

Không gọi axios trực tiếp trong component. `src/api/{client, authApi, foodApi, nutritionApi, workoutApi, progressApi}.ts`

Luồng: `Screen → Hook → API → Backend` (ví dụ `WorkoutScreen → useWorkout() → workoutApi.completeWorkout() → POST /workout-sessions/:id/complete`)

## Phase 11 — UI Screens (khoảng 12–15 màn chính)

- **Sprint 1:** Login, Register, Home, Profile
- **Sprint 2:** Nutrition Dashboard, Food Search, Add Food, Food Detail, Meal History
- **Sprint 3:** Workout Dashboard, Workout Templates, Create Template, Active Workout, Workout History
- **Sprint 4:** Progress, Weight Chart, Workout Chart, Weekly Summary

## Phase 12 — Dashboard (màn quan trọng nhất)

Hiển thị lời chào, cân nặng và thay đổi trong tuần, nutrition hôm nay (kcal/protein), workout hôm nay (số bài, số set, volume, nút Continue), xu hướng progress.
Dashboard không tự tính mà gọi `GET /nutrition/today`, `GET /workout/today`, `GET /progress/summary`.

## Phase 13 — Validation & Error Handling

Zod ở backend: `Request → Schema validation → Controller → Service → Database`. Reject weight âm, reps = 0, quantity âm.

## Phase 14 — Service Layer

`Controller → Service → Model`. Controller không chứa business logic.
Ví dụ `completeWorkout()` trong service: find session → validate status → tính duration → tính volume → detect PR → update → return.

## Phase 15 — Testing

- Unit: `calculateNutrition()`, `calculateVolume()`, `calculateEstimated1RM()`, `detectPR()`
- API: register, login, add food, create workout, complete workout
- Business/security rules: không complete workout đã completed; không sửa food log của user khác; không truy cập workout của user khác

## Phase 16 — Security

Password hashing, JWT + refresh token, authorization middleware, input validation, rate limiting, CORS, env variables.
**Luôn kiểm tra quyền sở hữu ở backend**, ví dụ `foodLog.userId === req.user.id`.

## Phase 17 — Deployment

MongoDB Atlas ← Node API (Render/Railway) ← React Native (EAS).
Env: `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `GEMINI_API_KEY`. Không commit `.env`.

## Phase 18 — AI (sau khi MVP xong)

- Meal suggestion: gửi remaining calories/macros cho Gemini (ví dụ "dinner under 500 kcal, ≥35g protein")
- Workout analysis: gửi dữ liệu 4 tuần gần nhất để tạo summary

## Phase 19 — Firebase Notification

FCM: workout reminder, meal reminder, weekly report, goal achieved, PR achieved.

---

## Lộ trình (2–3 tiếng/ngày)

| Tuần | Công việc |
|---|---|
| 1 | Requirement + DB + Backend foundation |
| 2 | Auth + Profile + Goal |
| 3 | Food + Nutrition |
| 4 | Workout |
| 5 | Progress + Dashboard |
| 6 | Mobile UI polish + validation |
| 7 | Testing + Security + Deploy (đủ để đưa vào CV) |
| 8 | AI + Notification |

## Mô tả CV

> **FitTrack — Personal Fitness & Nutrition Tracker.** Built a full-stack mobile application for workout, nutrition, and body-progress tracking using React Native, TypeScript, Node.js, Express, and MongoDB. Implemented JWT authentication, workout session management, nutrition calculations, personal-record detection, progress analytics, and RESTful APIs.
