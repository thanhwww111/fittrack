# FitTrack — Lịch tập tuần và điều hướng xuyên suốt

Ngày: 2026-10-01. Trạng thái: chờ duyệt bản thiết kế chi tiết.

## Mục tiêu đã thống nhất

Sau khi nhập thông tin cá nhân, người dùng chọn một lịch tuần để áp dụng. Lịch tự lặp theo thứ; buổi hôm nay phụ thuộc vào lịch này. Ví dụ Upper/Lower bốn buổi: Upper T2, Lower T3, Upper T6, Lower T7. Buổi bỏ lỡ không được dồn sang ngày khác.

Thông báo đầu ngày mặc định 07:00, sửa hoặc tắt được. Thanh điều hướng dưới xuất hiện trên mọi trang thuộc ứng dụng sau khi hoàn tất thiết lập; trang con có nút quay lại, popup có nút đóng.

Giữ các tính năng đã làm: lịch sử dinh dưỡng/tập luyện, bữa tùy chọn, AI dinh dưỡng, nút tăng giảm, buổi tập đề xuất. Giữ dữ liệu và kỷ lục hiện có.

## Hiện trạng và nguyên nhân

- Tab Tập luyện hiển thị mọi template dưới “Bắt đầu tập”, kể cả template không thuộc ngày hiện tại. Đây là nguyên nhân buổi ngực luôn xuất hiện.
- Có nhiều lịch được đánh dấu yêu thích, nhưng chưa có một lịch đang áp dụng duy nhất.
- Thiết lập ban đầu chỉ có cơ thể, mục tiêu và kết quả dinh dưỡng.
- Session chưa liên kết với một ngày trong lịch; chưa phân biệt ngày nghỉ và ngày bỏ lỡ.
- Nhắc tập dùng các thứ chọn riêng và nội dung chung, chưa lấy tên buổi từ lịch tuần.
- Các stack food/workout/ai/settings nằm ngoài tab navigator nên thanh tab biến mất trên trang con. Popup chọn bài tập chưa có nút đóng riêng.

## 1. Chọn và áp dụng lịch

Luồng người dùng mới: Cơ thể → Mục tiêu → Kết quả dinh dưỡng → Lịch tuần → vào ứng dụng.

Ở bước lịch tuần:

- Chọn lịch đề xuất: PPL, Upper/Lower, Full Body; có mô tả số buổi và bài tập.
- Chọn các thứ tập; số ngày phải khớp số buổi của lịch. App xếp các buổi theo thứ tăng dần, cho xem trước trước khi lưu.
- Upper/Lower bốn buổi mặc định T2/T3/T6/T7. Người dùng có thể đổi ngày trước khi áp dụng.
- Có lựa chọn tự tạo lịch tuần, dùng các buổi đề xuất hoặc buổi tự tạo; đây là tùy chọn nâng cao, không bắt người mới xếp từng ngày.
- Chỉ hoàn tất thiết lập khi lưu lịch thành công. Lỗi mạng giữ lựa chọn và cho thử lại, không tạo trùng lịch vì bấm lại.

Một tài khoản chỉ có một lịch đang áp dụng. “Áp dụng lịch” thay cho thao tác ghim/yêu thích dùng để quyết định buổi hôm nay. Có thể giữ nhiều lịch trong thư viện để chuyển sau.

Lần áp dụng đầu có hiệu lực từ hôm nay. Đổi lịch hoặc chỉnh lịch đang áp dụng có hiệu lực từ ngày mai, hiển thị rõ ngày hiệu lực trước khi lưu. Điều này giữ nguyên buổi đã bắt đầu hoặc hoàn thành hôm nay.

Người dùng cũ chưa chọn lịch được đưa vào bước chọn lịch sau khi đăng nhập, không bắt nhập lại hồ sơ. Không tự lấy template đầu tiên hoặc lịch yêu thích đầu tiên làm lịch đang áp dụng.

## 2. Buổi hôm nay và việc bỏ lỡ

Trang chủ và tab Tập luyện dùng cùng dữ liệu lịch hôm nay từ server:

- Ngày tập chưa bắt đầu: tên buổi, tên lịch, số bài, nút “Bắt đầu buổi hôm nay”.
- Đang tập: tiến độ và nút tiếp tục.
- Đã hoàn thành: tổng set, khối lượng, thời gian; không tự tạo thêm buổi khi bấm lại.
- Ngày nghỉ: “Hôm nay nghỉ”, kèm buổi tiếp theo.
- Chưa có lịch: hướng dẫn chọn lịch, không hiển thị một buổi bất kỳ.

Bỏ khu vực bắt đầu mọi template và “Buổi tập trống” khỏi dashboard. Template vẫn là thành phần của lịch để sửa bài, set, rep hoặc tự tạo buổi. Các API cũ cần cho tương thích được giữ trong giai đoạn chuyển đổi, nhưng app mới bắt đầu buổi qua lịch hôm nay.

Ngày tập đã qua mà không có buổi hoàn thành được ghi nhận “Đã bỏ lỡ”. Ngày nghỉ không tính bỏ lỡ. Không đánh dấu các ngày trước lần đầu áp dụng lịch là bỏ lỡ.

Buổi cũ còn dang dở khi đã qua ngày: đóng trạng thái đang tập, giữ các set đã ghi và ghi chú chưa hoàn thành; không tính như buổi hoàn thành hoặc tự dồn sang hôm nay. Đây là quy tắc theo ngày lịch: cần thể hiện trong màn đang tập nếu người dùng tập sát nửa đêm.

Lịch sử ngày hiển thị buổi dự kiến và trạng thái hoàn thành/bỏ lỡ/nghỉ cạnh số liệu thực tế. Buổi cũ không có liên kết lịch vẫn xem được, không tự suy đoán rằng nó hoàn thành một buổi mới trong lịch.

Nhắc bỏ lỡ bằng một ghi chú trong app, ví dụ “Hôm qua bạn chưa hoàn thành Lower. Hôm nay theo lịch là ngày nghỉ.” Không thêm thông báo lặp gây phiền và không ép tập bù.

## 3. Lưu dữ liệu lịch sử đúng theo thời điểm

Giữ WeeklyProgram làm bản lịch có thể chỉnh trong thư viện. Bổ sung các lần áp dụng lịch có ngày hiệu lực và snapshot gồm tên lịch, ngày tập, tên buổi, bài tập, set/rep/nghỉ. Chỉnh hoặc xóa template thư viện không làm thay đổi snapshot đã áp dụng.

Mỗi tài khoản có một bản ghi trạng thái lịch; việc thay snapshot hiệu lực phải cập nhật nguyên tử và chống hai request áp dụng cùng lúc. Khóa thử lại gắn với yêu cầu áp dụng để tránh tạo bản sao khi mất kết nối.

Buổi theo lịch liên kết với tài khoản, ngày dự kiến và phiên bản áp dụng. Dùng ràng buộc duy nhất cho tài khoản + ngày để chặn bắt đầu trùng trên hai thiết bị. Session giữ snapshot bài tập như hiện tại.

Trạng thái nghỉ/bỏ lỡ được tính từ snapshot và session theo ngày, kể cả khi người dùng không mở app nhiều ngày. Không phụ thuộc một tác vụ phải chạy đúng nửa đêm. Việc đóng session cũ được đối soát khi truy cập lịch hoặc thao tác session; thao tác ghi/hoàn thành buổi hết hạn phải trả lỗi rõ ràng.

Mọi tính ngày và thứ dùng múi giờ tài khoản. Snapshot giữ múi giờ lúc áp dụng để thay múi giờ sau này không viết lại lịch sử. Số liệu khối lượng chỉ tính buổi/set hợp lệ đã hoàn thành; buổi bỏ lỡ không tạo số liệu tập giả.

## 4. Hợp đồng API dự kiến

- Giữ CRUD thư viện lịch và template hiện có.
- Thêm thao tác áp dụng lịch với lựa chọn ngày, ngày hiệu lực và khóa thử lại; kiểm tra lịch/template thuộc tài khoản.
- Thêm API lịch đang áp dụng và lịch theo khoảng ngày: ngày, thứ, buổi dự kiến, trạng thái, session liên quan, buổi tiếp theo.
- Thêm thao tác bắt đầu buổi hôm nay: server quyết định ngày và snapshot; không tin tên buổi hoặc template do client tự chọn.
- Mở rộng lịch sử ngày hiện có để chứa trạng thái theo lịch; giữ các trường dinh dưỡng và workout hiện tại để không phá màn cũ.
- Giữ dữ liệu session cũ và đường xem chi tiết; không xóa/reset dữ liệu khi chuyển sang lịch tuần.

Tên route/schema cụ thể được chốt trong kế hoạch triển khai sau khi duyệt thiết kế này.

## 5. Nhắc tập đầu ngày

Khi áp dụng lịch, đề nghị quyền thông báo hệ điều hành và cho bật/tắt nhắc. Mặc định giờ 07:00; tài khoản đã chủ động tắt thông báo không bị tự bật lại.

Nội dung: “Hôm nay lịch tập của bạn là Upper · 6 bài tập”. Chạm thông báo mở tab Tập luyện, luôn tải lại lịch hiện tại để tránh bắt đầu nhầm từ thông báo cũ.

Ngày nhắc lấy từ lịch đang áp dụng, bỏ phần chọn ngày nhắc tập riêng. Ngày nghỉ không nhắc đi tập. Đổi lịch, giờ nhắc, đăng nhập/đăng xuất hoặc mở lại app sẽ đồng bộ/hủy lịch nhắc liên quan.

Dùng thông báo cục bộ có ngày giờ cụ thể theo múi giờ lịch, đặt trước tối đa 28 ngày và cập nhật khi mở app. Tối đa 28 nhắc tập + 24 nhắc dinh dưỡng hiện tại, trong giới hạn 64 lịch của iOS. Không yêu cầu thêm dịch vụ push hoặc cron để hoàn thành đợt này.

Giới hạn cần hiển thị/trình bày chính xác: quyền hệ điều hành có thể bị từ chối; bản web không hỗ trợ luồng thông báo native hiện có; nếu không mở app quá 28 ngày thì cần mở lại để đặt tiếp. Không tuyên bố đã xác nhận thông báo nền khi chỉ chạy unit test.

## 6. Thanh điều hướng và quay lại/đóng

Chọn tổ chức các màn ứng dụng trong một khung điều hướng có thanh dưới dùng chung. Giữ năm mục Trang chủ, Dinh dưỡng, Tập luyện, Tiến độ, Cá nhân; trang con vẫn đánh dấu đúng mục cha. Giữ URL và các liên kết từ thông báo hiện tại khi tổ chức lại route.

Phạm vi: mọi trang đã đăng nhập và hoàn tất thiết lập, bao gồm ghi món, lịch sử, AI, chỉnh lịch, chỉnh hồ sơ, cài đặt, đang tập. Login/register/quên mật khẩu và thiết lập ban đầu không hiện navbar để không bỏ qua bước bắt buộc.

Thanh dưới chiếm không gian bố cục và tôn trọng safe area, không đè nút lưu hoặc nội dung cuối trang. Chuyển tab trong lúc tập không kết thúc buổi. Không tạo stack vô hạn do bấm tab nhiều lần.

Trang con có nút quay lại ở header. Nếu mở trực tiếp bằng deep link và không có màn trước, quay về mục cha thay vì nút không hoạt động. Các tab gốc không cần nút quay lại.

Popup chọn bài có nút X/Đóng rõ ràng và nhãn trợ năng; kiểm tra thao tác Back trên Android. Dialog xác nhận có Hủy/Đóng. Khi popup chặn thao tác, navbar phía sau không nhận chạm; đóng popup trả về nguyên trạng thái màn trước.

Với form đang có thay đổi chưa lưu, quay lại/đóng/chuyển tab phải có xử lý nhất quán để không mất dữ liệu âm thầm: giữ bản nháp trong phiên hoặc xác nhận bỏ thay đổi theo từng luồng. Không ngăn chuyển tab chỉ vì có session đang tập.

## 7. Kiểm thử và tiêu chí nghiệm thu

- Người mới nhập hồ sơ, chọn Upper/Lower T2/T3/T6/T7, lưu thành công và vào đúng ngày hiện tại.
- Người cũ giữ dữ liệu, chỉ cần chọn lịch; yêu thích cũ không khiến ngực bị ghim.
- Ngày nghỉ, buổi hôm nay, hoàn thành, bỏ lỡ, qua nửa đêm và nhiều ngày không mở app đều đúng múi giờ.
- Đổi lịch ngày mai không sửa quá khứ/hôm nay; sửa template không sửa snapshot lịch sử.
- Áp dụng/bắt đầu đồng thời hoặc thử lại không tạo trùng; không truy cập lịch/session tài khoản khác.
- Lịch sử ngày vẫn có dinh dưỡng, khối lượng, thời gian và các session cũ.
- Nhắc 07:00 đúng tên buổi và ngày; đổi lịch/đăng xuất hủy lịch cũ; từ chối quyền không khóa ứng dụng.
- Navbar hiện trên toàn bộ trang thuộc phạm vi, tab được chọn đúng, deep link và nút quay lại có đích hợp lệ.
- Popup có nút đóng; chuyển tab không mất buổi đang tập; form chưa lưu được giữ hoặc xác nhận bỏ.
- Chạy đầy đủ test server/mobile, TypeScript và lint; kiểm tra trực quan route chính trên bản chạy được. Ghi riêng phần chưa xác minh trên điện thoại/thông báo nền.

## Ngoài phạm vi

Không tự dồn lịch, tập bù, tự điều chỉnh cường độ bằng AI hoặc tạo hệ thống cron/push mới. Không xóa dữ liệu tập cũ. Không commit/push hoặc triển khai khi chưa được yêu cầu.

## Bước tiếp theo

Duyệt bản thiết kế này, sau đó viết kế hoạch triển khai có thứ tự backend → kiểm thử → onboarding/lịch → thông báo → điều hướng → kiểm thử tổng thể. Chọn cách thực hiện kế hoạch trước khi bắt đầu sửa code sản phẩm.
