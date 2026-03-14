'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  const [contacts, setContacts] = useState<any[]>([])
  const [incomingRequests, setIncomingRequests] = useState<any[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([])
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [newContactEmail, setNewContactEmail] = useState('')
  
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const [isSending, setIsSending] = useState(false) 
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const [allReactions, setAllReactions] = useState<any[]>([]);

  // --- ЛОГИКА ДОЛГОГО НАЖАТИЯ ДЛЯ РЕАКЦИЙ ---
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<number | null>(null);

  // Таймер для мобильного долгого нажатия
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  const handlePressStart = (msgId: number) => {
    pressTimer.current = setTimeout(() => {
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

  function showNotification(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 4000)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      // === МАГИЯ ONESIGNAL: Говорим сервису, кто мы такие ===
      if (session) {
        // @ts-ignore
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        // @ts-ignore
        window.OneSignalDeferred.push(async function(OneSignal) {
          await OneSignal.login(session.user.id);
        });
      }
    })
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        // @ts-ignore
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        // @ts-ignore
        window.OneSignalDeferred.push(async function(OneSignal) {
          await OneSignal.login(session.user.id);
        });
      } else {
        // Если вышли из аккаунта - отвязываем пуши
        // @ts-ignore
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        // @ts-ignore
        window.OneSignalDeferred.push(async function(OneSignal) {
          await OneSignal.logout();
        });
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
      else showNotification('❌ Ошибка: ' + error.message)
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
      else showNotification('❌ Ошибка входа: ' + error.message)
    } else {
      showNotification('✅ Успешный вход!')
    }
  }

  async function fetchSidebarData() {
    if (!session) return
    const { data: contactsData } = await supabase.from('contacts').select('contact_id, profiles(id, email)').eq('owner_id', session.user.id).eq('status', 'accepted')
    setContacts(contactsData ? contactsData.map((c: any) => c.profiles) : [])

    const { data: pendingData } = await supabase.from('contacts').select('owner_id').eq('contact_id', session.user.id).eq('status', 'pending')
    if (pendingData && pendingData.length > 0) {
      const { data: reqProfiles } = await supabase.from('profiles').select('*').in('id', pendingData.map(r => r.owner_id))
      setIncomingRequests(reqProfiles || [])
    } else setIncomingRequests([])

    const { data: outData } = await supabase.from('contacts').select('contact_id, status').eq('owner_id', session.user.id).in('status', ['pending', 'rejected'])
    if (outData && outData.length > 0) {
      const { data: outProfiles } = await supabase.from('profiles').select('*').in('id', outData.map(r => r.contact_id))
      if (outProfiles) {
        setOutgoingRequests(outProfiles.map(p => ({ ...p, requestStatus: outData.find(o => o.contact_id === p.id)?.status })))
      }
    } else setOutgoingRequests([])

    const { data: incomingMsgs } = await supabase.from('messages').select('sender_id, is_read').eq('receiver_id', session.user.id)
    const counts: Record<string, number> = {}
    incomingMsgs?.forEach(msg => { if (!msg.is_read) counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1 })
    setUnreadCounts(counts)
  }

  // === ИСПРАВЛЕННЫЙ ГЛОБАЛЬНЫЙ REALTIME ===
  useEffect(() => {
    fetchSidebarData()
    if (!session) return
    
    // Слушаем заявки
    const contactsChannel = supabase.channel('realtime-contacts').on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, async (payload) => {
        if (payload.eventType === 'UPDATE' && payload.new.owner_id === session.user.id) {
            const { data: profile } = await supabase.from('profiles').select('email').eq('id', payload.new.contact_id).single()
            const userEmail = profile ? profile.email : 'Пользователь'
            if (payload.new.status === 'accepted') showNotification(`🎉 ${userEmail} принял(а) вашу заявку!`)
            else if (payload.new.status === 'rejected') showNotification(`❌ ${userEmail} отклонил(а) заявку.`)
        }
        fetchSidebarData()
    }).subscribe()

    // Слушаем ВСЕ новые сообщения, чтобы зажигать цифру "1" даже если мы не в чате!
    const badgesChannel = supabase.channel('realtime-badges').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${session.user.id}` }, () => {
        fetchSidebarData() 
    }).subscribe()

    return () => { 
      supabase.removeChannel(contactsChannel)
      supabase.removeChannel(badgesChannel)
    }
  }, [session])

  async function sendRequest(emailToAdd: string) {
    if (!emailToAdd.trim() || emailToAdd === session?.user.email) return
    const { data: profile } = await supabase.from('profiles').select('*').eq('email', emailToAdd).single()
    if (!profile) return showNotification('⚠️ Пользователь не найден.')
    const { data: existing } = await supabase.from('contacts').select('*').eq('owner_id', session.user.id).eq('contact_id', profile.id)
    if (existing && existing.length > 0) return showNotification('⚠️ Вы уже взаимодействовали с этим пользователем.')
    const { error } = await supabase.from('contacts').insert([{ owner_id: session.user.id, contact_id: profile.id, status: 'pending' }])
    if (!error) { setNewContactEmail(''); showNotification('📨 Заявка отправлена!'); fetchSidebarData(); }
  }
  async function acceptRequest(senderId: string) {
    await supabase.from('contacts').update({ status: 'accepted' }).eq('owner_id', senderId).eq('contact_id', session.user.id)
    await supabase.from('contacts').insert([{ owner_id: session.user.id, contact_id: senderId, status: 'accepted' }])
  }
  async function rejectRequest(senderId: string) {
    await supabase.from('contacts').update({ status: 'rejected' }).eq('owner_id', senderId).eq('contact_id', session.user.id)
    fetchSidebarData()
  }
  async function cancelOutgoingRequest(contactId: string) {
    await supabase.from('contacts').delete().match({ owner_id: session.user.id, contact_id: contactId })
    fetchSidebarData()
  }
  async function removeContact(e: any, contactId: string) {
    e.stopPropagation()
    if (!window.confirm("Удалить из контактов?")) return
    await supabase.from('contacts').delete().match({ owner_id: session.user.id, contact_id: contactId })
    await supabase.from('contacts').delete().match({ owner_id: contactId, contact_id: session.user.id })
    if (selectedUser?.id === contactId) setSelectedUser(null)
  }

  // === ЛОГИКА АКТИВНОГО ЧАТА ===
  // === ЛОГИКА АКТИВНОГО ЧАТА + РЕАКЦИИ ===
  useEffect(() => {
    if (!session || !selectedUser) return
    
    async function fetchMessagesAndMarkRead() {
      // 1. Грузим сообщения
      const { data } = await supabase.from('messages').select('*')
        .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${session.user.id})`)
        .order('created_at', { ascending: true })
      if (data) setMessages(data)
      
      // 2. Грузим реакции сразу при входе в чат
      const { data: reactData } = await supabase.from('message_reactions').select('*');
      if (reactData) setAllReactions(reactData);

      // 3. Помечаем как прочитанные
      await supabase.from('messages').update({ is_read: true }).eq('sender_id', selectedUser.id).eq('receiver_id', session.user.id).eq('is_read', false)
      fetchSidebarData()
    }
    fetchMessagesAndMarkRead()
    
    // 4. Подписываемся на REALTIME (и для сообщений, и для реакций)
    const channel = supabase.channel('realtime-chat-data').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const msg = payload.new
          if ((msg.sender_id === selectedUser.id && msg.receiver_id === session.user.id) || (msg.sender_id === session.user.id && msg.receiver_id === selectedUser.id)) {
            if (msg.sender_id === selectedUser.id) supabase.from('messages').update({ is_read: true }).eq('id', msg.id).then()
            setMessages((prev) => [...prev, msg])
          }
        }
        if (payload.eventType === 'UPDATE') {
          setMessages((prev) => prev.map(m => m.id === payload.new.id ? payload.new : m))
          fetchSidebarData()
        }
    })
    // Магия: слушаем изменения в таблице реакций
    .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, async () => {
        const { data } = await supabase.from('message_reactions').select('*');
        if (data) setAllReactions(data);
    })
    .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [session, selectedUser])

// Функция теперь умеет принимать тип анимации
const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
  messagesEndRef.current?.scrollIntoView({ behavior })
}

// 1. При выборе нового друга — скроллим МГНОВЕННО
useEffect(() => {
  scrollToBottom("auto")
}, [selectedUser])

// 2. При добавлении новых сообщений — скроллим ПЛАВНО
useEffect(() => {
  scrollToBottom("smooth")
}, [messages])

  function handleFileUpload(event: any) {
    const file = event.target.files[0]
    if (file) setPendingFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
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
    if ((!text.trim() && !pendingFile) || !selectedUser || isSending) return
    setIsSending(true)
    let uploadedUrl = null

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
    try {
      // 1. ОПТИМИСТИЧНОЕ ОБНОВЛЕНИЕ UI (Делаем мгновенно визуально)
      const existingLocal = allReactions.find((r: any) => 
        r.message_id === messageId && 
        r.user_id === session.user.id && 
        r.emoji === emoji
      );

      if (existingLocal) {
        // Если уже стоял — мгновенно убираем с экрана
        // @ts-ignore
        setAllReactions(prev => prev.filter(r => r.id !== existingLocal.id));
      } else {
        // Если не было — мгновенно рисуем на экране (даем фейковый ID)
        const tempReaction = { 
          id: Date.now(), 
          message_id: messageId, 
          user_id: session.user.id, 
          emoji: emoji 
        };
        // @ts-ignore
        setAllReactions(prev => [...prev, tempReaction]);
      }

      // 2. ОТПРАВЛЯЕМ В БАЗУ ДАННЫХ В ФОНЕ
      const { data: existing } = await supabase
        .from('message_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', session.user.id)
        .eq('emoji', emoji)
        .single();

      if (existing) {
        await supabase.from('message_reactions').delete().eq('id', existing.id);
      } else {
        await supabase.from('message_reactions').insert([{ 
          message_id: messageId, 
          user_id: session.user.id, 
          emoji: emoji 
        }]);
      }
    } catch (error) {
      console.error('Ошибка при работе с реакцией:', error);
      // Если произошла ошибка (например, нет интернета),
      // в идеале тут нужно откатить локальный стейт назад, 
      // но благодаря Realtime подписке он сам синхронизируется.
    }
  };

  // ==========================================
  // ВЕРСТКА С ИДЕАЛЬНОЙ ФИКСАЦИЕЙ ДЛЯ МОБИЛОК
  // ==========================================
  return (
    <div className="flex h-[100dvh] bg-gradient-to-br from-slate-100 to-indigo-50 text-slate-800 md:p-4 relative overflow-hidden w-full transition-all duration-500 antialiased">
      
      {toastMsg && (
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-gray-900/90 backdrop-blur-sm text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-3 animate-bounce border border-gray-700">
          <span className="font-medium text-sm md:text-base whitespace-nowrap">{toastMsg}</span>
        </div>
      )}

      {/* ЭКРАН ЛОГИНА: Теперь идеально по центру и не обрезается */}
      {!session ? (
        <div className="flex-1 flex items-center justify-center w-full h-full p-4">
          <div className="max-w-sm w-full bg-white/70 backdrop-blur-xl border border-white/50 shadow-2xl shadow-indigo-200/60 rounded-3xl flex flex-col gap-5 relative overflow-hidden shrink-0 p-6 md:p-8">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-300 to-indigo-400"></div>
            <div className="text-center mt-2 mb-2">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-50 text-3xl md:text-4xl rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">💬</div>
              <h2 className="text-xl md:text-2xl font-extrabold text-gray-800 tracking-tight">Мессенджер</h2>
              <p className="text-gray-500 text-xs md:text-sm mt-2">Войдите в аккаунт или создайте новый</p>
            </div>
            <div className="flex flex-col gap-3">
              <input className="border border-gray-200 p-3.5 w-full rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-400 outline-none transition-all text-sm" placeholder="Ваш Email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}/>
              <input className="border border-gray-200 p-3.5 w-full rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-400 outline-none transition-all text-sm" type="password" placeholder="Ваш Пароль" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}/>
            </div>
            <div className="flex gap-2 md:gap-3 mt-2">
              <button className="bg-blue-500 hover:bg-blue-600 text-white p-3 md:p-3.5 flex-1 rounded-xl font-bold text-sm md:text-base shadow-md shadow-blue-500/30 transition-all active:scale-95" onClick={handleLogin}>Войти</button>
              <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-3 md:p-3.5 flex-1 rounded-xl font-bold text-sm md:text-base shadow-sm transition-all active:scale-95" onClick={handleSignUp}>Рег-ция</button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ЛЕВАЯ КОЛОНКА */}
          <div className={`bg-white/80 backdrop-blur-xl border-r border-slate-200/60 shadow-md md:rounded-l-3xl flex-col transition-all duration-300 ease-in-out z-20 
            ${selectedUser ? 'hidden md:flex' : 'flex w-full'} 
            ${isCollapsed ? 'md:w-20 p-2 items-center' : 'md:w-1/3 p-4'}`}>
            
            <div className={`flex items-center mb-4 pb-2 border-none w-full shrink-0 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
              <button 
  onClick={() => setIsCollapsed(!isCollapsed)} 
  className="cursor-pointer hidden md:flex items-center justify-center w-10 h-10 text-slate-500 hover:text-indigo-600 hover:bg-white/80 bg-white/40 backdrop-blur-md border border-white/60 rounded-xl transition-all duration-300 shadow-lg active:scale-90" 
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
              
              {!isCollapsed && (
                <div className="flex-1 md:ml-2 pb-2 flex justify-between items-center overflow-hidden">
                  <div className="flex flex-col ml-3 overflow-hidden leading-tight">
  <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-bold">
    Профиль
  </span>
  <span className="text-sm font-semibold text-slate-700 truncate">
    {session.user.email}
  </span>
</div>
                  <button 
  className="cursor-pointer px-4 py-1.5 rounded-full shadow-md text-xs md:text-sm font-medium transition-all duration-300 active:scale-95 shrink-0 text-slate-500 bg-slate-100/60 hover:bg-rose-50 hover:text-rose-600 border border-transparent hover:border-rose-200" 
  onClick={() => supabase.auth.signOut()}
>
  Выйти
</button>
                </div>
              )}
            </div>
            
            {!isCollapsed && (
              <div className="mb-4 pb-4 w-full shrink-0">
                <h3 className="text-gray-500 font-semibold mb-2 text-xs uppercase tracking-wider">Найти пользователя</h3>
                <div className="flex gap-2">
                  <input className="border  border-slate-200/50 pl-3.5 flex-1 rounded-xl text-sm text-slate-800 shadow-lg placeholder-slate-400 bg-slate-100/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all w-full" placeholder="Email для заявки" value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendRequest(newContactEmail)} />
                  <button 
  className="cursor-pointer w-10 h-10 md:w-11 md:h-11 flex items-center justify-center bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-500/30 hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-500/40 active:scale-95 transition-all duration-300 shrink-0 ml-2"
  onClick={() => sendRequest(newContactEmail)}
>
  <span className="text-2xl leading-none font-light mb-0.5">+</span>
</button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto overflow-x-hidden w-full no-scrollbar pb-20 md:pb-0">
              {incomingRequests.length > 0 && (
<div className="mb-4 w-full shrink-0">
  {!isCollapsed && (
    <h3 className="text-slate-400 font-medium mb-3 text-xs uppercase tracking-widest px-2">
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
            : 'p-3.5 rounded-2xl bg-white/50 backdrop-blur-md border border-white/60 shadow-sm flex flex-col gap-3'
        }`}
      >
        {isCollapsed ? (
           <div 
             className="relative w-12 h-12 bg-gradient-to-br from-indigo-50 to-indigo-100/80 text-indigo-600 rounded-full flex justify-center items-center font-medium uppercase text-lg shadow-sm shadow-indigo-200/50 border border-white/60 cursor-pointer hover:scale-105 transition-all" 
             onClick={() => setIsCollapsed(false)}
           >
             {u.email[0]}
             {/* Красивый бейдж уведомления */}
             <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-sm shadow-rose-500/30 border-[1.5px] border-white">
               !
             </span>
           </div>
        ) : (
           <>
             <span className="truncate text-sm font-medium text-slate-700 text-center">
               {u.email}
             </span>
             <div className="flex gap-2 w-full">
               <button 
                 className="bg-emerald-500 text-white text-xs py-2.5 flex-1 rounded-xl hover:bg-emerald-600 shadow-sm shadow-emerald-500/30 active:scale-95 transition-all font-medium" 
                 onClick={() => acceptRequest(u.id)}
               >
                 Принять
               </button>
               <button 
                 className="bg-slate-100/80 text-slate-500 text-xs py-2.5 flex-1 rounded-xl border border-slate-200/50 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 active:scale-95 transition-all font-medium" 
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
  <h3 className="text-slate-400 font-medium mb-3 text-xs uppercase tracking-widest px-2">
    Мои заявки
  </h3>
  <ul className="w-full flex flex-col gap-2">
    {outgoingRequests.map(u => (
      <li 
        key={u.id} 
        className="p-3.5 rounded-2xl border border-white/60 bg-white/40 backdrop-blur-md shadow-sm text-sm flex justify-between items-center group transition-all duration-300 hover:bg-white/60"
      >
        <div className="flex flex-col truncate pr-2 w-full">
          <span className="font-medium text-slate-700 truncate">{u.email}</span>
          
          {/* Красивые бейджики статусов */}
          <div className="mt-1.5">
            {u.requestStatus === 'pending' ? (
              <span className="text-amber-600 bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1.5 w-fit shadow-sm">
                <span className="animate-pulse">⏳</span> Ожидает
              </span>
            ) : (
              <span className="text-rose-500 bg-rose-50 border border-rose-200/50 px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1.5 w-fit shadow-sm">
                🚫 Отклонено
              </span>
            )}
          </div>
        </div>

        {/* Элегантная кнопка отмены */}
        <button 
          className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 w-8 h-8 flex items-center justify-center rounded-full text-xl md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 active:scale-90 shrink-0 border border-transparent hover:border-rose-100" 
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

              {!isCollapsed && <h3 className="text-gray-500 font-semibold mb-2 text-xs uppercase tracking-wider md:text-center mt-6">Мои друзья</h3>}
              <ul className="w-full flex flex-col gap-1.5">
  {contacts.map(u => {
    const isSelected = selectedUser?.id === u.id;
    return (
      <li 
        key={u.id} 
        className={`cursor-pointer transition-all duration-300 w-full group flex items-center ${
          isCollapsed 
            ? 'justify-center p-1' 
            : `p-2 md:p-2 rounded-2xl justify-between border ${
                isSelected 
                  ? 'bg-white/70 backdrop-blur-md border-slate-200/50 shadow-lg' 
                  : 'border-slate-200/50 shadow-lg hover:bg-white/40 hover:backdrop-blur-sm text-slate-700'
              }`
        }`} 
        onClick={() => setSelectedUser(u)}
      >
        {isCollapsed ? (
          <div className={`relative w-12 h-12 rounded-full flex justify-center items-center font-bold uppercase text-xl transition-all duration-300 ${
            isSelected 
              ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/40 ring-4 ring-indigo-50/50' 
              : 'bg-white/60 text-slate-500 hover:bg-white/80 border border-white/50 shadow-sm'
          }`}>
            {u.email[0]}
            {/* Кружок непрочитанных (свернутый вид) */}
            {unreadCounts[u.id] > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-bold border-2 border-white shadow-sm shadow-rose-500/30">
                {unreadCounts[u.id] > 9 ? '9+' : unreadCounts[u.id]}
              </span>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center truncate p-2">
              {/* Аватарка (развернутый вид) */}
               <div className={`w-10 h-10 md:w-9 md:h-9 rounded-full flex items-center justify-center mr-3 uppercase font-bold shrink-0 text-lg md:text-base transition-all duration-300 ${
                 isSelected
                   ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                   : 'bg-gradient-to-br from-indigo-50 to-indigo-100/80 text-indigo-600 shadow-sm'
               }`}>
                 {u.email[0]}
               </div>
               {/* Имя / Почта */}
               <span className={`truncate text-base md:text-sm transition-colors ${
                 isSelected ? 'font-bold text-slate-800' : 'font-medium text-slate-600 group-hover:text-slate-800'
               }`}>
                 {u.email}
               </span>
            </div>
            
            <div className="flex items-center gap-1 shrink-0">
              {/* Бейдж непрочитанных (развернутый вид) */}
              {unreadCounts[u.id] > 0 && (
                <span className="bg-indigo-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm shadow-indigo-500/30">
                  {unreadCounts[u.id]}
                </span>
              )}
              {/* Крестик удаления из друзей */}
              <button 
                className="cursor-pointer text-slate-300 hover:text-rose-500 hover:bg-rose-50 w-8 h-8 flex items-center justify-center rounded-full text-xl  transition-all duration-300 active:scale-90 shrink-0 border border-transparent hover:border-rose-100" 
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
          {/* ПРАВАЯ КОЛОНКА (САМ ЧАТ) */}
<div className={`bg-cover bg-center shadow-md md:rounded-r-3xl flex-col relative transition-all duration-300 ease-in-out z-10 w-full h-full overflow-hidden
  ${selectedUser ? 'flex md:flex-1' : 'hidden md:flex md:flex-1'}`}>   
            {!selectedUser ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-6 text-center">
                <span className="text-5xl md:text-6xl mb-4 opacity-50">💬</span>
                <p className="text-base md:text-lg">Выберите друга слева, чтобы начать общение</p>
              </div>
            ) : (
              <>
                {/* ШАПКА ЧАТА: z-20 и bg-white гарантируют, что она не просвечивает и всегда сверху */}
                <div className="p-3 md:p-4 bg-white/70 backdrop-blur-md border-b border-slate-200/60 shadow-sm z-20 font-bold text-gray-800 flex items-center shrink-0 w-full rounded-r-3xl">
                  <button 
                    onClick={() => setSelectedUser(null)}
                    className="md:hidden mr-3 text-blue-500 hover:bg-blue-50 p-2 rounded-full flex items-center justify-center active:scale-95 transition shrink-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                  
                  <div className="w-10 h-10 bg-gradient-to-tr from-blue-400 to-blue-600 text-white shadow-md rounded-full flex items-center justify-center mr-3 uppercase text-lg shrink-0">{selectedUser.email[0]}</div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-base md:text-lg truncate">{selectedUser.email}</span>
                    <span className="text-[10px] md:text-xs text-green-500 font-medium">В сети</span>
                  </div>
                </div>
                
                {/* ОБЛАСТЬ СООБЩЕНИЙ */}
                {/* ОБЛАСТЬ СООБЩЕНИЙ */}
              <div className="bg-transparent flex-1 overflow-y-auto p-3 md:p-4 flex flex-col gap-3 pb-4 w-full no-scrollbar scroll-smooth">
{messages.map((m) => {
  const isMe = m.sender_id === session.user.id;
  const msgReactions = allReactions.filter((r: any) => r.message_id === m.id);
  const isMenuOpen = activeReactionMsgId === m.id;
  
  return (
    <div key={m.id} className={`relative flex flex-col mb-4 ${isMe ? 'items-end' : 'items-start'}`}>
      
      {/* 🚀 ПОЛНОЦЕННОЕ КОНТЕКСТНОЕ МЕНЮ (Эмодзи + Копировать) */}
      {isMenuOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setActiveReactionMsgId(null)} />
          
          <div className={`absolute bottom-full mb-1 z-30 flex flex-col gap-1.5 bg-white/95 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-slate-200/50 animate-in zoom-in duration-200 ${isMe ? 'right-2 items-end' : 'left-2 items-start'}`}>
            
            {/* Ряд с эмодзи */}
            <div className="flex gap-1">
              {['❤️', '👍', '🔥', '😂', '😢', '😁', '👑', '🐥'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={(e) => {
                    e.stopPropagation(); 
                    toggleReaction(m.id, emoji);
                    setActiveReactionMsgId(null); 
                  }}
                  className="hover:scale-130 transition-transform px-1.5 py-0.5 text-base md:text-lg active:scale-90 cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Кнопка "Копировать" (показываем, только если есть текст) */}
            {m.content && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(m.content);
                }}
                className="text-[12px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl w-full text-center transition-colors active:scale-95"
              >
                Копировать текст
              </button>
            )}
          </div>
        </>
      )}

      {/* ПУЗЫРЕК СООБЩЕНИЯ */}
      <div 
        onContextMenu={(e) => {
          e.preventDefault(); 
          setActiveReactionMsgId(m.id); 
        }}
        onTouchStart={() => handlePressStart(m.id)}
        onTouchEnd={handlePressEnd}
        onTouchMove={handlePressEnd}
        
        // 🛠 ПРАВКА 1: Добавили отключение серой/синей вспышки при тапе на мобилке
        style={{ 
          WebkitTouchCallout: 'none', 
          WebkitTapHighlightColor: 'transparent' 
        }}
        
        // 🛠 ПРАВКА 2: Добавили select-none md:select-text
        className={`max-w-[85%] md:max-w-[70%] p-3 shadow-sm relative flex flex-col shrink-0 transition-all duration-300 select-none md:select-text ${
          isMe 
            ? 'bg-indigo-500 text-white rounded-2xl rounded-tr-none shadow-md shadow-indigo-500/20 border border-white/10' 
            : 'bg-white/80 backdrop-blur-md text-slate-800 rounded-2xl rounded-tl-none border border-white/60 shadow-sm'
        }`}
      >
        {/* ... (здесь остается твой старый код картинок: m.file_url) ... */}
        {m.file_url && (
          <div className="mb-2 overflow-hidden rounded-xl">
            {m.file_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
               <img 
                 src={m.file_url} 
                 alt="Вложение" 
                 onLoad={() => scrollToBottom("auto")} 
                 className="w-full h-full max-h-64 object-cover hover:scale-[1.02] transition-transform duration-500 rounded-xl shadow-sm" 
               />
            ) : (
               <a href={m.file_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-3 rounded-xl text-sm transition-colors ${isMe ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'}`}>
                 <span className="text-lg">📎</span> <span className="font-medium">Файл</span>
               </a>
            )}
          </div>
        )}

        {/* ... (текст) ... */}
        {m.content && <span className="break-words text-[14px] md:text-[15px] leading-relaxed px-0.5 font-medium">{m.content}</span>}

        {/* ... (время и статус) ... */}
        <div className={`flex items-center gap-1.5 self-end mt-1.5 px-0.5 ${isMe ? 'text-indigo-100/80' : 'text-slate-400'}`}>
          <span className="text-[10px] font-medium tracking-tighter uppercase">{formatTime(m.created_at)}</span>
          {isMe && <span className="text-[11px] font-bold leading-none">{m.is_read ? '✓✓' : '✓'}</span>}
        </div>

        {/* ... (отображение поставленных реакций) ... */}
        {msgReactions.length > 0 && (
          <div className={`absolute -bottom-3.5 flex flex-wrap gap-1 z-10 ${isMe ? 'right-2' : 'left-2'}`}>
            {Array.from(new Set(msgReactions.map((r: any) => r.emoji))).map(emoji => {
              const count = msgReactions.filter((r: any) => r.emoji === emoji).length;
              const hasMyReaction = msgReactions.some((r: any) => r.emoji === emoji && r.user_id === session.user.id);
              
              return (
                <button 
                  key={emoji as string}
                  onClick={(e) => { e.stopPropagation(); toggleReaction(m.id, emoji as string); }}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold shadow-sm transition-all hover:scale-110 active:scale-90 cursor-pointer border ${hasMyReaction ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white/95 border-slate-100 text-slate-500'}`}
                >
                  <span>{emoji as string}</span>
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
                
                {/* ПАНЕЛЬ ВВОДА: Добавлен paddingBottom с учетом Safe Area (полоски на iPhone) */}
                <div
                  className=" border-t border-gray-300 flex flex-col shrink-0 w-full"
                  style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
                >
                  {/* @ts-ignore */}
                  {pendingFile && (
                    <div className="p-2 md:p-3 bg-gray-50 border-b flex items-start gap-3 transition-all shrink-0">
                      <div className="relative inline-block shrink-0">
                        {/* @ts-ignore */}
                        {pendingFile.type.startsWith('image/') ? <img src={URL.createObjectURL(pendingFile)} alt="Превью" className="h-14 w-14 md:h-16 md:w-16 object-cover rounded-lg border shadow-sm" /> : <div className="h-14 w-14 md:h-16 md:w-16 bg-white border rounded-lg shadow-sm flex items-center justify-center text-2xl">📄</div>}
                        {/* @ts-ignore */}
                        <button onClick={() => setPendingFile(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 shadow-md">×</button>
                      </div>
                      <div className="flex flex-col justify-center h-14 md:h-16">
                         {/* @ts-ignore */}
                         <span className="text-xs md:text-sm font-medium text-gray-700 truncate max-w-[150px] md:max-w-[200px]">{pendingFile.name || 'Изображение'}</span>
                         <span className="text-[10px] md:text-xs text-gray-400">Готово к отправке</span>
                      </div>
                    </div>
                  )}

                  <div className="p-2 md:p-3 flex gap-2 md:gap-3 items-end shrink-0 bg-white/70 backdrop-blur-md border-t border-slate-200/60  rounded-br-3xl">
                    <button onClick={() => fileInputRef.current?.click()} className="text-gray-400 hover:text-blue-500 p-2 md:p-3 rounded-full hover:bg-gray-100 transition-colors mb-1 md:mb-1 active:scale-95 shrink-0" disabled={isSending}><span className="text-xl md:text-xl">📎</span></button>
                    {/* @ts-ignore */}
                    <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} accept="image/*, .pdf, .doc, .docx" />
                    {/* @ts-ignore */}
                    <input
  className=" bg-slate-100/60 border border-slate-200/50 w-full md:w-auto md:flex-1 p-3 md:p-4 rounded-full shadow-inner outline-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:bg-white focus:border-indigo-300/50 transition-all text-[14px] md:text-[15px] min-w-0"
  value={text}
  onChange={(e) => setText(e.target.value)}
  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
  onPaste={handlePaste}
  placeholder="Сообщение..."
  disabled={isSending}
/>
                    {/* @ts-ignore */}
                    <button 
  className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full font-bold transition-all duration-300 mb-0.5 md:mb-1 shrink-0 
  ${isSending || (text.trim() === '' && pendingFile === null) 
    ? 'bg-slate-200 text-slate-400 shadow-none cursor-not-allowed' 
    : 'bg-indigo-500 text-white shadow-md shadow-indigo-500/40 hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-500/50 active:scale-95'}`} 
  onClick={sendMessage} 
  disabled={isSending || (text.trim() === '' && pendingFile === null)}
>
  {isSending ? (
    <span className="animate-pulse text-slate-400">...</span>
  ) : (
    <span className="text-lg md:text-xl transform translate-x-0.5">➤</span>
  )}
</button>
                  </div>
                </div>

              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}