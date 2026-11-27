# AGENTS.md — Quy chuẩn Phát triển Dự án Ví An Tâm × PayGuard AI

Tài liệu này là **quy chuẩn kỹ thuật bắt buộc** cho toàn bộ quá trình thiết kế, lập trình, kiểm thử và triển khai dự án **Ví An Tâm × PayGuard AI** (tham chiếu ý tưởng gốc tại [ViAnTam.md](file:///d:/Study/MyProject/MoMo%20TechDays/ViAnTam.md)). Mọi thành viên và AI coding agent phải tuân thủ nghiêm ngặt trước khi viết bất kỳ dòng code nào.

---

## 1. Mục tiêu Cốt lõi, Đối tượng Người dùng & Ràng buộc Phi chức năng

### 1.1. Mục tiêu cốt lõi
Xây dựng hệ thống **Trợ lý Tài chính Cá nhân & Khiên Kiểm định Ý định Giao dịch (Transaction Intent Verification)** nhằm phòng chống lừa đảo thao túng tâm lý **Authorized Push Payment (APP) Fraud** tại Việt Nam (giả danh công an, thuế, điện lực, shipper, tuyển CTV, lừa cọc...) ngay **trước bước chuyển tiền VietQR**.

Hệ thống trả lời câu hỏi cốt lõi: *"Điều người dùng nghĩ mình đang trả tiền có khớp với bản chất thực tế của giao dịch và ngữ cảnh tin nhắn hay không?"*, được triển khai trực tuyến 100% qua **03 điểm chạm hợp pháp**:
1. **Web Guard Portal (PWA):** Kiểm định tin nhắn, link lạ, ảnh chụp đoạn chat và mã VietQR.
2. **Chrome Extension (Manifest V3):** Cảnh báo trực tiếp trên trình duyệt (Zalo Web, Facebook Web, trang thanh toán).
3. **Checkout Middleware Simulator (B2B2C SDK Demo):** Mô phỏng bước *Pre-Payment Check* tích hợp trong cổng thanh toán/ví điện tử đối tác.

### 1.2. Đối tượng người dùng
- **Người dùng cuối (B2C):** Cá nhân sử dụng ví điện tử và chuyển khoản VietQR tại Việt Nam, đặc biệt ưu tiên **người lớn tuổi** hoặc người dễ bị thao túng tâm lý qua Zalo, Telegram, Facebook, SMS.
- **Người bảo hộ / Gia đình:** Con cái hoặc người thân thiết lập quy tắc bảo vệ bằng tiếng Việt tự nhiên (*Natural Language Policy Vault*) và nhận cảnh báo xác nhận chéo (*Dual-Approval Shield*).
- **Đối tác / Ban Giám Khảo (B2B2C Demo):** Trải nghiệm luồng tích hợp SDK kiểm định trước thanh toán qua Checkout Simulator và MCP Tool Layer.

### 1.3. Ràng buộc phi chức năng (Non-Functional Requirements)

#### A. Bảo mật & Quyền riêng tư dữ liệu (Security & Privacy)
- **PII Masking bắt buộc:** Trước khi gửi bất kỳ văn bản hoặc dữ liệu nào ra API LLM bên ngoài, tầng `Input_Sanitizer` phải dùng Regex/NER để che (mask) số CCCD/CMND, mã OTP, mật khẩu, số điện thoại cá nhân nhạy cảm và phần giữa số tài khoản (nếu không cần thiết cho bộ giải mã VietQR).
- **Anti-Prompt-Injection:** Mọi dữ liệu đầu vào không đáng tin cậy (tin nhắn chat, URL, nội dung trích xuất từ ảnh/QR) phải được bọc trong thẻ phân tách `<untrusted_content>...</untrusted_content>` khi đưa vào prompt LLM. Tuyệt đối không nối chuỗi thô vào system instructions.
- **Deterministic Hard Override:** Nếu Threat Intel APIs trả về dương tính (link độc hại/lừa đảo) hoặc giao dịch vi phạm *Két sắt Chính sách* (Policy Vault), Backend **bắt buộc ghi đè** `risk_level = "HIGH"` và kích hoạt Cooling-off (30–60 giây) bất kể LLM đánh giá thế nào.
- **Giảm thiểu lưu trữ dữ liệu nhạy cảm:** Ảnh chụp màn hình chat/QR chỉ xử lý in-memory; không lưu ảnh thô dài hạn xuống database/storage nếu không có mục đích demo đã được ẩn danh hóa.

#### B. Độ trễ phản hồi (Latency SLA)
- **End-to-End Pipeline Latency:** Tổng thời gian xử lý từ lúc nhận request kiểm định đến khi trả về Risk Decision phải đạt **≤ 2.5 – 3.0 giây** (P95 ≤ 3.5 giây).
- **Tầng ML/NLP nội bộ:** Các mô hình **PhoBERT** và **XGBoost** chạy qua **ONNX Runtime** in-process cùng **Isolation Forest** phải đạt độ trễ **20–50ms/request**.
- **Thực thi song song (Fan-out) & Timeout:** Các node `VietQR_Decoder`, `ThreatIntel_Node`, `PhoBERT_Node`, và `Finance_Anomaly_Node` phải chạy song song. Mọi lời gọi Threat Intel API bên ngoài (`api.chongluadao.vn`, URLhaus, PhishTank, Google Safe Browsing) phải đặt timeout cứng (khuyến nghị **800ms–1200ms**) để không làm nghẽn pipeline.
- **Caching:** Sử dụng **Redis** để cache kết quả tra cứu URL/domain và hash của tin nhắn/QR lặp lại nhằm giảm độ trễ và tránh vượt rate-limit API ngoài.

#### C. Giới hạn chi phí Token & LLM (Token Budget & Cost Control)
- **Pre-filter bằng ML nhẹ:** Luôn chạy PhoBERT + XGBoost + Rule Engine trước hoặc song song để giảm tải cho LLM; chỉ kích hoạt phân tích sâu của Multimodal LLM khi cần tổng hợp/đối chiếu ý định hoặc đọc ảnh chụp màn hình.
- **Giới hạn kích thước đầu vào:** Cắt gọn/tóm tắt nội dung chat đầu vào (tối đa **1.500–2.000 ký tự** sau khi sanitize); resize và nén ảnh chụp màn hình về kích thước hợp lý trước khi gửi Gemini Vision API.
- **Structured Output ngắn gọn:** Bắt buộc LLM trả về đúng JSON Schema qua Pydantic (`stated_intent`, `detected_transaction_nature`, `intent_mismatch_score`, `manipulation_tactics`, `exact_evidence_quotes`) với `max_output_tokens <= 1024`.
- **Giám sát Token:** Mọi lời gọi LLM phải ghi nhận `prompt_tokens`, `completion_tokens`, `total_tokens` và `latency_ms` vào structured logs để kiểm soát ngân sách.

---

## 2. Tech Stack Chuẩn (Tách bạch Frontend — Backend — AI Pipeline)

Kiến trúc được thiết kế theo hướng **Modular Monolith cho MVP**, dễ triển khai trực tuyến 100% nhưng tách bạch ranh giới rõ ràng để có thể tách service khi mở rộng:

| Tầng (Layer) | Công nghệ chuẩn | Trách nhiệm chính |
| :--- | :--- | :--- |
| **Frontend (Web & Simulator)** | **Next.js (App Router, TypeScript)** + **Tailwind CSS** + **PWA** | Web Guard Portal, Checkout Middleware Simulator, Sổ chi tiêu & Anomaly Dashboard, Policy Vault UI, Mini Risk Entity Graph UI. Deploy trên **Vercel**. |
| **Frontend (Browser Extension)** | **Chrome Extension (Manifest V3)** + TypeScript | Context menu *"Kiểm tra với Ví An Tâm"*, quét link/nội dung trên Zalo Web/Facebook Web, hiển thị popup cảnh báo gọi API Backend. |
| **Backend (API & Core Logic)** | **FastAPI (Python 3.11+)** + **Pydantic v2** + **SQLAlchemy / AsyncPG** | API Gateway, PII Masking, Auth/Demo Session, Quản lý Ngân sách & Giao dịch, Policy Vault Engine, Cooling-off & Guardian Alert (Telegram/Email), Global Error Handling. Deploy trên **Cloud Run / Render**. |
| **AI Pipeline (Isolated Module)** | **LangGraph (`StateGraph`)** + **Google Gemini API** + **ONNX Runtime** (`PhoBERT`, `XGBoost`) + **scikit-learn** (`Isolation Forest`) + **NetworkX** + **MCP Server** | Giải mã EMVCo VietQR, NLP Scam Detection, URL Phishing Classification, Anomaly Detection, RAG (`pgvector` trên PhishVN/SMS/data_scam), Intent Verification LLM, Hard Override Guardrails, đóng gói MCP Tool Layer. |
| **Data & Cache** | **PostgreSQL + `pgvector`** + **Redis** | Lưu trữ giao dịch, Policy Vault, vector embeddings kịch bản lừa đảo (`pgvector`), cache Threat Intel & trạng thái phiên Cooling-off (`Redis`). |

> **Nguyên tắc tách bạch:**
> - **Frontend** tuyệt đối không chứa logic chấm điểm rủi ro, không gọi trực tiếp LLM hay Threat Intel APIs.
> - **Backend (Routers/Services)** chỉ giao tiếp với **AI Pipeline** qua một interface/contract duy nhất (`IntentVerificationInput` -> `IntentVerificationResult`), không nhúng prompt hay logic suy luận AI vào HTTP controller.

---

## 3. Quy tắc Spec-Driven Development (SDD) — BẮT BUỘC

Thư mục `docs/specs/` là **Nguồn chân lý duy nhất (Single Source of Truth)** cho toàn bộ hệ thống.

### Quy trình làm việc bắt buộc
1. **Đối chiếu trước khi code:** Trước khi khởi tạo hoặc chỉnh sửa bất kỳ module nào (Frontend component, API endpoint, Database model, LangGraph node, MCP tool), lập trình viên/agent **phải đọc spec tương ứng** trong `docs/specs/`.
2. **Tạo Spec trước khi tạo Module mới:** Nếu module chưa có file spec trong `docs/specs/`, **không được viết code ngay**. Phải soạn file spec (mô tả mục tiêu, input/output schema, business rules, error codes, non-functional constraints) trong `docs/specs/` trước.
3. **Quy tắc Dừng khi có Mâu thuẫn (Stop-and-Sync):**
   - Nếu trong quá trình code hoặc kiểm thử phát hiện **bất kỳ mâu thuẫn nào** giữa code, ý tưởng mới và tài liệu trong `docs/specs/` (ví dụ: thay đổi tên trường JSON, đổi ngưỡng `risk_score` của Cooling-off, thêm trạng thái mới, đổi luồng LangGraph):
   - **DỪNG NGAY VIỆC VIẾT CODE.**
   - Cập nhật file spec trong `docs/specs/` trước để thống nhất contract.
   - Sau khi spec đã được cập nhật, mới tiếp tục viết/sửa code và test bám sát theo spec đó.
4. **Cấu trúc tối thiểu trong `docs/specs/`:**
   - `docs/specs/architecture-overview.md` — Kiến trúc tổng thể & luồng dữ liệu.
   - `docs/specs/api-contracts.md` — Toàn bộ REST API endpoints, request/response schemas, error codes.
   - `docs/specs/ai-pipeline.md` — LangGraph `StateGraph`, Pydantic Structured Output, PII Masking rules, Hard Override rules, ONNX model specs.
   - `docs/specs/database-schema.md` — Bảng PostgreSQL, `pgvector` schema, Redis key conventions.
   - `docs/specs/frontend-flows.md` — Luồng Web Guard, Checkout Simulator, Chrome Extension.

---

## 4. Quy ước Đặt tên, API Response, Error Handling & Bảo mật Keys

### 4.1. Quy ước đặt tên thư mục & mã nguồn
Cấu trúc thư mục gốc chuẩn của dự án:
```text
/
├── AGENTS.md                  # Quy chuẩn bắt buộc (file này)
├── ViAnTam.md                 # Tài liệu ý tưởng gốc
├── .env.example               # Mẫu biến môi trường (không chứa secret thật)
├── .gitignore                 # Bắt buộc ignore .env, weights nặng, node_modules, __pycache__
├── docs/
│   └── specs/                 # Spec-Driven Development (SSOT)
├── frontend/                  # Next.js PWA + Checkout Simulator (kebab-case cho folders/routes)
├── extension/                 # Chrome Extension Manifest V3
├── backend/                   # FastAPI + AI Pipeline (snake_case cho Python packages/modules)
│   ├── app/
│   │   ├── api/               # Routers (chỉ nhận request, validate, gọi service)
│   │   ├── core/              # Config (pydantic-settings), logging, security, exceptions
│   │   ├── models/            # SQLAlchemy ORM models
│   │   ├── schemas/           # Pydantic Request/Response & Envelope schemas
│   │   ├── services/          # Business logic (finance, policy_vault, guardian, guard)
│   │   ├── repositories/      # DB & Redis data access
│   │   └── ai/                # AI Pipeline tách biệt hoàn toàn
│   │       ├── graph/         # LangGraph StateGraph & nodes
│   │       ├── models/        # ONNX wrappers (PhoBERT, XGBoost), Isolation Forest
│   │       ├── tools/         # VietQR parser, Threat Intel clients, Entity Graph
│   │       ├── prompts/       # Prompt templates (có <untrusted_content> guard)
│   │       └── mcp/           # Unified MCP Tool Layer server
│   └── tests/                 # Unit & integration tests
└── ml_training/               # Notebooks/scripts chuẩn bị PhishVN, SMS, data_scam & export ONNX
```

- **Python (`backend/`, `ml_training/`):** Thư mục và file dùng `snake_case.py`; Class dùng `PascalCase`; biến/hàm dùng `snake_case`; hằng số dùng `UPPER_SNAKE_CASE`.
- **TypeScript (`frontend/`, `extension/`):** Thư mục route/feature dùng `kebab-case`; React Component dùng `PascalCase.tsx`; hooks/utils dùng `camelCase.ts` (ví dụ `useGuardCheck.ts`).
- **Docs (`docs/specs/`):** Dùng `kebab-case.md`.

### 4.2. API Response Format chuẩn
Mọi REST API endpoint của Backend **bắt buộc** trả về JSON theo cấu trúc Envelope thống nhất:

**Trường hợp thành công (`2xx`):**
```json
{
  "success": true,
  "data": {},
  "meta": {
    "request_id": "req_01J...",
    "timestamp": "2026-11-27T13:00:00Z",
    "latency_ms": 1420,
    "degraded_sources": []
  },
  "error": null
}
```

**Trường hợp thất bại (`4xx`, `5xx`):**
```json
{
  "success": false,
  "data": null,
  "meta": {
    "request_id": "req_01J...",
    "timestamp": "2026-11-27T13:00:00Z",
    "latency_ms": 38,
    "degraded_sources": []
  },
  "error": {
    "code": "INVALID_VIETQR_FORMAT",
    "message": "Không thể giải mã chuỗi VietQR. Vui lòng kiểm tra lại ảnh hoặc mã QR.",
    "details": {}
  }
}
```

### 4.3. Quy chuẩn Error Handling
- **Global Exception Handler:** Đăng ký tập trung tại FastAPI (`app/core/exceptions.py`). Không tự trả về JSON lỗi rời rạc bên trong từng router.
- **Mã lỗi chuẩn hóa (`error.code`):** Viết hoa `UPPER_SNAKE_CASE` và được định nghĩa trước trong `docs/specs/api-contracts.md` (ví dụ: `VALIDATION_ERROR`, `UNAUTHORIZED`, `POLICY_BLOCKED`, `INVALID_VIETQR_FORMAT`, `RATE_LIMIT_EXCEEDED`, `EXTERNAL_SERVICE_TIMEOUT`, `INTERNAL_SERVER_ERROR`).
- **Không rò rỉ thông tin nội bộ:** Không bao giờ trả stack trace, tên bảng SQL, hoặc dữ liệu PII chưa che vào `error.message` hoặc `error.details`.
- **Graceful Degradation (Chịu lỗi từng phần):**
  - Nếu một Threat Intel API ngoài bị timeout hoặc lỗi 5xx, **không** làm fail toàn bộ quá trình kiểm định. Ghi nhận tên nguồn lỗi vào `meta.degraded_sources`, log cảnh báo theo `request_id` và tiếp tục chấm điểm bằng các nguồn còn lại.
  - Nếu Gemini LLM API lỗi hoặc vượt timeout, fallback về kết quả tổng hợp từ PhoBERT + XGBoost + Threat Intel + Policy Vault kèm thông báo rõ ràng.

### 4.4. Quy tắc Không Hardcode API Keys & Secrets
- **Nghiêm cấm tuyệt đối** việc ghi cứng (hardcode) bất kỳ API key, token, mật khẩu, chuỗi kết nối DB/Redis hoặc secret nào (`GEMINI_API_KEY`, `CHONGLUADAO_API_KEY`, `SAFE_BROWSING_API_KEY`, `PHISHTANK_API_KEY`, `URLHAUS_AUTH_KEY`, `TELEGRAM_BOT_TOKEN`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, v.v.) trong source code, test, hay tài liệu spec.
- **Quản lý tập trung qua Environment Variables:** Backend nạp cấu hình qua `pydantic-settings` từ `.env` (chỉ dùng cho local/deploy env) và `.env` bắt buộc nằm trong `.gitignore`.
- **File `.env.example`:** Luôn cập nhật đầy đủ danh sách biến môi trường với giá trị giả lập/placeholder mỗi khi thêm tích hợp mới.
- **An toàn Logging:** Không log giá trị biến môi trường, API keys, hoặc header `Authorization` / `X-API-Key` ra stdout hoặc file log.
