'use client'

import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react'
import type { ChangeEvent, ClipboardEvent, ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import {
  isSpeechRecognitionSupported,
  speechLangFromUi,
  VoiceInputSession,
} from '@/src/lib/voice-input'
import { oneSignalLogin, oneSignalLogout } from '@/src/lib/onesignal'
import {
  IconBack,
  IconChevronRight,
  IconGlobe,
  IconMic,
  IconPen,
  IconPhotos,
  IconTranslate,
  IconSearch,
  IconSend,
  IosAvatar,
  MessagesAppIcon,
} from '@/components/ios-ui'
import type {
  Profile,
  OutgoingContact,
  ChatMessage,
  ChatGroup,
  GroupInvite,
  GroupJoinRequest,
  GroupVisibility,
  MessageReaction,
  ContactAcceptedRow,
  ContactPendingIncomingRow,
  ContactOutgoingRow,
  UnreadMessageRow,
  ContactsPayloadNew,
  GroupMemberQueryRow,
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
  | 'myProfile'
  | 'myProfileHint'
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
  | 'deleteMessage'
  | 'downloadImage'
  | 'messageDeleted'
  | 'aiThinking'
  | 'aiTranslateLabel'
  | 'aiStyleLabel'
  | 'styleMenuTitle'
  | 'translateMenuTitle'
  | 'magicWandTitle'
  | 'translateTitle'
  | 'photoTitle'
  | 'customLangPlaceholder'
  | 'go'
  | 'styleBusiness'
  | 'styleFriendly'
  | 'styleStrict'
  | 'styleSlang'
  | 'langEnglish'
  | 'langNorwegian'
  | 'langRussian'
  | 'searchPlaceholder'
  | 'searchNoResults'
  | 'searchMessages'
  | 'groupsTab'
  | 'createGroup'
  | 'createGroupTitle'
  | 'groupNamePlaceholder'
  | 'selectMembers'
  | 'createGroupBtn'
  | 'membersCount'
  | 'noGroupsYet'
  | 'groupCreated'
  | 'groupNameRequired'
  | 'groupMembersRequired'
  | 'groupDbNotReady'
  | 'groupRlsFix'
  | 'groupV2DbNotReady'
  | 'groupInvitesSent'
  | 'groupInviteTitle'
  | 'acceptBtn'
  | 'declineBtn'
  | 'groupSettings'
  | 'groupVisibility'
  | 'groupPrivate'
  | 'groupPublic'
  | 'inviteMembers'
  | 'deleteGroup'
  | 'deleteGroupConfirm'
  | 'groupDeleted'
  | 'searchGroups'
  | 'searchGroupsPlaceholder'
  | 'requestJoin'
  | 'joinRequestSent'
  | 'pendingJoinRequests'
  | 'noPublicGroupsFound'
  | 'memberInvited'
  | 'onlyCreatorCanDelete'
  | 'save'
  | 'voiceInput'
  | 'voiceListening'
  | 'voiceNotSupported'
  | 'voicePermissionDenied'

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
    myProfile: 'Мой профиль',
    myProfileHint: 'Имя и email, которые видят другие в чатах.',
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
    edit: 'Редактировать',
    deleteMessage: 'Удалить',
    downloadImage: 'Скачать изображение',
    messageDeleted: '✅ Сообщение удалено',
    aiThinking: '✨ ИИ думает…',
    aiTranslateLabel: 'Перевод: {x}',
    aiStyleLabel: 'Стиль: {x}',
    styleMenuTitle: 'Изменить стиль',
    translateMenuTitle: 'Перевести текст',
    magicWandTitle: 'Стиль текста',
    translateTitle: 'Перевести',
    photoTitle: 'Фото',
    customLangPlaceholder: 'Свой язык...',
    go: 'Go',
    styleBusiness: 'Деловой и вежливый',
    styleFriendly: 'Дружеский и веселый',
    styleStrict: 'Строгий и короткий',
    styleSlang: 'Дерзкий (Сленг)',
    langEnglish: 'Английский',
    langNorwegian: 'Норвежский',
    langRussian: 'Русский',
    searchPlaceholder: 'Поиск',
    searchNoResults: 'Ничего не найдено',
    searchMessages: 'Сообщения',
    groupsTab: 'Группы',
    createGroup: 'Создать группу',
    createGroupTitle: 'Новая группа',
    groupNamePlaceholder: 'Название группы',
    selectMembers: 'Участники',
    createGroupBtn: 'Создать',
    membersCount: '{n} участников',
    noGroupsYet: 'Пока нет групп',
    groupCreated: '✅ Группа создана',
    groupNameRequired: '⚠️ Введите название группы',
    groupMembersRequired: '⚠️ Выберите хотя бы одного участника',
    groupDbNotReady:
      '⚠️ Таблицы групп не созданы. Откройте Supabase → SQL Editor и выполните файл supabase/groups.sql',
    groupRlsFix:
      '⚠️ Ошибка RLS групп. Выполните в Supabase SQL Editor файл supabase/groups_rls_fix.sql',
    groupV2DbNotReady:
      '⚠️ Выполните supabase/groups_v2.sql в Supabase → SQL Editor (приглашения и публичные группы)',
    groupInvitesSent: '✅ Приглашения отправлены',
    groupInviteTitle: 'Приглашение в группу',
    acceptBtn: 'Принять',
    declineBtn: 'Отклонить',
    groupSettings: 'Настройки группы',
    groupVisibility: 'Видимость',
    groupPrivate: 'Приватная',
    groupPublic: 'Глобальная (в поиске)',
    inviteMembers: 'Пригласить участников',
    deleteGroup: 'Удалить группу',
    deleteGroupConfirm: 'Удалить группу «{name}»? Это нельзя отменить.',
    groupDeleted: '✅ Группа удалена',
    searchGroups: 'Найти группу',
    searchGroupsPlaceholder: 'Название публичной группы…',
    requestJoin: 'Запросить вступление',
    joinRequestSent: '✅ Запрос отправлен',
    pendingJoinRequests: 'Запросы на вступление',
    noPublicGroupsFound: 'Публичные группы не найдены',
    memberInvited: '✅ Приглашение отправлено',
    onlyCreatorCanDelete: '⚠️ Удалить группу может только создатель',
    save: 'Сохранить',
    voiceInput: 'Голосовой ввод',
    voiceListening: 'Слушаю…',
    voiceNotSupported: '⚠️ Голосовой ввод не поддерживается в этом браузере',
    voicePermissionDenied: '⚠️ Разрешите доступ к микрофону',
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
    myProfile: 'My profile',
    myProfileHint: 'Name and email others see in chats.',
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
    edit: 'Edit',
    deleteMessage: 'Delete',
    downloadImage: 'Download image',
    messageDeleted: '✅ Message deleted',
    aiThinking: '✨ AI is thinking…',
    aiTranslateLabel: 'Translate: {x}',
    aiStyleLabel: 'Style: {x}',
    styleMenuTitle: 'Change style',
    translateMenuTitle: 'Translate text',
    magicWandTitle: 'Text style',
    translateTitle: 'Translate',
    photoTitle: 'Photo',
    customLangPlaceholder: 'Custom language…',
    go: 'Go',
    styleBusiness: 'Business & polite',
    styleFriendly: 'Friendly & fun',
    styleStrict: 'Strict & concise',
    styleSlang: 'Bold (slang)',
    langEnglish: 'English',
    langNorwegian: 'Norwegian',
    langRussian: 'Russian',
    searchPlaceholder: 'Search',
    searchNoResults: 'No results',
    searchMessages: 'Messages',
    groupsTab: 'Groups',
    createGroup: 'Create group',
    createGroupTitle: 'New group',
    groupNamePlaceholder: 'Group name',
    selectMembers: 'Members',
    createGroupBtn: 'Create',
    membersCount: '{n} members',
    noGroupsYet: 'No groups yet',
    groupCreated: '✅ Group created',
    groupNameRequired: '⚠️ Enter a group name',
    groupMembersRequired: '⚠️ Select at least one member',
    groupDbNotReady:
      '⚠️ Group tables are missing. Run supabase/groups.sql in Supabase → SQL Editor',
    groupRlsFix: '⚠️ Group RLS error. Run supabase/groups_rls_fix.sql in Supabase → SQL Editor',
    groupV2DbNotReady: '⚠️ Run supabase/groups_v2.sql in Supabase → SQL Editor',
    groupInvitesSent: '✅ Invitations sent',
    groupInviteTitle: 'Group invitation',
    acceptBtn: 'Accept',
    declineBtn: 'Decline',
    groupSettings: 'Group settings',
    groupVisibility: 'Visibility',
    groupPrivate: 'Private',
    groupPublic: 'Public (searchable)',
    inviteMembers: 'Invite members',
    deleteGroup: 'Delete group',
    deleteGroupConfirm: 'Delete group "{name}"? This cannot be undone.',
    groupDeleted: '✅ Group deleted',
    searchGroups: 'Find group',
    searchGroupsPlaceholder: 'Public group name…',
    requestJoin: 'Request to join',
    joinRequestSent: '✅ Request sent',
    pendingJoinRequests: 'Join requests',
    noPublicGroupsFound: 'No public groups found',
    memberInvited: '✅ Invitation sent',
    onlyCreatorCanDelete: '⚠️ Only the creator can delete the group',
    save: 'Save',
    voiceInput: 'Voice input',
    voiceListening: 'Listening…',
    voiceNotSupported: '⚠️ Voice input is not supported in this browser',
    voicePermissionDenied: '⚠️ Allow microphone access',
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
    myProfile: 'Min profil',
    myProfileHint: 'Navn og e-post andre ser i chatter.',
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
    edit: 'Rediger',
    deleteMessage: 'Slett',
    downloadImage: 'Last ned bilde',
    messageDeleted: '✅ Melding slettet',
    aiThinking: '✨ AI tenker…',
    aiTranslateLabel: 'Oversett: {x}',
    aiStyleLabel: 'Stil: {x}',
    styleMenuTitle: 'Endre stil',
    translateMenuTitle: 'Oversett tekst',
    magicWandTitle: 'Tekststil',
    translateTitle: 'Oversett',
    photoTitle: 'Foto',
    customLangPlaceholder: 'Eget språk…',
    go: 'Go',
    styleBusiness: 'Formell og høflig',
    styleFriendly: 'Vennlig og morsom',
    styleStrict: 'Strengt og kort',
    styleSlang: 'Frekk (slang)',
    langEnglish: 'Engelsk',
    langNorwegian: 'Norsk',
    langRussian: 'Russisk',
    searchPlaceholder: 'Søk',
    searchNoResults: 'Ingen resultater',
    searchMessages: 'Meldinger',
    groupsTab: 'Grupper',
    createGroup: 'Opprett gruppe',
    createGroupTitle: 'Ny gruppe',
    groupNamePlaceholder: 'Gruppenavn',
    selectMembers: 'Medlemmer',
    createGroupBtn: 'Opprett',
    membersCount: '{n} medlemmer',
    noGroupsYet: 'Ingen grupper ennå',
    groupCreated: '✅ Gruppe opprettet',
    groupNameRequired: '⚠️ Skriv inn et gruppenavn',
    groupMembersRequired: '⚠️ Velg minst ett medlem',
    groupDbNotReady: '⚠️ Kjør supabase/groups.sql i Supabase → SQL Editor',
    groupRlsFix: '⚠️ Kjør supabase/groups_rls_fix.sql i Supabase → SQL Editor',
    groupV2DbNotReady: '⚠️ Kjør supabase/groups_v2.sql i Supabase → SQL Editor',
    groupInvitesSent: '✅ Invitasjoner sendt',
    groupInviteTitle: 'Gruppeinvitasjon',
    acceptBtn: 'Godta',
    declineBtn: 'Avslå',
    groupSettings: 'Gruppeinnstillinger',
    groupVisibility: 'Synlighet',
    groupPrivate: 'Privat',
    groupPublic: 'Offentlig (søkbar)',
    inviteMembers: 'Inviter medlemmer',
    deleteGroup: 'Slett gruppe',
    deleteGroupConfirm: 'Slette gruppen «{name}»? Dette kan ikke angres.',
    groupDeleted: '✅ Gruppe slettet',
    searchGroups: 'Finn gruppe',
    searchGroupsPlaceholder: 'Offentlig gruppenavn…',
    requestJoin: 'Be om å bli med',
    joinRequestSent: '✅ Forespørsel sendt',
    pendingJoinRequests: 'Forespørsler om medlemskap',
    noPublicGroupsFound: 'Ingen offentlige grupper funnet',
    memberInvited: '✅ Invitasjon sendt',
    onlyCreatorCanDelete: '⚠️ Bare oppretteren kan slette gruppen',
    save: 'Lagre',
    voiceInput: 'Taleinndata',
    voiceListening: 'Lytter…',
    voiceNotSupported: '⚠️ Taleinndata støttes ikke i denne nettleseren',
    voicePermissionDenied: '⚠️ Tillat mikrofontilgang',
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
    myProfile: 'Mon profil',
    myProfileHint: 'Nom et e-mail visibles par les autres dans les chats.',
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
    edit: 'Modifier',
    deleteMessage: 'Supprimer',
    downloadImage: 'Télécharger l’image',
    messageDeleted: '✅ Message supprimé',
    aiThinking: '✨ L’IA réfléchit…',
    aiTranslateLabel: 'Traduire : {x}',
    aiStyleLabel: 'Style : {x}',
    styleMenuTitle: 'Changer le style',
    translateMenuTitle: 'Traduire le texte',
    magicWandTitle: 'Style du texte',
    translateTitle: 'Traduire',
    photoTitle: 'Photo',
    customLangPlaceholder: 'Langue personnalisée…',
    go: 'Go',
    styleBusiness: 'Professionnel et poli',
    styleFriendly: 'Amical et fun',
    styleStrict: 'Strict et concis',
    styleSlang: 'Audacieux (argot)',
    langEnglish: 'Anglais',
    langNorwegian: 'Norvégien',
    langRussian: 'Russe',
    searchPlaceholder: 'Rechercher',
    searchNoResults: 'Aucun résultat',
    searchMessages: 'Messages',
    groupsTab: 'Groupes',
    createGroup: 'Créer un groupe',
    createGroupTitle: 'Nouveau groupe',
    groupNamePlaceholder: 'Nom du groupe',
    selectMembers: 'Membres',
    createGroupBtn: 'Créer',
    membersCount: '{n} membres',
    noGroupsYet: 'Pas encore de groupes',
    groupCreated: '✅ Groupe créé',
    groupNameRequired: '⚠️ Entrez un nom de groupe',
    groupMembersRequired: '⚠️ Sélectionnez au moins un membre',
    groupDbNotReady: '⚠️ Exécutez supabase/groups.sql dans Supabase → SQL Editor',
    groupRlsFix: '⚠️ Exécutez supabase/groups_rls_fix.sql dans Supabase → SQL Editor',
    groupV2DbNotReady: '⚠️ Exécutez supabase/groups_v2.sql dans Supabase → SQL Editor',
    groupInvitesSent: '✅ Invitations envoyées',
    groupInviteTitle: 'Invitation au groupe',
    acceptBtn: 'Accepter',
    declineBtn: 'Refuser',
    groupSettings: 'Paramètres du groupe',
    groupVisibility: 'Visibilité',
    groupPrivate: 'Privé',
    groupPublic: 'Public (recherchable)',
    inviteMembers: 'Inviter des membres',
    deleteGroup: 'Supprimer le groupe',
    deleteGroupConfirm: 'Supprimer le groupe « {name} » ? Irréversible.',
    groupDeleted: '✅ Groupe supprimé',
    searchGroups: 'Trouver un groupe',
    searchGroupsPlaceholder: 'Nom du groupe public…',
    requestJoin: 'Demander à rejoindre',
    joinRequestSent: '✅ Demande envoyée',
    pendingJoinRequests: 'Demandes d\'adhésion',
    noPublicGroupsFound: 'Aucun groupe public trouvé',
    memberInvited: '✅ Invitation envoyée',
    onlyCreatorCanDelete: '⚠️ Seul le créateur peut supprimer le groupe',
    save: 'Enregistrer',
    voiceInput: 'Saisie vocale',
    voiceListening: 'Écoute…',
    voiceNotSupported: '⚠️ Saisie vocale non prise en charge dans ce navigateur',
    voicePermissionDenied: '⚠️ Autorisez l\'accès au micro',
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
    myProfile: 'ملفي الشخصي',
    myProfileHint: 'الاسم والبريد اللذان يراهما الآخرون في المحادثات.',
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
    edit: 'تعديل',
    deleteMessage: 'حذف',
    downloadImage: 'تنزيل الصورة',
    messageDeleted: '✅ تم حذف الرسالة',
    aiThinking: '✨ الذكاء الاصطناعي يفكر…',
    aiTranslateLabel: 'ترجمة: {x}',
    aiStyleLabel: 'النمط: {x}',
    styleMenuTitle: 'تغيير الأسلوب',
    translateMenuTitle: 'ترجمة النص',
    magicWandTitle: 'أسلوب النص',
    translateTitle: 'ترجمة',
    photoTitle: 'صورة',
    customLangPlaceholder: 'لغة مخصصة…',
    go: 'Go',
    styleBusiness: 'رسمي ومهذب',
    styleFriendly: 'ودود ومرح',
    styleStrict: 'صارم ومختصر',
    styleSlang: 'جريء (عامية)',
    langEnglish: 'الإنجليزية',
    langNorwegian: 'النرويجية',
    langRussian: 'الروسية',
    searchPlaceholder: 'بحث',
    searchNoResults: 'لا توجد نتائج',
    searchMessages: 'الرسائل',
    groupsTab: 'المجموعات',
    createGroup: 'إنشاء مجموعة',
    createGroupTitle: 'مجموعة جديدة',
    groupNamePlaceholder: 'اسم المجموعة',
    selectMembers: 'الأعضاء',
    createGroupBtn: 'إنشاء',
    membersCount: '{n} أعضاء',
    noGroupsYet: 'لا توجد مجموعات بعد',
    groupCreated: '✅ تم إنشاء المجموعة',
    groupNameRequired: '⚠️ أدخل اسم المجموعة',
    groupMembersRequired: '⚠️ اختر عضوًا واحدًا على الأقل',
    groupDbNotReady: '⚠️ نفّذ supabase/groups.sql في Supabase → SQL Editor',
    groupRlsFix: '⚠️ نفّذ supabase/groups_rls_fix.sql في Supabase → SQL Editor',
    groupV2DbNotReady: '⚠️ نفّذ supabase/groups_v2.sql في Supabase → SQL Editor',
    groupInvitesSent: '✅ تم إرسال الدعوات',
    groupInviteTitle: 'دعوة إلى مجموعة',
    acceptBtn: 'قبول',
    declineBtn: 'رفض',
    groupSettings: 'إعدادات المجموعة',
    groupVisibility: 'الظهور',
    groupPrivate: 'خاصة',
    groupPublic: 'عامة (قابلة للبحث)',
    inviteMembers: 'دعوة أعضاء',
    deleteGroup: 'حذف المجموعة',
    deleteGroupConfirm: 'حذف المجموعة «{name}»؟ لا يمكن التراجع.',
    groupDeleted: '✅ تم حذف المجموعة',
    searchGroups: 'البحث عن مجموعة',
    searchGroupsPlaceholder: 'اسم المجموعة العامة…',
    requestJoin: 'طلب الانضمام',
    joinRequestSent: '✅ تم إرسال الطلب',
    pendingJoinRequests: 'طلبات الانضمام',
    noPublicGroupsFound: 'لم يتم العثور على مجموعات عامة',
    memberInvited: '✅ تم إرسال الدعوة',
    onlyCreatorCanDelete: '⚠️ يمكن للمنشئ فقط حذف المجموعة',
    save: 'حفظ',
    voiceInput: 'إدخال صوتي',
    voiceListening: 'جاري الاستماع…',
    voiceNotSupported: '⚠️ الإدخال الصوتي غير مدعوم في هذا المتصفح',
    voicePermissionDenied: '⚠️ اسمح بالوصول إلى الميكروفون',
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
    myProfile: '我的资料',
    myProfileHint: '其他人在聊天中看到的姓名和邮箱。',
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
    edit: '编辑',
    deleteMessage: '删除',
    downloadImage: '下载图片',
    messageDeleted: '✅ 消息已删除',
    aiThinking: '✨ AI 思考中…',
    aiTranslateLabel: '翻译：{x}',
    aiStyleLabel: '风格：{x}',
    styleMenuTitle: '更改风格',
    translateMenuTitle: '翻译文本',
    magicWandTitle: '文本风格',
    translateTitle: '翻译',
    photoTitle: '照片',
    customLangPlaceholder: '自定义语言…',
    go: 'Go',
    styleBusiness: '商务且礼貌',
    styleFriendly: '友好且有趣',
    styleStrict: '严格且简洁',
    styleSlang: '大胆（俚语）',
    langEnglish: '英语',
    langNorwegian: '挪威语',
    langRussian: '俄语',
    searchPlaceholder: '搜索',
    searchNoResults: '无结果',
    searchMessages: '消息',
    groupsTab: '群组',
    createGroup: '创建群组',
    createGroupTitle: '新群组',
    groupNamePlaceholder: '群组名称',
    selectMembers: '成员',
    createGroupBtn: '创建',
    membersCount: '{n} 位成员',
    noGroupsYet: '暂无群组',
    groupCreated: '✅ 群组已创建',
    groupNameRequired: '⚠️ 请输入群组名称',
    groupMembersRequired: '⚠️ 请至少选择一位成员',
    groupDbNotReady: '⚠️ 请在 Supabase → SQL Editor 中运行 supabase/groups.sql',
    groupRlsFix: '⚠️ 请运行 supabase/groups_rls_fix.sql',
    groupV2DbNotReady: '⚠️ 请在 Supabase → SQL Editor 中运行 supabase/groups_v2.sql',
    groupInvitesSent: '✅ 邀请已发送',
    groupInviteTitle: '群组邀请',
    acceptBtn: '接受',
    declineBtn: '拒绝',
    groupSettings: '群组设置',
    groupVisibility: '可见性',
    groupPrivate: '私密',
    groupPublic: '公开（可搜索）',
    inviteMembers: '邀请成员',
    deleteGroup: '删除群组',
    deleteGroupConfirm: '删除群组「{name}」？此操作无法撤销。',
    groupDeleted: '✅ 群组已删除',
    searchGroups: '查找群组',
    searchGroupsPlaceholder: '公开群组名称…',
    requestJoin: '申请加入',
    joinRequestSent: '✅ 申请已发送',
    pendingJoinRequests: '加入申请',
    noPublicGroupsFound: '未找到公开群组',
    memberInvited: '✅ 邀请已发送',
    onlyCreatorCanDelete: '⚠️ 只有创建者可以删除群组',
    save: '保存',
    voiceInput: '语音输入',
    voiceListening: '正在聆听…',
    voiceNotSupported: '⚠️ 此浏览器不支持语音输入',
    voicePermissionDenied: '⚠️ 请允许麦克风访问',
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
    myProfile: 'Мій профіль',
    myProfileHint: 'Ім’я та email, які бачать інші в чатах.',
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
    edit: 'Редагувати',
    deleteMessage: 'Видалити',
    downloadImage: 'Завантажити зображення',
    messageDeleted: '✅ Повідомлення видалено',
    aiThinking: '✨ ШІ думає…',
    aiTranslateLabel: 'Переклад: {x}',
    aiStyleLabel: 'Стиль: {x}',
    styleMenuTitle: 'Змінити стиль',
    translateMenuTitle: 'Перекласти текст',
    magicWandTitle: 'Стиль тексту',
    translateTitle: 'Перекласти',
    photoTitle: 'Фото',
    customLangPlaceholder: 'Своя мова…',
    go: 'Go',
    styleBusiness: 'Діловий і ввічливий',
    styleFriendly: 'Дружній і веселий',
    styleStrict: 'Строгий і короткий',
    styleSlang: 'Зухвалий (сленг)',
    langEnglish: 'Англійська',
    langNorwegian: 'Норвезька',
    langRussian: 'Російська',
    searchPlaceholder: 'Пошук',
    searchNoResults: 'Нічого не знайдено',
    searchMessages: 'Повідомлення',
    groupsTab: 'Групи',
    createGroup: 'Створити групу',
    createGroupTitle: 'Нова група',
    groupNamePlaceholder: 'Назва групи',
    selectMembers: 'Учасники',
    createGroupBtn: 'Створити',
    membersCount: '{n} учасників',
    noGroupsYet: 'Поки немає груп',
    groupCreated: '✅ Групу створено',
    groupNameRequired: '⚠️ Введіть назву групи',
    groupMembersRequired: '⚠️ Оберіть хоча б одного учасника',
    groupDbNotReady:
      '⚠️ Таблиці груп не створені. Виконайте supabase/groups.sql у Supabase → SQL Editor',
    groupRlsFix:
      '⚠️ Помилка RLS груп. Виконайте supabase/groups_rls_fix.sql у Supabase → SQL Editor',
    groupV2DbNotReady: '⚠️ Виконайте supabase/groups_v2.sql у Supabase → SQL Editor',
    groupInvitesSent: '✅ Запрошення надіслано',
    groupInviteTitle: 'Запрошення в групу',
    acceptBtn: 'Прийняти',
    declineBtn: 'Відхилити',
    groupSettings: 'Налаштування групи',
    groupVisibility: 'Видимість',
    groupPrivate: 'Приватна',
    groupPublic: 'Глобальна (у пошуку)',
    inviteMembers: 'Запросити учасників',
    deleteGroup: 'Видалити групу',
    deleteGroupConfirm: 'Видалити групу «{name}»? Це незворотно.',
    groupDeleted: '✅ Групу видалено',
    searchGroups: 'Знайти групу',
    searchGroupsPlaceholder: 'Назва публічної групи…',
    requestJoin: 'Запит на вступ',
    joinRequestSent: '✅ Запит надіслано',
    pendingJoinRequests: 'Запити на вступ',
    noPublicGroupsFound: 'Публічних груп не знайдено',
    memberInvited: '✅ Запрошення надіслано',
    onlyCreatorCanDelete: '⚠️ Видалити групу може лише творець',
    save: 'Зберегти',
    voiceInput: 'Голосовий ввід',
    voiceListening: 'Слухаю…',
    voiceNotSupported: '⚠️ Голосовий ввід не підтримується в цьому браузері',
    voicePermissionDenied: '⚠️ Дозвольте доступ до мікрофона',
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
    myProfile: 'Mi perfil',
    myProfileHint: 'Nombre y correo que otros ven en los chats.',
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
    edit: 'Editar',
    deleteMessage: 'Eliminar',
    downloadImage: 'Descargar imagen',
    messageDeleted: '✅ Mensaje eliminado',
    aiThinking: '✨ La IA está pensando…',
    aiTranslateLabel: 'Traducir: {x}',
    aiStyleLabel: 'Estilo: {x}',
    styleMenuTitle: 'Cambiar estilo',
    translateMenuTitle: 'Traducir texto',
    magicWandTitle: 'Estilo de texto',
    translateTitle: 'Traducir',
    photoTitle: 'Foto',
    customLangPlaceholder: 'Idioma personalizado…',
    go: 'Go',
    styleBusiness: 'Profesional y educado',
    styleFriendly: 'Amigable y divertido',
    styleStrict: 'Estricto y conciso',
    styleSlang: 'Atrevido (jerga)',
    langEnglish: 'Inglés',
    langNorwegian: 'Noruego',
    langRussian: 'Ruso',
    searchPlaceholder: 'Buscar',
    searchNoResults: 'Sin resultados',
    searchMessages: 'Mensajes',
    groupsTab: 'Grupos',
    createGroup: 'Crear grupo',
    createGroupTitle: 'Nuevo grupo',
    groupNamePlaceholder: 'Nombre del grupo',
    selectMembers: 'Miembros',
    createGroupBtn: 'Crear',
    membersCount: '{n} miembros',
    noGroupsYet: 'Aún no hay grupos',
    groupCreated: '✅ Grupo creado',
    groupNameRequired: '⚠️ Introduce un nombre de grupo',
    groupMembersRequired: '⚠️ Selecciona al menos un miembro',
    groupDbNotReady: '⚠️ Ejecuta supabase/groups.sql en Supabase → SQL Editor',
    groupRlsFix: '⚠️ Ejecuta supabase/groups_rls_fix.sql en Supabase → SQL Editor',
    groupV2DbNotReady: '⚠️ Ejecuta supabase/groups_v2.sql en Supabase → SQL Editor',
    groupInvitesSent: '✅ Invitaciones enviadas',
    groupInviteTitle: 'Invitación al grupo',
    acceptBtn: 'Aceptar',
    declineBtn: 'Rechazar',
    groupSettings: 'Ajustes del grupo',
    groupVisibility: 'Visibilidad',
    groupPrivate: 'Privado',
    groupPublic: 'Público (buscable)',
    inviteMembers: 'Invitar miembros',
    deleteGroup: 'Eliminar grupo',
    deleteGroupConfirm: '¿Eliminar el grupo «{name}»? No se puede deshacer.',
    groupDeleted: '✅ Grupo eliminado',
    searchGroups: 'Buscar grupo',
    searchGroupsPlaceholder: 'Nombre del grupo público…',
    requestJoin: 'Solicitar unirse',
    joinRequestSent: '✅ Solicitud enviada',
    pendingJoinRequests: 'Solicitudes de unión',
    noPublicGroupsFound: 'No se encontraron grupos públicos',
    memberInvited: '✅ Invitación enviada',
    onlyCreatorCanDelete: '⚠️ Solo el creador puede eliminar el grupo',
    save: 'Guardar',
    voiceInput: 'Entrada de voz',
    voiceListening: 'Escuchando…',
    voiceNotSupported: '⚠️ La entrada de voz no es compatible con este navegador',
    voicePermissionDenied: '⚠️ Permite el acceso al micrófono',
  },
}

function isGroupsSchemaMissingError(message: string) {
  const m = message.toLowerCase()
  return m.includes('chat_groups') && (m.includes('schema cache') || m.includes('does not exist'))
}

function isGroupsRlsRecursionError(message: string) {
  return message.toLowerCase().includes('infinite recursion') && message.toLowerCase().includes('group_members')
}

function isGroupsV2MissingError(message: string) {
  const m = message.toLowerCase()
  return (
    (m.includes('group_invites') || m.includes('group_join_requests') || m.includes('visibility')) &&
    (m.includes('schema cache') || m.includes('does not exist') || m.includes('column'))
  )
}

function groupErrorToast(message: string, t: (key: I18nKey) => string) {
  if (isGroupsSchemaMissingError(message)) return t('groupDbNotReady')
  if (isGroupsRlsRecursionError(message)) return t('groupRlsFix')
  if (isGroupsV2MissingError(message)) return t('groupV2DbNotReady')
  return '❌ ' + message
}

function groupCacheKey(groupId: string) {
  return `g:${groupId}`
}

type VoiceInputTarget = 'composer' | 'search'

function isImageFileUrl(url: string) {
  return /\.(jpeg|jpg|gif|png|webp)$/i.test(url)
}

type InboxMessageHit = {
  id: number
  content: string
  created_at: string
  sender_id: string
  receiver_id: string | null
  peerId: string
}

function escapeIlikePattern(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

function messageSearchSnippet(content: string, query: string, maxLen = 96) {
  const q = query.toLowerCase()
  const lower = content.toLowerCase()
  const idx = lower.indexOf(q)
  if (idx === -1) return content.length > maxLen ? `${content.slice(0, maxLen)}…` : content
  const start = Math.max(0, idx - 24)
  const end = Math.min(content.length, idx + query.length + 36)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < content.length ? '…' : ''
  return `${prefix}${content.slice(start, end)}${suffix}`
}

function highlightSearchMatch(text: string, query: string): ReactNode {
  const q = query.trim()
  if (!q) return text

  const lowerText = text.toLowerCase()
  const lowerQ = q.toLowerCase()
  if (!lowerText.includes(lowerQ)) return text

  const nodes: ReactNode[] = []
  let cursor = 0
  let part = 0

  while (cursor < text.length) {
    const idx = lowerText.indexOf(lowerQ, cursor)
    if (idx === -1) {
      nodes.push(text.slice(cursor))
      break
    }
    if (idx > cursor) nodes.push(text.slice(cursor, idx))
    nodes.push(
      <mark key={`hl-${part++}`} className="imessage-search-highlight">
        {text.slice(idx, idx + q.length)}
      </mark>
    )
    cursor = idx + q.length
  }

  return nodes
}

function renderMessageSearchPreview(content: string, query: string, isMe: boolean) {
  const snippet = messageSearchSnippet(content, query)
  const prefix = isMe ? 'You: ' : ''
  return (
    <>
      {prefix}
      {highlightSearchMatch(snippet, query)}
    </>
  )
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
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null)
  const [groups, setGroups] = useState<ChatGroup[]>([])
  const [groupUnreadCounts, setGroupUnreadCounts] = useState<Record<string, number>>({})
  const [groupPreviews, setGroupPreviews] = useState<
    Record<string, { content: string | null; file_url: string | null; created_at: string; sender_id: string }>
  >({})
  const [extraProfiles, setExtraProfiles] = useState<Record<string, Profile>>({})
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupMemberIds, setNewGroupMemberIds] = useState<Set<string>>(new Set())
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [newGroupVisibility, setNewGroupVisibility] = useState<GroupVisibility>('private')
  const [incomingGroupInvites, setIncomingGroupInvites] = useState<GroupInvite[]>([])
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false)
  const [groupSettingsVisibility, setGroupSettingsVisibility] = useState<GroupVisibility>('private')
  const [groupInviteMemberIds, setGroupInviteMemberIds] = useState<Set<string>>(new Set())
  const [pendingJoinRequests, setPendingJoinRequests] = useState<GroupJoinRequest[]>([])
  const [isSavingGroupSettings, setIsSavingGroupSettings] = useState(false)
  const [isDeletingGroup, setIsDeletingGroup] = useState(false)
  const [publicGroupSearch, setPublicGroupSearch] = useState('')
  const [publicGroupResults, setPublicGroupResults] = useState<ChatGroup[]>([])
  const [isSearchingPublicGroups, setIsSearchingPublicGroups] = useState(false)
  const [newContactEmail, setNewContactEmail] = useState('')
  const [messageSearchQuery, setMessageSearchQuery] = useState('')
  const [inboxMessageHits, setInboxMessageHits] = useState<InboxMessageHit[]>([])

  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showAddUser, setShowAddUser] = useState(false)
  const [inboxFilter, setInboxFilter] = useState<'all' | 'unread' | 'groups' | 'requests'>('all')
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
  // Кэш переписок по собеседнику — чат открывается мгновенно из памяти, свежие данные приходят фоном
  const messagesCacheRef = useRef<Record<string, ChatMessage[]>>({})
  const [text, setText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const composerInputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const voiceSessionRef = useRef<VoiceInputSession | null>(null)
  const voiceSessionTargetRef = useRef<VoiceInputTarget | null>(null)
  const voiceInterimRef = useRef('')
  const [voiceInputTarget, setVoiceInputTarget] = useState<VoiceInputTarget | null>(null)
  const [voiceInterim, setVoiceInterim] = useState('')
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const [allReactions, setAllReactions] = useState<MessageReaction[]>([])

  const t = useCallback(
    (key: I18nKey, vars?: Record<string, string>) => {
      const base = I18N[uiLanguage]?.[key] ?? I18N.ru[key] ?? key
      if (!vars) return base
      return Object.keys(vars).reduce((acc, k) => acc.replaceAll(`{${k}}`, vars[k] ?? ''), base)
    },
    [uiLanguage]
  )

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.dir = uiLanguage === 'ar' ? 'rtl' : 'ltr'
  }, [uiLanguage])

  useEffect(() => {
    if (inboxFilter !== 'groups') {
      setPublicGroupSearch('')
      setPublicGroupResults([])
    }
  }, [inboxFilter])

  const showNotification = useCallback((msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 4000)
  }, [])

  const setVoiceInterimValue = useCallback((value: string) => {
    voiceInterimRef.current = value
    setVoiceInterim(value)
  }, [])

  const appendVoiceTranscript = useCallback((target: VoiceInputTarget, trimmed: string) => {
    if (target === 'composer') {
      setText((prev) => (prev.trim() ? `${prev.trim()} ${trimmed}` : trimmed))
    } else {
      setMessageSearchQuery((prev) => (prev.trim() ? `${prev.trim()} ${trimmed}` : trimmed))
    }
  }, [])

  const flushVoiceInterim = useCallback(
    (target: VoiceInputTarget | null) => {
      const pending = voiceInterimRef.current.trim()
      if (pending && target) appendVoiceTranscript(target, pending)
      voiceInterimRef.current = ''
      setVoiceInterim('')
    },
    [appendVoiceTranscript]
  )

  const stopVoiceInput = useCallback(
    (options?: { immediate?: boolean }) => {
      const immediate = options?.immediate ?? false
      const target = voiceSessionTargetRef.current
      const session = voiceSessionRef.current

      flushVoiceInterim(target)
      voiceSessionRef.current = null
      voiceSessionTargetRef.current = null
      setVoiceInputTarget(null)
      setVoiceInterimValue('')

      if (!session) return
      if (immediate) session.destroyImmediate()
      else session.endByUser()
    },
    [flushVoiceInterim, setVoiceInterimValue]
  )

  const toggleVoiceInput = useCallback(
    (target: VoiceInputTarget) => {
      if (voiceInputTarget === target) {
        stopVoiceInput()
        return
      }
      if (voiceInputTarget) stopVoiceInput({ immediate: true })

      if (!isSpeechRecognitionSupported()) {
        showNotification(t('voiceNotSupported'))
        return
      }

      voiceSessionTargetRef.current = target
      const session = new VoiceInputSession(speechLangFromUi(uiLanguage), {
        onInterim: setVoiceInterimValue,
        onFinal: (trimmed) => {
          appendVoiceTranscript(target, trimmed)
          setVoiceInterimValue('')
        },
        onFatalError: (code) => {
          stopVoiceInput({ immediate: true })
          if (code === 'not-allowed') showNotification(t('voicePermissionDenied'))
          else if (code === 'unsupported') showNotification(t('voiceNotSupported'))
          else showNotification(`❌ ${code}`)
        },
      })
      voiceSessionRef.current = session
      session.begin()
      setVoiceInputTarget(target)

      if (target === 'composer') {
        setComposerPanel('closed')
        composerInputRef.current?.focus()
      } else {
        searchInputRef.current?.focus()
      }
    },
    [
      appendVoiceTranscript,
      setVoiceInterimValue,
      showNotification,
      stopVoiceInput,
      t,
      uiLanguage,
      voiceInputTarget,
    ]
  )

  useEffect(() => {
    voiceSessionRef.current?.setLanguage(speechLangFromUi(uiLanguage))
  }, [uiLanguage])

  useEffect(
    () => () => {
      stopVoiceInput({ immediate: true })
    },
    [stopVoiceInput]
  )

  useEffect(() => {
    if (!selectedUser && !selectedGroup && voiceInputTarget === 'composer') {
      stopVoiceInput({ immediate: true })
    }
  }, [selectedUser, selectedGroup, voiceInputTarget, stopVoiceInput])

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

  useEffect(() => {
    if (isSending || isAiLoading) stopVoiceInput({ immediate: true })
  }, [isSending, isAiLoading, stopVoiceInput])

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
  const pendingScrollTargetRef = useRef<{ peerId: string; msgId: number } | null>(null)
  const [highlightSearchMsgId, setHighlightSearchMsgId] = useState<number | null>(null)

  // Таймер для мобильного долгого нажатия
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressTouchRef = useRef<{ msgId: number; isMe: boolean; x: number; y: number } | null>(null)
  const LONG_PRESS_MS = 520
  const PRESS_MOVE_TOLERANCE_PX = 14

  const clearPressTimer = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  const handlePressStart = (msgId: number, isMe: boolean, clientX: number, clientY: number) => {
    // Меню уже открыто для этого сообщения — не перезапускаем,
    // даём нативному выделению текста сработать (как в Telegram)
    if (activeReactionMsgId === msgId) return
    clearPressTimer()
    pressTouchRef.current = { msgId, isMe, x: clientX, y: clientY }
    pressTimer.current = setTimeout(() => {
      if (pressTouchRef.current?.msgId !== msgId) return
      setActiveReactionIsMe(isMe)
      setActiveReactionMsgId(msgId)
      pressTouchRef.current = null
    }, LONG_PRESS_MS)
  }

  const handlePressMove = (clientX: number, clientY: number) => {
    const start = pressTouchRef.current
    if (!start || !pressTimer.current) return
    const dx = Math.abs(clientX - start.x)
    const dy = Math.abs(clientY - start.y)
    if (dx > PRESS_MOVE_TOLERANCE_PX || dy > PRESS_MOVE_TOLERANCE_PX) {
      clearPressTimer()
      pressTouchRef.current = null
    }
  }

  const handlePressEnd = () => {
    clearPressTimer()
    pressTouchRef.current = null
  }

  const handleMessageContextMenu = (
    e: { preventDefault: () => void },
    msgId: number,
    isMe: boolean,
    isMenuOpen: boolean
  ) => {
    if (isMenuOpen) {
      if (window.getSelection()?.toString()) return
      e.preventDefault()
      return
    }
    e.preventDefault()
    setActiveReactionIsMe(isMe)
    setActiveReactionMsgId(msgId)
  }

  // Esc закрывает меню (десктоп)
  useEffect(() => {
    if (activeReactionMsgId === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveReactionMsgId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeReactionMsgId])

  // Скролл переписки отменяет долгое нажатие — иначе меню открывается при прокрутке
  useEffect(() => {
    const viewportEl = messagesViewportRef.current
    if (!viewportEl) return
    const onScroll = () => handlePressEnd()
    viewportEl.addEventListener('scroll', onScroll, { passive: true })
    return () => viewportEl.removeEventListener('scroll', onScroll)
  }, [])

  // Поиск по тексту сообщений в истории переписок (Supabase + локальный кэш)
  useEffect(() => {
    const query = messageSearchQuery.trim()
    if (!session || !query) {
      setInboxMessageHits([])
      return
    }

    const userId = session.user.id
    const q = query.toLowerCase()

    const localHits: InboxMessageHit[] = []
    for (const [peerId, msgs] of Object.entries(messagesCacheRef.current)) {
      if (peerId.startsWith('g:')) continue
      for (const msg of msgs) {
        if (msg.group_id || !msg.content) continue
        if (!msg.content.toLowerCase().includes(q)) continue
        localHits.push({
          id: msg.id,
          content: msg.content,
          created_at: msg.created_at,
          sender_id: msg.sender_id,
          receiver_id: msg.receiver_id,
          peerId,
        })
      }
    }

    const mergeHits = (remote: InboxMessageHit[]) => {
      const byId = new Map<number, InboxMessageHit>()
      for (const hit of [...localHits, ...remote]) byId.set(hit.id, hit)
      return [...byId.values()].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    }

    if (localHits.length > 0) setInboxMessageHits(mergeHits([]))

    const timer = window.setTimeout(() => {
      void (async () => {
        const pattern = `%${escapeIlikePattern(query)}%`
        const { data, error } = await supabase
          .from('messages')
          .select('id, content, sender_id, receiver_id, created_at')
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .ilike('content', pattern)
          .not('content', 'is', null)
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) {
          console.error('Inbox message search failed:', error)
          setInboxMessageHits(mergeHits([]))
          return
        }

        const remoteHits: InboxMessageHit[] = (data ?? [])
          .filter((msg) => msg.content && msg.receiver_id)
          .map((msg) => ({
            id: msg.id,
            content: msg.content as string,
            created_at: msg.created_at,
            sender_id: msg.sender_id,
            receiver_id: msg.receiver_id,
            peerId: msg.sender_id === userId ? msg.receiver_id : msg.sender_id,
          }))

        setInboxMessageHits(mergeHits(remoteHits))
      })()
    }, 280)

    return () => window.clearTimeout(timer)
  }, [messageSearchQuery, session])

  // Двойной тап по сообщению = быстрый лайк ❤️ (как в Telegram)
  const lastTapRef = useRef<{ id: number; time: number } | null>(null)
  // key нужен, чтобы повторный двойной тап перезапускал анимацию (новый mount span'а)
  const [likeBurst, setLikeBurst] = useState<{ id: number; key: number } | null>(null)

  const quickLike = (msgId: number) => {
    // Сначала даём сердечку начать анимацию, а тяжёлое обновление
    // реакций (ре-рендер списка + запрос) откладываем на пару кадров
    setLikeBurst({ id: msgId, key: Date.now() })
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        void toggleReaction(msgId, '❤️')
      })
    })
    setTimeout(() => setLikeBurst((cur) => (cur?.id === msgId ? null : cur)), 850)
  }

  const handleBubbleTouchEnd = (msgId: number) => {
    handlePressEnd()
    // В режиме выделения двойной тап не должен ставить лайк
    if (activeReactionMsgId === msgId) return
    const now = Date.now()
    const last = lastTapRef.current
    if (last && last.id === msgId && now - last.time < 300) {
      lastTapRef.current = null
      quickLike(msgId)
    } else {
      lastTapRef.current = { id: msgId, time: now }
    }
  }

// Копирование как в Telegram: clipboard API + фолбэк для http/старых браузеров
  const downloadImage = async (url: string) => {
    setActiveReactionMsgId(null)
    const fallbackName = url.split('/').pop()?.split('?')[0] || 'image.jpg'
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error('fetch failed')
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = fallbackName
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      const a = document.createElement('a')
      a.href = url
      a.download = fallbackName
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      a.remove()
    }
  }

  const copyToClipboard = async (text: string) => {
    if (!text) return
    setActiveReactionMsgId(null)
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        document.execCommand('copy')
        ta.remove()
      }
      showNotification('📋 Текст скопирован!')
    } catch {
      showNotification('⚠️ Не удалось скопировать')
    }
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
        ? msgRect.right - menuRect.width
        : msgRect.left

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
      if (s?.user.id) oneSignalLogin(s.user.id)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s?.user.id) void loadUserSettings(s.user.id)
      else setUiLanguage('ru')
      if (s?.user.id) oneSignalLogin(s.user.id)
      else oneSignalLogout()
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
        if (!msg.receiver_id && msg.sender_id === userId) continue
        const peerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id
        if (!peerId || !contactIds.includes(peerId) || previews[peerId]) continue
        previews[peerId] = {
          content: msg.content,
          file_url: msg.file_url,
          created_at: msg.created_at,
          sender_id: msg.sender_id,
        }
      }
      setConversationPreviews(previews)
    } else {
      setConversationPreviews({})
    }

    try {
      const { data: groupMemberRows, error: groupsError } = await supabase
        .from('group_members')
        .select('chat_groups(id, name, created_by, created_at, visibility)')
        .eq('user_id', userId)
      if (groupsError) throw groupsError

      const groupRows = (groupMemberRows ?? []) as GroupMemberQueryRow[]
      const userGroups: ChatGroup[] = groupRows.flatMap((row) => {
        if (!row.chat_groups) return []
        const g = Array.isArray(row.chat_groups) ? row.chat_groups[0] : row.chat_groups
        return g ? [g] : []
      })
      const groupIds = userGroups.map((g) => g.id)

      if (groupIds.length > 0) {
        const { data: allMembers } = await supabase
          .from('group_members')
          .select('group_id')
          .in('group_id', groupIds)
        const memberCountByGroup: Record<string, number> = {}
        for (const row of allMembers ?? []) {
          const gid = row.group_id as string
          memberCountByGroup[gid] = (memberCountByGroup[gid] || 0) + 1
        }
        const groupsWithCounts = userGroups.map((g) => ({
          ...g,
          member_count: memberCountByGroup[g.id] ?? 1,
        }))
        setGroups(groupsWithCounts)

        const { data: recentGroupMsgs } = await supabase
          .from('messages')
          .select('group_id, content, file_url, created_at, sender_id')
          .in('group_id', groupIds)
          .order('created_at', { ascending: false })
          .limit(500)
        const gPreviews: typeof groupPreviews = {}
        for (const msg of recentGroupMsgs ?? []) {
          const gid = msg.group_id as string
          if (gid && !gPreviews[gid]) {
            gPreviews[gid] = {
              content: msg.content,
              file_url: msg.file_url,
              created_at: msg.created_at,
              sender_id: msg.sender_id,
            }
          }
        }
        setGroupPreviews(gPreviews)

        const { data: reads } = await supabase
          .from('group_reads')
          .select('group_id, last_read_at')
          .eq('user_id', userId)
          .in('group_id', groupIds)
        const readMap: Record<string, string> = {}
        for (const r of reads ?? []) {
          readMap[r.group_id as string] = r.last_read_at as string
        }

        const { data: unreadGroupMsgs } = await supabase
          .from('messages')
          .select('group_id, created_at, sender_id')
          .in('group_id', groupIds)
          .neq('sender_id', userId)
        const gUnread: Record<string, number> = {}
        for (const msg of unreadGroupMsgs ?? []) {
          const gid = msg.group_id as string
          const lastRead = readMap[gid]
          if (!lastRead || new Date(msg.created_at as string) > new Date(lastRead)) {
            gUnread[gid] = (gUnread[gid] || 0) + 1
          }
        }
        setGroupUnreadCounts(gUnread)
      } else {
        setGroups([])
        setGroupPreviews({})
        setGroupUnreadCounts({})
      }
    } catch (groupsErr) {
      console.warn('Groups sidebar unavailable:', groupsErr)
      setGroups([])
      setGroupPreviews({})
      setGroupUnreadCounts({})
    }

    try {
      const { data: inviteData, error: invitesError } = await supabase
        .from('group_invites')
        .select(
          'id, group_id, invitee_id, invited_by, status, created_at, chat_groups(id, name, created_by, created_at, visibility)'
        )
        .eq('invitee_id', userId)
        .eq('status', 'pending')
      if (invitesError) throw invitesError
      setIncomingGroupInvites((inviteData ?? []) as GroupInvite[])
    } catch (invitesErr) {
      console.warn('Group invites unavailable:', invitesErr)
      setIncomingGroupInvites([])
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

    const groupsChannel = supabase
      .channel('realtime-groups-sidebar')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_members' },
        () => {
          void fetchSidebarData()
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new as { group_id?: string | null }
          if (row.group_id) void fetchSidebarData()
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_invites' }, () => {
        void fetchSidebarData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_join_requests' }, () => {
        void fetchSidebarData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(contactsChannel)
      supabase.removeChannel(badgesChannel)
      supabase.removeChannel(groupsChannel)
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
      setShowAddUser(false)
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
  // === ЛОГИКА АКТИВНОГО ЧАТА + РЕАКЦИИ ===
  useEffect(() => {
    if (!session || (!selectedUser && !selectedGroup)) return
    const userId = session.user.id
    const isGroup = selectedGroup !== null
    const cacheKey = isGroup ? groupCacheKey(selectedGroup.id) : selectedUser!.id
    const peerId = selectedUser?.id
    const groupId = selectedGroup?.id

    const cached = messagesCacheRef.current[cacheKey]
    setMessages(cached ?? [])

    async function fetchMessagesAndMarkRead() {
      if (isGroup && groupId) {
        const { data: memberRows } = await supabase
          .from('group_members')
          .select('user_id, profiles(id, email)')
          .eq('group_id', groupId)
        const profilesFromMembers: Record<string, Profile> = {}
        for (const row of memberRows ?? []) {
          const raw = row.profiles as Profile | Profile[] | null
          const p = raw ? (Array.isArray(raw) ? raw[0] : raw) : null
          if (p) profilesFromMembers[p.id] = p
        }
        setExtraProfiles((prev) => ({ ...prev, ...profilesFromMembers }))

        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('group_id', groupId)
          .order('created_at', { ascending: true })
        if (error) {
          console.error('Failed to fetch group messages:', error)
        } else if (data) {
          const fresh = data as ChatMessage[]
          messagesCacheRef.current[cacheKey] = fresh
          setMessages(fresh)
        }

        await supabase.from('group_reads').upsert(
          { user_id: userId, group_id: groupId, last_read_at: new Date().toISOString() },
          { onConflict: 'user_id,group_id' }
        )
      } else if (peerId) {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .or(
            `and(sender_id.eq.${userId},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${userId})`
          )
          .order('created_at', { ascending: true })
        if (error) {
          console.error('Failed to fetch DM messages:', error)
        } else if (data) {
          const fresh = data as ChatMessage[]
          messagesCacheRef.current[cacheKey] = fresh
          setMessages(fresh)
        }

        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('sender_id', peerId)
          .eq('receiver_id', userId)
          .eq('is_read', false)
      }

      const { data: reactData } = await supabase.from('message_reactions').select('*')
      if (reactData) setAllReactions(reactData as MessageReaction[])

      void fetchSidebarData()
    }
    void fetchMessagesAndMarkRead()

    const channel = supabase
      .channel(`realtime-chat-${cacheKey}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const msg = payload.new as ChatMessage
            const matchesDm =
              peerId &&
              !msg.group_id &&
              ((msg.sender_id === peerId && msg.receiver_id === userId) ||
                (msg.sender_id === userId && msg.receiver_id === peerId))
            const matchesGroup = groupId && msg.group_id === groupId
            if (matchesDm || matchesGroup) {
              if (matchesDm && msg.sender_id === peerId) {
                void supabase.from('messages').update({ is_read: true }).eq('id', msg.id)
              }
              if (matchesGroup && msg.sender_id !== userId) {
                void supabase.from('group_reads').upsert(
                  { user_id: userId, group_id: groupId, last_read_at: new Date().toISOString() },
                  { onConflict: 'user_id,group_id' }
                )
              }
              setMessages((prev) => {
                const next = [...prev, msg]
                messagesCacheRef.current[cacheKey] = next
                return next
              })
            }
          }
          if (payload.eventType === 'UPDATE' && payload.new) {
            const updated = payload.new as ChatMessage
            const inThread =
              (peerId &&
                !updated.group_id &&
                (updated.sender_id === peerId || updated.receiver_id === peerId)) ||
              (groupId && updated.group_id === groupId)
            if (inThread) {
              setMessages((prev) => {
                const next = prev.map((m) => (m.id === updated.id ? updated : m))
                messagesCacheRef.current[cacheKey] = next
                return next
              })
              void fetchSidebarData()
            }
          }
          if (payload.eventType === 'DELETE' && payload.old) {
            const deleted = payload.old as ChatMessage
            const inThread =
              (peerId &&
                !deleted.group_id &&
                (deleted.sender_id === peerId || deleted.receiver_id === peerId)) ||
              (groupId && deleted.group_id === groupId)
            if (inThread) {
              setMessages((prev) => {
                const next = prev.filter((m) => m.id !== deleted.id)
                messagesCacheRef.current[cacheKey] = next
                return next
              })
              setAllReactions((prev) => prev.filter((r) => r.message_id !== deleted.id))
              void fetchSidebarData()
            }
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
  }, [session, selectedUser, selectedGroup, fetchSidebarData])

  useEffect(() => {
    setEditingMessageId(null)
    setComposerPanel('closed')
  }, [selectedUser?.id, selectedGroup?.id])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = messagesViewportRef.current
    if (!el) return
    // Не дёргаем пользователя, если он листает историю выше
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 320
    if (!nearBottom) return
    if (behavior === 'smooth') {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    } else {
      el.scrollTop = el.scrollHeight
    }
  }, [])

  const prevChatKeyRef = useRef<string | null>(null)
  const lastMsgIdRef = useRef<number | null>(null)

  const scrollToMessage = useCallback((msgId: number, behavior: ScrollBehavior = 'auto') => {
    const el = messagesViewportRef.current
    if (!el) return false
    const msgEl = document.getElementById(`msg-${msgId}`)
    if (!msgEl) return false

    const viewportRect = el.getBoundingClientRect()
    const msgRect = msgEl.getBoundingClientRect()
    // Центрируем найденное сообщение по вертикали в области чата
    const rawTop =
      el.scrollTop + (msgRect.top - viewportRect.top) - (el.clientHeight - msgRect.height) / 2
    const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight)
    const targetTop = Math.max(0, Math.min(rawTop, maxScroll))

    if (behavior === 'smooth') {
      el.scrollTo({ top: targetTop, behavior: 'smooth' })
    } else {
      el.scrollTop = targetTop
    }
    return true
  }, [])

  const tryScrollToPendingSearchMessage = useCallback(() => {
    const target = pendingScrollTargetRef.current
    if (!target || selectedUser?.id !== target.peerId) return false
    if (!messages.some((m) => m.id === target.msgId)) return false
    if (!scrollToMessage(target.msgId, 'auto')) return false

    pendingScrollTargetRef.current = null
    setHighlightSearchMsgId(target.msgId)
    prevChatKeyRef.current = selectedUser.id
    lastMsgIdRef.current = messages.length > 0 ? messages[messages.length - 1].id : null
    return true
  }, [messages, scrollToMessage, selectedUser?.id])

  useEffect(() => {
    if (highlightSearchMsgId === null) return
    const t = window.setTimeout(() => setHighlightSearchMsgId(null), 2200)
    return () => window.clearTimeout(t)
  }, [highlightSearchMsgId])

  useLayoutEffect(() => {
    const el = messagesViewportRef.current
    if (!el) return

    // Переход из поиска: ждём нужный чат и сообщение, не скроллим вниз
    if (pendingScrollTargetRef.current) {
      if (tryScrollToPendingSearchMessage()) return
      return
    }

    const chatKey = selectedGroup?.id ?? selectedUser?.id ?? null
    const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null
    const isNewChat = chatKey !== prevChatKeyRef.current
    const isNewMessage = lastMsg !== null && lastMsg.id !== lastMsgIdRef.current

    if (isNewChat || lastMsgIdRef.current === null) {
      // Открытие чата (или первая загрузка истории): мгновенно вниз,
      // ещё до того как пользователь увидит кадр
      el.scrollTop = el.scrollHeight
    } else if (isNewMessage && lastMsg) {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160
      if (lastMsg.sender_id === session?.user.id) {
        // Своё сообщение — мгновенно вниз
        el.scrollTop = el.scrollHeight
      } else if (nearBottom) {
        // Чужое сообщение и мы внизу — плавно доскролливаем
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
      }
      // Если пользователь листает историю выше — не дёргаем его
    }

    prevChatKeyRef.current = chatKey
    lastMsgIdRef.current = lastMsg?.id ?? null
  }, [selectedUser?.id, selectedGroup?.id, messages, session?.user.id, tryScrollToPendingSearchMessage])

  // Повторная попытка после отрисовки DOM и подгрузки истории с другого чата
  useEffect(() => {
    if (!pendingScrollTargetRef.current) return

    let cancelled = false
    let rafId = 0
    const attempt = (tries = 0) => {
      if (cancelled || tries > 40) return
      if (tryScrollToPendingSearchMessage()) return
      rafId = requestAnimationFrame(() => attempt(tries + 1))
    }

    rafId = requestAnimationFrame(() => requestAnimationFrame(() => attempt(0)))
    const giveUpTimer = window.setTimeout(() => {
      if (cancelled || !pendingScrollTargetRef.current) return
      const target = pendingScrollTargetRef.current
      if (selectedUser?.id !== target.peerId) return
      if (messages.some((m) => m.id === target.msgId)) return
      // Сообщение не найдено в загруженной истории — отпускаем pending
      pendingScrollTargetRef.current = null
      const el = messagesViewportRef.current
      if (el) el.scrollTop = el.scrollHeight
    }, 4000)

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      window.clearTimeout(giveUpTimer)
    }
  }, [selectedUser?.id, messages, tryScrollToPendingSearchMessage])

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

  const openDm = (peer: Profile) => {
    setSelectedGroup(null)
    setSelectedUser(peer)
  }

  const openGroup = (group: ChatGroup) => {
    setSelectedUser(null)
    setSelectedGroup(group)
  }

  const closeChat = () => {
    setSelectedUser(null)
    setSelectedGroup(null)
  }

  function inviteGroupFromRow(row: GroupInvite['chat_groups']): ChatGroup | null {
    if (!row) return null
    return Array.isArray(row) ? row[0] ?? null : row
  }

  async function createGroup() {
    if (!session || isCreatingGroup) return
    const name = newGroupName.trim()
    if (!name) return showNotification(t('groupNameRequired'))
    if (newGroupMemberIds.size === 0) return showNotification(t('groupMembersRequired'))

    setIsCreatingGroup(true)
    const { data: group, error: groupError } = await supabase
      .from('chat_groups')
      .insert({ name, created_by: session.user.id, visibility: newGroupVisibility })
      .select('id, name, created_by, created_at, visibility')
      .single()

    if (groupError || !group) {
      showNotification(groupErrorToast(groupError?.message ?? 'Failed to create group', t))
      setIsCreatingGroup(false)
      return
    }

    const { error: selfMemberError } = await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: session.user.id,
      role: 'admin',
    })
    if (selfMemberError) {
      showNotification(groupErrorToast(selfMemberError.message, t))
      setIsCreatingGroup(false)
      return
    }

    const invites = Array.from(newGroupMemberIds).map((uid) => ({
      group_id: group.id,
      invitee_id: uid,
      invited_by: session.user.id,
    }))
    const { error: invitesError } = await supabase.from('group_invites').insert(invites)
    if (invitesError) {
      showNotification(groupErrorToast(invitesError.message, t))
      setIsCreatingGroup(false)
      return
    }

    await supabase.from('group_reads').insert({
      user_id: session.user.id,
      group_id: group.id,
      last_read_at: new Date().toISOString(),
    })

    const created: ChatGroup = {
      ...group,
      member_count: 1,
    }
    setIsCreatingGroup(false)
    setIsCreateGroupOpen(false)
    setNewGroupName('')
    setNewGroupMemberIds(new Set())
    setNewGroupVisibility('private')
    showNotification(t('groupInvitesSent'))
    void fetchSidebarData()
    openGroup(created)
  }

  async function acceptGroupInvite(invite: GroupInvite) {
    if (!session) return
    const { error: memberError } = await supabase.from('group_members').insert({
      group_id: invite.group_id,
      user_id: session.user.id,
      role: 'member',
    })
    if (memberError) {
      showNotification(groupErrorToast(memberError.message, t))
      return
    }
    await supabase.from('group_invites').update({ status: 'accepted' }).eq('id', invite.id)
    await supabase.from('group_reads').upsert(
      {
        user_id: session.user.id,
        group_id: invite.group_id,
        last_read_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,group_id' }
    )
    const g = inviteGroupFromRow(invite.chat_groups)
    void fetchSidebarData()
    if (g) openGroup({ ...g, member_count: (g.member_count ?? 0) + 1 })
  }

  async function declineGroupInvite(inviteId: string) {
    if (!session) return
    await supabase.from('group_invites').update({ status: 'declined' }).eq('id', inviteId)
    void fetchSidebarData()
  }

  async function loadGroupJoinRequests(groupId: string) {
    if (!session) return
    const { data, error } = await supabase
      .from('group_join_requests')
      .select('id, group_id, user_id, status, created_at, profiles(id, email)')
      .eq('group_id', groupId)
      .eq('status', 'pending')
    if (error) {
      console.warn('Join requests:', error)
      setPendingJoinRequests([])
      return
    }
    setPendingJoinRequests((data ?? []) as GroupJoinRequest[])
  }

  async function openGroupSettings() {
    if (!selectedGroup || !session) return
    setGroupSettingsVisibility(selectedGroup.visibility ?? 'private')
    setGroupInviteMemberIds(new Set())
    setIsGroupSettingsOpen(true)
    if (selectedGroup.created_by === session.user.id) {
      await loadGroupJoinRequests(selectedGroup.id)
    } else {
      setPendingJoinRequests([])
    }
  }

  async function saveGroupSettings() {
    if (!session || !selectedGroup || isSavingGroupSettings) return
    if (selectedGroup.created_by !== session.user.id) return
    setIsSavingGroupSettings(true)
    const { error } = await supabase
      .from('chat_groups')
      .update({ visibility: groupSettingsVisibility })
      .eq('id', selectedGroup.id)
    if (error) {
      showNotification(groupErrorToast(error.message, t))
      setIsSavingGroupSettings(false)
      return
    }
    setSelectedGroup((g) => (g ? { ...g, visibility: groupSettingsVisibility } : g))
    setIsSavingGroupSettings(false)
    void fetchSidebarData()
  }

  async function inviteMembersToGroup() {
    if (!session || !selectedGroup || groupInviteMemberIds.size === 0) return
    const invites = Array.from(groupInviteMemberIds).map((uid) => ({
      group_id: selectedGroup.id,
      invitee_id: uid,
      invited_by: session.user.id,
    }))
    const { error } = await supabase.from('group_invites').insert(invites)
    if (error) {
      showNotification(groupErrorToast(error.message, t))
      return
    }
    setGroupInviteMemberIds(new Set())
    showNotification(t('memberInvited'))
  }

  async function acceptJoinRequest(req: GroupJoinRequest) {
    if (!session || !selectedGroup) return
    const { error: memberError } = await supabase.from('group_members').insert({
      group_id: req.group_id,
      user_id: req.user_id,
      role: 'member',
    })
    if (memberError) {
      showNotification(groupErrorToast(memberError.message, t))
      return
    }
    await supabase.from('group_join_requests').update({ status: 'accepted' }).eq('id', req.id)
    await loadGroupJoinRequests(selectedGroup.id)
    void fetchSidebarData()
  }

  async function declineJoinRequest(reqId: string) {
    if (!selectedGroup) return
    await supabase.from('group_join_requests').update({ status: 'declined' }).eq('id', reqId)
    await loadGroupJoinRequests(selectedGroup.id)
  }

  async function deleteGroup() {
    if (!session || !selectedGroup || isDeletingGroup) return
    if (selectedGroup.created_by !== session.user.id) {
      showNotification(t('onlyCreatorCanDelete'))
      return
    }
    if (!window.confirm(t('deleteGroupConfirm', { name: selectedGroup.name }))) return
    setIsDeletingGroup(true)
    const { error } = await supabase.from('chat_groups').delete().eq('id', selectedGroup.id)
    setIsDeletingGroup(false)
    if (error) {
      showNotification(groupErrorToast(error.message, t))
      return
    }
    setIsGroupSettingsOpen(false)
    closeChat()
    showNotification(t('groupDeleted'))
    void fetchSidebarData()
  }

  async function searchPublicGroups() {
    if (!session) return
    const q = publicGroupSearch.trim()
    if (!q) {
      setPublicGroupResults([])
      return
    }
    setIsSearchingPublicGroups(true)
    const { data, error } = await supabase
      .from('chat_groups')
      .select('id, name, created_by, created_at, visibility')
      .eq('visibility', 'public')
      .ilike('name', `%${q}%`)
      .limit(20)
    setIsSearchingPublicGroups(false)
    if (error) {
      showNotification(groupErrorToast(error.message, t))
      return
    }
    const memberGroupIds = new Set(groups.map((g) => g.id))
    setPublicGroupResults(
      ((data ?? []) as ChatGroup[]).filter((g) => !memberGroupIds.has(g.id))
    )
  }

  async function requestJoinPublicGroup(groupId: string) {
    if (!session) return
    const { error } = await supabase.from('group_join_requests').insert({
      group_id: groupId,
      user_id: session.user.id,
    })
    if (error) {
      showNotification(groupErrorToast(error.message, t))
      return
    }
    showNotification(t('joinRequestSent'))
    setPublicGroupResults((prev) => prev.filter((g) => g.id !== groupId))
  }

  async function sendMessage() {
    if (!session) return
    if ((!selectedUser && !selectedGroup) || isSending) return
    stopVoiceInput()

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

    const payload = selectedGroup
      ? {
          content: text.trim() ? text : null,
          file_url: uploadedUrl,
          sender_id: session.user.id,
          group_id: selectedGroup.id,
          receiver_id: null,
        }
      : {
          content: text.trim() ? text : null,
          file_url: uploadedUrl,
          sender_id: session.user.id,
          receiver_id: selectedUser!.id,
        }

    const { error } = await supabase.from('messages').insert([payload])

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
    if (p.file_url) return p.content ? p.content : 'Attachment'
    if (p.content) {
      const prefix = p.sender_id === session?.user.id ? 'You: ' : ''
      return `${prefix}${p.content}`
    }
    return t('online')
  }

  const totalUnread =
    Object.values(unreadCounts).reduce((a, b) => a + b, 0) +
    Object.values(groupUnreadCounts).reduce((a, b) => a + b, 0)
  const isInChat = selectedUser !== null || selectedGroup !== null
  const isComposerVoiceActive = voiceInputTarget === 'composer'
  const isSearchVoiceActive = voiceInputTarget === 'search'
  const composerDisplayValue =
    isComposerVoiceActive && voiceInterim
      ? text.trim()
        ? `${text} ${voiceInterim}`
        : voiceInterim
      : text
  const searchDisplayValue =
    isSearchVoiceActive && voiceInterim
      ? messageSearchQuery.trim()
        ? `${messageSearchQuery} ${voiceInterim}`
        : voiceInterim
      : messageSearchQuery
  const canSend =
    !isComposerVoiceActive && (text.trim() !== '' || pendingFile !== null)
  const isTyping = text.trim() !== '' || isComposerVoiceActive
  const voiceInputSupported = isSpeechRecognitionSupported()

  const composerPlusControl = (
    <div className="relative shrink-0 imessage-plus-wrap">
      <button
        type="button"
        className={`imessage-plus-btn ${composerPanel !== 'closed' ? 'imessage-plus-btn-active' : ''}`}
        disabled={isSending}
        aria-label="More"
        aria-expanded={composerPanel !== 'closed'}
        onClick={() => setComposerPanel((p) => (p === 'closed' ? 'plus' : 'closed'))}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/plus-flaticon.png"
          alt=""
          className={`imessage-plus-icon ${composerPanel !== 'closed' ? 'imessage-plus-icon-open' : ''}`}
        />
      </button>

      {composerPanel !== 'closed' && (
        <div className="imessage-composer-panel" role="menu">
          {composerPanel === 'plus' && (
            <>
              <button type="button" className="imessage-composer-panel-item" onClick={() => { fileInputRef.current?.click(); setComposerPanel('closed') }}>
                <span className="imessage-composer-panel-leading">
                  <IconPhotos className="imessage-composer-panel-icon" />
                </span>
                <span className="imessage-composer-panel-label">{t('photoTitle')}</span>
              </button>
              <button type="button" className="imessage-composer-panel-item" onClick={() => setComposerPanel('style')}>
                <span className="imessage-composer-panel-leading">
                  <IconPen className="imessage-composer-panel-icon" />
                </span>
                <span className="imessage-composer-panel-label">{t('magicWandTitle')}</span>
              </button>
              <button type="button" className="imessage-composer-panel-item" onClick={() => setComposerPanel('translate')}>
                <span className="imessage-composer-panel-leading">
                  <IconTranslate className="imessage-composer-panel-icon" />
                </span>
                <span className="imessage-composer-panel-label">{t('translateTitle')}</span>
              </button>
            </>
          )}
          {composerPanel === 'style' && (
            <>
              <button type="button" className="imessage-composer-panel-back" onClick={() => setComposerPanel('plus')}>‹ {t('magicWandTitle')}</button>
              {([{ label: t('styleBusiness'), prompt: 'Business and polite' }, { label: t('styleFriendly'), prompt: 'Friendly and fun' }, { label: t('styleStrict'), prompt: 'Strict and concise' }, { label: t('styleSlang'), prompt: 'Bold slang' }] as const).map((style) => (
                <button key={style.prompt} type="button" className="imessage-composer-panel-item imessage-composer-panel-item-plain" onClick={() => { handleAiAction('style', style.prompt) }}>{style.label}</button>
              ))}
            </>
          )}
          {composerPanel === 'translate' && (
            <>
              <button type="button" className="imessage-composer-panel-back" onClick={() => setComposerPanel('plus')}>‹ {t('translateTitle')}</button>
              {([{ label: t('langEnglish'), prompt: 'English' }, { label: t('langNorwegian'), prompt: 'Norwegian' }, { label: t('langRussian'), prompt: 'Russian' }] as const).map((lang) => (
                <button key={lang.prompt} type="button" className="imessage-composer-panel-item imessage-composer-panel-item-plain" onClick={() => { handleAiAction('translate', lang.prompt) }}>{lang.label}</button>
              ))}
              <div className="flex gap-2 mt-1 pt-2 border-t border-[var(--ios-separator)] px-1">
                <input value={customLang} onChange={(e) => setCustomLang(e.target.value)} placeholder={t('customLangPlaceholder')} className="flex-1 px-2 py-1.5 rounded-[8px] bg-[var(--ios-search-bg)] text-[13px] outline-none" />
                <button type="button" onClick={() => { handleAiAction('translate', customLang) }} className="px-2.5 py-1.5 rounded-[8px] bg-[var(--ios-accent)] text-white text-[13px] font-semibold">{t('go')}</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )

  const sortedContacts = [...contacts].sort((a, b) => {
    const ta = conversationPreviews[a.id]?.created_at
    const tb = conversationPreviews[b.id]?.created_at
    if (!ta && !tb) return displayName(a.email).localeCompare(displayName(b.email))
    if (!ta) return 1
    if (!tb) return -1
    return new Date(tb).getTime() - new Date(ta).getTime()
  })

  const inboxContacts = sortedContacts

  const inboxSearch = messageSearchQuery.trim().toLowerCase()
  const isInboxSearching = inboxSearch.length > 0

  const profileMatchesInboxSearch = (profile: Profile) => {
    if (!isInboxSearching) return true
    const haystack = `${displayName(profile.email)} ${profile.email}`.toLowerCase()
    return haystack.includes(inboxSearch)
  }

  const contactMatchesInboxSearch = (contact: Profile) => {
    if (!isInboxSearching) return true
    const preview = conversationPreviews[contact.id]
    const haystack = [
      displayName(contact.email),
      contact.email,
      preview?.content ?? '',
      previewText(contact.id),
      preview?.file_url ? 'attachment' : '',
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(inboxSearch)
  }

  const visibleOutgoingRequests = outgoingRequests.filter(
    (u) =>
      (inboxFilter === 'all' || inboxFilter === 'requests') && profileMatchesInboxSearch(u)
  )

  const visibleIncomingRequests = incomingRequests.filter(
    (u) =>
      (inboxFilter === 'all' || inboxFilter === 'requests') && profileMatchesInboxSearch(u)
  )

  const visibleGroupInvites = incomingGroupInvites.filter(
    (inv) => inboxFilter === 'all' || inboxFilter === 'requests' || inboxFilter === 'groups'
  )

  const profilesById = useMemo(() => {
    const m = new Map(contacts.map((c) => [c.id, c]))
    for (const [id, p] of Object.entries(extraProfiles)) m.set(id, p)
    return m
  }, [contacts, extraProfiles])

  function groupPreviewText(groupId: string) {
    const p = groupPreviews[groupId]
    const memberCount = String(groups.find((g) => g.id === groupId)?.member_count ?? 0)
    if (!p) return t('membersCount', { n: memberCount })
    if (p.file_url) return p.content ? p.content : 'Attachment'
    if (p.content) {
      const sender = profilesById.get(p.sender_id)
      const who =
        p.sender_id === session?.user.id ? 'You' : sender ? displayName(sender.email) : 'Member'
      return `${who}: ${p.content}`
    }
    return t('membersCount', { n: memberCount })
  }

  const groupMatchesInboxSearch = (group: ChatGroup) => {
    if (!isInboxSearching) return true
    const preview = groupPreviews[group.id]
    const haystack = [
      group.name,
      preview?.content ?? '',
      groupPreviewText(group.id),
      preview?.file_url ? 'attachment' : '',
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(inboxSearch)
  }

  const messageHitMatchesInboxFilter = (peerId: string) => {
    if (inboxFilter === 'groups' || inboxFilter === 'requests') return false
    if (inboxFilter === 'unread') return unreadCounts[peerId] > 0
    return true
  }

  const visibleInboxContacts = inboxContacts.filter((u) => {
    if (inboxFilter === 'unread' && unreadCounts[u.id] <= 0) return false
    if (inboxFilter === 'groups' || inboxFilter === 'requests') return false
    return contactMatchesInboxSearch(u)
  })

  const sortedGroups = [...groups].sort((a, b) => {
    const ta = groupPreviews[a.id]?.created_at
    const tb = groupPreviews[b.id]?.created_at
    if (!ta && !tb) return a.name.localeCompare(b.name)
    if (!ta) return 1
    if (!tb) return -1
    return new Date(tb).getTime() - new Date(ta).getTime()
  })

  const visibleGroups = sortedGroups.filter((g) => {
    if (inboxFilter === 'unread' && (groupUnreadCounts[g.id] ?? 0) <= 0) return false
    if (inboxFilter === 'all' || inboxFilter === 'groups' || inboxFilter === 'unread') {
      return groupMatchesInboxSearch(g)
    }
    return false
  })

  type InboxListItem =
    | { kind: 'dm'; contact: Profile; sortAt: string | null }
    | { kind: 'group'; group: ChatGroup; sortAt: string | null }

  const visibleInboxItems: InboxListItem[] = (() => {
    const items: InboxListItem[] = []
    if (inboxFilter === 'all' || inboxFilter === 'unread') {
      for (const u of visibleInboxContacts) {
        items.push({
          kind: 'dm',
          contact: u,
          sortAt: conversationPreviews[u.id]?.created_at ?? null,
        })
      }
      for (const g of visibleGroups) {
        items.push({
          kind: 'group',
          group: g,
          sortAt: groupPreviews[g.id]?.created_at ?? null,
        })
      }
      items.sort((a, b) => {
        if (!a.sortAt && !b.sortAt) {
          const nameA = a.kind === 'dm' ? displayName(a.contact.email) : a.group.name
          const nameB = b.kind === 'dm' ? displayName(b.contact.email) : b.group.name
          return nameA.localeCompare(nameB)
        }
        if (!a.sortAt) return 1
        if (!b.sortAt) return -1
        return new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime()
      })
      return items
    }
    if (inboxFilter === 'groups') {
      return visibleGroups.map((g) => ({
        kind: 'group' as const,
        group: g,
        sortAt: groupPreviews[g.id]?.created_at ?? null,
      }))
    }
    return items
  })()

  const visibleMessageHits = isInboxSearching
    ? inboxMessageHits.filter(
        (hit) => profilesById.has(hit.peerId) && messageHitMatchesInboxFilter(hit.peerId)
      )
    : []

  const inboxSearchEmpty =
    isInboxSearching &&
    visibleOutgoingRequests.length === 0 &&
    visibleIncomingRequests.length === 0 &&
    visibleGroupInvites.length === 0 &&
    visibleInboxItems.length === 0 &&
    visibleMessageHits.length === 0

  const groupsTabEmpty = inboxFilter === 'groups' && !isInboxSearching && visibleGroups.length === 0

  const openChatFromSearch = (peer: Profile, messageId?: number) => {
    if (messageId != null) {
      pendingScrollTargetRef.current = { peerId: peer.id, msgId: messageId }
      setHighlightSearchMsgId(null)
      setMessages(messagesCacheRef.current[peer.id] ?? [])
    } else {
      pendingScrollTargetRef.current = null
    }
    openDm(peer)
    setMessageSearchQuery('')
    setInboxMessageHits([])
  }

  const deleteMessage = async (messageId: number) => {
    if (!session) return
    setActiveReactionMsgId(null)
    if (editingMessageId === messageId) {
      setEditingMessageId(null)
      setText('')
    }

    const cacheKey = selectedGroup
      ? groupCacheKey(selectedGroup.id)
      : selectedUser?.id
    const snapshot = messages
    setMessages((prev) => {
      const next = prev.filter((m) => m.id !== messageId)
      if (cacheKey) messagesCacheRef.current[cacheKey] = next
      return next
    })
    setAllReactions((prev) => prev.filter((r) => r.message_id !== messageId))

    await supabase.from('message_reactions').delete().eq('message_id', messageId)
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('sender_id', session.user.id)

    if (error) {
      if (cacheKey) messagesCacheRef.current[cacheKey] = snapshot
      setMessages(snapshot)
      showNotification('❌ ' + error.message)
      const { data: reactData } = await supabase.from('message_reactions').select('*')
      if (reactData) setAllReactions(reactData as MessageReaction[])
    } else {
      showNotification(t('messageDeleted'))
      void fetchSidebarData()
    }
  }

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
        <div className="fixed top-[max(1.25rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 ios-glass-prominent z-[100] flex items-center gap-3 px-5 py-2.5 rounded-full border border-[var(--ios-border-subtle)] shadow-lg animate-bounce pointer-events-none">
          <span className="font-medium text-sm md:text-base whitespace-nowrap text-[var(--ios-text-primary)]">{toastMsg}</span>
        </div>
      )}

      {isCreateGroupOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-md"
            onClick={() => !isCreatingGroup && setIsCreateGroupOpen(false)}
          />
          <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center p-0 md:p-6">
            <div className="w-full max-w-lg ios-sheet ios-glass-prominent overflow-hidden max-md:pb-[env(safe-area-inset-bottom)] max-h-[85dvh] flex flex-col">
              <div className="ios-navbar flex h-12 shrink-0 items-center justify-between px-4">
                <span className="text-[17px] font-semibold text-[var(--ios-text-primary)]">
                  {t('createGroupTitle')}
                </span>
                <button
                  type="button"
                  onClick={() => !isCreatingGroup && setIsCreateGroupOpen(false)}
                  className="ios-icon-btn"
                  aria-label={t('close')}
                >
                  ×
                </button>
              </div>
              <div className="p-4 md:p-5 bg-[var(--ios-surface-secondary)] overflow-y-auto flex-1 min-h-0">
                <input
                  type="text"
                  autoFocus
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder={t('groupNamePlaceholder')}
                  className="ios-field w-full rounded-[12px] px-4 py-3 text-[16px] border border-[var(--ios-border-subtle)] bg-[var(--ios-surface)] outline-none focus:ring-2 focus:ring-[var(--ios-accent)]/30"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void createGroup()
                  }}
                />
                <p className="mt-4 mb-2 text-[13px] font-semibold text-[var(--ios-text-secondary)] uppercase tracking-wide">
                  {t('groupVisibility')}
                </p>
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setNewGroupVisibility('private')}
                    className={`flex-1 py-2.5 rounded-full text-[14px] font-medium ${
                      newGroupVisibility === 'private'
                        ? 'bg-[var(--ios-accent)] text-white'
                        : 'bg-[var(--ios-search-bg)] text-[var(--ios-text-primary)]'
                    }`}
                  >
                    {t('groupPrivate')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewGroupVisibility('public')}
                    className={`flex-1 py-2.5 rounded-full text-[14px] font-medium ${
                      newGroupVisibility === 'public'
                        ? 'bg-[var(--ios-accent)] text-white'
                        : 'bg-[var(--ios-search-bg)] text-[var(--ios-text-primary)]'
                    }`}
                  >
                    {t('groupPublic')}
                  </button>
                </div>
                <p className="mb-2 text-[13px] font-semibold text-[var(--ios-text-secondary)] uppercase tracking-wide">
                  {t('selectMembers')}
                </p>
                {contacts.length === 0 ? (
                  <p className="text-[14px] text-[var(--ios-text-tertiary)]">{t('myFriends')}: —</p>
                ) : (
                  <div className="ios-grouped overflow-hidden max-h-[40vh] overflow-y-auto">
                    {contacts.map((c) => {
                      const checked = newGroupMemberIds.has(c.id)
                      return (
                        <label
                          key={c.id}
                          className="flex items-center gap-3 px-4 py-3 border-b border-[var(--ios-separator)] last:border-b-0 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setNewGroupMemberIds((prev) => {
                                const next = new Set(prev)
                                if (next.has(c.id)) next.delete(c.id)
                                else next.add(c.id)
                                return next
                              })
                            }}
                            className="w-4 h-4 accent-[var(--ios-accent)]"
                          />
                          <IosAvatar seed={c.email} label={c.email} size="sm" variant="person" />
                          <span className="text-[16px] truncate">{displayName(c.email)}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
                <button
                  type="button"
                  disabled={isCreatingGroup || contacts.length === 0}
                  onClick={() => void createGroup()}
                  className="mt-4 w-full py-3.5 rounded-full bg-[var(--ios-accent)] text-white text-[17px] font-semibold disabled:opacity-50"
                >
                  {isCreatingGroup ? t('saving') : t('createGroupBtn')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {isGroupSettingsOpen && selectedGroup && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-md"
            onClick={() => !isSavingGroupSettings && !isDeletingGroup && setIsGroupSettingsOpen(false)}
          />
          <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center p-0 md:p-6">
            <div className="w-full max-w-lg ios-sheet ios-glass-prominent overflow-hidden max-md:pb-[env(safe-area-inset-bottom)] max-h-[85dvh] flex flex-col">
              <div className="ios-navbar flex h-12 shrink-0 items-center justify-between px-4">
                <span className="text-[17px] font-semibold text-[var(--ios-text-primary)]">
                  {t('groupSettings')}
                </span>
                <button
                  type="button"
                  onClick={() => !isSavingGroupSettings && !isDeletingGroup && setIsGroupSettingsOpen(false)}
                  className="ios-icon-btn"
                  aria-label={t('close')}
                >
                  ×
                </button>
              </div>
              <div className="p-4 md:p-5 bg-[var(--ios-surface-secondary)] overflow-y-auto flex-1 min-h-0">
                <p className="text-[15px] font-semibold text-[var(--ios-text-primary)] mb-3 truncate">
                  {selectedGroup.name}
                </p>
                {session?.user.id === selectedGroup.created_by && (
                  <>
                    <p className="text-[13px] font-semibold text-[var(--ios-text-secondary)] uppercase tracking-wide mb-2">
                      {t('groupVisibility')}
                    </p>
                    <div className="flex gap-2 mb-4">
                      <button
                        type="button"
                        onClick={() => setGroupSettingsVisibility('private')}
                        className={`flex-1 py-2.5 rounded-full text-[14px] font-medium ${
                          groupSettingsVisibility === 'private'
                            ? 'bg-[var(--ios-accent)] text-white'
                            : 'bg-[var(--ios-search-bg)]'
                        }`}
                      >
                        {t('groupPrivate')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setGroupSettingsVisibility('public')}
                        className={`flex-1 py-2.5 rounded-full text-[14px] font-medium ${
                          groupSettingsVisibility === 'public'
                            ? 'bg-[var(--ios-accent)] text-white'
                            : 'bg-[var(--ios-search-bg)]'
                        }`}
                      >
                        {t('groupPublic')}
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={isSavingGroupSettings}
                      onClick={() => void saveGroupSettings()}
                      className="w-full py-3 rounded-full bg-[var(--ios-accent)] text-white text-[16px] font-semibold mb-4 disabled:opacity-50"
                    >
                      {isSavingGroupSettings ? t('saving') : t('save')}
                    </button>
                    {pendingJoinRequests.length > 0 && (
                      <>
                        <p className="text-[13px] font-semibold text-[var(--ios-text-secondary)] uppercase tracking-wide mb-2">
                          {t('pendingJoinRequests')}
                        </p>
                        <div className="ios-grouped overflow-hidden mb-4">
                          {pendingJoinRequests.map((req) => {
                            const raw = req.profiles
                            const p = raw ? (Array.isArray(raw) ? raw[0] : raw) : null
                            return (
                              <div
                                key={req.id}
                                className="flex items-center gap-3 px-4 py-3 border-b border-[var(--ios-separator)] last:border-b-0"
                              >
                                {p && (
                                  <IosAvatar seed={p.email} label={p.email} size="sm" variant="person" />
                                )}
                                <span className="flex-1 text-[15px] truncate">
                                  {p ? displayName(p.email) : req.user_id}
                                </span>
                                <button
                                  type="button"
                                  className="px-3 py-1 rounded-full bg-[var(--ios-accent)] text-white text-[13px]"
                                  onClick={() => void acceptJoinRequest(req)}
                                >
                                  {t('acceptBtn')}
                                </button>
                                <button
                                  type="button"
                                  className="px-3 py-1 rounded-full bg-[var(--ios-search-bg)] text-[var(--ios-danger)] text-[13px]"
                                  onClick={() => void declineJoinRequest(req.id)}
                                >
                                  {t('declineBtn')}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </>
                )}
                <p className="text-[13px] font-semibold text-[var(--ios-text-secondary)] uppercase tracking-wide mb-2">
                  {t('inviteMembers')}
                </p>
                {contacts.length === 0 ? (
                  <p className="text-[14px] text-[var(--ios-text-tertiary)] mb-4">{t('myFriends')}: —</p>
                ) : (
                  <div className="ios-grouped overflow-hidden max-h-[28vh] overflow-y-auto mb-3">
                    {contacts.map((c) => {
                      const checked = groupInviteMemberIds.has(c.id)
                      return (
                        <label
                          key={c.id}
                          className="flex items-center gap-3 px-4 py-3 border-b border-[var(--ios-separator)] last:border-b-0 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setGroupInviteMemberIds((prev) => {
                                const next = new Set(prev)
                                if (next.has(c.id)) next.delete(c.id)
                                else next.add(c.id)
                                return next
                              })
                            }}
                            className="w-4 h-4 accent-[var(--ios-accent)]"
                          />
                          <IosAvatar seed={c.email} label={c.email} size="sm" variant="person" />
                          <span className="text-[16px] truncate">{displayName(c.email)}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
                <button
                  type="button"
                  disabled={groupInviteMemberIds.size === 0}
                  onClick={() => void inviteMembersToGroup()}
                  className="w-full py-3 rounded-full bg-[var(--ios-search-bg)] text-[var(--ios-accent)] text-[16px] font-semibold mb-4 disabled:opacity-50"
                >
                  {t('inviteMembers')}
                </button>
                {session?.user.id === selectedGroup.created_by && (
                  <button
                    type="button"
                    disabled={isDeletingGroup}
                    onClick={() => void deleteGroup()}
                    className="w-full py-3 rounded-full bg-[var(--ios-danger)] text-white text-[16px] font-semibold disabled:opacity-50"
                  >
                    {isDeletingGroup ? t('saving') : t('deleteGroup')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
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
                {session?.user.email && (
                  <div className="ios-grouped p-4 md:p-5">
                    <div className="flex items-start gap-3">
                      <IosAvatar seed={session.user.email} label={session.user.email} size="md" />
                      <div className="flex flex-col min-w-0 flex-1 gap-1">
                        <span className="text-[13px] font-semibold uppercase tracking-wide text-[var(--ios-text-secondary)]">
                          {t('myProfile')}
                        </span>
                        <span className="text-[17px] font-semibold text-[var(--ios-text-primary)] truncate">
                          {displayName(session.user.email)}
                        </span>
                        <span className="text-[15px] text-[var(--ios-text-secondary)] truncate">
                          {session.user.email}
                        </span>
                        <span className="text-[13px] text-[var(--ios-text-tertiary)] leading-snug pt-0.5">
                          {t('myProfileHint')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="ios-grouped p-4 md:p-5 mt-3">
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
                <div className="mt-4 px-2 flex flex-col gap-1.5 text-center text-[11px] leading-snug text-[var(--ios-text-tertiary)]">
                  <a
                    href="https://www.flaticon.com/ru/free-icons/"
                    title="настройки иконки"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--ios-text-secondary)] underline underline-offset-2"
                  >
                    Настройки иконки от apien - Flaticon
                  </a>
                  <a
                    href="https://www.flaticon.com/ru/free-icons/-"
                    title="Добавить пользователя иконки"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--ios-text-secondary)] underline underline-offset-2"
                  >
                    Добавить пользователя иконки от afif fudin - Flaticon
                  </a>
                  <a
                    href="https://www.flaticon.com/ru/free-icons/"
                    title="пользователь иконки"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--ios-text-secondary)] underline underline-offset-2"
                  >
                    Пользователь иконки от Freepik - Flaticon
                  </a>
                  <a
                    href="https://www.flaticon.com/ru/free-icons/"
                    title="поиск иконки"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--ios-text-secondary)] underline underline-offset-2"
                  >
                    Поиск иконки от apien - Flaticon
                  </a>
                  <a
                    href="https://www.flaticon.com/ru/free-icons/"
                    title="микрофон иконки"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--ios-text-secondary)] underline underline-offset-2"
                  >
                    Микрофон иконки от Karacis - Flaticon
                  </a>
                  <a
                    href="https://www.flaticon.com/ru/free-icons/-"
                    title="Кнопка назад иконки"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--ios-text-secondary)] underline underline-offset-2"
                  >
                    Кнопка назад иконки от riajulislam - Flaticon
                  </a>
                  <a
                    href="https://www.flaticon.com/ru/free-icons/"
                    title="приложение иконки"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--ios-text-secondary)] underline underline-offset-2"
                  >
                    Приложение иконки от Freepik - Flaticon
                  </a>
                  <a
                    href="https://www.flaticon.com/ru/free-icons/"
                    title="ручка иконки"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--ios-text-secondary)] underline underline-offset-2"
                  >
                    Ручка иконки от Freepik - Flaticon
                  </a>
                  <p className="text-[var(--ios-text-secondary)]">
                    гугл перевод текст язык значок by Chameleon Design on{' '}
                    <a
                      href="https://icon-icons.com/ru/authors/231-chameleon-design"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2"
                    >
                      Icon-Icons.com
                    </a>
                  </p>
                  <a
                    href="https://www.flaticon.com/ru/free-icons/"
                    title="Отправить иконки"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--ios-text-secondary)] underline underline-offset-2"
                  >
                    Отправить иконки от HideMaru - Flaticon
                  </a>
                  <a
                    href="https://www.flaticon.com/ru/free-icons/"
                    title="плюс иконки"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--ios-text-secondary)] underline underline-offset-2"
                  >
                    Плюс иконки - Flaticon
                  </a>
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
          <div className="flex-1 flex flex-col justify-center gap-8">
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
          <div className="flex flex-1 flex-row min-h-0 w-full overflow-hidden bg-[var(--ios-root-bg)]">
          {/* iMessage inbox list */}
          <div
            className={`imessage-sidebar-shell relative z-20
            ${isInChat ? 'hidden md:flex md:flex-none' : 'flex w-full flex-1 md:flex-none'}
            ${isCollapsed ? 'md:w-[80px]' : 'md:w-[356px] lg:w-[406px]'}`}
          >
            <div className="imessage-inbox relative flex flex-col min-h-0 min-w-0 flex-1 w-full overflow-hidden">

            {!isCollapsed ? (
              <>
                <div className="imessage-inbox-topbar imessage-toolbar-row shrink-0 px-4">
                  <button
                    type="button"
                    className="imessage-header-icon"
                    onClick={() => setShowAddUser((v) => !v)}
                    aria-label={t('findUser')}
                    aria-expanded={showAddUser}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/add-user-flaticon.png" alt="" className="imessage-header-flaticon" />
                  </button>
                  <h1 className="imessage-inbox-topbar-title">{t('appTitle')}</h1>
                  <button
                    type="button"
                    className="imessage-header-icon"
                    onClick={() => setIsSettingsOpen(true)}
                    aria-label={t('settings')}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/settings-flaticon.png" alt="" className="imessage-header-flaticon" />
                  </button>
                </div>

                {showAddUser && (
                  <div className="px-4 pb-3 pt-1">
                    <label className="imessage-inbox-find">
                      <IconSearch />
                      <input
                        type="email"
                        autoFocus
                        placeholder={t('findUser')}
                        value={newContactEmail}
                        onChange={(e) => setNewContactEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void sendRequest(newContactEmail)
                        }}
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
                    <p className="mt-2 text-center text-[11px] leading-snug text-[var(--ios-text-tertiary)]">
                      <a
                        href="https://www.flaticon.com/ru/free-icons/-"
                        title="Добавить пользователя иконки"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--ios-text-secondary)] underline underline-offset-2"
                      >
                        Добавить пользователя иконки от afif fudin - Flaticon
                      </a>
                    </p>
                  </div>
                )}

                <div className="imessage-filter-bar shrink-0">
                  {([
                    ['all', 'All'],
                    ['unread', 'Unread'],
                    ['groups', t('groupsTab')],
                    ['requests', 'Requests'],
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={`imessage-filter-pill ${inboxFilter === key ? 'imessage-filter-pill-active' : ''}`}
                      onClick={() => setInboxFilter(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {inboxFilter === 'groups' && !isInboxSearching && (
                  <div className="imessage-groups-toolbar shrink-0">
                    <button
                      type="button"
                      className="imessage-create-group-btn"
                      onClick={() => setIsCreateGroupOpen(true)}
                    >
                      <span className="imessage-create-group-icon-wrap" aria-hidden>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/icons/add-group-flaticon.png"
                          alt=""
                          width={20}
                          height={20}
                          className="imessage-create-group-icon"
                        />
                      </span>
                      <span>{t('createGroup')}</span>
                    </button>
                    <label className="imessage-float-search imessage-group-search">
                      <IconSearch />
                      <input
                        type="search"
                        enterKeyHint="search"
                        value={publicGroupSearch}
                        onChange={(e) => setPublicGroupSearch(e.target.value)}
                        placeholder={t('searchGroupsPlaceholder')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void searchPublicGroups()
                          if (e.key === 'Escape') {
                            setPublicGroupSearch('')
                            setPublicGroupResults([])
                          }
                        }}
                      />
                      {publicGroupSearch.trim() ? (
                        <button
                          type="button"
                          disabled={isSearchingPublicGroups}
                          onClick={() => void searchPublicGroups()}
                          className="imessage-inbox-find-go disabled:opacity-50"
                        >
                          {t('go')}
                        </button>
                      ) : null}
                    </label>
                  </div>
                )}

                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar pb-28">
                  {inboxSearchEmpty && (
                    <div className="imessage-search-empty">
                      <p>{t('searchNoResults')}</p>
                    </div>
                  )}

                  {visibleOutgoingRequests.map((u) => (
                    <div key={u.id} className="imessage-row opacity-80">
                      <span className="imessage-unread-spacer" />
                      <IosAvatar seed={u.email} label={u.email} size="inbox" variant="person" />
                      <div className="imessage-row-body">
                        <div className="imessage-row-top">
                          <span className="imessage-row-name">{displayName(u.email)}</span>
                          <button type="button" className="text-[var(--ios-danger)] text-[13px] shrink-0" onClick={() => cancelOutgoingRequest(u.id)}>×</button>
                        </div>
                        <p className="imessage-row-preview">
                          {u.requestStatus === 'pending' ? 'Pending' : 'Declined'}
                        </p>
                      </div>
                    </div>
                  ))}

                  {visibleIncomingRequests.map((u) => (
                    <div key={u.id} className="imessage-row">
                      <span className="imessage-unread-dot" />
                      <IosAvatar seed={u.email} label={u.email} size="inbox" variant="person" />
                      <div className="imessage-row-body">
                        <div className="imessage-row-top">
                          <span className="imessage-row-name imessage-row-name-unread">{displayName(u.email)}</span>
                          <span className="imessage-row-meta">
                            <span className="imessage-row-time">{t('newRequests')}</span>
                            <IconChevronRight className="imessage-row-chevron" />
                          </span>
                        </div>
                        <p className="imessage-row-preview">{u.email}</p>
                        <div className="flex gap-2 mt-2">
                          <button type="button" className="flex-1 py-1.5 rounded-full bg-[var(--ios-accent)] text-white text-[14px] font-medium" onClick={() => acceptRequest(u.id)}>{t('acceptBtn')}</button>
                          <button type="button" className="flex-1 py-1.5 rounded-full bg-[var(--ios-search-bg)] text-[var(--ios-danger)] text-[14px] font-medium" onClick={() => rejectRequest(u.id)}>{t('declineBtn')}</button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {visibleGroupInvites.map((inv) => {
                    const g = inviteGroupFromRow(inv.chat_groups)
                    const name = g?.name ?? t('groupInviteTitle')
                    return (
                      <div key={inv.id} className="imessage-row">
                        <span className="imessage-unread-dot" />
                        <IosAvatar seed={inv.group_id} label={name} size="inbox" variant="color" />
                        <div className="imessage-row-body">
                          <div className="imessage-row-top">
                            <span className="imessage-row-name imessage-row-name-unread">{name}</span>
                            <span className="imessage-row-meta">
                              <span className="imessage-row-time">{t('groupInviteTitle')}</span>
                            </span>
                          </div>
                          <p className="imessage-row-preview">{t('groupInviteTitle')}</p>
                          <div className="flex gap-2 mt-2">
                            <button
                              type="button"
                              className="flex-1 py-1.5 rounded-full bg-[var(--ios-accent)] text-white text-[14px] font-medium"
                              onClick={() => void acceptGroupInvite(inv)}
                            >
                              {t('acceptBtn')}
                            </button>
                            <button
                              type="button"
                              className="flex-1 py-1.5 rounded-full bg-[var(--ios-search-bg)] text-[var(--ios-danger)] text-[14px] font-medium"
                              onClick={() => void declineGroupInvite(inv.id)}
                            >
                              {t('declineBtn')}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {inboxFilter === 'groups' && !isInboxSearching && publicGroupResults.length === 0 && publicGroupSearch.trim() && !isSearchingPublicGroups && (
                    <p className="px-4 py-2 text-[13px] text-[var(--ios-text-tertiary)]">{t('noPublicGroupsFound')}</p>
                  )}

                  {inboxFilter === 'groups' && !isInboxSearching && publicGroupResults.map((g) => (
                    <div key={g.id} className="imessage-group-search-hit">
                      <IosAvatar seed={g.id} label={g.name} size="sm" variant="color" />
                      <span className="flex-1 min-w-0 text-[15px] font-medium truncate">{g.name}</span>
                      <button
                        type="button"
                        onClick={() => void requestJoinPublicGroup(g.id)}
                        className="px-3 py-1.5 rounded-full bg-[var(--ios-accent)] text-white text-[13px] font-medium shrink-0"
                      >
                        {t('requestJoin')}
                      </button>
                    </div>
                  ))}

                  {groupsTabEmpty && (
                    <div className="imessage-groups-empty px-6 py-10 text-center">
                      <p className="text-[15px] text-[var(--ios-text-secondary)]">{t('noGroupsYet')}</p>
                    </div>
                  )}

                  {visibleInboxItems.map((item) => {
                    if (item.kind === 'dm') {
                      const u = item.contact
                      const unread = unreadCounts[u.id] > 0
                      const preview = conversationPreviews[u.id]
                      return (
                        <div
                          key={`dm-${u.id}`}
                          className={`imessage-row cursor-pointer ${selectedUser?.id === u.id ? 'imessage-row-selected' : ''}`}
                          onClick={() => (isInboxSearching ? openChatFromSearch(u) : openDm(u))}
                        >
                          {unread ? <span className="imessage-unread-dot" /> : <span className="imessage-unread-spacer" />}
                          <IosAvatar seed={u.email} label={u.email} size="inbox" variant="person" />
                          <div className="imessage-row-body">
                            <div className="imessage-row-top">
                              <span className={`imessage-row-name ${unread ? 'imessage-row-name-unread' : ''}`}>
                                {isInboxSearching
                                  ? highlightSearchMatch(displayName(u.email), inboxSearch)
                                  : displayName(u.email)}
                              </span>
                              <span className="imessage-row-meta">
                                {preview && (
                                  <span className="imessage-row-time">{formatListTime(preview.created_at)}</span>
                                )}
                                <IconChevronRight className="imessage-row-chevron" />
                              </span>
                            </div>
                            <p className={`imessage-row-preview ${unread ? 'imessage-row-preview-unread' : ''}`}>
                              {isInboxSearching
                                ? highlightSearchMatch(previewText(u.id), inboxSearch)
                                : previewText(u.id)}
                            </p>
                          </div>
                        </div>
                      )
                    }

                    const g = item.group
                    const unread = (groupUnreadCounts[g.id] ?? 0) > 0
                    const preview = groupPreviews[g.id]
                    return (
                      <div
                        key={`group-${g.id}`}
                        className={`imessage-row cursor-pointer ${selectedGroup?.id === g.id ? 'imessage-row-selected' : ''}`}
                        onClick={() => openGroup(g)}
                      >
                        {unread ? <span className="imessage-unread-dot" /> : <span className="imessage-unread-spacer" />}
                        <IosAvatar seed={g.id} label={g.name} size="inbox" variant="color" />
                        <div className="imessage-row-body">
                          <div className="imessage-row-top">
                            <span className={`imessage-row-name ${unread ? 'imessage-row-name-unread' : ''}`}>
                              {isInboxSearching
                                ? highlightSearchMatch(g.name, inboxSearch)
                                : g.name}
                            </span>
                            <span className="imessage-row-meta">
                              {preview && (
                                <span className="imessage-row-time">{formatListTime(preview.created_at)}</span>
                              )}
                              <IconChevronRight className="imessage-row-chevron" />
                            </span>
                          </div>
                          <p className={`imessage-row-preview ${unread ? 'imessage-row-preview-unread' : ''}`}>
                            {isInboxSearching
                              ? highlightSearchMatch(groupPreviewText(g.id), inboxSearch)
                              : groupPreviewText(g.id)}
                          </p>
                        </div>
                      </div>
                    )
                  })}

                  {visibleMessageHits.length > 0 && (
                    <>
                      <div className="imessage-search-section-title">{t('searchMessages')}</div>
                      {visibleMessageHits.map((hit) => {
                        const peer = profilesById.get(hit.peerId)
                        if (!peer) return null
                        const isMe = hit.sender_id === session?.user.id
                        return (
                          <div
                            key={hit.id}
                            className={`imessage-row imessage-row-search-hit cursor-pointer ${selectedUser?.id === peer.id ? 'imessage-row-selected' : ''}`}
                            onClick={() => openChatFromSearch(peer, hit.id)}
                          >
                            <span className="imessage-unread-spacer" />
                            <IosAvatar seed={peer.email} label={peer.email} size="inbox" variant="person" />
                            <div className="imessage-row-body">
                              <div className="imessage-row-top">
                                <span className="imessage-row-name">
                                  {highlightSearchMatch(displayName(peer.email), inboxSearch)}
                                </span>
                                <span className="imessage-row-meta">
                                  <span className="imessage-row-time">{formatListTime(hit.created_at)}</span>
                                  <IconChevronRight className="imessage-row-chevron" />
                                </span>
                              </div>
                              <p className="imessage-row-preview imessage-row-preview-unread">
                                {renderMessageSearchPreview(hit.content, inboxSearch, isMe)}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </>
                  )}
                </div>

                <div className="imessage-bottom-search">
                  <label
                    className={`imessage-float-search${isSearchVoiceActive ? ' imessage-float-search-voice-active' : ''}`}
                  >
                    <IconSearch />
                    <input
                      ref={searchInputRef}
                      type="search"
                      enterKeyHint="search"
                      placeholder={isSearchVoiceActive ? t('voiceListening') : t('searchPlaceholder')}
                      value={searchDisplayValue}
                      onChange={(e) => {
                        stopVoiceInput()
                        setMessageSearchQuery(e.target.value)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          stopVoiceInput()
                          setMessageSearchQuery('')
                        }
                      }}
                      className={isSearchVoiceActive ? 'imessage-input-pill-voice' : ''}
                    />
                    {isSearchVoiceActive ? (
                      <button
                        type="button"
                        className="imessage-voice-btn imessage-search-voice-btn imessage-voice-btn-listening"
                        onClick={() => toggleVoiceInput('search')}
                        aria-label={t('voiceInput')}
                        aria-pressed
                        title={t('voiceInput')}
                      >
                        <IconMic className="w-5 h-5" />
                      </button>
                    ) : isInboxSearching ? (
                      <button
                        type="button"
                        className="imessage-search-clear"
                        aria-label={t('cancel')}
                        onClick={() => {
                          stopVoiceInput()
                          setMessageSearchQuery('')
                        }}
                      >
                        ×
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="imessage-voice-btn imessage-search-voice-btn"
                        onClick={() => toggleVoiceInput('search')}
                        disabled={!voiceInputSupported}
                        aria-label={t('voiceInput')}
                        aria-pressed={false}
                        title={t('voiceInput')}
                      >
                        <IconMic className="w-5 h-5 opacity-80" />
                      </button>
                    )}
                  </label>
                </div>
              </>
            ) : (
              <div className="hidden md:flex flex-col items-center gap-3 p-2 pt-4">
                <button type="button" onClick={() => setIsCollapsed(false)} className="ios-icon-btn text-[var(--ios-text-secondary)]">
                  <IconBack className="w-7 h-7" />
                </button>
                <button type="button" onClick={() => setIsSettingsOpen(true)} className="ios-icon-btn" aria-label={t('settings')}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/settings-flaticon.png" alt="" className="w-7 h-7 object-contain" />
                </button>
              </div>
            )}
            </div>
          </div>

{/* ПРАВАЯ КОЛОНКА — Messages thread */}
          <div className={`flex flex-col relative z-10 w-full min-h-0 flex-1 overflow-hidden ios-chat-canvas
            ${isInChat ? 'flex max-md:w-full' : 'hidden md:flex'}`}>   
            
            {!isInChat ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <MessagesAppIcon className="w-24 h-24 mb-6 opacity-90" />
                <p className="text-[20px] font-semibold text-[var(--ios-text-primary)] max-w-sm">{t('chooseFriendTitle')}</p>
                <p className="text-[15px] mt-2 text-[var(--ios-text-secondary)]">{t('chooseFriendSubtitle')}</p>
              </div>
            ) : (
              <>
                <div
                  ref={messagesViewportRef}
                  className="imessage-messages-viewport flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 md:px-6 flex flex-col w-full no-scrollbar bg-[var(--ios-chat-bg)]"
                >
                  <div className="imessage-thread-header -mx-4 md:-mx-6 px-4 md:px-6">
                    <button
                      type="button"
                      onClick={closeChat}
                      className="imessage-back-btn imessage-header-icon"
                      aria-label={t('back')}
                    >
                      <IconBack className="imessage-header-flaticon" />
                      {totalUnread > 0 && <span className="imessage-back-badge">{totalUnread > 9 ? '9+' : totalUnread}</span>}
                    </button>
                    {selectedGroup ? (
                      <button
                        type="button"
                        onClick={() => void openGroupSettings()}
                        className="imessage-thread-contact"
                        aria-label={t('groupSettings')}
                      >
                        <span className="imessage-thread-contact-glow" aria-hidden />
                        <span className="imessage-thread-avatar-wrap">
                          <span className="imessage-thread-avatar-glow" aria-hidden />
                          <IosAvatar seed={selectedGroup.id} label={selectedGroup.name} size="threadLg" variant="color" />
                        </span>
                        <span className="imessage-thread-name-pill">
                          <span className="truncate">{selectedGroup.name}</span>
                          <IconChevronRight className="!w-2.5 !h-3.5 !opacity-50 shrink-0" />
                        </span>
                      </button>
                    ) : selectedUser ? (
                      <button
                        type="button"
                        onClick={() => openProfile(selectedUser)}
                        className="imessage-thread-contact"
                        aria-label="Открыть профиль пользователя"
                      >
                        <span className="imessage-thread-contact-glow" aria-hidden />
                        <span className="imessage-thread-avatar-wrap">
                          <span className="imessage-thread-avatar-glow" aria-hidden />
                          <IosAvatar seed={selectedUser.email} label={selectedUser.email} size="threadLg" variant="person" />
                        </span>
                        <span className="imessage-thread-name-pill">
                          <span className="truncate">{displayName(selectedUser.email)}</span>
                          <IconChevronRight className="!w-2.5 !h-3.5 !opacity-50 shrink-0" />
                        </span>
                      </button>
                    ) : null}
                    <div className="imessage-thread-header-side" aria-hidden />
                  </div>
                  <div className="py-1 flex flex-col w-full">
                  {messages.map((m, idx) => {
                    const isMe = m.sender_id === session.user.id;
                    const isImage = Boolean(m.file_url && isImageFileUrl(m.file_url))
                    const isImageOnly = isImage && !m.content?.trim()
                    const msgReactions = allReactions.filter((r) => r.message_id === m.id)
                    const isMenuOpen = activeReactionMsgId === m.id;
                    const prev = messages[idx - 1]
                    const showDate =
                      !prev ||
                      new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString()
                    
                    return (
                      <div key={m.id} className="contents">
                        {showDate && (
                          <div className="imessage-date-separator">{formatDateSeparator(m.created_at)}</div>
                        )}
                      <div
                        className={`relative flex flex-col mb-2 ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        {selectedGroup && !isMe && (
                          <span className="text-[11px] font-medium text-[var(--ios-text-secondary)] mb-0.5 px-2">
                            {displayName(profilesById.get(m.sender_id)?.email ?? 'Member')}
                          </span>
                        )}

                        {/* КОНТЕКСТНОЕ МЕНЮ (Эмодзи + Копировать + Перевести) */}
                        {isMenuOpen && (
                          <>
                            <div className="imessage-msg-backdrop fixed inset-0 z-20" onClick={() => setActiveReactionMsgId(null)} />
                            <div
                              ref={reactionMenuRef}
                              className={`imessage-msg-menu fixed z-30 transition-opacity ${
                                reactionMenuStyle ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                              }`}
                              style={reactionMenuStyle ? { top: reactionMenuStyle.top, left: reactionMenuStyle.left } : undefined}
                            >
                              {/* Ряд эмодзи как в Telegram */}
                              <div className="imessage-msg-menu-emoji-row">
                                {['❤️', '👍', '🔥', '😂', '😢', '😁', '👑', '🐥'].map((emoji) => {
                                  const isMine = msgReactions.some(
                                    (r) => r.emoji === emoji && r.user_id === session.user.id
                                  )
                                  return (
                                    <button
                                      key={emoji}
                                      onClick={(e) => { e.stopPropagation(); toggleReaction(m.id, emoji); setActiveReactionMsgId(null); }}
                                      disabled={isAiLoading}
                                      className={`imessage-msg-menu-emoji ${isMine ? 'imessage-msg-menu-emoji-active' : ''}`}
                                    >
                                      {emoji}
                                    </button>
                                  )
                                })}
                              </div>
                              {/* Пункты меню строками, как в Telegram */}
                              <div className="imessage-msg-menu-items">
                                {isImage && m.file_url && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      void downloadImage(m.file_url!)
                                    }}
                                    disabled={isAiLoading}
                                    className="imessage-msg-menu-item"
                                  >
                                    <span className="imessage-msg-menu-item-icon" aria-hidden>
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src="/icons/download-flaticon.png"
                                        alt=""
                                        className="w-[22px] h-[22px] object-contain"
                                      />
                                    </span>
                                    <span>{t('downloadImage')}</span>
                                  </button>
                                )}
                                {!isImageOnly && m.content && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      const selected = window.getSelection()?.toString().trim()
                                      void copyToClipboard(selected || m.content || '')
                                    }}
                                    disabled={isAiLoading}
                                    className="imessage-msg-menu-item"
                                  >
                                    <span className="imessage-msg-menu-item-icon" aria-hidden>
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src="/icons/copy-flaticon.png"
                                        alt=""
                                        className="w-[22px] h-[22px] object-contain"
                                      />
                                    </span>
                                    <span>{t('copyText')}</span>
                                  </button>
                                )}
                                {!isImageOnly && !isImage && m.file_url && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      void copyToClipboard(m.file_url || '')
                                    }}
                                    disabled={isAiLoading}
                                    className="imessage-msg-menu-item"
                                  >
                                    <span className="imessage-msg-menu-item-icon" aria-hidden>
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src="/icons/copy-flaticon.png"
                                        alt=""
                                        className="w-[22px] h-[22px] object-contain"
                                      />
                                    </span>
                                    <span>{t('copyText')}</span>
                                  </button>
                                )}
                                {!isImageOnly && isMe && m.content && (
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
                                    className="imessage-msg-menu-item"
                                  >
                                    <span className="imessage-msg-menu-item-icon" aria-hidden>
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src="/icons/edit-flaticon.png"
                                        alt=""
                                        className="w-[22px] h-[22px] object-contain"
                                      />
                                    </span>
                                    <span>{t('edit')}</span>
                                  </button>
                                )}
                                {!isImageOnly && m.content && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      void handleAiAction('translate', 'Русский', m.id, m.content!)
                                      setActiveReactionMsgId(null)
                                    }}
                                    disabled={isAiLoading}
                                    className="imessage-msg-menu-item"
                                  >
                                    <span className="imessage-msg-menu-item-icon" aria-hidden>
                                      <IconTranslate className="!w-[18px] !h-[18px]" />
                                    </span>
                                    <span>{t('translate')}</span>
                                  </button>
                                )}
                                {isMe && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      void deleteMessage(m.id)
                                    }}
                                    disabled={isAiLoading || isSending}
                                    className="imessage-msg-menu-item imessage-msg-menu-item-danger"
                                  >
                                    <span className="imessage-msg-menu-item-icon" aria-hidden>
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src="/icons/delete-flaticon.png"
                                        alt=""
                                        className="w-[22px] h-[22px] object-contain"
                                      />
                                    </span>
                                    <span>{t('deleteMessage')}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </>
                        )}

                        {/* ПУЗЫРЕК СООБЩЕНИЯ */}
                        <div 
                          id={`msg-${m.id}`}
                          onContextMenu={(e) =>
                            handleMessageContextMenu(e, m.id, isMe, isMenuOpen)
                          }
                          onDoubleClick={() => { if (!isMenuOpen) quickLike(m.id) }}
                          onTouchStart={(e) => {
                            const touch = e.touches[0]
                            if (touch) handlePressStart(m.id, isMe, touch.clientX, touch.clientY)
                          }}
                          onTouchEnd={() => handleBubbleTouchEnd(m.id)}
                          onTouchMove={(e) => {
                            const touch = e.touches[0]
                            if (touch) handlePressMove(touch.clientX, touch.clientY)
                          }}
                          onTouchCancel={handlePressEnd}
                          style={{
                            WebkitTouchCallout: isMenuOpen ? 'default' : 'none',
                            WebkitTapHighlightColor: 'transparent',
                          }}
                          className={`ios-bubble relative flex flex-col shrink-0 ${isMe ? 'ios-bubble-sent' : 'ios-bubble-received'} ${
                            isMenuOpen ? 'imessage-bubble-selected select-text' : 'select-none'
                          } ${highlightSearchMsgId === m.id ? 'imessage-bubble-search-hit' : ''}`}
                        >
                          {likeBurst?.id === m.id && (
                            <span key={likeBurst.key} className="imessage-like-burst" aria-hidden>❤️</span>
                          )}
                          {m.file_url && (
                            <div className="mb-2 overflow-hidden rounded-xl">
                              {isImageFileUrl(m.file_url) ? (
                                /* eslint-disable-next-line @next/next/no-img-element -- remote Supabase URLs; next/image needs domain config */
                                <img
                                  src={m.file_url}
                                  alt="Вложение"
                                  draggable={false}
                                  onLoad={() => scrollToBottom('auto')}
                                  onContextMenu={(e) =>
                                    handleMessageContextMenu(e, m.id, isMe, isMenuOpen)
                                  }
                                  onTouchStart={(e) => {
                                    const touch = e.touches[0]
                                    if (touch) handlePressStart(m.id, isMe, touch.clientX, touch.clientY)
                                  }}
                                  onTouchEnd={() => handleBubbleTouchEnd(m.id)}
                                  onTouchMove={(e) => {
                                    const touch = e.touches[0]
                                    if (touch) handlePressMove(touch.clientX, touch.clientY)
                                  }}
                                  onTouchCancel={handlePressEnd}
                                  className="w-full h-full max-h-64 object-cover rounded-xl shadow-sm"
                                />
                              ) : (
                                 <a href={m.file_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-3 rounded-[12px] text-sm transition-colors ${isMe ? 'bg-black/15 hover:bg-black/25' : 'bg-black/25 hover:bg-black/35'}`}>
                                   <span className="text-lg">📎</span> <span className="font-medium">Файл</span>
                                 </a>
                              )}
                            </div>
                          )}

                          {m.content && (
                            <span
                              className={`break-words leading-snug ${
                                isMenuOpen ? 'select-text' : 'select-none max-md:pointer-events-none'
                              }`}
                            >
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

                          {msgReactions.length > 0 && (
                            <div className={`absolute -bottom-3.5 flex flex-wrap gap-1 z-[1] ${isMe ? 'right-2' : 'left-2'}`}>
                              {Array.from(new Set(msgReactions.map((r) => r.emoji))).map((emoji) => {
                                const count = msgReactions.filter((r) => r.emoji === emoji).length
                                const hasMyReaction = msgReactions.some(
                                  (r) => r.emoji === emoji && r.user_id === session.user.id
                                )
                                return (
                                  <button
                                    type="button"
                                    key={emoji}
                                    onClick={(e) => { e.stopPropagation(); toggleReaction(m.id, emoji); }}
                                    className={`imessage-reaction-pill ${hasMyReaction ? 'imessage-reaction-pill-mine' : ''}`}
                                  >
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
                </div>
                
                {/* ПАНЕЛЬ ВВОДА — safe-area для home indicator + место над клавиатурой (iOS) */}
                <div className="imessage-composer-area flex flex-col w-full">
                  {pendingFile && (
                    <div className="px-4 py-2 flex items-center gap-3">
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

                  <div className="imessage-composer relative z-30">
                    {composerPanel !== 'closed' && (
                      <button
                        type="button"
                        className="imessage-composer-backdrop"
                        aria-label={t('cancel')}
                        onClick={() => setComposerPanel('closed')}
                      />
                    )}

                    <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx" />

                    <div className={`imessage-input-shell ${isTyping || isComposerVoiceActive ? 'imessage-input-shell-active' : ''} ${composerPanel !== 'closed' ? 'imessage-input-shell-menu-open' : ''}`}>
                      {composerPlusControl}

                      <input
                        ref={composerInputRef}
                        className={`imessage-input-pill ${aiProcessingFromInput && isAiLoading ? 'text-transparent caret-transparent' : ''} ${isComposerVoiceActive ? 'imessage-input-pill-voice' : ''}`}
                        value={composerDisplayValue}
                        onChange={(e) => {
                          stopVoiceInput()
                          setText(e.target.value)
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        onPaste={handlePaste}
                        placeholder={isComposerVoiceActive ? t('voiceListening') : t('messagePlaceholder')}
                        disabled={isSending || isAiLoading}
                        onFocus={() => setComposerPanel('closed')}
                      />

                      {!canSend && !isAiLoading && composerPanel === 'closed' && (
                        <button
                          type="button"
                          className={`imessage-voice-btn ${isComposerVoiceActive ? 'imessage-voice-btn-listening' : ''}`}
                          onClick={() => toggleVoiceInput('composer')}
                          disabled={!voiceInputSupported || isSending}
                          aria-label={t('voiceInput')}
                          aria-pressed={isComposerVoiceActive}
                          title={t('voiceInput')}
                        >
                          <IconMic className="w-5 h-5" />
                        </button>
                      )}

                      {canSend && (
                        <button type="button" className="ios-send-btn" onClick={sendMessage} disabled={isSending || isAiLoading} aria-label="Send">
                          {isSending ? '…' : editingMessageId !== null ? '✓' : <IconSend />}
                        </button>
                      )}

                      {aiProcessingFromInput && isAiLoading && aiProcessingLabel && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-12">
                          <span className="text-[13px] text-[var(--ios-preview-text)] truncate">{aiProcessingLabel}</span>
                        </div>
                      )}
                    </div>
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