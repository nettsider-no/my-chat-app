'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { ChangeEvent, ClipboardEvent, MouseEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { applyTheme, readStoredTheme, type ThemeMode } from '@/lib/theme'
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

  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const [allReactions, setAllReactions] = useState<MessageReaction[]>([])

  const [theme, setTheme] = useState<ThemeMode>('light')

  useEffect(() => {
    const stored = readStoredTheme()
    if (stored) {
      setTheme(stored)
      applyTheme(stored)
    }
  }, [])

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

  // === ИИ ФИШКИ (Состояния) ===
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [showTranslateMenu, setShowTranslateMenu] = useState(false);
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
    setShowStyleMenu(false);
    setShowTranslateMenu(false);
    setAiProcessingLabel(
      msgId
        ? action === 'translate'
          ? 'Перевод сообщения'
          : 'Обработка...'
        : action === 'translate'
          ? `Перевод: ${modifier}`
          : `Стиль: ${modifier}`
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
  }, [])

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
    if ((!text.trim() && !pendingFile) || !selectedUser || isSending) return
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

  function formatTime(isoString: string) { return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }

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

  const themeBtnBase =
    'flex items-center justify-center rounded-[10px] mac-neu-raised border border-[var(--mac-border)] transition-all active:scale-95 hover:brightness-105 shrink-0 text-[var(--mac-text-primary)]'

  // ==========================================
  // ВЕРСТКА (macOS / Messages)
  // ==========================================
  return (
    <div className="flex flex-col h-[100dvh] min-h-0 w-full relative overflow-hidden text-[var(--mac-text-primary)] antialiased md:p-4">
      
      {toastMsg && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 mac-glass-strong z-50 flex items-center gap-3 px-5 py-2.5 rounded-full mac-window-shadow border border-[var(--mac-border)] animate-bounce">
          <span className="font-medium text-sm md:text-base whitespace-nowrap text-[var(--mac-text-primary)]">{toastMsg}</span>
        </div>
      )}

      {isSettingsOpen && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 md:p-6">
            <div className="w-full max-w-lg mac-window-shadow border border-[var(--mac-border)] bg-[var(--mac-window-bg)] rounded-[16px] overflow-hidden max-md:rounded-[14px]">
              <div className="mac-titlebar flex h-9 md:h-10 shrink-0 items-center relative px-3 md:px-4">
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[11px] md:text-xs font-semibold text-[var(--mac-text-secondary)] tracking-wide">
                  Настройки
                </span>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="mac-neu-raised w-9 h-9 md:w-10 md:h-10 rounded-[10px] flex items-center justify-center text-[var(--mac-text-secondary)] hover:text-[var(--mac-danger)] transition-all active:scale-95 border border-[var(--mac-border)]"
                  aria-label="Закрыть настройки"
                  title="Закрыть"
                >
                  ×
                </button>
              </div>
              <div className="mac-glass p-5 md:p-6 border-0 border-t border-[var(--mac-border-subtle)]">
                <div className="mac-neu-inset rounded-[14px] p-4 md:p-5 border border-[var(--mac-border-subtle)]">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-[14px] mac-neu-raised flex items-center justify-center text-xl border border-[var(--mac-border)]">
                      ⚙️
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-[var(--mac-text-primary)]">Раздел настроек</span>
                      <span className="text-xs md:text-sm text-[var(--mac-text-secondary)]">
                        Скоро тут появятся настройки, привязанные к вашему аккаунту.
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
        <div className="flex-1 flex items-center justify-center w-full h-full p-4">
          <div className="max-w-sm w-full mac-window-shadow flex flex-col gap-0 relative overflow-hidden shrink-0 rounded-[14px] md:rounded-[16px] border border-[var(--mac-border)] bg-[var(--mac-window-bg)]">
            <div className="mac-titlebar flex h-9 md:h-10 shrink-0 items-center relative px-3 md:px-4">
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[11px] md:text-xs font-semibold text-[var(--mac-text-secondary)] tracking-wide">
                Вход
              </span>
              <div className="flex-1 min-w-[52px]" />
            </div>
            <div className="mac-glass p-6 md:p-8 flex flex-col gap-5 border-0 border-t border-[var(--mac-border-subtle)] rounded-none relative">
            <button
              type="button"
              onClick={toggleTheme}
              className={`absolute top-4 right-4 z-10 ${themeBtnBase} w-10 h-10 text-lg`}
              title={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
              aria-label={theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'}
            >
              <span aria-hidden>{theme === 'light' ? '🌙' : '☀️'}</span>
            </button>
            <div className="text-center mt-1 mb-1">
              <div className="w-16 h-16 md:w-20 md:h-20 mac-neu-raised text-3xl md:text-4xl rounded-[18px] flex items-center justify-center mx-auto mb-4">💬</div>
              <h2 className="text-xl md:text-2xl font-bold text-[var(--mac-text-primary)] tracking-tight">Мессенджер</h2>
              <p className="text-[var(--mac-text-secondary)] text-xs md:text-sm mt-2">Войдите в аккаунт или создайте новый</p>
            </div>
            <div className="flex flex-col gap-3">
              <input className="mac-neu-inset p-3.5 w-full rounded-[10px] text-sm text-[var(--mac-text-primary)] placeholder:text-[var(--mac-text-secondary)] outline-none focus:ring-2 focus:ring-[var(--mac-accent)]/40 transition-all" placeholder="Ваш Email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}/>
              <input className="mac-neu-inset p-3.5 w-full rounded-[10px] text-sm text-[var(--mac-text-primary)] placeholder:text-[var(--mac-text-secondary)] outline-none focus:ring-2 focus:ring-[var(--mac-accent)]/40 transition-all" type="password" placeholder="Ваш Пароль" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}/>
            </div>
            <div className="flex gap-2 md:gap-3 mt-1">
              <button type="button" className="flex-1 py-3 md:py-3.5 rounded-[10px] font-semibold text-sm md:text-base text-white bg-[var(--mac-imessage-sent)] border-[var(--mac-accent)]/30 hover:brightness-110 transition-all active:scale-[0.98]" onClick={handleLogin}>Войти</button>
              <button type="button" className="mac-neu-raised flex-1 py-3 md:py-3.5 rounded-[10px] font-semibold text-sm md:text-base text-[var(--mac-text-primary)] hover:brightness-95 active:brightness-90 transition-all active:scale-[0.98]" onClick={handleSignUp}>Рег-ция</button>
            </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col min-h-0 w-full max-md:min-h-0">
          <div className="flex flex-col flex-1 min-h-0 w-full max-md:rounded-none max-md:border-x-0 md:rounded-[12px] overflow-hidden mac-window-shadow border border-[var(--mac-border)] bg-[var(--mac-window-bg)] max-md:pt-safe">
            <header
              className={`mac-titlebar flex h-8 md:h-9 shrink-0 items-center relative px-3 md:px-4 z-30 ${selectedUser ? 'max-md:hidden' : ''}`}
            >
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[11px] md:text-xs font-semibold text-[var(--mac-text-secondary)] tracking-wide truncate max-w-[45%]">
                Messenger
              </span>
              <div className="flex-1 min-w-[52px]" />
            </header>
            <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
          {/* ЛЕВАЯ КОЛОНКА */}
          <div className={`flex flex-col min-h-0 min-w-0 overflow-hidden transition-all duration-300 ease-in-out z-20 border-r border-[var(--mac-border-subtle)] bg-[var(--mac-sidebar-bg)]/95 backdrop-blur-xl md:backdrop-blur-2xl
            ${selectedUser ? 'hidden md:flex' : 'flex w-full flex-1'} 
            ${isCollapsed ? 'md:w-20 p-2 items-center' : 'md:w-1/3 p-4'}`}>
            
            <div
              className={`flex mb-4 pb-2 border-none w-full shrink-0 ${
                isCollapsed
                  ? 'flex-col items-center gap-2 md:gap-2'
                  : 'flex-row items-center justify-between'
              }`}
            >
              <button 
  type="button"
  onClick={() => setIsCollapsed(!isCollapsed)} 
  className="cursor-pointer hidden md:flex items-center justify-center w-10 h-10 text-[var(--mac-text-secondary)] hover:text-[var(--mac-accent)] mac-neu-raised rounded-[10px] transition-all duration-300 active:scale-90" 
  title={isCollapsed ? "Развернуть" : "Свернуть"}
>
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`w-5 h-5 transition-transform duration-500 ${isCollapsed ? 'rotate-180' : ''}`}
  >
    <path d="M15 18l-6-6 6-6" />
  </svg>
</button>

              {isCollapsed && (
                <div className="hidden md:flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className={`${themeBtnBase} w-10 h-10 text-lg`}
                    title={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
                    aria-label={theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'}
                  >
                    <span aria-hidden>{theme === 'light' ? '🌙' : '☀️'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(true)}
                    className={`${themeBtnBase} w-10 h-10 text-lg`}
                    title="Настройки"
                    aria-label="Открыть настройки"
                  >
                    <span aria-hidden>⚙️</span>
                  </button>
                </div>
              )}
              
              {!isCollapsed && (
                <div className="flex-1 md:ml-2 pb-2 flex justify-between items-center overflow-hidden gap-2 min-w-0">
                  <div className="flex flex-col ml-3 overflow-hidden leading-tight min-w-0">
  <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--mac-text-secondary)] font-bold">
    Профиль
  </span>
  <span className="text-sm font-semibold text-[var(--mac-text-primary)] truncate">
    {session.user.email}
  </span>
</div>
                  <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className={`${themeBtnBase} w-9 h-9 md:w-10 md:h-10 text-base md:text-lg`}
                    title={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
                    aria-label={theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'}
                  >
                    <span aria-hidden>{theme === 'light' ? '🌙' : '☀️'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(true)}
                    className={`${themeBtnBase} w-9 h-9 md:w-10 md:h-10 text-base md:text-lg`}
                    title="Настройки"
                    aria-label="Открыть настройки"
                  >
                    <span aria-hidden>⚙️</span>
                  </button>
                  <button 
  type="button"
  className="cursor-pointer px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all duration-300 active:scale-95 shrink-0 mac-neu-raised text-[var(--mac-danger)] hover:brightness-110 border border-[var(--mac-border)]" 
  onClick={() => supabase.auth.signOut()}
>
  Выйти
</button>
                  </div>
                </div>
              )}
            </div>
            
            {!isCollapsed && (
              <div className="mb-4 pb-4 w-full shrink-0">
                <h3 className="text-[var(--mac-text-secondary)] font-semibold mb-2 text-xs uppercase tracking-wider">Найти пользователя</h3>
                <div className="flex gap-2">
                  <input className="mac-neu-inset pl-3.5 flex-1 rounded-[10px] text-sm text-[var(--mac-text-primary)] placeholder:text-[var(--mac-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--mac-accent)]/30 transition-all w-full" placeholder="Email для заявки" value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendRequest(newContactEmail)} />
                  <button 
  type="button"
                    className="cursor-pointer w-10 h-10 md:w-11 md:h-11 flex items-center justify-center text-white bg-[var(--mac-imessage-sent)] rounded-[10px] hover:brightness-110 active:scale-95 transition-all duration-300 shrink-0 ml-2 border border-[var(--mac-accent)]/25"
  onClick={() => sendRequest(newContactEmail)}
>
  <span className="text-2xl leading-none font-light mb-0.5">+</span>
</button>
                </div>
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full no-scrollbar max-md:pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] md:pb-0">
              {incomingRequests.length > 0 && (
<div className="mb-4 w-full shrink-0">
  {!isCollapsed && (
    <h3 className="text-[var(--mac-text-secondary)] font-medium mb-3 text-xs uppercase tracking-widest px-2">
      Новые запросы
    </h3>
  )}
  <ul className="w-full flex flex-col items-center gap-2">
    {incomingRequests.map(u => (
      <li 
        key={u.id} 
        className={`w-full transition-all duration-300 ${
          isCollapsed 
            ? 'flex justify-center' 
            : 'p-3.5 rounded-[14px] mac-glass flex flex-col gap-3'
        }`}
      >
        {isCollapsed ? (
           <div 
             className="relative w-12 h-12 mac-neu-raised text-[var(--mac-accent)] rounded-full flex justify-center items-center font-medium uppercase text-lg border border-[var(--mac-border)] cursor-pointer hover:scale-105 transition-all" 
             onClick={() => setIsCollapsed(false)}
           >
             {u.email[0]}
             {/* Красивый бейдж уведомления */}
             <span className="absolute -top-1 -right-1 bg-[var(--mac-danger)] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold border border-[var(--mac-border)]">
               !
             </span>
           </div>
        ) : (
           <>
             <span className="truncate text-sm font-medium text-[var(--mac-text-primary)] text-center">
               {u.email}
             </span>
             <div className="flex gap-2 w-full">
               <button 
                 type="button"
                 className="mac-neu-raised text-white text-xs py-2.5 flex-1 rounded-[10px] bg-[var(--mac-success)] hover:brightness-110 active:scale-95 transition-all font-medium border border-white/10" 
                 onClick={() => acceptRequest(u.id)}
               >
                 Принять
               </button>
               <button 
                 type="button"
                 className="mac-neu-raised text-[var(--mac-text-secondary)] text-xs py-2.5 flex-1 rounded-[10px] border border-[var(--mac-border)] hover:text-[var(--mac-danger)] active:scale-95 transition-all font-medium" 
                 onClick={() => rejectRequest(u.id)}
               >
                 Отклонить
               </button>
             </div>
           </>
        )}
      </li>
    ))}
  </ul>
</div>
              )}

              {!isCollapsed && outgoingRequests.length > 0 && (
                <div className="mb-4 w-full shrink-0">
  <h3 className="text-[var(--mac-text-secondary)] font-medium mb-3 text-xs uppercase tracking-widest px-2">
    Мои заявки
  </h3>
  <ul className="w-full flex flex-col gap-2">
    {outgoingRequests.map(u => (
      <li 
        key={u.id} 
        className="p-3.5 rounded-[14px] mac-glass text-sm flex justify-between items-center group transition-all duration-300 hover:brightness-110"
      >
        <div className="flex flex-col truncate pr-2 w-full">
          <span className="font-medium text-[var(--mac-text-primary)] truncate">{u.email}</span>
          
          {/* Красивые бейджики статусов */}
          <div className="mt-1.5">
            {u.requestStatus === 'pending' ? (
              <span className="text-amber-200 bg-amber-500/15 border border-amber-400/25 px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1.5 w-fit">
                <span className="animate-pulse">⏳</span> Ожидает
              </span>
            ) : (
              <span className="text-[var(--mac-danger)] bg-red-500/12 border border-red-400/20 px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1.5 w-fit">
                🚫 Отклонено
              </span>
            )}
          </div>
        </div>

        {/* Элегантная кнопка отмены */}
        <button 
          type="button"
          className="text-[var(--mac-text-secondary)] hover:text-[var(--mac-danger)] mac-neu-raised w-8 h-8 flex items-center justify-center rounded-full text-xl md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 active:scale-90 shrink-0" 
          onClick={() => cancelOutgoingRequest(u.id)}
          title="Отменить заявку"
        >
          ×
        </button>
      </li>
    ))}
  </ul>
</div>
              )}

              {!isCollapsed && <h3 className="text-[var(--mac-text-secondary)] font-semibold mb-2 text-xs uppercase tracking-wider md:text-center mt-6">Мои друзья</h3>}
              <ul className="w-full flex flex-col gap-1">
  {contacts.map(u => {
    const isSelected = selectedUser?.id === u.id;
    return (
      <li 
        key={u.id} 
        className={`cursor-pointer transition-all duration-300 w-full group flex items-center ${
          isCollapsed
            ? 'justify-center p-1'
            : isSelected
              ? 'p-1 md:p-1 rounded-[9px] justify-between border mac-glass-strong border-[var(--mac-accent)]/35 ring-1 ring-[var(--mac-accent)]/20'
              : 'p-1 md:p-1 rounded-[9px] justify-between border border-[var(--mac-border-subtle)] mac-neu-raised hover:brightness-110 text-[var(--mac-text-primary)]'
        }`}
        onClick={() => setSelectedUser(u)}
      >
        {isCollapsed ? (
          <div className={`relative w-12 h-12 rounded-full flex justify-center items-center font-bold uppercase text-xl transition-all duration-300 ${
            isSelected 
              ? 'bg-[var(--mac-imessage-sent)] text-white mac-window-shadow border border-white/15' 
              : 'mac-neu-raised text-[var(--mac-text-secondary)] border border-[var(--mac-border)]'
          }`}>
            {u.email[0]}
            {/* Кружок непрочитанных (свернутый вид) */}
            {unreadCounts[u.id] > 0 && (
              <span className="absolute -top-1 -right-1 bg-[var(--mac-danger)] text-white text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-bold border border-[var(--mac-border)]">
                {unreadCounts[u.id] > 9 ? '9+' : unreadCounts[u.id]}
              </span>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center truncate p-1">
              {/* Аватарка (развернутый вид) */}
               <div className={`w-8 h-8 md:w-7 md:h-7 rounded-full flex items-center justify-center mr-1.5 uppercase font-bold shrink-0 text-sm md:text-sm transition-all duration-300 ${
                 isSelected
                   ? 'bg-[var(--mac-imessage-sent)] text-white border border-white/15'
                   : 'mac-neu-raised text-[var(--mac-accent)] border border-[var(--mac-border)]'
               }`}>
                 {u.email[0]}
               </div>
               {/* Имя / Почта */}
               <span className={`truncate text-sm md:text-sm transition-colors ${
                 isSelected ? 'font-bold text-[var(--mac-text-primary)]' : 'font-medium text-[var(--mac-text-secondary)] group-hover:text-[var(--mac-text-primary)]'
               }`}>
                 {u.email}
               </span>
            </div>
            
            <div className="flex items-center gap-1 shrink-0">
              {/* Бейдж непрочитанных (развернутый вид) */}
              {unreadCounts[u.id] > 0 && (
                <span className="bg-[var(--mac-imessage-sent)] text-white text-[9px] font-bold px-1 py-0.5 rounded-full border border-white/10">
                  {unreadCounts[u.id]}
                </span>
              )}
              {/* Крестик удаления из друзей */}
              <button 
                type="button"
                className="cursor-pointer text-[var(--mac-text-secondary)] hover:text-[var(--mac-danger)] mac-neu-raised w-6 h-6 flex items-center justify-center rounded-full text-base transition-all duration-300 active:scale-90 shrink-0" 
                onClick={(e) => removeContact(e, u.id)}
                title="Удалить из друзей"
              >
                ×
              </button>
            </div>
          </>
        )}
      </li>
    )
  })}
</ul>
            </div>
          </div>

{/* ПРАВАЯ КОЛОНКА (САМ ЧАТ) */}
          <div className={`flex flex-col relative transition-all duration-300 ease-in-out z-10 w-full min-h-0 flex-1 overflow-hidden bg-[var(--mac-chat-bg)] border-l border-[var(--mac-border-subtle)] max-md:border-l-0
            ${selectedUser ? 'flex md:flex-1 max-md:w-full max-md:flex-1' : 'hidden md:flex md:flex-1'}`}>   
            
            {!selectedUser ? (
              <div className="flex-1 flex flex-col items-center justify-center text-[var(--mac-text-secondary)] p-6 text-center">
                <div className="w-20 h-20 md:w-24 md:h-24 mac-neu-raised rounded-[20px] flex items-center justify-center text-4xl md:text-5xl mb-5 opacity-90">💬</div>
                <p className="text-base md:text-lg font-medium text-[var(--mac-text-primary)]">Выберите друга слева, чтобы начать общение</p>
                <p className="text-xs md:text-sm mt-2 text-[var(--mac-text-secondary)]">Как в Messages на Mac</p>
              </div>
            ) : (
              <>
                {/* ШАПКА ЧАТА */}
                <div className="p-3 md:p-4 mac-glass border-b border-[var(--mac-border-subtle)] z-20 flex items-center shrink-0 w-full gap-2">
                  <button 
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="md:hidden flex items-center justify-center gap-2 min-h-[48px] px-4 py-2.5 rounded-[12px] mac-neu-raised text-[var(--mac-accent)] hover:brightness-110 active:scale-[0.98] transition shrink-0 font-semibold text-base border border-[var(--mac-border)]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-7 h-7 shrink-0" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                    <span>Назад</span>
                  </button>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className={`md:hidden ${themeBtnBase} min-h-[48px] w-12 shrink-0 rounded-[12px] text-xl`}
                    title={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
                    aria-label={theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'}
                  >
                    <span aria-hidden>{theme === 'light' ? '🌙' : '☀️'}</span>
                  </button>
                  <div className="flex flex-1 min-w-0 items-center">
                  <div className="w-10 h-10 rounded-full mac-neu-raised flex items-center justify-center mr-3 uppercase text-lg shrink-0 font-semibold text-[var(--mac-imessage-sent)] border border-[var(--mac-border)]">{selectedUser.email[0]}</div>
                  <div className="flex flex-col overflow-hidden min-w-0">
                    <span className="text-base md:text-lg truncate font-semibold text-[var(--mac-text-primary)]">{selectedUser.email}</span>
                    <span className="text-[10px] md:text-xs text-[var(--mac-success)] font-medium">В сети</span>
                  </div>
                  </div>
                </div>
                
                {/* ОБЛАСТЬ СООБЩЕНИЙ */}
                <div
                  ref={messagesViewportRef}
                  className="bg-transparent flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 md:p-4 flex flex-col gap-3 pb-3 w-full no-scrollbar"
                >
                  {messages.map((m) => {
                    const isMe = m.sender_id === session.user.id;
                    const msgReactions = allReactions.filter((r) => r.message_id === m.id)
                    const isMenuOpen = activeReactionMsgId === m.id;
                    
                    return (
                      <div
                        key={m.id}
                        id={`msg-${m.id}`}
                        className={`relative flex flex-col mb-4 ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        
                        {/* КОНТЕКСТНОЕ МЕНЮ (Эмодзи + Копировать + Перевести) */}
                        {isMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setActiveReactionMsgId(null)} />
                            <div
                              ref={reactionMenuRef}
                              className={`fixed z-30 flex flex-col gap-1.5 mac-glass-strong p-2 rounded-[14px] mac-window-shadow border border-[var(--mac-border)] animate-in zoom-in duration-200 max-h-[70vh] overflow-auto transition-opacity ${
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
                                  className="text-[12px] font-semibold text-[var(--mac-text-primary)] mac-neu-inset hover:brightness-110 px-3 py-1.5 rounded-[10px] w-full text-center transition-colors active:scale-95"
                                >
                                  Копировать текст
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
                                  className="text-[12px] font-semibold text-[var(--mac-accent)] mac-neu-raised border border-[var(--mac-accent)]/25 px-3 py-1.5 rounded-[10px] w-full text-center transition-colors active:scale-95 mt-0.5 flex items-center justify-center gap-1 hover:brightness-110"
                                >
                                  <span>🤖</span> Перевести
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
                          className={`max-w-[85%] md:max-w-[70%] px-3.5 py-2.5 md:px-4 md:py-3 relative flex flex-col shrink-0 transition-all duration-300 select-none md:select-text rounded-[18px] md:rounded-[20px] ${isMe ? 'rounded-br-[5px] mac-msg-sent bg-[var(--mac-imessage-sent)] text-white border border-white/12' : 'rounded-bl-[5px] mac-msg-in bg-[var(--mac-imessage-received)] text-[var(--mac-text-primary)] border border-[var(--mac-imessage-received-border)]'}`}
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
                            <span className="break-words text-[14px] md:text-[15px] leading-relaxed px-0.5 font-medium max-md:pointer-events-none select-none md:select-text">
                              {m.content}
                            </span>
                          )}

                          {/* ВЫВОД ПЕРЕВОДА */}
                          {translations[m.id] && (
                            <div className={`mt-2 pt-2 border-t flex flex-col gap-0.5 ${isMe ? 'border-white/15' : 'border-white/10'}`}>
                              <span className="text-[10px] uppercase font-bold text-[var(--mac-accent)] tracking-wider opacity-90">🤖 Перевод</span>
                              <span className={`break-words text-[13px] md:text-[14px] leading-relaxed italic ${isMe ? 'text-white/85' : 'text-[var(--mac-text-secondary)]'}`}>
                                {translations[m.id]}
                              </span>
                            </div>
                          )}

                          <div className={`flex items-center gap-1.5 self-end mt-1.5 px-0.5 ${isMe ? 'text-white/50' : 'text-[var(--mac-text-secondary)]'}`}>
                            <span className="text-[10px] font-medium tracking-tighter uppercase">{formatTime(m.created_at)}</span>
                            {isMe && <span className="text-[11px] font-bold leading-none">{m.is_read ? '✓✓' : '✓'}</span>}
                          </div>

                          {msgReactions.length > 0 && (
                            <div className={`absolute -bottom-3.5 flex flex-wrap gap-1 z-10 ${isMe ? 'right-2' : 'left-2'}`}>
                              {Array.from(new Set(msgReactions.map((r) => r.emoji))).map((emoji) => {
                                const count = msgReactions.filter((r) => r.emoji === emoji).length
                                const hasMyReaction = msgReactions.some(
                                  (r) => r.emoji === emoji && r.user_id === session.user.id
                                )
                                return (
                                  <button type="button" key={emoji} onClick={(e) => { e.stopPropagation(); toggleReaction(m.id, emoji); }} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold transition-all hover:scale-110 active:scale-90 cursor-pointer border mac-neu-raised ${hasMyReaction ? 'border-[var(--mac-accent)]/40 text-[var(--mac-accent)]' : 'border-[var(--mac-border)] text-[var(--mac-text-secondary)]'}`}>
                                    <span>{emoji}</span>
                                    {count > 1 && <span>{count}</span>}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} className="shrink-0" />
                </div>
                
                {/* ПАНЕЛЬ ВВОДА — safe-area для home indicator + место над клавиатурой (iOS) */}
                <div className="border-t border-[var(--mac-border-subtle)] flex flex-col shrink-0 w-full mac-glass pb-composer-safe max-md:mac-composer-mobile-shadow">
                  
                  {/* ПРЕДПРОСМОТР ФАЙЛА */}
                  {pendingFile && (
                    <div className="p-2 md:p-3 mac-neu-inset border-b border-[var(--mac-border-subtle)] flex items-start gap-3 transition-all shrink-0 mx-2 mt-2 rounded-[10px]">
                      <div className="relative inline-block shrink-0">
                        {pendingFile.type.startsWith('image/') ? (
                          /* eslint-disable-next-line @next/next/no-img-element -- blob preview URL from createObjectURL */
                          <img src={URL.createObjectURL(pendingFile)} alt="Превью" className="h-14 w-14 md:h-16 md:w-16 object-cover rounded-[8px] border border-[var(--mac-border)]" />
                        ) : (
                          <div className="h-14 w-14 md:h-16 md:w-16 mac-neu-raised rounded-[8px] flex items-center justify-center text-2xl border border-[var(--mac-border)]">📄</div>
                        )}
                        <button type="button" onClick={() => setPendingFile(null)} className="absolute -top-2 -right-2 w-5 h-5 rounded-full mac-neu-raised text-[var(--mac-danger)] text-xs flex items-center justify-center hover:brightness-110 border border-[var(--mac-border)]">×</button>
                      </div>
                      <div className="flex flex-col justify-center h-14 md:h-16 min-w-0">
                         <span className="text-xs md:text-sm font-medium text-[var(--mac-text-primary)] truncate max-w-[150px] md:max-w-[200px]">{pendingFile.name || 'Изображение'}</span>
                         <span className="text-[10px] md:text-xs text-[var(--mac-text-secondary)]">Готово к отправке</span>
                      </div>
                    </div>
                  )}

                  {/* СТРОКА С КНОПКАМИ И ИНПУТОМ */}
                  <div className="p-2 max-md:px-3 max-md:pb-1 md:p-3 flex gap-1 md:gap-2 items-end shrink-0 border-t border-[var(--mac-border-subtle)] z-40 relative">
                    
                    {/* КНОПКА ФАЙЛА */}
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[var(--mac-text-secondary)] hover:text-[var(--mac-accent)] p-2 md:p-2.5 rounded-full mac-neu-raised mb-1 md:mb-1 active:scale-95 shrink-0 transition-colors" disabled={isSending}>
                      <span className="text-xl md:text-xl">📎</span>
                    </button>
                    <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx" />
                    
                    {/* 🪄 МАГИЧЕСКАЯ ПАЛОЧКА */}
                    <div className="relative flex items-end">
                          {showStyleMenu && (
                        <div className="absolute bottom-full left-0 mb-3 mac-glass-strong p-2 rounded-[14px] mac-window-shadow border border-[var(--mac-border)] flex flex-col gap-1 w-48 animate-in zoom-in-95 origin-bottom-left" style={{ zIndex: 9999 }}>
                          <span className="text-xs text-[var(--mac-text-secondary)] font-bold px-2 py-1 uppercase tracking-wider">Изменить стиль</span>
                          {['Деловой и вежливый', 'Дружеский и веселый', 'Строгий и короткий', 'Дерзкий (Сленг)'].map(style => (
                            <button
                              key={style}
                              type="button"
                              onClick={() => handleAiAction('style', style)}
                              disabled={isAiLoading}
                              className="text-sm text-left px-3 py-2 text-[var(--mac-text-primary)] hover:bg-[var(--mac-hover-surface)] rounded-[10px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {style}
                            </button>
                          ))}
                        </div>
                      )}
                      <button type="button" onClick={() => { setShowStyleMenu(!showStyleMenu); setShowTranslateMenu(false); }} className={`p-2 md:p-2.5 rounded-full mb-1 active:scale-95 shrink-0 transition-colors mac-neu-raised ${showStyleMenu ? 'text-[var(--mac-accent)] ring-1 ring-[var(--mac-accent)]/35' : 'text-[var(--mac-text-secondary)] hover:text-[var(--mac-accent)]'}`} disabled={isSending || isAiLoading} title="Магическая палочка">
                        <span className="text-xl">🪄</span>
                      </button>
                    </div>

                    {/* 🌐 ПЕРЕВОД */}
                    <div className="relative flex items-end">
                          {showTranslateMenu && (
                        <div className="absolute bottom-full left-0 mb-3 mac-glass-strong p-2 rounded-[14px] mac-window-shadow border border-[var(--mac-border)] flex flex-col gap-1 w-52 animate-in zoom-in-95 origin-bottom-left" style={{ zIndex: 9999 }}>
                          <span className="text-xs text-[var(--mac-text-secondary)] font-bold px-2 py-1 uppercase tracking-wider">Перевести текст</span>
                          {['Английский', 'Норвежский', 'Русский'].map(lang => (
                            <button
                              key={lang}
                              type="button"
                              onClick={() => handleAiAction('translate', lang)}
                              disabled={isAiLoading}
                              className="text-sm text-left px-3 py-2 text-[var(--mac-text-primary)] hover:bg-[var(--mac-hover-surface)] rounded-[10px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {lang}
                            </button>
                          ))}
                          <div className="flex gap-1 mt-1 border-t border-[var(--mac-border-subtle)] pt-1.5 px-1">
                            <input value={customLang} onChange={e => setCustomLang(e.target.value)} placeholder="Свой язык..." className="text-xs p-1.5 mac-neu-inset rounded-[8px] flex-1 outline-none focus:ring-1 focus:ring-[var(--mac-accent)]/40 text-[var(--mac-text-primary)] placeholder:text-[var(--mac-text-secondary)]" />
                            <button
                              type="button"
                              onClick={() => handleAiAction('translate', customLang)}
                              disabled={isAiLoading}
                              className="mac-neu-raised text-white text-xs px-2 py-1.5 rounded-[8px] bg-[var(--mac-imessage-sent)] hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {isAiLoading ? '...' : 'Go'}
                            </button>
                          </div>
                        </div>
                      )}
                      <button type="button" onClick={() => { setShowTranslateMenu(!showTranslateMenu); setShowStyleMenu(false); }} className={`p-2 md:p-2.5 rounded-full mb-1 active:scale-95 shrink-0 transition-colors mac-neu-raised ${showTranslateMenu ? 'text-[var(--mac-accent)] ring-1 ring-[var(--mac-accent)]/35' : 'text-[var(--mac-text-secondary)] hover:text-[var(--mac-accent)]'}`} disabled={isSending || isAiLoading} title="Перевод">
                        <span className="text-xl">🌐</span>
                      </button>
                    </div>

                    {/* ПОЛЕ ВВОДА ТЕКСТА + ВИЗУАЛЬНАЯ ОБРАТНАЯ СВЯЗЬ ИИ */}
                    <div className="relative w-full md:flex-1 min-w-0">
                      <input
                        className={`mac-neu-inset w-full p-3 md:p-4 rounded-full outline-none focus:ring-2 focus:ring-[var(--mac-accent)]/35 transition-all text-[14px] md:text-[15px] min-w-0 text-[var(--mac-text-primary)] placeholder:text-[var(--mac-text-secondary)] ${
                          isAiLoading ? 'ring-2 ring-[var(--mac-accent)]/30 animate-pulse' : ''
                        } ${aiProcessingFromInput && isAiLoading ? 'text-transparent caret-transparent' : ''}`}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        onPaste={handlePaste}
                        placeholder={isAiLoading ? "Сообщение..." : "Сообщение..."}
                        disabled={isSending || isAiLoading}
                      />
                      {aiProcessingFromInput && isAiLoading && aiProcessingLabel && (
                        <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-center pointer-events-none px-6">
                          <div className="mac-glass-strong px-3 py-1 rounded-full border border-[var(--mac-border-subtle)] flex items-center gap-2 animate-in zoom-in duration-200 max-w-[90%]">
                            <span className="text-[11px] font-semibold text-[var(--mac-text-secondary)] truncate">
                              {aiProcessingLabel}
                            </span>
                            <span className="ai-ellipsis text-[var(--mac-accent)]" aria-hidden="true">
                              <span />
                              <span />
                              <span />
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* КНОПКА ОТПРАВКИ */}
                    <button 
                      type="button"
                      className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full font-bold transition-all duration-300 mb-0.5 md:mb-1 shrink-0
                      ${isSending || isAiLoading || (text.trim() === '' && pendingFile === null) 
                        ? 'opacity-40 cursor-not-allowed text-[var(--mac-text-secondary)]' 
                        : 'bg-[var(--mac-imessage-sent)] text-white hover:brightness-110 active:scale-95 border-[var(--mac-accent)]/30'}`} 
                      onClick={sendMessage} 
                      disabled={isSending || isAiLoading || (text.trim() === '' && pendingFile === null)}
                    >
                      {isSending ? (
                        <span className="animate-pulse text-white/70">...</span>
                      ) : (
                        <span className="text-lg md:text-xl transform translate-x-0.5">➤</span>
                      )}
                    </button>
                    
                  </div>
                </div>
              </>
            )}
          </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}