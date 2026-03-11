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
  useEffect(() => {
    if (!session || !selectedUser) return
    async function fetchMessagesAndMarkRead() {
      const { data } = await supabase.from('messages').select('*')
        .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${session.user.id})`)
        .order('created_at', { ascending: true })
      if (data) setMessages(data)
      await supabase.from('messages').update({ is_read: true }).eq('sender_id', selectedUser.id).eq('receiver_id', session.user.id).eq('is_read', false)
      fetchSidebarData()
    }
    fetchMessagesAndMarkRead()
    
    const channel = supabase.channel('realtime-private').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const msg = payload.new
          if (msg.sender_id === selectedUser.id && msg.receiver_id === session.user.id) {
            supabase.from('messages').update({ is_read: true }).eq('id', msg.id).then()
            setMessages((prev) => [...prev, msg])
          } else if (msg.sender_id === session.user.id && msg.receiver_id === selectedUser.id) {
            setMessages((prev) => [...prev, msg])
          }
        }
        if (payload.eventType === 'UPDATE') {
          setMessages((prev) => prev.map(m => m.id === payload.new.id ? payload.new : m))
          fetchSidebarData()
        }
    }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session, selectedUser])

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  useEffect(() => scrollToBottom(), [messages])

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

  // ==========================================
  // ВЕРСТКА С ИДЕАЛЬНОЙ ФИКСАЦИЕЙ ДЛЯ МОБИЛОК
  // ==========================================
  return (
    <div className="flex h-[100dvh] bg-cover bg-center md:p-4 relative overflow-hidden w-full transition-all duration-500 antialiased" style={{ backgroundImage: 'var(--bg-login)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      
      {toastMsg && (
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-gray-900/90 backdrop-blur-sm text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-3 animate-bounce border border-gray-700">
          <span className="font-medium text-sm md:text-base whitespace-nowrap">{toastMsg}</span>
        </div>
      )}

      {/* ЭКРАН ЛОГИНА: Теперь идеально по центру и не обрезается */}
      {!session ? (
        <div className="flex-1 flex items-center justify-center w-full h-full p-4">
          <div className="max-w-sm w-full bg-white border border-gray-100 shadow-2xl rounded-3xl flex flex-col gap-5 relative overflow-hidden shrink-0 p-6 md:p-8">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
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
          <div className={`bg-cover bg-center border-r shadow-md md:rounded-l-lg flex-col transition-all duration-300 ease-in-out z-20 
            ${selectedUser ? 'hidden md:flex' : 'flex w-full'} 
            ${isCollapsed ? 'md:w-20 p-2 items-center' : 'md:w-1/3 p-4'}`} style={{ backgroundImage: 'var(--bg-sidebar)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
            
            <div className={`flex items-center mb-4 pb-2 border-none w-full shrink-0 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
              <button onClick={() => setIsCollapsed(!isCollapsed)} className="hidden md:block text-gray-500 hover:text-blue-500 hover:bg-gray-100 p-2 rounded-full transition" title={isCollapsed ? "Развернуть" : "Свернуть"}>{isCollapsed ? '▶' : '◀'} </button>
              
              {!isCollapsed && (
                <div className="flex-1 md:ml-2 flex justify-between items-center overflow-hidden">
                  <p className="font-bold truncate text-sm">Профиль: <span className="text-blue-500 block truncate">{session.user.email}</span></p>
                  <button className="bg-transparet border border-red-200 hover:bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-xs md:text-sm  transition active:scale-95 shrink-0" onClick={() => supabase.auth.signOut()}>Выйти</button>
                </div>
              )}
            </div>
            
            {!isCollapsed && (
              <div className="mb-4 pb-4 border-b w-full shrink-0">
                <h3 className="text-gray-500 font-semibold mb-2 text-xs uppercase tracking-wider">Найти пользователя</h3>
                <div className="flex gap-2">
                  <input className="border-none pl-3.5 flex-1 rounded-lg text-sm bg-gray-50 w-full" placeholder="Email для заявки" value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendRequest(newContactEmail)} />
                  <button className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm active:scale-95" onClick={() => sendRequest(newContactEmail)}>+</button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto overflow-x-hidden w-full no-scrollbar pb-20 md:pb-0">
              {incomingRequests.length > 0 && (
                <div className="mb-4 w-full shrink-0">
                  {!isCollapsed && <h3 className="text-indigo-500 font-semibold mb-2 text-xs uppercase tracking-wider">Новые запросы</h3>}
                  <ul className="w-full flex flex-col items-center">
                    {incomingRequests.map(u => (
                      <li key={u.id} className={`mb-2 w-full transition-all ${isCollapsed ? 'flex justify-center' : 'p-3 rounded-xl border border-indigo-200 bg-indigo-50 flex flex-col'}`}>
                        {isCollapsed ? (
                           <div className="relative w-12 h-12 bg-indigo-100 text-indigo-500 rounded-full flex justify-center items-center font-bold uppercase text-xl shadow cursor-pointer" onClick={() => setIsCollapsed(false)}>
                             {u.email[0]}<span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-md">!</span>
                           </div>
                        ) : (
                           <>
                             <span className="truncate text-sm mb-3 font-bold text-center">{u.email}</span>
                             <div className="flex gap-2 w-full">
                               <button className="bg-green-500 text-white text-xs py-2 flex-1 rounded-lg hover:bg-green-600 shadow-sm active:scale-95" onClick={() => acceptRequest(u.id)}>Принять</button>
                               <button className="bg-red-100 text-red-600 border border-red-200 text-xs py-2 flex-1 rounded-lg hover:bg-red-200 active:scale-95" onClick={() => rejectRequest(u.id)}>Отклонить</button>
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
                  <h3 className="text-gray-400 font-semibold mb-2 text-xs uppercase tracking-wider">Мои заявки</h3>
                  <ul className="w-full">
                    {outgoingRequests.map(u => (
                      <li key={u.id} className="p-3 rounded-xl mb-2 border border-gray-200 bg-gray-50 text-sm flex justify-between items-center group">
                        <div className="flex flex-col truncate w-3/4">
                          <span className="font-bold truncate">{u.email}</span>
                          {u.requestStatus === 'pending' ? <span className="text-yellow-600 text-xs mt-1 flex items-center gap-1">⏳ Ожидает</span> : <span className="text-red-500 text-xs mt-1 flex items-center gap-1">🚫 Отклонено</span>}
                        </div>
                        <button className="text-gray-400 hover:text-red-500 text-2xl px-2 opacity-50 md:group-hover:opacity-100 transition active:scale-95" onClick={() => cancelOutgoingRequest(u.id)}>×</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!isCollapsed && <h3 className="text-gray-500 font-semibold mb-2 text-xs uppercase tracking-wider md:text-center mt-6">Мои друзья</h3>}
              <ul className="w-full flex flex-col items-center">
                {contacts.map(u => {
                   const isSelected = selectedUser?.id === u.id;
                   return (
                      <li key={u.id} className={`cursor-pointer mb-2 transition-all w-full flex items-center ${isCollapsed ? 'justify-center p-1' : `p-4 md:p-3 rounded-xl justify-between ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500 text-blue-700' : 'hover:bg-gray-50 text-gray-700 bg-white border border-transparent shadow-sm md:shadow-none md:border-none'}`}`} onClick={() => setSelectedUser(u)}>
                        {isCollapsed ? (
                          <div className={`relative w-12 h-12 rounded-full flex justify-center items-center font-bold uppercase text-xl transition-all shadow-sm ${isSelected ? 'bg-blue-500 text-white ring-4 ring-blue-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                            {u.email[0]}
                            {unreadCounts[u.id] > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-bold border-2 border-white shadow-md">{unreadCounts[u.id] > 9 ? '9+' : unreadCounts[u.id]}</span>}
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center truncate">
                               <div className="w-10 h-10 md:w-8 md:h-8 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mr-3 md:mr-3 uppercase font-bold shrink-0 text-lg md:text-base">{u.email[0]}</div>
                               <span className="truncate font-medium text-base md:text-sm">{u.email}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {unreadCounts[u.id] > 0 && <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">{unreadCounts[u.id]}</span>}
                              <button className="text-gray-300 hover:text-red-500 text-2xl md:text-lg ml-2 active:scale-95 shrink-0" onClick={(e) => removeContact(e, u.id)}>×</button>
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
          <div className={`bg-cover bg-center shadow-md md:rounded-r-lg flex-col relative transition-all duration-300 ease-in-out z-10 w-full
            ${selectedUser ? 'flex md:flex-1' : 'hidden md:flex md:flex-1'}`} style={{ backgroundImage: 'var(--bg-chat)', backgroundSize: 'cover', backgroundPosition: 'center' }}>   
            {!selectedUser ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-6 text-center">
                <span className="text-5xl md:text-6xl mb-4 opacity-50">💬</span>
                <p className="text-base md:text-lg">Выберите друга слева, чтобы начать общение</p>
              </div>
            ) : (
              <>
                {/* ШАПКА ЧАТА: z-20 и bg-white гарантируют, что она не просвечивает и всегда сверху */}
                <div className="p-3 md:p-4 border-b bg-white shadow-sm z-20 font-bold text-gray-800 flex items-center shrink-0 w-full" style={{ backgroundImage: "url('/bg-sidebar.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
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
                <div className="flex-1 overflow-y-auto p-3 md:p-4 flex flex-col gap-3 pb-4 w-full no-scrollbar">
                  {messages.map((m) => {
                    const isMe = m.sender_id === session.user.id
                    return (
                      <div key={m.id} className={`max-w-[85%] md:max-w-[75%] p-3 rounded-2xl shadow-sm relative flex flex-col shrink-0 ${isMe ? 'bg-blue-500/80 backdrop-blur-md text-white border border-blue-400/30 self-end rounded-tr-sm' : 'bg-white/70 backdrop-blur-md text-gray-800 border border-white/50 self-start rounded-tl-sm'}`}>
                        {m.file_url && (
                          <div className="mb-2">
                            {m.file_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                               <img src={m.file_url} alt="Вложение" className="rounded-xl max-h-48 md:max-h-64 object-cover shadow-sm" />
                            ) : (
                               <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-black/10 p-2 rounded-lg text-sm hover:underline">📎 Файл</a>
                            )}
                          </div>
                        )}
                        {m.content && <span className="break-words text-[14px] md:text-[15px] leading-relaxed">{m.content}</span>}
                        <span className={`text-[9px] md:text-[10px] self-end mt-1 font-medium ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>{formatTime(m.created_at)} {isMe && (m.is_read ? '✓✓' : '✓')}</span>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} className="shrink-0" />
                </div>
                
                {/* ПАНЕЛЬ ВВОДА: Добавлен paddingBottom с учетом Safe Area (полоски на iPhone) */}
                <div 
                  className="bg-white border-t flex flex-col shrink-0 w-full"
                  style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)',backgroundImage: "url('/bg-sidebar.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
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

                  <div className="p-2 md:p-3 flex gap-2 md:gap-3 items-end shrink-0">
                    <button onClick={() => fileInputRef.current?.click()} className="text-gray-400 hover:text-blue-500 p-2 md:p-3 rounded-full hover:bg-gray-100 transition-colors mb-1 md:mb-1 active:scale-95 shrink-0" disabled={isSending}><span className="text-xl md:text-xl">📎</span></button>
                    {/* @ts-ignore */}
                    <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} accept="image/*, .pdf, .doc, .docx" />
                    {/* @ts-ignore */}
                    <input className="border-none md:p-4 flex-1 rounded-3xl outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 text-[14px] md:text-[15px] min-w-0" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} onPaste={handlePaste} placeholder="Сообщение..." disabled={isSending}/>
                    {/* @ts-ignore */}
                    <button className={`text-white w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full font-bold shadow-md transition-all mb-0.5 md:mb-1 shrink-0 ${isSending || (text.trim() === '' && pendingFile === null) ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 active:scale-95'}`} onClick={sendMessage} disabled={isSending || (text.trim() === '' && pendingFile === null)}>{isSending ? '...' : <span className="text-lg md:text-xl">➤</span>}</button>
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