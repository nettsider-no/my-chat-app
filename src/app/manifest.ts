import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Messenger | Приватный чат', // Полное название приложения
    short_name: 'Messenger',          // Короткое название под иконкой на экране
    description: 'Мой личный защищенный мессенджер',
    start_url: '/',                   // С какой страницы запускать приложение
    display: 'standalone',            // МАГИЯ ЗДЕСЬ: Убирает браузерную строку!
    background_color: '#ffffff',      // Цвет фона при запуске
    theme_color: '#f5f5f7',
    icons: [
      {
        src: '/icon-512.png',          // Путь к твоей новой стеклянной иконке
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',       // Позволяет телефону красиво обрезать иконку
      },
    ],
  }
}