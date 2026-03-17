# T-memo (Threads & Instagram 收藏庫)

T-memo 是一個專為社群媒體重度使用者設計的 PWA (漸進式網頁應用)，能讓你快速收藏、分類並透過 AI 總結你所看到的 Threads 與 Instagram 貼文。

## ✨ 核心特色功能

1. **自動解析社群連結**
   - 貼上 Threads 或 Instagram 貼文連結，系統會自動抓取預覽圖 (OG Image)、作者資訊與內容片段。
2. **AI 自動摘要與分類 (Gemini)**
   - 整合 Google Gemini API，一鍵產生「精簡一句話重點摘要」，並自動為文章加上 Tag 或自動建議放進對應的資料夾。
3. **PWA 支援 (漸進式網頁應用)**
   - 支援安裝到手機桌面，提供類原生 App 的體驗（包含獨立視窗與離線快取支援）。
4. **多樣化的視覺版面**
   - **主頁資訊流**：以時間軸方式瀏覽所有收藏。
   - **分類資料夾**：類似檔案系統的視覺呈現，方便管理不同領域的知識（例如：設計靈感、程式教學、美食清單）。
   - **精華區 (Highlights)**：採用 Masonry 瀑布流排版，凸顯 AI 摘要與個人筆記，隱藏不必要的細節，打造專屬您的靈感牆。

## 🛠 技術棧與架構

- **前端框架**: Next.js 14 (App Router) + React
- **樣式**: Tailwind CSS
- **圖示庫**: Lucide React
- **資料庫與身分驗證**: Supabase (PostgreSQL, Row Level Security)
- **AI 服務**: Google Gemini API (@google/generative-ai)

## 🚀 本地開發環境設置

### 1. 安裝套件
確保您的環境已安裝 Node.js，然後執行：

```bash
npm install
# 或使用 yarn, pnpm
```

### 2. 環境變數設定
請在專案根目錄建立 `.env.local` 檔案，並填入以下資訊：

```env
# Supabase 連線資訊 (請至 Supabase 專案設定取得)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Gemini API 金鑰 (請至 Google AI Studio 申請)
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Supabase 資料庫 Schema
專案根目錄下附有 `supabase_schema.sql`，請將該檔案內的 SQL 語法複製並貼上至您的 Supabase SQL Editor 中執行，以建立所需的資料表 (`profiles`, `categories`, `memos`) 與權限控制 (RLS)。

### 4. 啟動開發伺服器

執行以下指令，然後開啟 [http://localhost:3000](http://localhost:3000)：

```bash
npm run dev
```

## 📱 PWA 安裝說明

開啟本網站後，您可以透過瀏覽器的功能將其加到主畫面：
- **iOS (Safari)**：點擊底部的「分享」圖示，選擇「加入主畫面」。
- **Android (Chrome)**：點擊右上角選單，選擇「加入主畫面」或「安裝應用程式」。
