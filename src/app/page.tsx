'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function App() {
  // === 1. СОСТОЯНИЯ (ПЕРЕМЕННЫЕ) ===
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

  // Вспомогательная функция для показа уведомлений
  function showNotification(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 4000)
  }

  // === 2. АВТОРИЗАЦИЯ ===
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
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

  // === 3. ЗАГРУЗКА БОКОВОЙ ПАНЕЛИ И ЗАЯВКИ ===
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

  useEffect(() => {
    fetchSidebarData()
    if (!session) return
    const channel = supabase.channel('realtime-contacts').on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, async (payload) => {
        if (payload.eventType === 'UPDATE' && payload.new.owner_id === session.user.id) {
            const { data: profile } = await supabase.from('profiles').select('email').eq('id', payload.new.contact_id).single()
            const userEmail = profile ? profile.email : 'Пользователь'
            if (payload.new.status === 'accepted') showNotification(`🎉 ${userEmail} принял(а) вашу заявку!`)
            else if (payload.new.status === 'rejected') showNotification(`❌ ${userEmail} отклонил(а) заявку.`)
        }
        fetchSidebarData()
    }).subscribe()
    return () => { supabase.removeChannel(channel) }
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

  // === 4. ЛОГИКА ЧАТА ===
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
          } else if (msg.receiver_id === session.user.id) fetchSidebarData()
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

  // === 5. РАБОТА С ФАЙЛАМИ ===
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
  // === 6. ГЛОБАЛЬНЫЙ ИНТЕРФЕЙС (ВЕРСТКА) ====
  // ==========================================
  
  return (
    <div className="flex h-screen bg-gray-100 p-4 relative overflow-hidden">
      
      {/* Глобальное уведомление (Toast) - поверх всего */}
      {toastMsg && (
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-gray-900/90 backdrop-blur-sm text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-3 animate-bounce border border-gray-700">
          <span className="font-medium">{toastMsg}</span>
        </div>
      )}

      {/* ЕСЛИ НЕ ВОШЕЛ - ЭКРАН ВХОДА */}
      {!session ? (
        <div className="m-auto p-8 max-w-sm w-full bg-white border border-gray-100 shadow-2xl rounded-3xl flex flex-col gap-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
          <div className="text-center mt-2 mb-2">
            <div className="w-20 h-20 bg-blue-50 text-4xl rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">💬</div>
            <h2 className="text-2xl font-extrabold text-gray-800 tracking-tight">Мессенджер</h2>
            <p className="text-gray-500 text-sm mt-2">Войдите в аккаунт или создайте новый</p>
          </div>
          <div className="flex flex-col gap-3">
            <input className="border border-gray-200 p-3.5 w-full rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-400 outline-none transition-all text-sm" placeholder="Ваш Email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}/>
            <input className="border border-gray-200 p-3.5 w-full rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-400 outline-none transition-all text-sm" type="password" placeholder="Ваш Пароль" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}/>
          </div>
          <div className="flex gap-3 mt-2">
            <button className="bg-blue-500 hover:bg-blue-600 text-white p-3.5 flex-1 rounded-xl font-bold shadow-md shadow-blue-500/30 transition-all hover:-translate-y-0.5" onClick={handleLogin}>Войти</button>
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-3.5 flex-1 rounded-xl font-bold shadow-sm transition-all hover:-translate-y-0.5" onClick={handleSignUp}>Регистрация</button>
          </div>
        </div>
      ) : (
      
      /* ЕСЛИ ВОШЕЛ - ЭКРАН ЧАТА */
        <>
          {/* Левая панель */}
          <div className={`bg-white border-r shadow-md rounded-l-lg flex flex-col transition-all duration-300 ease-in-out z-20 ${isCollapsed ? 'w-20 p-2 items-center' : 'w-1/3 p-4'}`}>
            <div className={`flex items-center mb-4 pb-2 border-b w-full ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
              <button onClick={() => setIsCollapsed(!isCollapsed)} className="text-gray-500 hover:text-blue-500 hover:bg-gray-100 p-2 rounded-full transition" title={isCollapsed ? "Развернуть" : "Свернуть"}>{isCollapsed ? '▶' : '◀'} </button>
              {!isCollapsed && (
                <div className="flex-1 ml-2 flex justify-between items-center overflow-hidden">
                  <p className="font-bold truncate text-sm">Профиль: <span className="text-blue-500 block truncate">{session.user.email}</span></p>
                  <button className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs transition" onClick={() => supabase.auth.signOut()}>Выйти</button>
                </div>
              )}
            </div>
            
            {!isCollapsed && (
              <div className="mb-4 pb-4 border-b w-full">
                <h3 className="text-gray-500 font-semibold mb-2 text-xs uppercase tracking-wider">Найти пользователя</h3>
                <div className="flex gap-2">
                  <input className="border p-2 flex-1 rounded text-sm bg-gray-50 w-full" placeholder="Email для заявки" value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendRequest(newContactEmail)} />
                  <button className="bg-blue-500 text-white px-3 py-2 rounded text-sm font-bold" onClick={() => sendRequest(newContactEmail)}>+</button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto overflow-x-hidden w-full no-scrollbar">
              {incomingRequests.length > 0 && (
                <div className="mb-4 w-full">
                  {!isCollapsed && <h3 className="text-indigo-500 font-semibold mb-2 text-xs uppercase tracking-wider">Новые запросы</h3>}
                  <ul className="w-full flex flex-col items-center">
                    {incomingRequests.map(u => (
                      <li key={u.id} className={`mb-2 w-full transition-all ${isCollapsed ? 'flex justify-center' : 'p-3 rounded-lg border border-indigo-200 bg-indigo-50 flex flex-col'}`}>
                        {isCollapsed ? (
                           <div className="relative w-12 h-12 bg-indigo-100 text-indigo-500 rounded-full flex justify-center items-center font-bold uppercase text-xl shadow cursor-pointer" onClick={() => setIsCollapsed(false)}>
                             {u.email[0]}<span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-md">!</span>
                           </div>
                        ) : (
                           <>
                             <span className="truncate text-sm mb-2 font-bold text-center">{u.email}</span>
                             <div className="flex gap-2 w-full">
                               <button className="bg-green-500 text-white text-xs py-1.5 flex-1 rounded hover:bg-green-600" onClick={() => acceptRequest(u.id)}>Принять</button>
                               <button className="bg-red-100 text-red-600 border border-red-200 text-xs py-1.5 flex-1 rounded hover:bg-red-200" onClick={() => rejectRequest(u.id)}>Отклонить</button>
                             </div>
                           </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!isCollapsed && outgoingRequests.length > 0 && (
                <div className="mb-4 w-full">
                  <h3 className="text-gray-400 font-semibold mb-2 text-xs uppercase tracking-wider">Мои заявки</h3>
                  <ul className="w-full">
                    {outgoingRequests.map(u => (
                      <li key={u.id} className="p-2 rounded-lg mb-2 border border-gray-200 bg-gray-50 text-sm flex justify-between items-center group">
                        <div className="flex flex-col truncate w-3/4">
                          <span className="font-bold truncate">{u.email}</span>
                          {u.requestStatus === 'pending' ? <span className="text-yellow-600 text-xs mt-1 flex items-center gap-1">⏳ Ожидает</span> : <span className="text-red-500 text-xs mt-1 flex items-center gap-1">🚫 Отклонено</span>}
                        </div>
                        <button className="text-gray-300 hover:text-red-500 text-xl px-2 opacity-50 group-hover:opacity-100 transition" onClick={() => cancelOutgoingRequest(u.id)}>×</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!isCollapsed && <h3 className="text-gray-500 font-semibold mb-2 text-xs uppercase tracking-wider text-center">Мои друзья</h3>}
              <ul className="w-full flex flex-col items-center">
                {contacts.map(u => {
                   const isSelected = selectedUser?.id === u.id;
                   return (
                      <li key={u.id} className={`cursor-pointer mb-2 transition-all w-full flex items-center ${isCollapsed ? 'justify-center p-1' : `p-3 rounded-lg justify-between ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}`} onClick={() => setSelectedUser(u)} title={isCollapsed ? u.email : ''}>
                        {isCollapsed ? (
                          <div className={`relative w-12 h-12 rounded-full flex justify-center items-center font-bold uppercase text-xl transition-all shadow-sm ${isSelected ? 'bg-blue-500 text-white ring-4 ring-blue-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                            {u.email[0]}
                            {unreadCounts[u.id] > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-bold border-2 border-white shadow-md">{unreadCounts[u.id] > 9 ? '9+' : unreadCounts[u.id]}</span>}
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center truncate">
                               <div className="w-8 h-8 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mr-3 uppercase font-bold shrink-0">{u.email[0]}</div>
                               <span className="truncate font-medium">{u.email}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {unreadCounts[u.id] > 0 && <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full shadow-sm">{unreadCounts[u.id]}</span>}
                              <button className="text-gray-300 hover:text-red-500 text-lg ml-2" onClick={(e) => removeContact(e, u.id)}>×</button>
                            </div>
                          </>
                        )}
                      </li>
                   )
                })}
              </ul>
            </div>
          </div>

          {/* Правая панель (САМ ЧАТ) */}
          <div className="flex-1 bg-white shadow-md rounded-r-lg flex flex-col relative transition-all duration-300 ease-in-out z-10">
            {!selectedUser ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <span className="text-6xl mb-4 opacity-50">💬</span>
                <p className="text-lg">Выберите друга, чтобы начать общение</p>
              </div>
            ) : (
              <>
                {/* Шапка чата */}
                <div className="p-4 border-b bg-white shadow-sm z-10 font-bold text-gray-800 flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-tr from-blue-400 to-blue-600 text-white shadow-md rounded-full flex items-center justify-center mr-4 uppercase text-xl">{selectedUser.email[0]}</div>
                  <div className="flex flex-col"><span className="text-lg">{selectedUser.email}</span><span className="text-xs text-green-500 font-medium">В сети</span></div>
                </div>
                
                {/* Окно сообщений */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-gray-50">
                  {messages.map((m) => {
                    const isMe = m.sender_id === session.user.id
                    return (
                      <div key={m.id} className={`max-w-[75%] p-3 rounded-2xl shadow-sm relative flex flex-col ${isMe ? 'bg-blue-500 text-white self-end rounded-tr-sm' : 'bg-white text-gray-800 border self-start rounded-tl-sm'}`}>
                        {m.file_url && (
                          <div className="mb-2">
                            {m.file_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                               <img src={m.file_url} alt="Вложение" className="rounded-lg max-h-64 object-cover shadow-sm" />
                            ) : (
                               <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-black/10 p-2 rounded text-sm hover:underline">📎 Посмотреть файл</a>
                            )}
                          </div>
                        )}
                        {m.content && <span className="break-words text-[15px]">{m.content}</span>}
                        <span className={`text-[10px] self-end mt-1 font-medium ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>{formatTime(m.created_at)} {isMe && (m.is_read ? '✓✓' : '✓')}</span>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
                
                {/* Нижняя панель ввода */}
                <div className="bg-white border-t flex flex-col">
                  {/* @ts-ignore */}
                  {pendingFile && (
                    <div className="p-3 bg-gray-50 border-b flex items-start gap-3 transition-all">
                      <div className="relative inline-block">
                        {/* @ts-ignore */}
                        {pendingFile.type.startsWith('image/') ? <img src={URL.createObjectURL(pendingFile)} alt="Превью" className="h-16 w-16 object-cover rounded-lg border shadow-sm" /> : <div className="h-16 w-16 bg-white border rounded-lg shadow-sm flex items-center justify-center text-2xl">📄</div>}
                        {/* @ts-ignore */}
                        <button onClick={() => setPendingFile(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 shadow-md">×</button>
                      </div>
                      <div className="flex flex-col justify-center h-16">
                         {/* @ts-ignore */}
                         <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{pendingFile.name || 'Изображение из буфера'}</span>
                         <span className="text-xs text-gray-400">Готово к отправке</span>
                      </div>
                    </div>
                  )}

                  <div className="p-3 flex gap-3 items-end">
                    <button onClick={() => fileInputRef.current?.click()} className="text-gray-400 hover:text-blue-500 p-3 rounded-full hover:bg-gray-100 transition-colors mb-1" disabled={isSending}><span className="text-xl">📎</span></button>
                    {/* @ts-ignore */}
                    <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} accept="image/*, .pdf, .doc, .docx" />
                    {/* @ts-ignore */}
                    <input className="border p-4 flex-1 rounded-3xl outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50 text-[15px]" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} onPaste={handlePaste} placeholder="Напишите сообщение..." disabled={isSending}/>
                    {/* @ts-ignore */}
                    <button className={`text-white w-14 h-14 flex items-center justify-center rounded-full font-bold shadow-md transition-all mb-1 ${isSending || (text.trim() === '' && pendingFile === null) ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 hover:scale-105 active:scale-95'}`} onClick={sendMessage} disabled={isSending || (text.trim() === '' && pendingFile === null)}>{isSending ? '...' : <span className="text-xl">➤</span>}</button>
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