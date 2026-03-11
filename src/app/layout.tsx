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

// === 2. НАСТРОЙКА НАЗВАНИЯ САЙТА И ИКОНКИ ===
export const metadata: Metadata = {
  title: "Messenger | Приватный чат", // То, что будет написано на вкладке
  description: "Мой личный защищенный мессенджер",
  icons: {
    icon: '/favicon.ico', // Твоя красивая иконка
    apple: '/favicon.ico', // Иконка для добавления на экран iPhone
  },
  // Эти настройки сделают так, что если ссылку кинуть в Telegram, появится красивая карточка
  openGraph: {
    title: "Messenger",
    description: "Присоединяйся к моему приватному чату!",
    type: "website",
  }
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