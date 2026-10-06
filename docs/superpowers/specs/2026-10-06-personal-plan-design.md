# Kế hoạch ăn và vận động cá nhân — MVP

Ngày: 2026-10-06. Trạng thái: người dùng đã duyệt thiết kế và yêu cầu triển khai; MVP đã được triển khai và kiểm tra tự động.

## 1. Mục tiêu và phạm vi đã duyệt

Thêm tab Kế hoạch cho người muốn vận động ngoài gym. Sau khi thiết lập hồ sơ, người dùng chọn môn và khảo sát thời gian rảnh; app đề xuất kế hoạch ăn và vận động 7 ngày, cho chỉnh trước khi áp dụng. MVP hỗ trợ một môn chính: yoga hoặc đi bộ. Ví dụ người chọn yoga và rảnh ba ngày phải nhận đúng ba buổi yoga trong các ngày đó.

Dinh dưỡng dùng Food, NutritionTarget, Meal và FoodLog hiện có. Bữa đề xuất chỉ trở thành nhật ký khi người dùng xác nhận đã ăn. Hoạt động ngoài gym có lịch sử thời lượng riêng; không đưa vào set, volume hoặc PR gym.

Chưa bao gồm phối hợp nhiều môn, chạy/bơi/đạp xe, chu kỳ nhiều tuần, tăng tải tự động hay AI bắt buộc. Không sửa công việc chưa commit của phiên trước và không commit/push nếu chưa được yêu cầu.

## 2. Quyết định kỹ thuật đề xuất

- Giữ kiến trúc server route → schema → controller → service → model; mobile API → store/hook → màn hình.
- Dùng bộ tạo kế hoạch theo quy tắc và nội dung mẫu có phiên bản. Không phụ thuộc quota AI. Nội dung vận động phải được kiểm chứng nguồn trước khi triển khai; không đưa công thức calo hay chỉ định điều trị mới vào phân hệ này.
- Kế hoạch là bảy ngày có ngày cụ thể, theo timezone hồ sơ. Kết thúc bảy ngày thì hiển thị đã kết thúc và cho tạo bản kế tiếp có xác nhận; không tự lặp hay ghi hoạt động tương lai.
- Mặc định tab mới hiện cho mọi tài khoản. Khảo sát có thể lưu dở; người dùng được trở về app và tiếp tục sau, không bị khóa core bởi bước mới.
- Áp dụng lần đầu từ hôm nay. Thay kế hoạch đang dùng từ ngày mai; hôm nay và lịch sử đã ghi giữ nguyên. Ngày hiệu lực hiển thị trước nút xác nhận.

## 3. Luồng người dùng

### Thiết lập và khảo sát

Sau bước kết quả dinh dưỡng, chọn Gym hoặc Môn khác. Gym tiếp tục bước lịch tuần hiện có. Môn khác dẫn vào khảo sát; không bắt tạo lịch gym. Tài khoản cũ vào khảo sát từ trạng thái trống của tab Kế hoạch, không bị đưa lại vào onboarding.

Khảo sát MVP gồm môn chính, mức kinh nghiệm, ngày rảnh cụ thể, giờ và số phút cho từng buổi; giờ các bữa ăn, món muốn tránh và lựa chọn món yêu thích từ thư viện hiện có. Mục tiêu, cân, chiều cao, timezone và target lấy từ hồ sơ, không nhập lại. Chỉ chấp nhận thời gian buổi hợp lệ trong giới hạn của mẫu nội dung và phải giải thích khi không đáp ứng được lựa chọn.

Các thông tin ngân sách, lịch làm việc chi tiết, thiết bị và thời gian nấu chưa dùng để suy ra kết quả thì không thu thập ở MVP. Danh sách tránh món là lựa chọn của người dùng, không được diễn giải thành bảo đảm an toàn dị ứng khi dữ liệu thành phần chưa đầy đủ.

### Bản nháp

Server tạo bảy ngày từ ngày hiệu lực dự kiến, đúng thứ rảnh và thời lượng đã chọn. Ngày còn lại là nghỉ. Mỗi buổi có nội dung mẫu song ngữ, chia phần với tổng thời lượng bằng thời lượng buổi.

Bữa đề xuất tham chiếu các món người dùng được phép xem và khẩu phần theo đơn vị hiện có. Hiển thị tổng kcal/protein/carbs/fat và độ lệch với target từng ngày; không khẳng định đạt đúng tất cả macro nếu thư viện món không đáp ứng. Không có món phù hợp thì hiển thị phần còn thiếu và cho chọn món, không bịa dữ liệu dinh dưỡng. Target chưa có thì yêu cầu thiết lập bằng luồng hiện có.

Cho sửa ngày/giờ/thời lượng trong ngày rảnh, đổi món và khẩu phần. Mọi sửa đổi được server kiểm tra và tính lại. Khi sửa khảo sát, bản nháp cũ đánh dấu cần tạo lại; không thay kế hoạch đang áp dụng. Không tạo lịch nhắc hoặc nhật ký từ bản nháp.

### Kế hoạch đang dùng

Tab có Hôm nay, Tuần và Chỉnh khảo sát. Hôm nay hiển thị hoạt động hoặc ngày nghỉ, bữa đề xuất, trạng thái đã ghi và đường dẫn sang Dinh dưỡng. Tuần hiển thị bảy ngày có ngày cụ thể và trạng thái.

Buổi hôm nay cho nhập thời lượng thực tế và ghi chú, rồi xác nhận hoàn thành hoặc bỏ qua. Ngày đã qua chưa hoàn thành hiển thị bỏ lỡ; ngày nghỉ không tính bỏ lỡ. Cho bổ sung hoàn thành ngày đã qua trong phạm vi kế hoạch, không xác nhận ngày tương lai. Không dồn buổi bỏ lỡ sang ngày khác.

Ghi món mở biểu mẫu hiện có, điền ngày/bữa/món/lượng từ dòng kế hoạch; người dùng có thể chỉnh và xác nhận. Một dòng kế hoạch chỉ có một FoodLog liên kết. Bấm lại đưa tới log đã có; muốn ăn thêm thì dùng luồng ghi món thông thường. Xóa log gỡ trạng thái đã ăn; có thể xác nhận lại dòng đó. Thay kế hoạch không xóa log hay hoạt động cũ.

## 4. Mô hình dữ liệu

### LifestyleSurvey

Một bản khảo sát hiện tại cho mỗi user, có revision và timestamps: sport YOGA/WALKING, experience, availableDays gồm dayOfWeek 1–7/time HH:mm/durationMinutes, mealTimes theo mealId, preferredFoodIds và excludedFoodIds. Ngày không trùng; meal và food phải thuộc phạm vi người dùng được truy cập. Lưu revision phục vụ phát hiện cập nhật đồng thời.

### PersonalPlan

Một document cho mỗi bản kế hoạch: userId, revision, state DRAFT/PUBLISHED, sourceSurveyRevision, generatorVersion, timezone, startDate/endDate, surveySnapshot, targetSnapshot và days. Target snapshot gồm id, hiệu lực và các chỉ tiêu; không sửa target hiện có khi áp dụng plan.

Mỗi day có date; activity tùy chọn với id ổn định, sport, time, plannedMinutes và các bước nội dung; meals gồm id ổn định, mealId/time và các dòng foodId/foodName/servingUnit/quantity/nutritionSnapshot. Tổng dinh dưỡng do server tính từ dữ liệu Food, không nhận số macro client tự khai.

Plan đã xuất bản bất biến. Chỉnh kế hoạch tạo bản nháp mới. Snapshot giữ lịch sử khi món hay hồ sơ đổi; ghi món thực tế dùng dữ liệu được kiểm tra lại tại thời điểm xác nhận và hiển thị lại nếu giá trị thay đổi.

### PersonalPlanState

Một document/user, unique userId, chứa revision, các activation theo effectiveFrom và requestId. Activation trỏ tới plan đã xuất bản, có ngày hiệu lực của nó. Tại một ngày chỉ một activation có hiệu lực; chọn activation mới nhất không sau ngày đó. Bản cũ vẫn xem được, không cần sửa trạng thái hàng loạt để kích hoạt.

Áp dụng dùng compare-and-swap tương tự trainingSchedule.service hiện có. requestId gửi lại với cùng plan và revision trả kết quả cũ; khác payload trả 409. Publish bản nháp bằng cập nhật có điều kiện trước khi ghi activation; nếu bước activation lỗi thì retry cùng requestId có thể tiếp tục. Một bản xuất bản chưa được activation trỏ tới không được coi là đang dùng.

### ActivityLog và liên kết FoodLog

ActivityLog có unique userId/planId/activityId; date, sport, status COMPLETED/SKIPPED, actualMinutes và note. Ghi hoặc sửa bằng upsert có revision; userId luôn lấy từ phiên đăng nhập. Trạng thái bỏ lỡ được suy ra từ ngày hiện tại và thiếu log, không cần cron ghi hàng loạt.

FoodLog thêm sourcePlanId/sourcePlanItemId tùy chọn với partial unique index trên userId/sourcePlanId/sourcePlanItemId khi có nguồn kế hoạch. Luồng ghi thường không mang các trường này nên vẫn ghi nhiều món giống nhau được. Chống retry bằng unique index ở chính FoodLog; không dùng cập nhật hai document làm điều kiện duy nhất. Trạng thái đã ghi được truy vấn từ FoodLog, không lưu cờ có thể lệch ở plan.

## 5. API dự kiến

Tất cả route dưới /api/personal-plan, có authenticate và Zod validate:

- GET/PUT /survey: lấy/lưu khảo sát, PUT yêu cầu revision.
- POST /drafts: tạo bản nháp từ khảo sát hiện tại và startDate hợp lệ, có requestId chống tạo trùng.
- GET /drafts/:id và PUT /drafts/:id: lấy/sửa bản nháp theo revision; không sửa bản đã xuất bản.
- POST /drafts/:id/apply: requestId và revision; server quyết định ngày hiệu lực, kiểm tra khảo sát/target còn khớp, rồi xuất bản/kích hoạt.
- GET /current?date=YYYY-MM-DD: plan có hiệu lực, trạng thái hoạt động và FoodLog liên kết; ngày ngoài thời hạn trả trạng thái hết hạn.
- GET /history và GET /history/:id: xem các plan đã áp dụng và dữ liệu ghi liên quan của chính user.
- PUT /:planId/activities/:activityId/log: ghi hoàn thành/bỏ qua hoặc sửa theo revision.
- POST /:planId/items/:itemId/log: xác nhận món bằng lượng/bữa/ngày được validate và nguồn ổn định; lặp request không tạo log thứ hai.

Các truy vấn theo id luôn kèm userId. Khi target/timezone/khảo sát thay đổi sau tạo nháp, apply trả 409 yêu cầu xem/tạo lại; không tự áp dụng kế hoạch khác. Thay target khi đang dùng hiển thị cảnh báo và gợi ý tạo kế hoạch mới, không sửa snapshot cũ.

## 6. Tích hợp mobile và nhắc lịch

Thêm route (tabs)/plan.tsx, các màn con plan/survey và plan/draft, personalPlanApi, store/hook và component dùng tokens theme và catalog VI/EN. Thêm tab vào APP_TABS, tab layout, parentTabHref và AppFooter; giữ điều hướng trang con về tab tương ứng.

Rà soát guard onboarding ở root layout và profileStore: người chọn môn khác không bị yêu cầu lịch gym. WeeklyCheckInGate vẫn áp dụng bình thường, giữ bản nháp bên dưới và refresh target/profile sau lưu. Survey/plan store xóa dữ liệu khi logout/đổi tài khoản; phản hồi request của tài khoản cũ không được ghi vào store mới.

Nhắc hoạt động dùng expo-notifications hiện có, khóa riêng theo activation/ngày/activityId. Chỉ lập lịch từ activation đã lưu, với timezone của plan và quyền thông báo đã cấp; refresh khi áp dụng plan, foreground, thay cài đặt hoặc đăng nhập. Hủy nhắc plan cũ từ ngày hiệu lực mới, giữ lịch gym riêng. Bật nhắc môn khác không tự bật nhắc gym. Không tạo lịch bữa ăn thứ hai: tiếp tục dùng nhắc dinh dưỡng hiện có.

Đọc docs Expo 57 tương ứng trước khi chạm API Router/Notifications/RN. Kiểm tra sáu mục trên màn hẹp, nhãn VI/EN và vùng bấm; nếu cần đổi bố cục navbar vượt phạm vi thêm tab thì trình lại lựa chọn.

## 7. Tiêu chí nghiệm thu và kiểm tra

- Yoga ba ngày rảnh tạo đúng ba buổi yoga, không gym, tổng thời lượng các bước khớp mỗi buổi.
- Không có lịch trên ngày không rảnh; nghỉ không bị tính bỏ lỡ; không hoàn thành ngày tương lai.
- Nháp/apply không tạo FoodLog; xác nhận món, retry và request đồng thời chỉ một log; xóa rồi ghi lại có trạng thái đúng.
- Sửa lượng/đổi món tính macro từ dữ liệu thật, không dùng số client tự khai; thiếu món được trình bày rõ.
- Hai request apply cạnh tranh vẫn chỉ một plan hiệu lực tại mỗi ngày; retry không tạo activation mới; xung đột revision/target được báo rõ.
- Đổi plan từ ngày mai giữ dữ liệu hôm nay và lịch sử; hết bảy ngày không tự lặp; timezone/qua tuần đúng.
- Tài khoản A không đọc/sửa plan, food, meal hay log của B; logout và phản hồi mạng trễ không lẫn dữ liệu.
- ActivityLog không làm thay đổi volume/PR/đếm buổi gym; onboarding gym và weekly check-in tiếp tục hoạt động.
- Mobile kiểm tra bản nháp/chỉnh/apply/ghi món, footer/back, VI/EN và lỗi mạng; nhắc được lập/hủy đúng activation.
- Chạy test nghiệp vụ server/mobile, TypeScript cả hai, mobile lint và web export; kiểm tra thiết bị thật cho navbar/bàn phím/nhắc lịch nếu có thiết bị.

## 8. Bước tiếp theo

Duyệt bản thiết kế này, sau đó lập implementation plan với thứ tự: dữ liệu/API và test nghiệp vụ → khảo sát/tạo/chỉnh/apply → tích hợp món và hoạt động → onboarding/navbar/nhắc → kiểm tra hồi quy. Chưa tạo product code trong bước thiết kế; không coi kết quả test phiên trước là kiểm chứng cho tính năng mới.
