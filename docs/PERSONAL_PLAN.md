# Kế hoạch cá nhân — yoga và đi bộ

Triển khai ngày 2026-10-06 theo thiết kế đã duyệt tại [personal-plan-design](superpowers/specs/2026-10-06-personal-plan-design.md).

## Cách dùng

1. Người dùng mới hoàn tất hồ sơ/target rồi chọn **Gym** hoặc **Yoga / Đi bộ**. Chọn môn khác không yêu cầu tạo lịch gym. Tài khoản đã dùng app vào tab **Kế hoạch** để bắt đầu.
2. Khảo sát chọn một môn chính, kinh nghiệm, các ngày rảnh, giờ và thời lượng từng buổi (10–90 phút), giờ bữa ăn, món ưu tiên/muốn tránh và nhắc hoạt động.
   Ba bữa sáng/trưa/tối luôn được giữ và cần giờ HH:mm hợp lệ. Chọn thêm Ăn vặt hoặc dùng **+ Thêm bữa tùy chọn** để tạo tên như Bữa phụ/Bữa vặt; bữa tự đặt tên dùng chung với Dinh dưỡng. Có thể bỏ bữa phụ khỏi khảo sát, không xóa loại bữa trong Dinh dưỡng. Không chọn bữa phụ hoặc để trống phần tạo tên chưa lưu vẫn lưu khảo sát được. Tối đa 8 bữa/ngày. Khi giờ của bữa đã chọn hoặc lịch tập chưa hợp lệ, hai nút lưu bị khóa và hiển thị hướng dẫn sửa.
3. Lưu khảo sát, tạo bản nháp bảy ngày. Chỉnh giờ/thời lượng, món/khẩu phần rồi **Lưu chỉnh sửa**. Đổi ngày rảnh qua khảo sát và tạo bản nháp mới.
4. Xem ngày hiệu lực, tổng kcal/macro và chênh lệch target rồi **Áp dụng kế hoạch**. Lần đầu từ hôm nay; thay plan còn hiệu lực từ ngày mai. Bản nháp và thao tác áp dụng không tạo nhật ký ăn uống.
5. Trong Hôm nay/Cả tuần, xác nhận hoạt động bằng số phút thực tế và ghi chú; hoặc bỏ qua. Ghi bổ sung ngày đã qua còn hiệu lực tại Lịch sử kế hoạch. Không xác nhận hoạt động tương lai.
6. **Ghi món** mở biểu mẫu dinh dưỡng hiện có với lượng/bữa/ngày điền sẵn. Xác nhận mới tạo FoodLog. Dòng đã ghi dẫn sang đúng ngày trong Dinh dưỡng. Xóa log rồi xác nhận lại được; bấm/retry đồng thời không tạo log thứ hai.

## Dữ liệu và quy tắc

- `LifestyleSurvey`: một bản/user với revision. `PersonalPlan`: bản nháp sửa được, bản đã xuất bản bất biến, snapshot survey/target/timezone và bảy ngày cụ thể.
- `PersonalPlanState`: các activation theo ngày hiệu lực, compare-and-swap và requestId; một plan có hiệu lực trên mỗi ngày. Plan kết thúc không tự lặp. Các ngày bị plan khác thay thế không được ghi dưới plan cũ.
- `ActivityLog`: riêng với gym, không làm thay đổi set, volume hoặc PR. Ngày tập đã qua thiếu log hiển thị bỏ lỡ; ngày nghỉ không tính bỏ lỡ.
- `FoodLog.sourcePlanId/sourcePlanItemId`: partial unique index theo user/plan/item. Sao chép bữa bỏ các liên kết nguồn, vì đây là lần ăn khác.
- Server tính dinh dưỡng từ Food, không tin macro client gửi. Dữ liệu món đổi sau xem trước phải tải lại và xác nhận; bản nháp có thể lưu lại kể cả chưa chỉnh để làm mới snapshot.
- Survey/target/timezone thay đổi trước apply trả 409 và yêu cầu xem/tạo lại. Target thay đổi sau apply chỉ cảnh báo, không sửa plan/lịch sử cũ.
- API xác thực và lọc userId trên mọi truy vấn. Store plan kiểm tra tài khoản và generation, bỏ phản hồi cũ sau reset/đăng xuất.

## Nhắc lịch

Nhắc hoạt động dùng lịch cục bộ Expo Notifications, khóa riêng `fittrack-reminder-plan-*`, giờ tuyệt đối theo timezone plan. Chỉ nhắc các ngày còn hiệu lực chưa hoàn thành/bỏ qua, lấy cả plan hiện tại và các activation tương lai. Lập tối đa 14 nhắc hoạt động gần nhất để dành chỗ cho nhắc gym/dinh dưỡng; làm mới khi đăng nhập, foreground, áp dụng/lưu khảo sát, đổi ngôn ngữ hoặc cập nhật trạng thái. Tắt nhắc ở khảo sát hủy nhắc plan; không tự bật nhắc gym và không thêm lịch bữa ăn thứ hai.

## Bộ tạo bản đầu và giới hạn

- Bộ tạo quy tắc `rules-v1` là bản đầu. Bản nháp mới dùng Gemini `ai-pt-v1`, có giải thích theo ngày và thích nghi với phản hồi; lỗi AI được hiển thị, không âm thầm thay bằng quy tắc. Giới hạn 5 lượt tạo/ngày, dữ liệu món và dinh dưỡng được server kiểm tra. Xem [AI PT](AI_PT.md).
- Yoga là cấu trúc buổi nhẹ theo lớp/hướng dẫn viên phù hợp trình độ, không có video hay hướng dẫn tư thế 3D mới. Tham khảo [NCCIH: Yoga](https://www.nccih.nih.gov/health/yoga-effectiveness-and-safety). Đi bộ gồm bắt đầu nhẹ, đi thoải mái và chậm dần; tham khảo [NHS: Walking for health](https://www.nhs.uk/live-well/exercise/walking-for-health/).
- Đề xuất món là khẩu phần theo dữ liệu thư viện, ưu tiên món đã chọn và loại món muốn tránh; không phải thực đơn tối ưu đồng thời tất cả macro. Thiếu món phù hợp hiển thị trống/tổng thiếu, không bịa món hay dinh dưỡng.
- Lựa chọn muốn tránh không bảo đảm sàng lọc dị ứng vì dữ liệu thành phần chưa đầy đủ. Không đổi công thức tính target và không tự cộng kcal vận động vào hạn mức ăn.
- Bản nháp/khảo sát chưa lưu giữ trong phiên theo tài khoản khi đổi theme; khảo sát đã lưu và kế hoạch lưu trên server. Chưa có đồng bộ offline hoặc tự lưu mọi chỉnh sửa lên server.
- Chưa hỗ trợ phối hợp nhiều môn, chu kỳ nhiều tuần hoặc đổi ngày trực tiếp bằng kéo/thả.

## Kiểm thử

Các test `server/tests/personalPlan*.test.ts` kiểm tra lịch bảy ngày, ownership, validation, revision, snapshot, idempotency/concurrency, thay lịch, log món, sửa món và sao chép bữa. Các test `mobile/__tests__/personal-plan*.ts*` kiểm tra điều hướng, store khi reset, timezone, activation tương lai, duration, historical backfill, bản nháp và form dinh dưỡng.

Chưa kiểm tra trực quan qua trình duyệt kết nối hay trên Android/iOS thật trong phiên này. Cần thử navbar sáu mục trên màn hẹp, bàn phím, nhắc cục bộ, background/foreground và đổi tuần trên thiết bị.

Kết quả kiểm tra ngày 2026-10-06: server 28 suite / 273 test và mobile 37 suite / 168 test đều đạt; TypeScript hai phần đạt; lint 0 lỗi, 2 cảnh báo axios có sẵn; Expo web export đạt (47 route tĩnh); `git diff --check` đạt. Thay đổi chưa commit/push.
