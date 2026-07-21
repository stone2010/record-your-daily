import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '我的日记 - 本地优先的轻量级日记应用',
  description: '一款离线优先的日记/随手记应用，支持Markdown编辑，VIP用户可解锁云端同步功能',
  keywords: '日记,备忘录,Markdown,离线优先,PWA',
  authors: [{ name: 'Diary App' }],
  manifest: '/record-your-daily/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '我的日记',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: '我的日记',
    title: '我的日记 - 本地优先的轻量级日记应用',
    description: '一款离线优先的日记/随手记应用，支持Markdown编辑',
  },
  twitter: {
    card: 'summary',
    title: '我的日记',
    description: '一款离线优先的日记/随手记应用',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9fafb' },
    { media: '(prefers-color-scheme: dark)', color: '#111827' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}