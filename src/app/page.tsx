'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { ChangeEvent, ClipboardEvent, MouseEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { applyTheme, readStoredTheme, type ThemeMode } from '@/lib/theme'
import {
  IconChevronLeft,
  IconChevronRight,
  IconFilter,
  IconGear,
  IconGlobe,
  IconMic,
  IconMoon,
  IconPlus,
  IconSearch,
  IconSend,
  IconSun,
  IosAvatar,
  MessagesAppIcon,
} from '@/components/ios-ui'
import type {
  Profile,
  OutgoingContact,
  ChatMessage,
  MessageReaction,
  ContactAcceptedRow,
  ContactPendingIncomingRow,
  ContactOutgoingRow,
  UnreadMessageRow,
  ContactsPayloadNew,
} from '@/src/types/chat'

type UiLanguage = 'en' | 'no' | 'fr' | 'ar' | 'zh' | 'ru' | 'uk' | 'es'
const UI_LANG_OPTIONS: Array<{ code: UiLanguage; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'no', label: 'Norsk' },
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
  { code: 'zh', label: '中文' },
  { code: 'ru', label: 'Русский' },
  { code: 'uk', label: 'Українська' },
  { code: 'es', label: 'Español' },
]

type I18nKey =
  | 'appTitle'
  | 'loginTitle'
  | 'loginSubtitle'
  | 'emailPlaceholder'
  | 'passwordPlaceholder'
  | 'signIn'
  | 'signUp'
  | 'logout'
  | 'profile'
  | 'settings'
  | 'close'
  | 'language'
  | 'languageHint'
  | 'saving'
  | 'findUser'
  | 'requestEmailPlaceholder'
  | 'newRequests'
  | 'myRequests'
  | 'myFriends'
  | 'back'
  | 'online'
  | 'chooseFriendTitle'
  | 'chooseFriendSubtitle'
  | 'messagePlaceholder'
  | 'editing'
  | 'cancel'
  | 'copyText'
  | 'translate'
  | 'edit'
  | 'aiThinking'
  | 'aiTranslateLabel'
  | 'aiStyleLabel'
  | 'styleMenuTitle'
  | 'translateMenuTitle'
  | 'magicWandTitle'
  | 'translateTitle'
  | 'customLangPlaceholder'
  | 'go'
  | 'styleBusiness'
  | 'styleFriendly'
  | 'styleStrict'
  | 'styleSlang'
  | 'langEnglish'
  | 'langNorwegian'
  | 'langRussian'

const I18N: Record<UiLanguage, Record<I18nKey, string>> = {
  ru: {
    appTitle: 'Messenger',
    loginTitle: 'Вход',
    loginSubtitle: 'Войдите в аккаунт или создайте новый',
    emailPlaceholder: 'Ваш Email',
    passwordPlaceholder: 'Ваш Пароль',
    signIn: 'Войти',
    signUp: 'Рег-ция',
    logout: 'Выйти',
    profile: 'Профиль',
    settings: 'Настройки',
    close: 'Закрыть',
    language: 'Язык',
    languageHint: 'Сохраняется для вашего аккаунта.',
    saving: 'Сохранение…',
    findUser: 'Найти пользователя',
    requestEmailPlaceholder: 'Email для заявки',
    newRequests: 'Новые запросы',
    myRequests: 'Мои заявки',
    myFriends: 'Мои друзья',
    back: 'Назад',
    online: 'В сети',
    chooseFriendTitle: 'Выберите друга слева, чтобы начать общение',
    chooseFriendSubtitle: 'Как в Messages на iPhone',
    messagePlaceholder: 'Сообщение...',
    editing: '✏️ Редактирование',
    cancel: 'Отмена',
    copyText: 'Копировать текст',
    translate: 'Перевести',
    edit: '✏️ Редактировать',
    aiThinking: '✨ ИИ думает…',
    aiTranslateLabel: 'Перевод: {x}',
    aiStyleLabel: 'Стиль: {x}',
    styleMenuTitle: 'Изменить стиль',
    translateMenuTitle: 'Перевести текст',
    magicWandTitle: 'Магическая палочка',
    translateTitle: 'Перевод',
    customLangPlaceholder: 'Свой язык...',
    go: 'Go',
    styleBusiness: 'Деловой и вежливый',
    styleFriendly: 'Дружеский и веселый',
    styleStrict: 'Строгий и короткий',
    styleSlang: 'Дерзкий (Сленг)',
    langEnglish: 'Английский',
    langNorwegian: 'Норвежский',
    langRussian: 'Русский',
  },
  en: {
    appTitle: 'Messenger',
    loginTitle: 'Sign in',
    loginSubtitle: 'Sign in or create a new account',
    emailPlaceholder: 'Email',
    passwordPlaceholder: 'Password',
    signIn: 'Sign in',
    signUp: 'Sign up',
    logout: 'Log out',
    profile: 'Profile',
    settings: 'Settings',
    close: 'Close',
    language: 'Language',
    languageHint: 'Saved to your account.',
    saving: 'Saving…',
    findUser: 'Find user',
    requestEmailPlaceholder: 'Email to request',
    newRequests: 'New requests',
    myRequests: 'My requests',
    myFriends: 'My friends',
    back: 'Back',
    online: 'Online',
    chooseFriendTitle: 'Choose a friend on the left to start chatting',
    chooseFriendSubtitle: 'Like Messages on iPhone',
    messagePlaceholder: 'Message…',
    editing: '✏️ Editing',
    cancel: 'Cancel',
    copyText: 'Copy text',
    translate: 'Translate',
    edit: '✏️ Edit',
    aiThinking: '✨ AI is thinking…',
    aiTranslateLabel: 'Translate: {x}',
    aiStyleLabel: 'Style: {x}',
    styleMenuTitle: 'Change style',
    translateMenuTitle: 'Translate text',
    magicWandTitle: 'Magic wand',
    translateTitle: 'Translate',
    customLangPlaceholder: 'Custom language…',
    go: 'Go',
    styleBusiness: 'Business & polite',
    styleFriendly: 'Friendly & fun',
    styleStrict: 'Strict & concise',
    styleSlang: 'Bold (slang)',
    langEnglish: 'English',
    langNorwegian: 'Norwegian',
    langRussian: 'Russian',
  },
  no: {
    appTitle: 'Messenger',
    loginTitle: 'Logg inn',
    loginSubtitle: 'Logg inn eller opprett en ny konto',
    emailPlaceholder: 'E-post',
    passwordPlaceholder: 'Passord',
    signIn: 'Logg inn',
    signUp: 'Registrer',
    logout: 'Logg ut',
    profile: 'Profil',
    settings: 'Innstillinger',
    close: 'Lukk',
    language: 'Språk',
    languageHint: 'Lagres på kontoen din.',
    saving: 'Lagrer…',
    findUser: 'Finn bruker',
    requestEmailPlaceholder: 'E-post for forespørsel',
    newRequests: 'Nye forespørsler',
    myRequests: 'Mine forespørsler',
    myFriends: 'Mine venner',
    back: 'Tilbake',
    online: 'På nett',
    chooseFriendTitle: 'Velg en venn til venstre for å starte en chat',
    chooseFriendSubtitle: 'Som Messages på iPhone',
    messagePlaceholder: 'Melding…',
    editing: '✏️ Redigering',
    cancel: 'Avbryt',
    copyText: 'Kopier tekst',
    translate: 'Oversett',
    edit: '✏️ Rediger',
    aiThinking: '✨ AI tenker…',
    aiTranslateLabel: 'Oversett: {x}',
    aiStyleLabel: 'Stil: {x}',
    styleMenuTitle: 'Endre stil',
    translateMenuTitle: 'Oversett tekst',
    magicWandTitle: 'Tryllestav',
    translateTitle: 'Oversett',
    customLangPlaceholder: 'Eget språk…',
    go: 'Go',
    styleBusiness: 'Formell og høflig',
    styleFriendly: 'Vennlig og morsom',
    styleStrict: 'Strengt og kort',
    styleSlang: 'Frekk (slang)',
    langEnglish: 'Engelsk',
    langNorwegian: 'Norsk',
    langRussian: 'Russisk',
  },
  fr: {
    appTitle: 'Messenger',
    loginTitle: 'Connexion',
    loginSubtitle: 'Connectez-vous ou créez un compte',
    emailPlaceholder: 'E-mail',
    passwordPlaceholder: 'Mot de passe',
    signIn: 'Se connecter',
    signUp: 'S’inscrire',
    logout: 'Déconnexion',
    profile: 'Profil',
    settings: 'Paramètres',
    close: 'Fermer',
    language: 'Langue',
    languageHint: 'Enregistré sur votre compte.',
    saving: 'Enregistrement…',
    findUser: 'Trouver un utilisateur',
    requestEmailPlaceholder: 'E-mail de demande',
    newRequests: 'Nouvelles demandes',
    myRequests: 'Mes demandes',
    myFriends: 'Mes amis',
    back: 'Retour',
    online: 'En ligne',
    chooseFriendTitle: 'Choisissez un ami à gauche pour commencer',
    chooseFriendSubtitle: 'Comme Messages sur iPhone',
    messagePlaceholder: 'Message…',
    editing: '✏️ Modification',
    cancel: 'Annuler',
    copyText: 'Copier le texte',
    translate: 'Traduire',
    edit: '✏️ Modifier',
    aiThinking: '✨ L’IA réfléchit…',
    aiTranslateLabel: 'Traduire : {x}',
    aiStyleLabel: 'Style : {x}',
    styleMenuTitle: 'Changer le style',
    translateMenuTitle: 'Traduire le texte',
    magicWandTitle: 'Baguette magique',
    translateTitle: 'Traduire',
    customLangPlaceholder: 'Langue personnalisée…',
    go: 'Go',
    styleBusiness: 'Professionnel et poli',
    styleFriendly: 'Amical et fun',
    styleStrict: 'Strict et concis',
    styleSlang: 'Audacieux (argot)',
    langEnglish: 'Anglais',
    langNorwegian: 'Norvégien',
    langRussian: 'Russe',
  },
  ar: {
    appTitle: 'Messenger',
    loginTitle: 'تسجيل الدخول',
    loginSubtitle: 'سجّل الدخول أو أنشئ حسابًا جديدًا',
    emailPlaceholder: 'البريد الإلكتروني',
    passwordPlaceholder: 'كلمة المرور',
    signIn: 'دخول',
    signUp: 'تسجيل',
    logout: 'خروج',
    profile: 'الملف الشخصي',
    settings: 'الإعدادات',
    close: 'إغلاق',
    language: 'اللغة',
    languageHint: 'يتم حفظها في حسابك.',
    saving: 'جارٍ الحفظ…',
    findUser: 'ابحث عن مستخدم',
    requestEmailPlaceholder: 'بريد الطلب',
    newRequests: 'طلبات جديدة',
    myRequests: 'طلباتي',
    myFriends: 'أصدقائي',
    back: 'رجوع',
    online: 'متصل',
    chooseFriendTitle: 'اختر صديقًا من اليسار لبدء المحادثة',
    chooseFriendSubtitle: 'مثل Messages على Mac',
    messagePlaceholder: 'رسالة…',
    editing: '✏️ تعديل',
    cancel: 'إلغاء',
    copyText: 'نسخ النص',
    translate: 'ترجمة',
    edit: '✏️ تعديل',
    aiThinking: '✨ الذكاء الاصطناعي يفكر…',
    aiTranslateLabel: 'ترجمة: {x}',
    aiStyleLabel: 'النمط: {x}',
    styleMenuTitle: 'تغيير الأسلوب',
    translateMenuTitle: 'ترجمة النص',
    magicWandTitle: 'عصا سحرية',
    translateTitle: 'ترجمة',
    customLangPlaceholder: 'لغة مخصصة…',
    go: 'Go',
    styleBusiness: 'رسمي ومهذب',
    styleFriendly: 'ودود ومرح',
    styleStrict: 'صارم ومختصر',
    styleSlang: 'جريء (عامية)',
    langEnglish: 'الإنجليزية',
    langNorwegian: 'النرويجية',
    langRussian: 'الروسية',
  },
  zh: {
    appTitle: 'Messenger',
    loginTitle: '登录',
    loginSubtitle: '登录或创建新账号',
    emailPlaceholder: '邮箱',
    passwordPlaceholder: '密码',
    signIn: '登录',
    signUp: '注册',
    logout: '退出登录',
    profile: '个人资料',
    settings: '设置',
    close: '关闭',
    language: '语言',
    languageHint: '保存到你的账号。',
    saving: '保存中…',
    findUser: '查找用户',
    requestEmailPlaceholder: '请求邮箱',
    newRequests: '新请求',
    myRequests: '我的请求',
    myFriends: '我的好友',
    back: '返回',
    online: '在线',
    chooseFriendTitle: '在左侧选择好友开始聊天',
    chooseFriendSubtitle: '类似 Mac 上的 Messages',
    messagePlaceholder: '消息…',
    editing: '✏️ 编辑中',
    cancel: '取消',
    copyText: '复制文本',
    translate: '翻译',
    edit: '✏️ 编辑',
    aiThinking: '✨ AI 思考中…',
    aiTranslateLabel: '翻译：{x}',
    aiStyleLabel: '风格：{x}',
    styleMenuTitle: '更改风格',
    translateMenuTitle: '翻译文本',
    magicWandTitle: '魔法棒',
    translateTitle: '翻译',
    customLangPlaceholder: '自定义语言…',
    go: 'Go',
    styleBusiness: '商务且礼貌',
    styleFriendly: '友好且有趣',
    styleStrict: '严格且简洁',
    styleSlang: '大胆（俚语）',
    langEnglish: '英语',
    langNorwegian: '挪威语',
    langRussian: '俄语',
  },
  uk: {
    appTitle: 'Messenger',
    loginTitle: 'Вхід',
    loginSubtitle: 'Увійдіть або створіть новий акаунт',
    emailPlaceholder: 'Ваш Email',
    passwordPlaceholder: 'Ваш Пароль',
    signIn: 'Увійти',
    signUp: 'Реєстрація',
    logout: 'Вийти',
    profile: 'Профіль',
    settings: 'Налаштування',
    close: 'Закрити',
    language: 'Мова',
    languageHint: 'Зберігається для вашого акаунта.',
    saving: 'Збереження…',
    findUser: 'Знайти користувача',
    requestEmailPlaceholder: 'Email для заявки',
    newRequests: 'Нові запити',
    myRequests: 'Мої заявки',
    myFriends: 'Мої друзі',
    back: 'Назад',
    online: 'В мережі',
    chooseFriendTitle: 'Оберіть друга зліва, щоб почати спілкування',
    chooseFriendSubtitle: 'Як у Messages на iPhone',
    messagePlaceholder: 'Повідомлення…',
    editing: '✏️ Редагування',
    cancel: 'Скасувати',
    copyText: 'Копіювати текст',
    translate: 'Перекласти',
    edit: '✏️ Редагувати',
    aiThinking: '✨ ШІ думає…',
    aiTranslateLabel: 'Переклад: {x}',
    aiStyleLabel: 'Стиль: {x}',
    styleMenuTitle: 'Змінити стиль',
    translateMenuTitle: 'Перекласти текст',
    magicWandTitle: 'Чарівна паличка',
    translateTitle: 'Переклад',
    customLangPlaceholder: 'Своя мова…',
    go: 'Go',
    styleBusiness: 'Діловий і ввічливий',
    styleFriendly: 'Дружній і веселий',
    styleStrict: 'Строгий і короткий',
    styleSlang: 'Зухвалий (сленг)',
    langEnglish: 'Англійська',
    langNorwegian: 'Норвезька',
    langRussian: 'Російська',
  },
  es: {
    appTitle: 'Messenger',
    loginTitle: 'Iniciar sesión',
    loginSubtitle: 'Inicia sesión o crea una cuenta nueva',
    emailPlaceholder: 'Correo',
    passwordPlaceholder: 'Contraseña',
    signIn: 'Entrar',
    signUp: 'Registrarse',
    logout: 'Salir',
    profile: 'Perfil',
    settings: 'Ajustes',
    close: 'Cerrar',
    language: 'Idioma',
    languageHint: 'Se guarda en tu cuenta.',
    saving: 'Guardando…',
    findUser: 'Buscar usuario',
    requestEmailPlaceholder: 'Correo para solicitud',
    newRequests: 'Nuevas solicitudes',
    myRequests: 'Mis solicitudes',
    myFriends: 'Mis amigos',
    back: 'Atrás',
    online: 'En línea',
    chooseFriendTitle: 'Elige un amigo a la izquierda para empezar a chatear',
    chooseFriendSubtitle: 'Como Messages en iPhone',
    messagePlaceholder: 'Mensaje…',
    editing: '✏️ Editando',
    cancel: 'Cancelar',
    copyText: 'Copiar texto',
    translate: 'Traducir',
    edit: '✏️ Editar',
    aiThinking: '✨ La IA está pensando…',
    aiTranslateLabel: 'Traducir: {x}',
    aiStyleLabel: 'Estilo: {x}',
    styleMenuTitle: 'Cambiar estilo',
    translateMenuTitle: 'Traducir texto',
    magicWandTitle: 'Varita mágica',
    translateTitle: 'Traducir',
    customLangPlaceholder: 'Idioma personalizado…',
    go: 'Go',
    styleBusiness: 'Profesional y educado',
    styleFriendly: 'Amigable y divertido',
    styleStrict: 'Estricto y conciso',
    styleSlang: 'Atrevido (jerga)',
    langEnglish: 'Inglés',
    langNorwegian: 'Noruego',
    langRussian: 'Ruso',
  },
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [contacts, setContacts] = useState<Profile[]>([])
  const [incomingRequests, setIncomingRequests] = useState<Profile[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<OutgoingContact[]>([])
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})

  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [newContactEmail, setNewContactEmail] = useState('')
  const [messageSearchQuery, setMessageSearchQuery] = useState('')

  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [composerPanel, setComposerPanel] = useState<'closed' | 'plus' | 'style' | 'translate'>('closed')
  const [conversationPreviews, setConversationPreviews] = useState<
    Record<string, { content: string | null; file_url: string | null; created_at: string; sender_id: string }>
  >({})
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>('ru')
  const [isSavingLanguage, setIsSavingLanguage] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [profilePeer, setProfilePeer] = useState<Profile | null>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const composerInputRef = useRef<HTMLInputElement>(null)
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const [allReactions, setAllReactions] = useState<MessageReaction[]>([])

  const [theme, setTheme] = useState<ThemeMode>('light')

  const t = useCallback(
    (key: I18nKey, vars?: Record<string, string>) => {
      const base = I18N[uiLanguage]?.[key] ?? I18N.ru[key] ?? key
      if (!vars) return base
      return Object.keys(vars).reduce((acc, k) => acc.replaceAll(`{${k}}`, vars[k] ?? ''), base)
    },
    [uiLanguage]
  )

  useEffect(() => {
    const stored = readStoredTheme()
    if (stored) {
      setTheme(stored)
      applyTheme(stored)
    }
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dir = uiLanguage === 'ar' ? 'rtl' : 'ltr'
  }, [uiLanguage])


  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark'
      applyTheme(next)
      return next
    })
  }, [])

  const showNotification = useCallback((msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 4000)
  }, [])

  const loadUserSettings = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('language')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        console.warn('Failed to load user_settings:', error.message)
        return
      }
      const lang = data?.language
      if (lang && UI_LANG_OPTIONS.some((o) => o.code === lang)) {
        setUiLanguage(lang as UiLanguage)
      }
    },
    []
  )

  const saveUserLanguage = useCallback(
    async (userId: string, lang: UiLanguage) => {
      setIsSavingLanguage(true)
      const { error } = await supabase
        .from('user_settings')
        .upsert({ user_id: userId, language: lang }, { onConflict: 'user_id' })
      if (error) showNotification('❌ Не удалось сохранить язык: ' + error.message)
      setIsSavingLanguage(false)
    },
    [showNotification]
  )

  // === ИИ ФИШКИ (Состояния) ===
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiProcessingLabel, setAiProcessingLabel] = useState<string | null>(null)
  const [aiProcessingFromInput, setAiProcessingFromInput] = useState(false)
  const [customLang, setCustomLang] = useState('');
  const [translations, setTranslations] = useState<Record<number, string>>({}); // Храним переводы чужих сообщений

  // === ФУНКЦИЯ ОБРАЩЕНИЯ К ИИ ===
  const handleAiAction = async (action: 'style' | 'translate', modifier: string, msgId?: number, msgContent?: string) => {
    // Определяем, с каким текстом работаем (из поля ввода или из чужого сообщения)
    const isFromInput = !msgId
    const targetText = msgId ? msgContent : text;
    
    if (!targetText?.trim()) {
      return showNotification('⚠️ Введите текст для обработки ИИ');
    }

    setIsAiLoading(true);
    setAiProcessingFromInput(isFromInput)
    setComposerPanel('closed');
    setAiProcessingLabel(
      msgId
        ? action === 'translate'
          ? t('aiThinking')
          : t('aiThinking')
        : action === 'translate'
          ? t('aiTranslateLabel', { x: modifier })
          : t('aiStyleLabel', { x: modifier })
    )

    try {
      // Берем 3 последних сообщения для контекста
      const context = messages.slice(-10).map(m => m.content).filter(Boolean);

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: targetText, action, modifier, context })
      });

      const data: { error?: string; result?: string } = await res.json()
      if (data.error) throw new Error(data.error)
      const result = data.result
      if (typeof result !== 'string') throw new Error('Пустой ответ ИИ')

      if (msgId) {
        setTranslations((prev) => ({ ...prev, [msgId]: result }))
        showNotification('✅ Сообщение переведено!')
      } else {
        setText(result)
        showNotification('✨ Текст обновлен!')
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка'
      showNotification('❌ Ошибка ИИ: ' + message)
    } finally {
      setIsAiLoading(false);
      setAiProcessingLabel(null)
      setAiProcessingFromInput(false)
    }
  };

  // --- ЛОГИКА ДОЛГОГО НАЖАТИЯ ДЛЯ РЕАКЦИЙ ---
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<number | null>(null);
  const [activeReactionIsMe, setActiveReactionIsMe] = useState(false)

  const reactionMenuRef = useRef<HTMLDivElement | null>(null)
  const [reactionMenuStyle, setReactionMenuStyle] = useState<{ top: number; left: number } | null>(null)
  const messagesViewportRef = useRef<HTMLDivElement | null>(null)

  // Таймер для мобильного долгого нажатия
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handlePressStart = (msgId: number, isMe: boolean) => {
    pressTimer.current = setTimeout(() => {
      setActiveReactionIsMe(isMe)
      setActiveReactionMsgId(msgId);
    }, 400); // Если держим 400мс - открываем меню
  };

  const handlePressEnd = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

// Добавляем функцию копирования
  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showNotification('📋 Текст скопирован!');
    setActiveReactionMsgId(null); // Закрываем меню после копирования
  };

  // Переопределяем позицию меню реакций/копирования так,
  // чтобы оно всегда попадало в область видимости (особенно если сообщение сверху).
  useEffect(() => {
    if (activeReactionMsgId === null) {
      setReactionMenuStyle(null)
      return
    }

    const viewportEl = messagesViewportRef.current

    const recalc = () => {
      const menuEl = reactionMenuRef.current
      if (!menuEl) return

      const msgEl = document.getElementById(`msg-${activeReactionMsgId}`)
      if (!msgEl) return

      const msgRect = msgEl.getBoundingClientRect()
      const menuRect = menuEl.getBoundingClientRect()

      const padding = 10
      const viewportRect = viewportEl?.getBoundingClientRect() ?? {
        top: 0,
        left: 0,
        right: window.innerWidth,
        bottom: window.innerHeight,
        width: window.innerWidth,
        height: window.innerHeight,
      }

      const spaceAbove = msgRect.top - viewportRect.top - padding
      const spaceBelow = viewportRect.bottom - msgRect.bottom - padding

      const placement = spaceAbove >= menuRect.height
        ? 'top'
        : spaceBelow >= menuRect.height
          ? 'bottom'
          : spaceAbove >= spaceBelow
            ? 'top'
            : 'bottom'

      const rawTop =
        placement === 'top'
          ? msgRect.top - menuRect.height - 8
          : msgRect.bottom + 8

      const minTop = viewportRect.top + padding
      const maxTop = viewportRect.bottom - menuRect.height - padding
      const top = Math.max(minTop, Math.min(rawTop, maxTop))

      const rawLeft = activeReactionIsMe
        ? msgRect.right - menuRect.width - 8
        : msgRect.left + 8

      const minLeft = viewportRect.left + padding
      const maxLeft = viewportRect.right - menuRect.width - padding
      const left = Math.max(minLeft, Math.min(rawLeft, maxLeft))

      setReactionMenuStyle({ top, left })
    }

    const schedule = () => requestAnimationFrame(recalc)
    schedule()

    viewportEl?.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)

    return () => {
      viewportEl?.removeEventListener('scroll', schedule as EventListener)
      window.removeEventListener('resize', schedule)
    }
  }, [activeReactionMsgId, activeReactionIsMe])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      if (s?.user.id) void loadUserSettings(s.user.id)
      if (s?.user.id) {
        window.OneSignalDeferred = window.OneSignalDeferred ?? []
        window.OneSignalDeferred.push(async (OneSignal) => {
          await OneSignal.login(s.user.id)
        })
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s?.user.id) void loadUserSettings(s.user.id)
      else setUiLanguage('ru')
      window.OneSignalDeferred = window.OneSignalDeferred ?? []
      if (s?.user.id) {
        window.OneSignalDeferred.push(async (OneSignal) => {
          await OneSignal.login(s.user.id)
        })
      } else {
        window.OneSignalDeferred.push(async (OneSignal) => {
          await OneSignal.logout()
        })
      }
    })
    return () => subscription.unsubscribe()
  }, [loadUserSettings])

  async function handleSignUp() {
    if (!email.trim() || !password.trim()) return showNotification('⚠️ Пожалуйста, введите Email и пароль')
    if (password.length < 6) return showNotification('⚠️ Пароль должен содержать минимум 6 символов')
    showNotification('⏳ Регистрируем...')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      if (error.message.includes('User already registered')) showNotification('⚠️ Этот Email уже занят. Попробуйте "Войти".')
      else if (error.message === 'Failed to fetch' || error.message.toLowerCase().includes('failed to fetch')) {
        showNotification('❌ Не удалось подключиться к Supabase (Failed to fetch). Проверьте интернет/AdBlock/VPN и переменные NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY, затем перезапустите dev-сервер.')
      } else showNotification('❌ Ошибка: ' + error.message)
      return
    }
    if (data.user) {
      await supabase.from('profiles').insert([{ id: data.user.id, email }])
      showNotification('🎉 Успешная регистрация! Добро пожаловать.')
    }
  }

  async function handleLogin() {
    if (!email.trim() || !password.trim()) return showNotification('⚠️ Пожалуйста, введите Email и пароль')
    showNotification('⏳ Входим...')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if (error.message.includes('Invalid login credentials')) showNotification('❌ Неверный Email или пароль. Жмите "Регистрация".')
      else if (error.message === 'Failed to fetch' || error.message.toLowerCase().includes('failed to fetch')) {
        showNotification('❌ Не удалось подключиться к Supabase (Failed to fetch). Проверьте интернет/AdBlock/VPN и переменные NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY, затем перезапустите dev-сервер.')
      } else showNotification('❌ Ошибка входа: ' + error.message)
    } else {
      showNotification('✅ Успешный вход!')
    }
  }

  const fetchSidebarData = useCallback(async () => {
    if (!session) return
    const userId = session.user.id

    const { data: contactsData } = await supabase
      .from('contacts')
      .select('contact_id, profiles(id, email)')
      .eq('owner_id', userId)
      .eq('status', 'accepted')
    const acceptedRows = (contactsData ?? []) as ContactAcceptedRow[]
    setContacts(
      acceptedRows.flatMap((c) => {
        if (!c.profiles) return []
        return Array.isArray(c.profiles) ? c.profiles : [c.profiles]
      })
    )

    const { data: pendingData } = await supabase
      .from('contacts')
      .select('owner_id')
      .eq('contact_id', userId)
      .eq('status', 'pending')
    const pendingRows = (pendingData ?? []) as ContactPendingIncomingRow[]
    if (pendingRows.length > 0) {
      const { data: reqProfiles } = await supabase
        .from('profiles')
        .select('*')
        .in(
          'id',
          pendingRows.map((r) => r.owner_id)
        )
      setIncomingRequests((reqProfiles as Profile[] | null) ?? [])
    } else setIncomingRequests([])

    const { data: outData } = await supabase
      .from('contacts')
      .select('contact_id, status')
      .eq('owner_id', userId)
      .in('status', ['pending', 'rejected'])
    const outRows = (outData ?? []) as ContactOutgoingRow[]
    if (outRows.length > 0) {
      const { data: outProfiles } = await supabase
        .from('profiles')
        .select('*')
        .in(
          'id',
          outRows.map((r) => r.contact_id)
        )
      if (outProfiles) {
        const profiles = outProfiles as Profile[]
        setOutgoingRequests(
          profiles.map((p) => {
            const raw = outRows.find((o) => o.contact_id === p.id)?.status
            const requestStatus: 'pending' | 'rejected' =
              raw === 'rejected' ? 'rejected' : 'pending'
            return { ...p, requestStatus }
          })
        )
      }
    } else setOutgoingRequests([])

    const { data: incomingMsgs } = await supabase
      .from('messages')
      .select('sender_id, is_read')
      .eq('receiver_id', userId)
    const counts: Record<string, number> = {}
    const unreadRows = (incomingMsgs ?? []) as UnreadMessageRow[]
    unreadRows.forEach((msg) => {
      if (!msg.is_read) counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1
    })
    setUnreadCounts(counts)

    const contactIds = acceptedRows.flatMap((c) => {
      if (!c.profiles) return []
      const profiles = Array.isArray(c.profiles) ? c.profiles : [c.profiles]
      return profiles.map((p) => p.id)
    })
    if (contactIds.length > 0) {
      const { data: recentMsgs } = await supabase
        .from('messages')
        .select('sender_id, receiver_id, content, file_url, created_at')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(300)
      const previews: Record<string, { content: string | null; file_url: string | null; created_at: string; sender_id: string }> = {}
      for (const msg of recentMsgs ?? []) {
        const peerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id
        if (contactIds.includes(peerId) && !previews[peerId]) {
          previews[peerId] = {
            content: msg.content,
            file_url: msg.file_url,
            created_at: msg.created_at,
            sender_id: msg.sender_id,
          }
        }
      }
      setConversationPreviews(previews)
    } else {
      setConversationPreviews({})
    }
  }, [session])

  // === ИСПРАВЛЕННЫЙ ГЛОБАЛЬНЫЙ REALTIME ===
  useEffect(() => {
    void fetchSidebarData()
    if (!session) return

    const contactsChannel = supabase
      .channel('realtime-contacts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contacts' },
        async (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            const row = payload.new as ContactsPayloadNew
            if (row.owner_id === session.user.id) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', row.contact_id)
                .single()
              const userEmail = profile?.email ?? 'Пользователь'
              if (row.status === 'accepted')
                showNotification(`🎉 ${userEmail} принял(а) вашу заявку!`)
              else if (row.status === 'rejected')
                showNotification(`❌ ${userEmail} отклонил(а) заявку.`)
            }
          }
          void fetchSidebarData()
        }
      )
      .subscribe()

    const badgesChannel = supabase
      .channel('realtime-badges')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${session.user.id}`,
        },
        () => {
          void fetchSidebarData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(contactsChannel)
      supabase.removeChannel(badgesChannel)
    }
  }, [session, fetchSidebarData, showNotification])

  async function sendRequest(emailToAdd: string) {
    if (!session) return
    if (!emailToAdd.trim() || emailToAdd === session.user.email) return
    const { data: profile } = await supabase.from('profiles').select('*').eq('email', emailToAdd).single()
    if (!profile) return showNotification('⚠️ Пользователь не найден.')
    const p = profile as Profile
    const { data: existing } = await supabase
      .from('contacts')
      .select('*')
      .eq('owner_id', session.user.id)
      .eq('contact_id', p.id)
    if (existing && existing.length > 0)
      return showNotification('⚠️ Вы уже взаимодействовали с этим пользователем.')
    const { error } = await supabase
      .from('contacts')
      .insert([{ owner_id: session.user.id, contact_id: p.id, status: 'pending' }])
    if (!error) {
      setNewContactEmail('')
      showNotification('📨 Заявка отправлена!')
      void fetchSidebarData()
    }
  }
  async function acceptRequest(senderId: string) {
    if (!session) return
    await supabase
      .from('contacts')
      .update({ status: 'accepted' })
      .eq('owner_id', senderId)
      .eq('contact_id', session.user.id)
    await supabase
      .from('contacts')
      .insert([{ owner_id: session.user.id, contact_id: senderId, status: 'accepted' }])
  }
  async function rejectRequest(senderId: string) {
    if (!session) return
    await supabase
      .from('contacts')
      .update({ status: 'rejected' })
      .eq('owner_id', senderId)
      .eq('contact_id', session.user.id)
    void fetchSidebarData()
  }
  async function cancelOutgoingRequest(contactId: string) {
    if (!session) return
    await supabase.from('contacts').delete().match({ owner_id: session.user.id, contact_id: contactId })
    void fetchSidebarData()
  }
  async function removeContact(e: MouseEvent<HTMLButtonElement>, contactId: string) {
    e.stopPropagation()
    if (!session) return
    if (!window.confirm('Удалить из контактов?')) return
    await supabase.from('contacts').delete().match({ owner_id: session.user.id, contact_id: contactId })
    await supabase.from('contacts').delete().match({ owner_id: contactId, contact_id: session.user.id })
    if (selectedUser?.id === contactId) setSelectedUser(null)
  }

  // === ЛОГИКА АКТИВНОГО ЧАТА + РЕАКЦИИ ===
  useEffect(() => {
    if (!session || !selectedUser) return
    const userId = session.user.id
    const peerId = selectedUser.id

    async function fetchMessagesAndMarkRead() {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${userId})`
        )
        .order('created_at', { ascending: true })
      if (data) setMessages(data as ChatMessage[])

      const { data: reactData } = await supabase.from('message_reactions').select('*')
      if (reactData) setAllReactions(reactData as MessageReaction[])

      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', peerId)
        .eq('receiver_id', userId)
        .eq('is_read', false)
      void fetchSidebarData()
    }
    void fetchMessagesAndMarkRead()

    const channel = supabase
      .channel('realtime-chat-data')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const msg = payload.new as ChatMessage
            if (
              (msg.sender_id === peerId && msg.receiver_id === userId) ||
              (msg.sender_id === userId && msg.receiver_id === peerId)
            ) {
              if (msg.sender_id === peerId) {
                void supabase.from('messages').update({ is_read: true }).eq('id', msg.id)
              }
              setMessages((prev) => [...prev, msg])
            }
          }
          if (payload.eventType === 'UPDATE' && payload.new) {
            const updated = payload.new as ChatMessage
            setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
            void fetchSidebarData()
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions' },
        async () => {
          const { data } = await supabase.from('message_reactions').select('*')
          if (data) setAllReactions(data as MessageReaction[])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session, selectedUser, fetchSidebarData])

  useEffect(() => {
    // При смене диалога выходим из режима редактирования и закрываем меню
    setEditingMessageId(null)
    setComposerPanel('closed')
  }, [selectedUser?.id])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }, [])

  useEffect(() => {
    scrollToBottom('auto')
  }, [selectedUser, scrollToBottom])

  useEffect(() => {
    scrollToBottom('smooth')
  }, [messages, scrollToBottom])

  function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) setPendingFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const items = event.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1 || items[i].kind === 'file') {
        const file = items[i].getAsFile()
        if (file) {
          event.preventDefault()
          setPendingFile(file)
          break
        }
      }
    }
  }

  async function sendMessage() {
    if (!session) return
    if (!selectedUser || isSending) return

    if (editingMessageId !== null) {
      if (!text.trim()) return
      if (pendingFile) {
        showNotification('⚠️ Нельзя редактировать сообщение с вложением. Уберите файл и попробуйте снова.')
        return
      }
      setIsSending(true)
      const nextContent = text.trim()
      const { error } = await supabase
        .from('messages')
        .update({ content: nextContent })
        .eq('id', editingMessageId)
        .eq('sender_id', session.user.id)

      if (error) {
        showNotification('❌ Не удалось сохранить: ' + error.message)
      } else {
        setMessages((prev) => prev.map((m) => (m.id === editingMessageId ? { ...m, content: nextContent } : m)))
        showNotification('✅ Сообщение обновлено')
        setEditingMessageId(null)
        setText('')
      }
      setIsSending(false)
      return
    }

    if ((!text.trim() && !pendingFile) || isSending) return
    setIsSending(true)
    let uploadedUrl: string | null = null

    if (pendingFile) {
      showNotification('⏳ Загружаем файл...')
      const fileExt = pendingFile.name ? pendingFile.name.split('.').pop() : 'png'
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${session.user.id}/${fileName}`
      const { error: uploadError } = await supabase.storage.from('chat-files').upload(filePath, pendingFile)
      
      if (uploadError) {
        showNotification('❌ Ошибка загрузки: ' + uploadError.message)
        setIsSending(false)
        return
      }
      const { data } = supabase.storage.from('chat-files').getPublicUrl(filePath)
      uploadedUrl = data.publicUrl
    }

    const { error } = await supabase.from('messages').insert([{ 
        content: text.trim() ? text : null, 
        file_url: uploadedUrl, 
        sender_id: session.user.id, 
        receiver_id: selectedUser.id 
    }])

    if (!error) {
      setText('')
      setPendingFile(null)
      if (uploadedUrl) showNotification('✅ Файл отправлен!')
    }
    setIsSending(false)
  }

  function formatTime(isoString: string) {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  function formatListTime(isoString: string) {
    const d = new Date(isoString)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) return formatTime(isoString)
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString([], { weekday: 'long' })
  }

  function formatDateSeparator(isoString: string) {
    const d = new Date(isoString)
    const now = new Date()
    const time = formatTime(isoString)
    if (d.toDateString() === now.toDateString()) return `Today ${time}`
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`
    return `${d.toLocaleDateString([], { weekday: 'long' })} ${time}`
  }

  function displayName(email: string) {
    return email.split('@')[0]
  }

  function previewText(contactId: string) {
    const p = conversationPreviews[contactId]
    if (!p) return t('online')
    if (p.file_url) return p.content ? p.content : '📎 Attachment'
    if (p.content) {
      const prefix = p.sender_id === session?.user.id ? 'You: ' : ''
      return `${prefix}${p.content}`
    }
    return t('online')
  }

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)
  const canSend = text.trim() !== '' || pendingFile !== null

  const sortedContacts = [...contacts].sort((a, b) => {
    const ta = conversationPreviews[a.id]?.created_at
    const tb = conversationPreviews[b.id]?.created_at
    if (!ta && !tb) return displayName(a.email).localeCompare(displayName(b.email))
    if (!ta) return 1
    if (!tb) return -1
    return new Date(tb).getTime() - new Date(ta).getTime()
  })

  const filteredContacts = sortedContacts.filter((u) => {
    const q = messageSearchQuery.trim().toLowerCase()
    if (!q) return true
    const name = displayName(u.email).toLowerCase()
    const preview = previewText(u.id).toLowerCase()
    return name.includes(q) || u.email.toLowerCase().includes(q) || preview.includes(q)
  })

  const toggleReaction = async (messageId: number, emoji: string) => {
    if (!session) return
    const userId = session.user.id
    try {
      const existingLocal = allReactions.find(
        (r) => r.message_id === messageId && r.user_id === userId && r.emoji === emoji
      )

      if (existingLocal) {
        setAllReactions((prev) => prev.filter((r) => r.id !== existingLocal.id))
      } else {
        const tempReaction: MessageReaction = {
          id: Date.now(),
          message_id: messageId,
          user_id: userId,
          emoji,
        }
        setAllReactions((prev) => [...prev, tempReaction])
      }

      const { data: existing } = await supabase
        .from('message_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('emoji', emoji)
        .single()

      if (existing) {
        await supabase.from('message_reactions').delete().eq('id', existing.id)
      } else {
        await supabase.from('message_reactions').insert([
          { message_id: messageId, user_id: userId, emoji },
        ])
      }
    } catch (error) {
      console.error('Ошибка при работе с реакцией:', error)
    }
  }

  const themeIcon = theme === 'light' ? <IconMoon className="w-[18px] h-[18px]" /> : <IconSun className="w-[18px] h-[18px]" />

  const openProfile = (peer: Profile) => {
    setProfilePeer(peer)
    setIsProfileOpen(true)
    setIsSettingsOpen(false)
  }

  const closeProfile = () => {
    setIsProfileOpen(false)
    setProfilePeer(null)
  }

  // ==========================================
  // ВЕРСТКА (iOS 27 / Liquid Glass)
  // ==========================================
  return (
    <div className="flex flex-col h-[100dvh] min-h-0 w-full relative overflow-hidden text-[var(--ios-text-primary)] antialiased ios-app-shell">
      
      {toastMsg && (
        <div className="absolute top-[max(1.25rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 ios-glass-prominent z-50 flex items-center gap-3 px-5 py-2.5 rounded-full border border-[var(--ios-border-subtle)] shadow-lg animate-bounce">
          <span className="font-medium text-sm md:text-base whitespace-nowrap text-[var(--ios-text-primary)]">{toastMsg}</span>
        </div>
      )}

      {isSettingsOpen && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-md" onClick={() => setIsSettingsOpen(false)} />
          <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center p-0 md:p-6">
            <div className="w-full max-w-lg ios-sheet ios-glass-prominent overflow-hidden max-md:pb-[env(safe-area-inset-bottom)]">
              <div className="ios-navbar flex h-12 shrink-0 items-center justify-between px-4">
                <span className="text-[17px] font-semibold text-[var(--ios-text-primary)]">
                  {t('settings')}
                </span>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="ios-icon-btn"
                  aria-label={t('close')}
                  title={t('close')}
                >
                  ×
                </button>
              </div>
              <div className="p-4 md:p-5 bg-[var(--ios-surface-secondary)]">
                <div className="ios-grouped p-4 md:p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-full bg-[var(--ios-accent-tint)] flex items-center justify-center text-[var(--ios-accent)] shrink-0">
                      <IconGlobe />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1 gap-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-[var(--ios-text-primary)]">{t('language')}</span>
                          <span className="text-xs md:text-sm text-[var(--ios-text-secondary)]">
                            {t('languageHint')}
                          </span>
                        </div>
                        <div className="text-[11px] font-semibold text-[var(--ios-text-secondary)]">
                          {isSavingLanguage ? t('saving') : ' '}
                        </div>
                      </div>
                      <select
                        value={uiLanguage}
                        onChange={(e) => {
                          const next = e.target.value as UiLanguage
                          setUiLanguage(next)
                          if (session?.user.id) void saveUserLanguage(session.user.id, next)
                        }}
                        disabled={!session?.user.id || isSavingLanguage}
                        className="ios-field w-full rounded-[10px] px-3 py-2.5 text-sm border border-[var(--ios-border-subtle)] bg-[var(--ios-surface)] text-[var(--ios-text-primary)] outline-none focus:ring-2 focus:ring-[var(--ios-accent)]/30 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {UI_LANG_OPTIONS.map((o) => (
                          <option key={o.code} value={o.code}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="ios-grouped mt-3 overflow-hidden">
                  <button type="button" onClick={toggleTheme} className="w-full px-4 py-3.5 flex items-center justify-between text-[17px] border-b border-[var(--ios-separator)]">
                    <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                    {themeIcon}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsOpen(false)
                      void supabase.auth.signOut()
                    }}
                    className="w-full px-4 py-3.5 text-left text-[17px] text-[var(--ios-danger)]"
                  >
                    {t('logout')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {isProfileOpen && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-md" onClick={closeProfile} />
          <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center p-0 md:p-6">
            <div className="w-full max-w-lg ios-sheet ios-glass-prominent overflow-hidden max-md:pb-[env(safe-area-inset-bottom)]">
              <div className="ios-navbar flex h-12 shrink-0 items-center justify-between px-4">
                <span className="text-[17px] font-semibold text-[var(--ios-text-primary)]">
                  {t('profile')}
                </span>
                <button
                  type="button"
                  onClick={closeProfile}
                  className="ios-icon-btn"
                  aria-label={t('close')}
                  title={t('close')}
                >
                  ×
                </button>
              </div>
              <div className="p-4 md:p-5 bg-[var(--ios-surface-secondary)]">
                <div className="ios-grouped p-4 md:p-5">
                  <div className="flex items-center gap-3">
                    {profilePeer && <IosAvatar seed={profilePeer.email} label={profilePeer.email} size="md" />}
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-[var(--ios-text-primary)] truncate">
                        {profilePeer?.email ?? ''}
                      </span>
                      <span className="text-xs md:text-sm text-[var(--ios-text-secondary)]">
                        {/* i18n stub text intentionally left in RU for now */}
                        Заглушка профиля. Позже добавим функционал (настройки, фото, статус и т.д.).
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {!session ? (
        <div className="flex-1 flex flex-col w-full h-full pt-safe px-5 pb-8 max-w-md mx-auto">
          <div className="flex justify-end pt-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="ios-icon-btn"
              title={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
              aria-label={theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'}
            >
              {themeIcon}
            </button>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-8 -mt-6">
            <div className="text-center">
              <MessagesAppIcon className="w-[88px] h-[88px] mx-auto mb-5" />
              <h1 className="ios-large-title text-[var(--ios-text-primary)]">{t('appTitle')}</h1>
              <p className="text-[var(--ios-text-secondary)] text-[15px] mt-2 leading-snug">{t('loginSubtitle')}</p>
            </div>
            <div className="ios-grouped">
              <input className="w-full px-4 py-3.5 bg-transparent border-0 border-b border-[var(--ios-separator)] text-[17px] outline-none placeholder:text-[var(--ios-text-secondary)]" placeholder={t('emailPlaceholder')} value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
              <input className="w-full px-4 py-3.5 bg-transparent border-0 text-[17px] outline-none placeholder:text-[var(--ios-text-secondary)]" type="password" placeholder={t('passwordPlaceholder')} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>
            <div className="flex flex-col gap-3">
              <button type="button" className="ios-btn-primary w-full transition-all active:scale-[0.98]" onClick={handleLogin}>{t('signIn')}</button>
              <button type="button" className="ios-btn-secondary w-full transition-all active:scale-[0.98]" onClick={handleSignUp}>{t('signUp')}</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col min-h-0 w-full max-md:min-h-0 pt-safe">
          <div className="flex flex-1 flex-row min-h-0 w-full overflow-hidden md:max-w-6xl md:mx-auto md:my-3 md:rounded-[14px] md:border md:border-[var(--ios-border-subtle)] md:ios-elevated md:bg-[var(--ios-surface)]">
          {/* iMessage inbox list */}
          <div className={`imessage-inbox relative flex flex-col min-h-0 min-w-0 z-20 border-r border-[var(--ios-separator)]
            ${selectedUser ? 'hidden md:flex md:flex-none' : 'flex w-full flex-1 md:flex-none'} 
            ${isCollapsed ? 'md:w-[72px]' : 'md:w-[340px] lg:w-[390px]'}`}>

            {!isCollapsed ? (
              <>
                <div className="shrink-0 px-4 pt-1 pb-0 flex items-center justify-between">
                  <button type="button" className="imessage-edit-pill" onClick={() => setIsEditMode((v) => !v)}>
                    {isEditMode ? 'Done' : 'Edit'}
                  </button>
                  <button type="button" className="imessage-filter-btn" onClick={() => setIsSettingsOpen(true)} aria-label={t('settings')}>
                    <IconFilter />
                  </button>
                </div>
                <h1 className="imessage-inbox-title px-4 text-[var(--ios-text-primary)]">{t('appTitle')}</h1>

                <div className="px-4 pb-3 pt-1">
                  <label className="imessage-inbox-find">
                    <IconSearch />
                    <input
                      type="email"
                      placeholder={t('findUser')}
                      value={newContactEmail}
                      onChange={(e) => setNewContactEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendRequest(newContactEmail)}
                    />
                    {newContactEmail.trim() && (
                      <button
                        type="button"
                        className="imessage-inbox-find-go"
                        onClick={() => void sendRequest(newContactEmail)}
                      >
                        {t('go')}
                      </button>
                    )}
                  </label>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar pb-24">
                  {outgoingRequests.map((u) => (
                    <div key={u.id} className="imessage-row opacity-80">
                      <span className="imessage-unread-spacer" />
                      <IosAvatar seed={u.email} label={u.email} size="md" />
                      <div className="imessage-row-body">
                        <div className="imessage-row-top">
                          <span className="imessage-row-name">{displayName(u.email)}</span>
                          <button type="button" className="text-[var(--ios-danger)] text-[13px] shrink-0" onClick={() => cancelOutgoingRequest(u.id)}>×</button>
                        </div>
                        <p className="imessage-row-preview">
                          {u.requestStatus === 'pending' ? '⏳ Pending' : '🚫 Declined'}
                        </p>
                      </div>
                      <span />
                    </div>
                  ))}

                  {incomingRequests.map((u) => (
                    <div key={u.id} className="imessage-row">
                      <span className="imessage-unread-dot" />
                      <IosAvatar seed={u.email} label={u.email} size="md" />
                      <div className="imessage-row-body">
                        <div className="imessage-row-top">
                          <span className="imessage-row-name imessage-row-name-unread">{displayName(u.email)}</span>
                          <span className="imessage-row-time">{t('newRequests')}</span>
                        </div>
                        <p className="imessage-row-preview">{u.email}</p>
                        <div className="flex gap-2 mt-2">
                          <button type="button" className="flex-1 py-1.5 rounded-full bg-[var(--ios-accent)] text-white text-[14px] font-medium" onClick={() => acceptRequest(u.id)}>Принять</button>
                          <button type="button" className="flex-1 py-1.5 rounded-full bg-[var(--ios-search-bg)] text-[var(--ios-danger)] text-[14px] font-medium" onClick={() => rejectRequest(u.id)}>Отклонить</button>
                        </div>
                      </div>
                      <span />
                    </div>
                  ))}

                  {filteredContacts.map((u) => {
                    const unread = unreadCounts[u.id] > 0
                    const preview = conversationPreviews[u.id]
                    return (
                      <div key={u.id} className="imessage-row cursor-pointer" onClick={() => setSelectedUser(u)}>
                        {unread ? <span className="imessage-unread-dot" /> : <span className="imessage-unread-spacer" />}
                        <IosAvatar seed={u.email} label={u.email} size="md" />
                        <div className="imessage-row-body">
                          <div className="imessage-row-top">
                            <span className={`imessage-row-name ${unread ? 'imessage-row-name-unread' : ''}`}>
                              {displayName(u.email)}
                            </span>
                            {preview && (
                              <span className="imessage-row-time">{formatListTime(preview.created_at)}</span>
                            )}
                          </div>
                          <p className={`imessage-row-preview ${unread ? 'imessage-row-preview-unread' : ''}`}>
                            {previewText(u.id)}
                          </p>
                        </div>
                        <IconChevronRight className="imessage-row-chevron" />
                        {isEditMode && (
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ios-danger)] text-xl z-10"
                            onClick={(e) => removeContact(e, u.id)}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="imessage-floating-bar absolute bottom-0 left-0 right-0">
                  <label className="imessage-search-pill w-full">
                    <IconSearch />
                    <input
                      placeholder="Search"
                      value={messageSearchQuery}
                      onChange={(e) => setMessageSearchQuery(e.target.value)}
                    />
                    <IconMic className="opacity-70" />
                  </label>
                </div>
              </>
            ) : (
              <div className="hidden md:flex flex-col items-center gap-3 p-2 pt-4">
                <button type="button" onClick={() => setIsCollapsed(false)} className="ios-icon-btn text-[var(--ios-text-secondary)]">
                  <IconChevronLeft className="w-5 h-5" />
                </button>
                <button type="button" onClick={() => setIsSettingsOpen(true)} className="ios-icon-btn"><IconGear /></button>
              </div>
            )}
          </div>

{/* ПРАВАЯ КОЛОНКА — Messages thread */}
          <div className={`flex flex-col relative z-10 w-full min-h-0 flex-1 overflow-hidden ios-chat-canvas
            ${selectedUser ? 'flex max-md:w-full' : 'hidden md:flex'}`}>   
            
            {!selectedUser ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <MessagesAppIcon className="w-24 h-24 mb-6 opacity-90" />
                <p className="text-[20px] font-semibold text-[var(--ios-text-primary)] max-w-sm">{t('chooseFriendTitle')}</p>
                <p className="text-[15px] mt-2 text-[var(--ios-text-secondary)]">{t('chooseFriendSubtitle')}</p>
              </div>
            ) : (
              <>
                <div className="imessage-thread-header">
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="imessage-back-btn md:hidden"
                    aria-label={t('back')}
                  >
                    <IconChevronLeft className="w-7 h-7" />
                    {totalUnread > 0 && <span className="imessage-back-badge">{totalUnread > 9 ? '9+' : totalUnread}</span>}
                  </button>
                  <div className="hidden md:block" />
                  <button
                    type="button"
                    onClick={() => openProfile(selectedUser)}
                    className="imessage-thread-contact"
                    aria-label="Открыть профиль пользователя"
                  >
                    <IosAvatar seed={selectedUser.email} label={selectedUser.email} size="thread" variant="person" />
                    <span className="imessage-thread-name truncate max-w-full">
                      {displayName(selectedUser.email)}
                      <IconChevronRight className="w-3.5 h-3.5 text-[var(--ios-preview-text)]" />
                    </span>
                  </button>
                  <div className="hidden md:block" />
                </div>
                
                {/* ОБЛАСТЬ СООБЩЕНИЙ */}
                <div
                  ref={messagesViewportRef}
                  className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 md:px-6 py-3 flex flex-col pb-3 w-full no-scrollbar bg-[var(--ios-chat-bg)]"
                >
                  {messages.map((m, idx) => {
                    const isMe = m.sender_id === session.user.id;
                    const msgReactions = allReactions.filter((r) => r.message_id === m.id)
                    const isMenuOpen = activeReactionMsgId === m.id;
                    const prev = messages[idx - 1]
                    const showDate =
                      !prev ||
                      new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString()
                    
                    return (
                      <div key={m.id} id={`msg-${m.id}`} className="contents">
                        {showDate && (
                          <div className="imessage-date-separator">{formatDateSeparator(m.created_at)}</div>
                        )}
                      <div
                        className={`relative flex flex-col mb-2 ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        
                        {/* КОНТЕКСТНОЕ МЕНЮ (Эмодзи + Копировать + Перевести) */}
                        {isMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setActiveReactionMsgId(null)} />
                            <div
                              ref={reactionMenuRef}
                              className={`fixed z-30 flex flex-col gap-1.5 ios-glass-prominent p-2 rounded-[14px] ios-elevated border border-[var(--ios-border)] animate-in zoom-in duration-200 max-h-[70vh] overflow-auto transition-opacity ${
                                reactionMenuStyle ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                              } ${isMe ? 'items-end' : 'items-start'}`}
                              style={reactionMenuStyle ? { top: reactionMenuStyle.top, left: reactionMenuStyle.left } : undefined}
                            >
                              <div className="flex gap-1">
                                {['❤️', '👍', '🔥', '😂', '😢', '😁', '👑', '🐥'].map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={(e) => { e.stopPropagation(); toggleReaction(m.id, emoji); setActiveReactionMsgId(null); }}
                                    disabled={isAiLoading}
                                    className={`hover:scale-130 transition-transform px-1.5 py-0.5 text-base md:text-lg active:scale-90 cursor-pointer ${
                                      isAiLoading ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                              {m.content && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (m.content) copyToClipboard(m.content)
                                  }}
                                  disabled={isAiLoading}
                                  className="text-[12px] font-semibold text-[var(--ios-text-primary)] ios-field hover:brightness-110 px-3 py-1.5 rounded-[10px] w-full text-center transition-colors active:scale-95"
                                >
                                  {t('copyText')}
                                </button>
                              )}
                              {isMe && m.content && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditingMessageId(m.id)
                                    setText(m.content ?? '')
                                    setActiveReactionMsgId(null)
                                    requestAnimationFrame(() => composerInputRef.current?.focus())
                                  }}
                                  disabled={isAiLoading || isSending}
                                  className="text-[12px] font-semibold text-[var(--ios-text-primary)] ios-field hover:brightness-110 px-3 py-1.5 rounded-[10px] w-full text-center transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {t('edit')}
                                </button>
                              )}
                              {m.content && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (m.content) void handleAiAction('translate', 'Русский', m.id, m.content)
                                      setActiveReactionMsgId(null)
                                  }}
                                  disabled={isAiLoading}
                                  className="text-[12px] font-semibold text-[var(--ios-accent)] ios-control border border-[var(--ios-accent)]/25 px-3 py-1.5 rounded-[10px] w-full text-center transition-colors active:scale-95 mt-0.5 flex items-center justify-center gap-1 hover:brightness-110"
                                >
                                  <span>🤖</span> {t('translate')}
                                </button>
                              )}
                            </div>
                          </>
                        )}

                        {/* ПУЗЫРЕК СООБЩЕНИЯ */}
                        <div 
                          onContextMenu={(e) => { e.preventDefault(); setActiveReactionIsMe(isMe); setActiveReactionMsgId(m.id); }}
                          onTouchStart={() => handlePressStart(m.id, isMe)}
                          onTouchEnd={handlePressEnd}
                          onTouchMove={handlePressEnd}
                          style={{ WebkitTouchCallout: 'none', WebkitTapHighlightColor: 'transparent' }}
                          className={`ios-bubble relative flex flex-col shrink-0 select-none md:select-text ${isMe ? 'ios-bubble-sent' : 'ios-bubble-received'}`}
                        >
                          {m.file_url && (
                            <div className="mb-2 overflow-hidden rounded-xl">
                              {m.file_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                                /* eslint-disable-next-line @next/next/no-img-element -- remote Supabase URLs; next/image needs domain config */
                                <img src={m.file_url} alt="Вложение" onLoad={() => scrollToBottom('auto')} className="w-full h-full max-h-64 object-cover hover:scale-[1.02] transition-transform duration-500 rounded-xl shadow-sm" />
                              ) : (
                                 <a href={m.file_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-3 rounded-[12px] text-sm transition-colors ${isMe ? 'bg-black/15 hover:bg-black/25' : 'bg-black/25 hover:bg-black/35'}`}>
                                   <span className="text-lg">📎</span> <span className="font-medium">Файл</span>
                                 </a>
                              )}
                            </div>
                          )}

                          {m.content && (
                            <span className="break-words leading-snug max-md:pointer-events-none select-none md:select-text">
                              {m.content}
                            </span>
                          )}

                          {/* ВЫВОД ПЕРЕВОДА */}
                          {translations[m.id] && (
                            <div className={`mt-2 pt-2 border-t flex flex-col gap-0.5 ${isMe ? 'border-white/15' : 'border-white/10'}`}>
                              <span className="text-[10px] uppercase font-bold text-[var(--ios-accent)] tracking-wider opacity-90">🤖 Перевод</span>
                              <span className={`break-words text-[13px] md:text-[14px] leading-relaxed italic ${isMe ? 'text-white/85' : 'text-[var(--ios-text-secondary)]'}`}>
                                {translations[m.id]}
                              </span>
                            </div>
                          )}

                          {isMe && (
                            <span className="text-[11px] text-[var(--ios-preview-text)] self-end mt-1 px-1">
                              {m.is_read ? 'Delivered' : 'Sent'}
                            </span>
                          )}

                          {msgReactions.length > 0 && (
                            <div className={`absolute -bottom-3.5 flex flex-wrap gap-1 z-10 ${isMe ? 'right-2' : 'left-2'}`}>
                              {Array.from(new Set(msgReactions.map((r) => r.emoji))).map((emoji) => {
                                const count = msgReactions.filter((r) => r.emoji === emoji).length
                                const hasMyReaction = msgReactions.some(
                                  (r) => r.emoji === emoji && r.user_id === session.user.id
                                )
                                return (
                                  <button type="button" key={emoji} onClick={(e) => { e.stopPropagation(); toggleReaction(m.id, emoji); }} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold transition-all hover:scale-110 active:scale-90 cursor-pointer border ios-control ${hasMyReaction ? 'border-[var(--ios-accent)]/40 text-[var(--ios-accent)]' : 'border-[var(--ios-border)] text-[var(--ios-text-secondary)]'}`}>
                                    <span>{emoji}</span>
                                    {count > 1 && <span>{count}</span>}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} className="shrink-0" />
                </div>
                
                {/* ПАНЕЛЬ ВВОДА — safe-area для home indicator + место над клавиатурой (iOS) */}
                <div className="imessage-composer-area flex flex-col w-full bg-[var(--ios-chat-bg)]">
                  {pendingFile && (
                    <div className="px-4 py-2 flex items-center gap-3 border-t border-[var(--ios-separator)]">
                      {pendingFile.type.startsWith('image/') ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={URL.createObjectURL(pendingFile)} alt="Preview" className="h-14 w-14 object-cover rounded-lg" />
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-[var(--ios-search-bg)] flex items-center justify-center">📄</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-medium truncate">{pendingFile.name || 'Attachment'}</p>
                        <button type="button" className="text-[var(--ios-accent)] text-[13px]" onClick={() => setPendingFile(null)}>{t('cancel')}</button>
                      </div>
                    </div>
                  )}

                  {editingMessageId !== null && !isAiLoading && (
                    <div className="px-4 py-1 flex items-center justify-between text-[13px] text-[var(--ios-preview-text)]">
                      <span>{t('editing')}</span>
                      <button type="button" className="text-[var(--ios-accent)]" onClick={() => { setEditingMessageId(null); setText('') }}>{t('cancel')}</button>
                    </div>
                  )}

                  {composerPanel !== 'closed' && (
                    <button
                      type="button"
                      className="imessage-composer-backdrop"
                      aria-label={t('cancel')}
                      onClick={() => setComposerPanel('closed')}
                    />
                  )}

                  {composerPanel !== 'closed' && (
                    <div className="imessage-composer-panel" role="menu">
                      {composerPanel === 'plus' && (
                        <>
                          <button type="button" className="imessage-composer-panel-item" onClick={() => { fileInputRef.current?.click(); setComposerPanel('closed') }}>📎 Attachment</button>
                          <button type="button" className="imessage-composer-panel-item" onClick={() => setComposerPanel('style')}>{t('magicWandTitle')}</button>
                          <button type="button" className="imessage-composer-panel-item" onClick={() => setComposerPanel('translate')}>{t('translateTitle')}</button>
                        </>
                      )}
                      {composerPanel === 'style' && (
                        <>
                          <button type="button" className="imessage-composer-panel-back" onClick={() => setComposerPanel('plus')}>‹ {t('magicWandTitle')}</button>
                          {([{ label: t('styleBusiness'), prompt: 'Business and polite' }, { label: t('styleFriendly'), prompt: 'Friendly and fun' }, { label: t('styleStrict'), prompt: 'Strict and concise' }, { label: t('styleSlang'), prompt: 'Bold slang' }] as const).map((style) => (
                            <button key={style.prompt} type="button" className="imessage-composer-panel-item" onClick={() => { handleAiAction('style', style.prompt) }}>{style.label}</button>
                          ))}
                        </>
                      )}
                      {composerPanel === 'translate' && (
                        <>
                          <button type="button" className="imessage-composer-panel-back" onClick={() => setComposerPanel('plus')}>‹ {t('translateTitle')}</button>
                          {([{ label: t('langEnglish'), prompt: 'English' }, { label: t('langNorwegian'), prompt: 'Norwegian' }, { label: t('langRussian'), prompt: 'Russian' }] as const).map((lang) => (
                            <button key={lang.prompt} type="button" className="imessage-composer-panel-item" onClick={() => { handleAiAction('translate', lang.prompt) }}>{lang.label}</button>
                          ))}
                          <div className="flex gap-2 mt-1 pt-2 border-t border-[var(--ios-separator)] px-1">
                            <input value={customLang} onChange={(e) => setCustomLang(e.target.value)} placeholder={t('customLangPlaceholder')} className="flex-1 px-2 py-1.5 rounded-[8px] bg-[var(--ios-search-bg)] text-[13px] outline-none" />
                            <button type="button" onClick={() => { handleAiAction('translate', customLang) }} className="px-2.5 py-1.5 rounded-[8px] bg-[var(--ios-accent)] text-white text-[13px] font-semibold">{t('go')}</button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div className="imessage-composer relative z-20">
                    <button
                      type="button"
                      className={`imessage-plus-btn ${composerPanel !== 'closed' ? 'imessage-plus-btn-active' : ''}`}
                      disabled={isSending}
                      aria-label="More"
                      aria-expanded={composerPanel !== 'closed'}
                      onClick={() => setComposerPanel((p) => (p === 'closed' ? 'plus' : 'closed'))}
                    >
                      <IconPlus className={`w-5 h-5 transition-transform duration-200 ${composerPanel !== 'closed' ? 'rotate-45' : ''}`} />
                    </button>
                    <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx" />

                    <div className="relative flex-1 min-w-0">
                      <input
                        ref={composerInputRef}
                        className={`imessage-input-pill ${aiProcessingFromInput && isAiLoading ? 'text-transparent caret-transparent' : ''}`}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        onPaste={handlePaste}
                        placeholder={`${t('messagePlaceholder')} • SMS`}
                        disabled={isSending || isAiLoading}
                        onFocus={() => setComposerPanel('closed')}
                      />
                      {!canSend && !isAiLoading && composerPanel === 'closed' && (
                        <IconMic className="imessage-input-mic w-5 h-5" />
                      )}
                      {aiProcessingFromInput && isAiLoading && aiProcessingLabel && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-10">
                          <span className="text-[13px] text-[var(--ios-preview-text)] truncate">{aiProcessingLabel}</span>
                        </div>
                      )}
                    </div>

                    {canSend && (
                      <button type="button" className="ios-send-btn mb-0.5" onClick={sendMessage} disabled={isSending || isAiLoading} aria-label="Send">
                        {isSending ? '…' : editingMessageId !== null ? '✓' : <IconSend className="w-4 h-4 translate-x-px" />}
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          </div>
        </div>
      )}
    </div>
  )
}