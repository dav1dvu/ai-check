import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AI Slop & Plagiarism Detector | Kiểm tra AI Slop & Đạo văn (EN & VI)',
  description:
    'Nền tảng kiểm tra AI Slop và Đạo văn đa ngữ (Tiếng Việt & Tiếng Anh) chuẩn xác cao, bảo mật 100% không lưu văn bản, tối ưu trên Vercel Serverless.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-neutral-950 text-neutral-100 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
