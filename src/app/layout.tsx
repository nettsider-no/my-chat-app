import type { Metadata, Viewport } from "next";
import { GeistSans } from 'geist/font/sans'; // Импортируем крутой шрифт Geist Sans
import Script from "next/script";
import "./globals.css";

// МЕТАДАННЫЕ (Наш паспорт приложения)
export const metadata: Metadata = {
  title: "Messenger | Приватный чат",
  description: "Мой личный защищенный мессенджер в стиле Apple",
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
  themeColor: "#f5f5f7",
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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k='messenger-theme';var t=localStorage.getItem(k);if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
        {/* Внедряем CSS-переменные прямо здесь для удобства */}
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --bg-login: url('/bg-login.png');
            }
          `
        }} />
      </head>
      {/* Класс {GeistSans.className} применит шрифт ко всему сайту */}
      <body className={`${GeistSans.className} antialiased mac-desktop-bg min-h-dvh`}>
        
        {/* --- КОД ONESIGNAL (Оставляем как есть) --- */}
        <Script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" strategy="beforeInteractive" />
        <Script id="onesignal-init" strategy="afterInteractive" dangerouslySetInnerHTML={{
          __html: `
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            OneSignalDeferred.push(async function(OneSignal) {
              await OneSignal.init({
                appId: "9485fb3c-fdf8-4d2c-b4d3-8cecaf4e347c",
              });
            });
          `
        }} />
        {/* --- КОНЕЦ КОДА ONESIGNAL --- */}
        
        {children}
      </body>
    </html>
  );
}