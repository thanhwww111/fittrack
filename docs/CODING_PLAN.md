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
| 6 | Workout | ⬜ |
| 7 | Progress | ⬜ |
| 8 | Mobile foundation | 🟡 Mới có màn check `/health` (`a966f27`) |
| 9 | State management (Zustand) | ⬜ |
| 10 | API layer mobile | 🟡 Có `client.ts`, `healthApi.ts` |
| 11 | UI screens (4 sprint) | ⬜ |
| 12 | Dashboard | ⬜ |
| 13 | Validation & error handling | 🟡 Có middleware `validate` + `errorHandler` |
| 14 | Service layer | ⬜ |
| 15 | Testing | 🟡 Đã setup Vitest + Supertest, có test auth |
| 16 | Security | 🟡 Có helmet, cors, env validation, bcrypt, JWT + refresh rotation, rate limit auth |
| 17 | Deployment | ⬜ |
| 18 | AI (Gemini) | ⬜ |
| 19 | Firebase notification | ⬜ |

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
