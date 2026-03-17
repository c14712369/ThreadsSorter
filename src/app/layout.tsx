import type { Metadata } from "next";
import "./globals.css";
import Shell from "@/components/layout/Shell";

export const metadata: Metadata = {
  title: "T-memo | Threads 知識管理工具",
  description: "專為 Threads 設計的 PWA 知識管理工具，自動解析連結、結構化資訊與雲端同步。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className="antialiased">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
