import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

// === 1. ЗАПРЕТ ЗУМА НА МОБИЛЬНЫХ (ФИКС ПОЛЕЙ ВВОДА) ===
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Запрещаем увеличивать больше 100%
  userScalable: false, // Запрещаем пользователю щипать экран для зума
};

export const metadata: Metadata = {
  title: "Messenger | Приватный чат",
  description: "Мой личный защищенный мессенджер",
  manifest: "/manifest.json", // Ссылка на наш манифест (Next.js сгенерирует .json сам)
  
  // Эти настройки сделают так, что верхняя полоска телефона станет синей (PWA)
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Messenger",
  },
  
  icons: {
    icon: '/favicon.ico',   // Маленькая иконка для вкладок ПК
    apple: '/icon-512.png', // Большая стеклянная иконка для Айфонов
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={inter.className}>{children}</body>
    </html>
  );
}