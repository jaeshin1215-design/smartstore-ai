import type { Metadata } from "next";
import { Geist, Geist_Mono, EB_Garamond } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});

export const metadata: Metadata = {
  title: "SellFit",
  description: "AI로 스마트스토어 셀러의 모든 작업을 자동화해주는 앱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      translate="no"
      className={`${geistSans.variable} ${geistMono.variable} ${ebGaramond.variable} h-full antialiased notranslate`}
    >
      <head>
        {/* 크롬 자동 번역이 상품명·라벨을 재번역해 화면을 깨뜨리는 것 방지 (2026-07-10 삭제사고 원인) */}
        <meta name="google" content="notranslate" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
