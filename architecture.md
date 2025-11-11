# Vmind Architecture Document v1.8

This document outlines the architectural principles, design decisions, and technical strategies for the Vmind application. It serves as a guide for development, ensuring consistency, maintainability, and scalability.

---

### 1. Mục tiêu & Phạm vi (Goals & Scope)

*   **Mục tiêu hệ thống:** Xây dựng Vmind trở thành một ứng dụng học từ vựng chuyên sâu, toàn diện và hấp dẫn (gamified) dành cho người học nghiêm túc. Hệ thống phải mang lại trải nghiệm mượt mà, cá nhân hóa và có khả năng đồng bộ hóa trên nhiều thiết bị.
*   **Yêu cầu chức năng (Functional):**
    *   Quản lý bộ từ vựng (Tables): Tạo, sửa, xóa, import/export.
    *   Các chế độ học tập đa dạng: Flashcards (lặp lại ngắt quãng), Multiple Choice, Typing, True/False, Scramble, Theater, Dictation.
    *   Hỗ trợ học tập bằng AI: Gemini API được dùng để giải thích từ, tạo câu ví dụ, phát âm.
    *   Theo dõi tiến độ: Hệ thống XP, cấp độ (level), chuỗi học tập (streak) và huy hiệu (badges).
    *   Tính năng phụ trợ: Reading Space (đọc và trích xuất từ vựng), Journal (nhật ký học tập).
    *   Cộng đồng: Chia sẻ và tải về các bộ từ vựng từ thư viện chung (Community Library).
*   **Yêu cầu phi chức năng (Non-functional):**
    *   **Performance:** Giao diện phản hồi nhanh, thời gian tải dưới 3 giây. Tối ưu cho các bộ từ vựng lớn (>1000 từ).
    *   **Offline-first:** Người dùng khách (Guest) có thể sử dụng các tính năng cốt lõi offline nhờ `localStorage`.
    *   **Availability:** Đảm bảo uptime 99.9% cho các dịch vụ backend (Supabase).
    *   **Scalability:** Kiến trúc backend (Supabase) có khả năng mở rộng. Frontend phải được thiết kế để không bị suy giảm hiệu năng khi thêm tính năng mới.
    *   **Maintainability:** Codebase phải dễ đọc, dễ hiểu và dễ nâng cấp.
*   **Lý do xây dựng:** Vmind giải quyết vấn đề của các phương pháp học từ vựng truyền thống (nhàm chán, kém hiệu quả) bằng cách tích hợp gamification, thuật toán lặp lại ngắt quãng và sức mạnh của AI, tạo ra một công cụ học tập cá nhân hóa và hiệu quả cao.

---

### 2. Nguyên tắc thiết kế & Triết lý kiến trúc

*   **Nguyên tắc Code Base:**
    *   **Single Responsibility Principle (SRP):** Mỗi component/module chỉ đảm nhiệm một chức năng duy nhất. Ví dụ: `HomeScreen` chỉ hiển thị tổng quan, `TableScreen` quản lý chi tiết một table. Cần tiếp tục chia nhỏ các component lớn.
    *   **Don't Repeat Yourself (DRY):** Tái sử dụng hooks, components, và utility functions. `useLocalStorage` là một ví dụ tốt.
    *   **Keep It Simple, Stupid (KISS):** Ưu tiên các giải pháp đơn giản và hiệu quả. Tránh lạm dụng các thư viện phức tạp khi chưa cần thiết.
*   **Lựa chọn kiến trúc:**
    *   **Frontend:** Modular Monolith. Vmind là một Single Page Application (SPA) được tổ chức theo từng "module" chức năng (màn hình).
    *   **Backend:** Backend-as-a-Service (BaaS). Sử dụng Supabase là một quyết định chiến lược đúng đắn, giúp giảm tải công việc backend.
    *   **Domain-Driven Design (DDD):** Các khái niệm cốt lõi đã được định nghĩa trong `types.ts` (Table, VocabRow, UserStats). Cần chính thức hóa các Bounded Contexts (ví dụ: Learning, UserManagement, Content).

*   **Triết lý Trải nghiệm Người dùng (UX Philosophy): "Khu vườn tri thức Zen"**
    *   **Tĩnh lặng và Tập trung (Calmness and Focus):** Giao diện phải tối giản, loại bỏ các yếu tố không cần thiết gây phân tâm. Sử dụng nhiều không gian trắng (whitespace) để tạo cảm giác thoáng đãng, giúp người dùng tập trung vào nội dung học.
    *   **Tự nhiên và Hữu cơ (Natural and Organic):** Bảng màu lấy cảm hứng từ thiên nhiên: màu xanh của rêu, tre, màu be của đá cuội, màu trắng ngà của giấy. Thay thế các đường viền sắc nét bằng bóng đổ (`box-shadow`) mềm mại, nhiều lớp để tạo chiều sâu tự nhiên. Các hiệu ứng chuyển động (animation) phải mượt mà, tinh tế, không đột ngột.
    *   **Mạch lạc và Trực quan (Clarity and Intuitiveness):** Luồng người dùng phải rõ ràng như một lối đi trong vườn. Mọi tương tác đều phải mang lại cảm giác tự nhiên, không cần suy nghĩ.
    *   **Phản hồi Nhẹ nhàng (Gentle Feedback):** Thay vì các màu báo lỗi (đỏ tươi) hoặc thành công (xanh lá cây) quá chói, sử dụng các tông màu đất dịu hơn (ví dụ: màu đất nung `terracotta` cho lỗi, màu xanh ngọc bích `jade` cho thành công).

---

### 3. Thiết kế API & Giao tiếp

*   **External APIs:**
    *   **Supabase:** Giao tiếp qua Supabase JS Client.
    *   **Gemini API:** Toàn bộ logic gọi Gemini được đóng gói trong `services/geminiService.ts`. Đây là một pattern tốt, giúp dễ dàng thay thế hoặc nâng cấp model AI sau này.
*   **Error Handling Standard:** Cần chuẩn hóa việc xử lý lỗi từ API.
    *   Tạo một Global Error Boundary trong React để bắt các lỗi render.
    *   Sử dụng một hàm `handleApiError` chung để xử lý lỗi mạng, lỗi 4xx, 5xx và hiển thị thông báo nhất quán cho người dùng qua Toast/Notification.

---

### 4. Kiến trúc Frontend (Frontend Architecture)

*   **Tổ chức thư mục:** Chuyển đổi từ cấu trúc hiện tại (`components`, `hooks`, `services`) sang cấu trúc theo **feature/domain** để tăng khả năng bảo trì và mở rộng khi dự án lớn hơn.
    ```
    /src
      /features
        /TableManagement
          /components (TableCard, TableScreen)
          /hooks (useTableData)
          /services
        /StudySession
          /...
    ```
*   **State Management:** `AppContext.tsx` hiện đang quản lý quá nhiều state (vi phạm SRP) và gây ra "prop drilling". Đây là một "món nợ kỹ thuật" (technical debt) cần được giải quyết.
    *   **Chiến lược:** Tái cấu trúc, chuyển đổi sang một giải pháp quản lý state toàn cục hiệu quả hơn.
    *   **Đề xuất:**
        *   **Zustand:** Cho các state toàn cục, ít liên quan (ví dụ: UserStatsStore, SettingsStore). Giải pháp này nhẹ nhàng và hiệu quả hơn Redux cho quy mô hiện tại.
        *   **React Context + useReducer:** Cho các state liên quan chặt chẽ trong một domain cụ thể (ví dụ: StudySessionContext).

---

### 5. UI/UX & Design System

*   **Design Tokens:** Chuẩn hóa các giá trị thiết kế trong `tailwind.config.js` để tạo nên trải nghiệm "Zen green" đồng nhất.
*   **Colors (Bảng màu):** Lấy cảm hứng từ một khu vườn thiền Nhật Bản.
    *   `primary`: `zen-green-600` (Màu xanh rêu đậm, cho các nút kêu gọi hành động chính).
    *   `secondary`: `stone-500` (Màu xám đá cuội, cho các nút phụ).
    *   `background`: `bamboo-50` (Màu nền trắng ngà hoặc be rất nhạt, tạo cảm giác ấm áp).
    *   `surface`: `white` (Màu trắng tinh khiết cho các thẻ card, panel).
    *   `text-main`: `charcoal-800` (Màu đen than, mềm mại hơn màu đen tuyền).
    *   `text-subtle`: `stone-600` (Màu xám đá cho các văn bản phụ).
    *   `success`: `jade-500` (Màu xanh ngọc bích, dịu mắt).
    *   `error`: `terracotta-500` (Màu đất nung, một tông đỏ đất, ít gây căng thẳng).
*   **Typography (Kiểu chữ):**
    *   `font-family-sans`: `Nunito Sans` hoặc `Manrope` (Font sans-serif tròn trịa, hiện đại và dễ đọc cho UI).
    *   `font-family-serif`: `Lora` hoặc `Merriweather` (Font serif thanh lịch cho các nội dung đọc dài, tạo cảm giác học thuật).
    *   `font-size`: Hệ thống h1, h2, body, caption với tương phản vừa phải.
*   **Spacing (Khoảng cách):** Tăng cường sử dụng không gian trắng. Giữ hệ thống 4px cơ sở nhưng áp dụng các giá trị lớn hơn cho khoảng cách giữa các khối chính.
*   **Borders & Shadows (Viền & Bóng đổ):**
    *   Hạn chế tối đa việc sử dụng đường viền. Nếu cần, dùng màu rất nhạt như `bamboo-200`.
    *   Ưu tiên sử dụng `box-shadow` mềm, nhiều lớp để phân tách các thành phần, tạo cảm giác các lớp giao diện nổi nhẹ trên nền.
*   **Component Library:** Xây dựng thư viện component tái sử dụng (`<Button>`, `<Input>`, `<Card>`).
    *   **Khuyến nghị:** Sử dụng **Storybook** để phát triển và tài liệu hóa các component một cách độc lập.
*   **Accessibility (A11y) & Responsive:**
    *   Luôn đảm bảo `aria-label` phù hợp cho các yếu tố tương tác.
    *   Kiểm tra khả năng điều hướng bằng bàn phím (`tab-index`).
    *   Thiết kế phải responsive trên mobile, tablet, desktop.

---

### 6. Iconography & Assets Rules

*   **Iconography:** Thay thế object SVG hardcode trong `Icon.tsx`.
*   **Quy tắc:**
    *   **Lưới thiết kế:** 24x24px.
    *   **Phong cách:** Thay đổi sang `stroke-width: 2` và các thuộc tính `stroke-linecap="round"`, `stroke-linejoin="round"` để tạo ra các icon có đường nét mềm mại, bo tròn, thân thiện hơn.
    *   **Cảm hứng:** Các icon cần được thiết kế lại để lấy cảm hứng từ thiên nhiên và sự tối giản (ví dụ: icon "home" có thể là hình một chiếc lá, icon "settings" là hình các vòng tròn đồng tâm trên mặt nước).
*   **Assets:**
    *   **Hình ảnh:** Nén ảnh trước khi sử dụng (ưu tiên định dạng WebP).
    *   **Lazy Loading:** Áp dụng lazy loading cho hình ảnh và các component không cần thiết ngay lúc đầu.

---

### 7. Backend Design & Data Layer

*   **Database:** Supabase sử dụng PostgreSQL.
*   **Data Structure:** Code (`DataSyncManager.tsx`, `useTableStore.ts`, `TableScreen.tsx`) cho thấy hệ thống đã được chuẩn hóa (normalized). Dữ liệu không còn nằm trong một cột JSONB mà đã được tách ra các bảng riêng biệt trên Supabase: `profiles` (lưu `stats`, `settings`), `tables`, `vocab_rows`, `folders`, `notes`...
*   **Data Caching:** Sử dụng **React Query (TanStack Query)** để quản lý server state. Nó sẽ tự động xử lý caching, re-fetching, và các trạng thái loading/error, giúp đơn giản hóa code trong components.

---

### 8. Security & Compliance

*   **Authentication:** Supabase Auth.
*   **Authorization:** Cực kỳ quan trọng: Phải kích hoạt **Row Level Security (RLS)** trên bảng `profiles` của Supabase. Tạo policy để đảm bảo user chỉ có thể đọc và ghi vào dòng có `id` trùng với `auth.uid()` của chính họ.
*   **Input Validation:** Luôn xác thực dữ liệu đầu vào từ người dùng.
*   **API Keys:** `process.env.API_KEY` cho Gemini không bao giờ được lộ ra phía client.

---

### 9. Performance & Scalability

*   **Tối ưu Frontend:**
    *   **Code Splitting:** Sử dụng `React.lazy()` để tách các màn hình.
    *   **Memoization:** Sử dụng `React.memo`, `useMemo`, `useCallback` để tránh re-render không cần thiết.
    *   **Pagination:** Triển khai pagination cho các bảng có quá nhiều từ vựng.
*   **Tối ưu Backend (Supabase):**
    *   **Indexing:** Đánh index cho các cột thường được truy vấn khi chuyển sang các bảng riêng.
    *   **CDN:** Tận dụng CDN tích hợp sẵn của Supabase cho assets.

---

### 10. Observability (Monitoring / Logging / Tracing)

*   **Logging & Error Monitoring:** Tích hợp một dịch vụ như Sentry (báo cáo lỗi) hoặc LogRocket (ghi lại session).
*   **Performance Monitoring:** Theo dõi các chỉ số Core Web Vitals (LCP, FID, CLS).

---

### 11. CI/CD & DevOps Pipelines

*   **CI/CD Pipeline:** Thiết lập pipeline tự động bằng GitHub Actions.
    *   **Trigger:** Khi có push/merge vào branch `main` hoặc `develop`.
    *   **Steps:** `Install Dependencies` -> `Lint & Format` -> `Type Check` -> `Test` -> `Build` -> `Deploy`.
*   **Environments:** Có ít nhất 3 môi trường: `development` (local), `staging` (mirror production), và `production`, mỗi môi trường kết nối đến một project Supabase riêng.

---

### 12. Testing Strategy

Codebase hiện chưa có test. Cần xây dựng một chiến lược kiểm thử toàn diện:
*   **Unit Tests (Vitest/Jest + RTL):** Kiểm thử các hàm logic (trong `utils`), các hooks, và từng component UI nhỏ.
*   **Integration Tests (RTL):** Kiểm thử sự tương tác giữa các components trong một màn hình. Ví dụ: Thêm một từ vựng vào bảng và xác nhận nó xuất hiện trong danh sách.
*   **End-to-End (E2E) Tests (Cypress/Playwright):** Tự động hóa các luồng người dùng quan trọng nhất: Đăng ký -> Đăng nhập -> Tạo Table -> Bắt đầu một Study Session.

---

### 13. Versioning & Release Strategy

*   **Versioning:** Áp dụng Semantic Versioning (MAJOR.MINOR.PATCH).
*   **Release Strategy:**
    *   Sử dụng **Feature Flags/Toggles** để bật/tắt các tính năng lớn, cho phép kiểm thử trên production trước khi public rộng rãi.
    *   Luôn có kế hoạch **Rollback**: Có khả năng quay trở lại phiên bản ổn định trước đó một cách nhanh chóng nếu bản release mới gặp sự cố nghiêm trọng.

---

### 14. Operational Playbooks

Xây dựng các tài liệu "runbook" để xử lý các sự cố thường gặp:
*   **Sự cố API:** Phải làm gì khi Supabase hoặc Gemini API bị gián đoạn? (Hiển thị banner bảo trì, vô hiệu hóa các tính năng liên quan).
*   **Sự cố Đồng bộ hóa:** Hướng dẫn quy trình debug khi người dùng báo cáo mất dữ liệu hoặc dữ liệu không đồng bộ.

---

### 15. Documentation & Knowledge Base

*   **Architecture Documentation:** Chính tài liệu này là khởi đầu. Cần được cập nhật thường xuyên khi có những thay đổi lớn về kiến trúc.
*   **Component Documentation:** Sử dụng **Storybook** làm nguồn tài liệu sống (living documentation) cho toàn bộ Design System.
*   **Knowledge Base:** Sử dụng một nền tảng wiki nội bộ (Notion, GitHub Wiki) để lưu trữ các quyết định kiến trúc, hướng dẫn setup môi trường, và các quy trình phát triển chung của team.