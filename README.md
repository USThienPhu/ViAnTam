# ScamGuard Chat: Web nhắn tin tích hợp AI phát hiện lừa đảo

## 1. Giới thiệu

ScamGuard Chat là một web nhắn tin demo. Phần nhắn tin chỉ giữ ở mức tối thiểu. Trọng tâm của dự án là **xây dựng AI (LLM) nhận diện lừa đảo** và các tính năng bảo vệ người dùng đi kèm, như cảnh báo và báo cáo tài khoản.

Khi nghi ngờ một cuộc trò chuyện, người dùng bấm "Kiểm tra lừa đảo". Hệ thống phân tích hội thoại và trả về mức độ rủi ro, các dấu hiệu đáng ngờ và lời khuyên. Kết quả chỉ mang tính tham khảo, không khẳng định chắc chắn một người là kẻ lừa đảo.

## 2. Mục tiêu

- Xây dựng module AI/LLM phát hiện lừa đảo trong tin nhắn, đây là phần chính.
- Kết hợp nhiều nguồn tín hiệu (văn bản, link, tên người dùng, mã QR) thay vì chỉ đọc văn bản.
- Cung cấp cho người dùng các công cụ tự bảo vệ: cảnh báo, báo cáo, chặn.
- Có một web chat đơn giản đủ để demo luồng sử dụng thực tế.

## 3. Phạm vi

**Làm (mức đơn giản, đủ demo)**
- Đăng ký, đăng nhập.
- Chat 1-1 giữa các người dùng, gửi văn bản và ảnh (để gửi mã QR).

**Không làm**
- Chat nhóm, gọi thoại/video, mã hóa đầu cuối, ứng dụng di động.

**Tập trung phát triển**
- Module AI phát hiện lừa đảo và các tính năng an toàn (mục 4 và 5).

## 4. Tính năng AI phát hiện lừa đảo

Người dùng chọn một cuộc hội thoại và bấm "Kiểm tra lừa đảo". AI phân tích các yếu tố sau.

| Yếu tố | Nội dung phân tích |
|---|---|
| Nội dung hội thoại | Kịch bản lừa đảo quen thuộc: tạo áp lực thời gian, hứa lãi suất cao, giả danh ngân hàng/công an/shipper, yêu cầu OTP, mời đầu tư, tuyển cộng tác viên, tình cảm rồi vay tiền. |
| Đường link | Tên miền giả mạo (typosquatting), link rút gọn, tên miền mới lạ, trang giả ngân hàng. Có thể đối chiếu thêm với Google Safe Browsing hoặc danh sách chặn. |
| Tên người dùng | Giả danh tổ chức/người nổi tiếng/nhân viên hỗ trợ, ký tự lạ giống chữ thật, tên tài khoản mới tạo mang tính dẫn dụ. |
| Mã QR chuyển tiền | Đọc nội dung QR (ngân hàng, số tài khoản, tên chủ tài khoản, số tiền, nội dung chuyển khoản). Đối chiếu với danh sách tài khoản đã bị báo cáo trong hệ thống. |

**Kết quả trả về**
- Mức rủi ro: Thấp / Trung bình / Cao.
- Điểm rủi ro (0 đến 100).
- Danh sách dấu hiệu đáng ngờ, kèm trích dẫn đoạn tin nhắn liên quan.
- Loại lừa đảo nghi ngờ (đầu tư, giả danh, việc làm online, tình cảm, phishing...).
- Lời khuyên hành động cụ thể (không chuyển tiền, không cung cấp OTP, báo cáo, chặn).
- Dòng lưu ý: đây là đánh giá tham khảo của AI.

### 4.1. Câu hỏi làm rõ khi chưa chắc chắn

Khi điểm rủi ro nằm ở vùng lưng chừng (khoảng 30 đến 69), AI không kết luận ngay mà hỏi người dùng thêm. Mục đích là giảm nghi nhầm người tốt, ví dụ chủ trọ hoặc người bán hàng cá nhân thật.

**Nguyên tắc**
- Chỉ hỏi ở vùng chưa chắc chắn. Điểm từ 70 trở lên (hoặc link/tài khoản nằm trong danh sách đen) vẫn cảnh báo ngay, điểm dưới 30 không hỏi.
- Tối đa 3 câu, mỗi câu trả lời bằng một lần bấm: Có / Không / Không chắc.
- Hỏi về sự kiện kiểm chứng được ("họ chủ động liên hệ bạn trước không?"), không hỏi cảm nhận ("bạn thấy họ đáng tin không?").
- Câu "Không chắc" được tính như một tín hiệu bất lợi nhẹ, không bỏ qua.
- Dùng ngôn ngữ trung tính: "Chưa xác minh được đối phương", không viết "Đây là lừa đảo".
- Người đang bị dẫn dắt có thể được kẻ lừa đảo bảo trả lời "Có". Vì vậy ưu tiên câu hỏi dẫn tới một việc làm ngoài cuộc chat, ví dụ gọi lại bằng số đã lưu từ trước hoặc tự tra trang chính thức, rồi mới quay lại.

**Ngân hàng câu hỏi mẫu**

| Tình huống | Câu hỏi | Tác động tới điểm |
|---|---|---|
| Chuyển tiền / mã QR | Đối phương chủ động liên hệ bạn trước, hay bạn tự tìm họ? | Họ liên hệ trước: tăng |
| Chuyển tiền / mã QR | Họ tự xưng là cơ quan hoặc công ty nhưng yêu cầu chuyển vào tài khoản cá nhân? | Có: tăng mạnh |
| Chuyển tiền / mã QR | Bạn đã từng giao dịch với họ, hoặc có người quen xác nhận? | Có: giảm |
| Chuyển tiền / mã QR | Bạn có thể gặp trực tiếp hoặc gọi lại bằng số đã lưu từ trước không? | Gọi lại và khớp: giảm. Không thể: tăng nhẹ |
| Mọi tình huống | Họ có yêu cầu bạn giữ bí mật hoặc phải chuyển trong hôm nay? | Có: tăng mạnh |
| Việc làm online | Bạn có phải nạp hoặc chuyển tiền trước để nhận tiền công không? | Có: tăng mạnh |
| Việc làm online | Số tiền yêu cầu nạp có tăng sau mỗi lần không? | Có: tăng mạnh |
| Việc làm online | Bạn đã rút được tiền về tài khoản của mình sau khi nạp chưa? | Chưa: tăng |
| Giả danh người thân | Bạn đã gọi lại bằng số trong danh bạ cũ chưa? | Chưa: tăng, gợi ý làm ngay |
| Đầu tư | Lãi suất hoặc cam kết lợi nhuận có được ghi trong hợp đồng, công ty có tra cứu được không? | Không: tăng |

**Cách dùng câu trả lời**
- Mỗi câu trả lời cộng hoặc trừ một lượng điểm cố định theo bảng trọng số, không để LLM tự quyết định. Cách này giúp giải thích được vì sao điểm thay đổi và dễ kiểm thử.
- Hiển thị lý do thay đổi, ví dụ: "Điểm tăng từ 55 lên 78 vì họ liên hệ bạn trước và yêu cầu chuyển vào tài khoản cá nhân."
- Nếu vẫn ở vùng chưa chắc chắn sau khi hỏi, đưa ra một bước xác minh cụ thể (gọi số chính thức, tra cứu công ty) thay vì ép chọn có/không.
- Với trường hợp rủi ro cao, vẫn cho nút "Tôi đã kiểm tra và vẫn muốn tiếp tục", đi kèm một đoạn chờ ngắn. Không chặn hoàn toàn để tránh người dùng bỏ sản phẩm.

## 5. Tính năng an toàn cho người dùng

- **Báo cáo tài khoản:** chọn lý do, mô tả, đính kèm tin nhắn làm bằng chứng.
- **Chặn người dùng:** người bị chặn không nhắn được nữa.
- **Cảnh báo tự động:** hiển thị nhãn cảnh báo trên tài khoản bị báo cáo nhiều lần, hoặc khi tin nhắn có link/QR nằm trong danh sách đen.
- **Danh sách đen nội bộ:** tài khoản ngân hàng, link và người dùng đã bị báo cáo. AI dùng danh sách này làm tín hiệu bổ sung.
- **Lịch sử kiểm tra:** người dùng xem lại các kết quả đã kiểm tra.
- **Phản hồi về kết quả AI:** nút "Đúng / Sai" để thu thập dữ liệu cải thiện mô hình.
- **Mẹo phòng chống lừa đảo:** trang hướng dẫn nhận biết các hình thức lừa đảo phổ biến.
- **Quản trị (tùy chọn):** trang xem và xử lý các báo cáo.

## 6. Luồng hoạt động của AI

```
Người dùng bấm "Kiểm tra"
        |
        v
Thu thập dữ liệu: tin nhắn gần nhất, link, tên đối phương, ảnh QR
        |
        v
Tiền xử lý
  - Trích xuất link và phân tích tên miền
  - Giải mã QR để lấy thông tin tài khoản nhận tiền
  - Đối chiếu danh sách đen và số lần bị báo cáo
        |
        v
Gọi LLM với prompt + dữ liệu đã trích xuất
        |
        v
LLM trả về JSON: mức rủi ro, điểm, dấu hiệu, loại lừa đảo, lời khuyên
        |
        v
Điểm ở vùng chưa chắc chắn (30 đến 69)?
  - Có: hỏi tối đa 3 câu làm rõ (mục 4.1), cập nhật điểm theo trọng số cố định
  - Không: bỏ qua bước này
        |
        v
Hiển thị kết quả và lưu lịch sử
```

Kiến trúc kết hợp luật (rule-based) và LLM: bước tiền xử lý cung cấp dữ kiện chắc chắn, LLM đánh giá ngữ cảnh và diễn giải bằng ngôn ngữ dễ hiểu.

## 7. Công nghệ đề xuất

| Thành phần | Lựa chọn |
|---|---|
| Backend | Node.js + Express (hoặc Python FastAPI) |
| Realtime chat | Socket.IO |
| Cơ sở dữ liệu | SQLite |
| Giao diện | HTML, CSS, JavaScript (hoặc React) |
| LLM | Dịch vụ API (OpenAI, Gemini, Claude...) hoặc mô hình chạy tại máy (Ollama) |
| Đọc mã QR | Thư viện giải mã QR (jsQR, pyzbar) |
| Kiểm tra link | Phân tích tên miền, tùy chọn Google Safe Browsing API |

## 8. Cấu trúc dữ liệu chính

- `users`: id, tên đăng nhập, mật khẩu đã băm, ngày tạo.
- `messages`: id, người gửi, người nhận, nội dung, ảnh, thời gian.
- `reports`: id, người báo cáo, người bị báo cáo, lý do, mô tả, bằng chứng.
- `blocks`: người chặn, người bị chặn.
- `blacklist`: loại (link / tài khoản ngân hàng / người dùng), giá trị, số lần báo cáo.
- `scam_checks`: id, người yêu cầu, cuộc hội thoại, kết quả JSON, thời gian, phản hồi đúng/sai, điểm trước và sau khi hỏi làm rõ.
- `clarification_answers`: id, scam_check_id, mã câu hỏi, câu trả lời (có / không / không chắc), điểm cộng hoặc trừ.

## 9. Quyền riêng tư và bảo mật

- Chỉ phân tích khi người dùng chủ động bấm kiểm tra.
- Hiện thông báo trước khi gửi: nội dung hội thoại sẽ được gửi tới dịch vụ AI.
- Chỉ gửi số tin nhắn gần nhất cần thiết, không gửi mật khẩu hay thông tin nhạy cảm khác.
- Mật khẩu được băm (bcrypt), API key để trong biến môi trường, không đưa vào mã nguồn.
- Kiểm tra và giới hạn loại, dung lượng ảnh tải lên. Giới hạn tần suất gọi AI để tránh lạm dụng.
- Coi nội dung tin nhắn là dữ liệu không đáng tin, chống prompt injection (kẻ lừa đảo có thể cài câu lệnh vào tin nhắn để đánh lừa AI).

## 10. Hạn chế đã biết

- AI có thể báo nhầm (người tốt bị nghi ngờ) hoặc bỏ sót (kẻ lừa đảo tinh vi). Câu hỏi làm rõ (mục 4.1) giảm báo nhầm nhưng không loại bỏ hoàn toàn, vì người dùng có thể trả lời theo lời kẻ lừa đảo.
- Kết quả không thay thế cho cơ quan chức năng hay ngân hàng.
- Độ chính xác phụ thuộc vào chất lượng prompt, mô hình và dữ liệu danh sách đen.

## 11. Kế hoạch thực hiện

1. Thiết lập dự án, cơ sở dữ liệu, đăng ký/đăng nhập.
2. Chat 1-1 cơ bản và gửi ảnh.
3. Module AI: phân tích văn bản, trả JSON có cấu trúc.
4. Mở rộng AI: phân tích link, tên người dùng, đọc mã QR.
5. Báo cáo, chặn, danh sách đen, cảnh báo tự động.
6. Lịch sử kiểm tra, phản hồi đúng/sai, trang mẹo phòng chống.
7. Bộ kiểm thử với các mẫu hội thoại lừa đảo và hội thoại bình thường để đo độ chính xác.
8. Hoàn thiện giao diện tiếng Việt và viết hướng dẫn chạy.
9. (Mở rộng) Chế độ luyện tập với chatbot mô phỏng lừa đảo, xem mục 12.

## 12. Tính năng mở rộng (làm sau khi hoàn thành tính năng chính)

Chừa sẵn chỗ trong thiết kế để thêm chế độ **luyện tập nhận biết lừa đảo**: người dùng nhắn tin với chatbot đóng vai kẻ lừa đảo, để làm quen với các cuộc hội thoại có dấu hiệu lừa đảo trong môi trường an toàn.

**Cách hoạt động**
- Người dùng chọn một kịch bản (giả danh công an, đầu tư lãi cao, việc làm online, tình cảm rồi vay tiền, shipper/ngân hàng yêu cầu OTP...) và trò chuyện với chatbot như trong chat thường.
- Chatbot dẫn dắt theo kịch bản. Ví dụ sau khoảng 3 lượt trao đổi, chatbot gửi mã QR chuyển tiền kèm nội dung sai, hoặc tự xưng là công an và yêu cầu chuyển tiền "xác minh".
- Trong lúc trò chuyện, giao diện có hai nút:
  - **"Khả năng lừa đảo"**: người dùng bấm khi cho rằng đối phương đang lừa đảo.
  - **"Khả năng không lừa đảo"**: người dùng bấm khi cho rằng cuộc trò chuyện an toàn.
- Chatbot không biết trước người dùng sẽ chọn gì. Sau khi người dùng chọn, hệ thống công bố đáp án, chỉ ra các dấu hiệu đã xuất hiện ở từng lượt và giải thích cách nhận biết.
- Kịch bản không phải lúc nào cũng là lừa đảo. Hệ thống trộn thêm một số cuộc trò chuyện bình thường, để người dùng không chọn "lừa đảo" một cách máy móc.

**Điểm cần chừa sẵn khi thiết kế**
- Tách "đối phương" thành một giao diện chung (người thật hoặc chatbot), để sau này thay bằng chatbot mà không sửa phần chat.
- Mỗi kịch bản lưu dưới dạng dữ liệu: loại, các bước, thời điểm xuất hiện dấu hiệu (QR sai nội dung, giả danh...), và đáp án đúng (lừa đảo hay không).
- Bảng dữ liệu dự kiến `practice_sessions`: id, người dùng, kịch bản, lựa chọn của người dùng, đáp án, số lượt trao đổi trước khi chọn, thời gian.
- Có thể dùng lại module AI phát hiện lừa đảo ở mục 4 để giải thích dấu hiệu sau mỗi phiên.
- Chỉ hiển thị rõ đây là chế độ mô phỏng. Chatbot không đưa mã QR, số tài khoản hay đường link thật.

**Có thể làm thêm**
- Điểm số và thống kê tỉ lệ nhận biết đúng theo từng loại lừa đảo.
- Độ khó tăng dần (kịch bản tinh vi hơn).

## 13. Cần xác nhận trước khi làm

- Dùng LLM nào: API bên ngoài (cần key) hay chạy tại máy (Ollama)?
- Có dùng Google Safe Browsing không, hay chỉ phân tích tên miền?
- Ngôn ngữ lập trình ưu tiên: Node.js hay Python?
- Có cần trang quản trị xử lý báo cáo không?
