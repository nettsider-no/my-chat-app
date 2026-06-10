import type { Metadata, Viewport } from "next";
import { GeistSans } from 'geist/font/sans'; // Импортируем крутой шрифт Geist Sans
import { OneSignalLoader } from "@/src/components/OneSignalLoader";
import "./globals.css";

// МЕТАДАННЫЕ (Наш паспорт приложения)
export const metadata: Metadata = {
  title: "Messenger | Приватный чат",
  description: "Приватный мессенджер в стиле iOS 27 и Liquid Glass",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Messenger",
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-512.png',
  },
};

export const viewport: Viewport = {
  themeColor: "#f2f2f7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

// ВЕРСТКА: Добавляем GeistSans и CSS-переменные для картинок
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/* Внедряем CSS-переменные прямо здесь для удобства */}
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --bg-login: url('/bg-login.png');
            }
          `
        }} />
      </head>
      {/* GeistSans.variable даёт CSS-переменную --font-geist-sans:
          на Apple-устройствах рендерится родной SF, на остальных — Geist */}
      <body className={`${GeistSans.variable} antialiased ios-root-bg min-h-dvh`}>
        
        <OneSignalLoader />
        
        {children}
      </body>
    </html>
  );
}