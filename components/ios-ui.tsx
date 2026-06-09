type IconProps = { className?: string }

function iconCls(base: string, className?: string) {
  return className ? `${base} ${className}` : base
}

export function IconChevronLeft({ className }: IconProps) {
  return (
    <svg className={iconCls('w-5 h-5 shrink-0', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

export function IconBack({ className }: IconProps) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/icons/back-flaticon.png"
      alt=""
      aria-hidden
      className={iconCls('w-10 h-10 shrink-0 object-contain', className)}
    />
  )
}

export function IconChevronRight({ className }: IconProps) {
  return (
    <svg className={iconCls('w-3.5 h-3.5 shrink-0 opacity-35', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

export function IconSearch({ className }: IconProps) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/icons/search-flaticon.png"
      alt=""
      aria-hidden
      className={iconCls('w-[18px] h-[18px] shrink-0 object-contain', className)}
    />
  )
}

export function IconPlus({ className }: IconProps) {
  return (
    <svg className={iconCls('w-5 h-5 shrink-0', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function IconCompose({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}

export function IconFilter({ className }: IconProps) {
  return (
    <svg className={iconCls('w-5 h-5 shrink-0', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  )
}

export function IconMic({ className }: IconProps) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/icons/mic-flaticon.png"
      alt=""
      aria-hidden
      className={iconCls('w-[18px] h-[18px] shrink-0 object-contain', className)}
    />
  )
}

export function IconSend({ className }: IconProps) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/icons/send-flaticon.png"
      alt=""
      aria-hidden
      className={iconCls('w-[30px] h-[30px] shrink-0 object-contain', className)}
    />
  )
}

export function IconPhotos({ className }: IconProps) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/icons/photos-flaticon.png"
      alt=""
      aria-hidden
      className={iconCls('w-6 h-6 shrink-0 object-contain rounded-[6px]', className)}
    />
  )
}

export function IconPen({ className }: IconProps) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/icons/pen-flaticon.png"
      alt=""
      aria-hidden
      className={iconCls('w-6 h-6 shrink-0 object-contain rounded-full', className)}
    />
  )
}

export function IconTranslate({ className }: IconProps) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/icons/translate-icon-icons.png"
      alt=""
      aria-hidden
      className={iconCls('w-6 h-6 shrink-0 object-contain', className)}
    />
  )
}

export function IconGear({ className }: IconProps) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/icons/settings-flaticon.png"
      alt=""
      aria-hidden
      className={iconCls('w-10 h-10 shrink-0 object-contain', className)}
    />
  )
}

export function IconMoon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21 14.5A8.5 8.5 0 019.5 3 10 10 0 1021 14.5z" />
    </svg>
  )
}

export function IconSun({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

export function IconSparkles({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l1.2 4.2L17.4 7.5 13.2 8.7 12 13l-1.2-4.3L6.6 7.5l4.2-1.3L12 2zM5 14l.8 2.8L8.6 18l-2.8.8L5 22l-.8-2.2L1.4 18l2.8-.8L5 14zm14 0l.8 2.8 2.8.8-2.8.8L19 22l-.8-2.2-2.8-.8 2.8-.8L19 14z" />
    </svg>
  )
}

export function IconGlobe({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 014 9 15 15 0 01-4 9 15 15 0 01-4-9 15 15 0 014-9z" />
    </svg>
  )
}

export function IconPerson({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 12a4.5 4.5 0 100-9 4.5 4.5 0 000 9zM4 20.5c0-3.6 3.1-6.5 8-6.5s8 2.9 8 6.5V21H4v-.5z" />
    </svg>
  )
}

export function MessagesAppIcon({ className = 'w-16 h-16' }: IconProps) {
  return (
    <div className={`${className} ios-messages-icon rounded-[22%] flex items-center justify-center shadow-lg`}>
      <svg viewBox="0 0 48 48" className="w-[58%] h-[58%]" fill="white" aria-hidden>
        <path d="M8 10h32a4 4 0 014 4v14a4 4 0 01-4 4H18l-8 6v-6h-2a4 4 0 01-4-4V14a4 4 0 014-4z" />
      </svg>
    </div>
  )
}

const AVATAR_GRADIENTS = [
  'linear-gradient(145deg, #5AC8FA 0%, #007AFF 100%)',
  'linear-gradient(145deg, #AF52DE 0%, #5856D6 100%)',
  'linear-gradient(145deg, #FF9500 0%, #FF2D55 100%)',
  'linear-gradient(145deg, #34C759 0%, #30B0C7 100%)',
  'linear-gradient(145deg, #FF6482 0%, #FF3B30 100%)',
  'linear-gradient(145deg, #64D2FF 0%, #0A84FF 100%)',
  'linear-gradient(145deg, #FFD60A 0%, #FF9F0A 100%)',
]

export function avatarGradient(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]
}

export function IosAvatar({
  seed,
  label,
  size = 'md',
  variant = 'color',
  className = '',
}: {
  seed: string
  label: string
  size?: 'inbox' | 'sm' | 'md' | 'lg' | 'xl' | 'thread' | 'threadLg'
  variant?: 'color' | 'person'
  className?: string
}) {
  const sizes = {
    inbox: 'w-10 h-10 text-sm',
    sm: 'w-9 h-9 text-sm',
    md: 'w-12 h-12 text-base',
    lg: 'w-[52px] h-[52px] text-lg',
    xl: 'w-20 h-20 text-3xl',
    thread: 'w-14 h-14',
    threadLg: 'w-16 h-16 text-2xl',
  }
  if (variant === 'person') {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src="/icons/user-flaticon.png"
        alt=""
        aria-hidden
        className={`${sizes[size]} rounded-full shrink-0 object-cover ${className}`}
      />
    )
  }
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold text-white shrink-0 ios-avatar ${className}`}
      style={{ background: avatarGradient(seed) }}
      aria-hidden
    >
      {label.charAt(0).toUpperCase()}
    </div>
  )
}
