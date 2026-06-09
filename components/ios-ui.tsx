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

export function IconChevronRight({ className }: IconProps) {
  return (
    <svg className={iconCls('w-3.5 h-3.5 shrink-0 opacity-35', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

export function IconSearch({ className }: IconProps) {
  return (
    <svg className={iconCls('w-4 h-4 shrink-0', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  )
}

export function IconPlus({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
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

export function IconFilter({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  )
}

export function IconMic({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="4" y="10" width="2.5" height="8" rx="1.2" />
      <rect x="8.5" y="7" width="2.5" height="11" rx="1.2" />
      <rect x="13" y="9" width="2.5" height="9" rx="1.2" />
      <rect x="17.5" y="6" width="2.5" height="12" rx="1.2" />
    </svg>
  )
}

export function IconSend({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3.4 20.6 22 12 3.4 3.4l-.9 7.3 9.8 1-9.8 1 .9 7.3z" />
    </svg>
  )
}

export function IconGear({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
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
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'thread'
  variant?: 'color' | 'person'
  className?: string
}) {
  const sizes = {
    sm: 'w-9 h-9 text-sm',
    md: 'w-12 h-12 text-base',
    lg: 'w-[52px] h-[52px] text-lg',
    xl: 'w-20 h-20 text-3xl',
    thread: 'w-14 h-14',
  }
  if (variant === 'person') {
    return (
      <div className={`${sizes[size]} rounded-full flex items-center justify-center shrink-0 imessage-person-avatar ${className}`}>
        <IconPerson className="w-[55%] h-[55%]" />
      </div>
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
