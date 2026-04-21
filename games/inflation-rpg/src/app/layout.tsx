import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

/**
 * 전역으로 사용할 기본 산세리프 폰트입니다.
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

/**
 * 전역으로 사용할 기본 고정폭(Mono) 폰트입니다.
 */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * 애플리케이션의 메타데이터 및 SEO 정보를 정의합니다.
 */
export const metadata: Metadata = {
  title: "무한성장: 조선의 검",
  description: "A web-based remake of Inflation RPG with Korean aesthetics",
};

/**
 * Next.js 애플리케이션의 최상위 레이아웃 컴포넌트입니다.
 * HTML 구조와 공통 리소스(폰트 등)를 설정합니다.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
