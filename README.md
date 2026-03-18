# T-memo | Threads & Instagram 知識管理工具

T-memo 是一個專為社群媒體重度使用者設計的 PWA（漸進式網頁應用），能讓你快速收藏、分類並透過 AI 摘要你所看到的 Threads 與 Instagram 貼文，並支援雲端同步與離線使用。

---

## 核心功能

### 1. 自動解析社群連結
貼上 Threads 或 Instagram 貼文連結，系統會自動擷取：
- **作者帳號**（`@handle`）與個人簡介
- **貼文內容摘錄**（前 50 字）
- **預覽圖片**（OG Image，透過 Server 端 Proxy 繞過 CORS 限制）

解析策略採雙層備援：
1. **Threads oEmbed API**（最穩定，優先使用）
2. **Cheerio HTML 爬蟲**（fallback，解析 og: meta 標籤）

### 2. AI 自動摘要與分類（Google Gemini）
- 一鍵呼叫 `Gemini 2.5 Flash Lite`，產生一句話重點摘要（繁體中文，50 字以內）
- 自動推薦 1–3 個標籤（`ai_tags`）
- 根據標籤自動比對現有分類資料夾，預先選取最相關的類別

### 3. 多視圖瀏覽
| 視圖 | 說明 |
|------|------|
| **首頁資訊流** | 時間軸卡片列表，支援關鍵字搜尋、分類篩選、精華篩選 |
| **分類資料夾** | 格狀資料夾視覺，顯示每個分類的 memo 數量 |
| **精華牆（Highlights）** | CSS Masonry 瀑布流，凸顯 AI 摘要與個人筆記 |

### 4. 手勢互動（Framer Motion）
- MemoCard 左滑：顯示「封存」與「刪除」操作按鈕
- 滑動有彈性回彈動畫，並限制左滑最大距離 160px

### 5. PWA 支援
- `manifest.json` + Service Worker（Cache-First 策略）
- 可安裝到手機桌面，以獨立視窗模式啟動
- 離線時顯示 fallback 頁面，不崩潰

### 6. 身份驗證與資料安全
- Supabase Email/Password 認證
- Email 驗證信 → OAuth Callback 換取 Session
- 所有資料表啟用 **Row Level Security（RLS）**，確保使用者只能存取自己的資料

---

## 技術棧

| 類別 | 技術 |
|------|------|
| **前端框架** | Next.js 16 (App Router) + React 19 |
| **樣式** | Tailwind CSS v4 |
| **動畫** | Framer Motion |
| **圖示庫** | Lucide React |
| **資料庫 / 身分驗證** | Supabase（PostgreSQL + RLS + SSR Client） |
| **AI 服務** | Google Gemini 2.5 Flash Lite（`@google/generative-ai`） |
| **HTML 解析** | Cheerio |
| **PWA** | 自訂 Service Worker + Web App Manifest |

---

## 專案結構

```
src/
├── app/
│   ├── api/
│   │   ├── parse-link/route.ts       # 連結解析（oEmbed + Cheerio 雙策略）
│   │   ├── generate-summary/route.ts # AI 摘要產生（Gemini）
│   │   └── image-proxy/route.ts      # 圖片 CORS Proxy（快取 1 年）
│   ├── auth/
│   │   ├── callback/route.ts         # OAuth 驗證碼換 Session
│   │   └── auth-code-error/page.tsx  # 驗證失敗提示頁
│   ├── login/page.tsx                # 登入 / 註冊頁面
│   ├── page.tsx                      # 主頁（資訊流 + 搜尋 + 篩選）
│   ├── layout.tsx                    # Root Layout（PWA meta + Shell）
│   └── globals.css                   # Tailwind 全域樣式與 CSS 變數
├── components/
│   ├── layout/
│   │   └── Shell.tsx                 # 桌面側邊欄 + 手機底部導航
│   ├── MemoCard.tsx                  # Memo 卡片（列表模式 / 精華模式）
│   ├── AddMemoModal.tsx              # 新增 Memo 彈窗（含解析 + AI 流程）
│   ├── EditMemoModal.tsx             # 編輯 Memo 彈窗
│   ├── MemoDetailModal.tsx           # Memo 詳細資訊彈窗
│   ├── CategoryBoard.tsx             # 分類資料夾視圖
│   ├── CategoryManager.tsx           # 分類 CRUD 管理
│   ├── CategoryManagerModal.tsx      # 分類管理彈窗
│   ├── EssentialBoard.tsx            # 精華牆（Masonry）
│   └── ui/
│       ├── Button.tsx                # 通用按鈕元件
│       └── Card.tsx                  # 通用卡片元件
├── hooks/
│   └── useAuth.ts                    # 認證狀態 Hook
├── lib/
│   ├── supabase.ts                   # Browser Supabase Client
│   ├── supabase-server.ts            # Server-Side Supabase Client
│   ├── middleware.ts                 # Auth Session 刷新邏輯
│   └── utils.ts                     # cn() className 工具函式
└── middleware.ts                     # Next.js Middleware 設定
```

---

## 資料庫 Schema

共三張資料表，全部啟用 RLS：

```sql
-- 使用者個人資料
profiles (id, email, created_at)

-- 分類資料夾
categories (id, user_id, name, icon, created_at)

-- 收藏的 Memo
memos (
  id, user_id, url,
  author_handle, content_snippet, post_timestamp,
  category_id,          -- FK → categories（可為 null）
  is_essential,         -- 是否加入精華
  personal_note,        -- 個人筆記
  preview_image,        -- Base64 或原始 URL
  ai_summary,           -- AI 一句話摘要
  ai_tags,              -- AI 推薦標籤（text[]）
  created_at
)
```

---

## 本地開發設置

### 1. 安裝套件

```bash
npm install
```

### 2. 環境變數

在專案根目錄建立 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

### 3. 建立資料庫

將 `supabase_schema.sql` 的內容貼至 Supabase SQL Editor 執行，建立 `profiles`、`categories`、`memos` 資料表與 RLS 政策。

### 4. 啟動開發伺服器

```bash
npm run dev
# 開啟 http://localhost:3000
```

---

## PWA 安裝說明

- **iOS（Safari）**：點擊底部「分享」圖示 → 選擇「加入主畫面」
- **Android（Chrome）**：點擊右上角選單 → 選擇「安裝應用程式」

---

## 設計規格

| 項目 | 值 |
|------|----|
| 背景色 | `#0F172A`（深石板藍） |
| 主色調 | `#2DD4BF`（青藍色） |
| 精華標記 | Amber（琥珀色星星） |
| 刪除操作 | Rose（玫瑰紅） |
| 字體 | Arial / Helvetica（系統字體） |

---

## 常用指令

```bash
npm run dev      # 開發伺服器
npm run build    # 正式版本建置
npm start        # 啟動正式伺服器
npm run lint     # ESLint 檢查
```
