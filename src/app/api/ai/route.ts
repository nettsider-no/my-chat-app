import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Инициализируем OpenAI (он сам возьмет ключ из .env.local)
const openai = new OpenAI();

export async function POST(req: Request) {
  try {
    // Получаем данные от нашего чата (фронтенда)
    const { text, action, modifier, context } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Текст не передан' }, { status: 400 });
    }

    // Собираем историю переписки в одну строку (чтобы ИИ понимал, о чем речь)
    let contextString = "";
    if (context && context.length > 0) {
      contextString = `\n\nКонтекст последних сообщений из чата (для правильного понимания смысла):\n"${context.join('\n')}"`;
    }

    let systemPrompt = "Ты умный ИИ-помощник. Твоя задача — редактировать или переводить текст.";

    // ЛОГИКА 1: Если юзер нажал на Магическую палочку (Смена стиля)
    if (action === 'style') {
      systemPrompt = `Перепиши следующий текст пользователя. 
      Стиль, который нужно строго использовать: "${modifier}". 
      Сохрани исходный смысл, но адаптируй под этот стиль. Идеально исправь все ошибки. 
      Выведи ТОЛЬКО готовый текст, без кавычек, без приветствий и без твоих комментариев.${contextString}`;
    } 
    // ЛОГИКА 2: Если юзер нажал на Перевод (Глобус)
    else if (action === 'translate') {
      systemPrompt = `Переведи следующий текст пользователя на этот язык: "${modifier}". 
      Используй контекст переписки, если слова многозначные. 
      Выведи ТОЛЬКО перевод, без кавычек и без оригинального текста.${contextString}`;
    }

    // Стучимся в OpenAI (gpt-4o-mini сейчас самая дешевая и умная модель для таких задач)
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', 
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: 0.7, // 0.7 дает креативность, но не позволяет ИИ "галлюцинировать"
    });

    const result = response.choices[0].message.content?.trim();

    // Возвращаем результат обратно в наш React
    return NextResponse.json({ result });

  } catch (error: unknown) {
    console.error('Ошибка OpenAI API:', error);
    return NextResponse.json({ error: 'Ошибка при обработке ИИ' }, { status: 500 });
  }
}