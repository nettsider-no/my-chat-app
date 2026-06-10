export type SpeechUiLanguage = 'en' | 'no' | 'fr' | 'ar' | 'zh' | 'ru' | 'uk' | 'es'

const SPEECH_LANG: Record<SpeechUiLanguage, string> = {
  en: 'en-US',
  no: 'nb-NO',
  fr: 'fr-FR',
  ar: 'ar-SA',
  zh: 'zh-CN',
  ru: 'ru-RU',
  uk: 'uk-UA',
  es: 'es-ES',
}

export function speechLangFromUi(ui: SpeechUiLanguage) {
  return SPEECH_LANG[ui] ?? 'en-US'
}

export function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognition
    webkitSpeechRecognition?: new () => SpeechRecognition
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function isSpeechRecognitionSupported() {
  return getSpeechRecognitionCtor() !== null
}

export type VoiceSessionCallbacks = {
  onInterim: (text: string) => void
  onFinal: (text: string) => void
  onFatalError: (code: string) => void
}

/** Keeps speech recognition alive across browser-imposed silence timeouts. */
export class VoiceInputSession {
  private recognition: SpeechRecognition | null = null
  private restartTimer: ReturnType<typeof setTimeout> | null = null
  private running = false
  private userStop = false
  private restartAttempt = 0
  private lang: string
  private readonly callbacks: VoiceSessionCallbacks
  private readonly onVisibilityChange: () => void

  constructor(lang: string, callbacks: VoiceSessionCallbacks) {
    this.lang = lang
    this.callbacks = callbacks
    this.onVisibilityChange = () => {
      if (typeof document === 'undefined') return
      if (document.visibilityState !== 'visible') return
      if (!this.running || this.userStop) return
      if (this.recognition) return
      this.scheduleRestart(0)
    }
  }

  setLanguage(lang: string) {
    this.lang = lang
  }

  begin() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibilityChange)
    }
    this.userStop = false
    this.running = true
    this.restartAttempt = 0
    this.launch()
  }

  endByUser() {
    this.userStop = true
    this.running = false
    this.detachVisibilityListener()
    this.clearRestartTimer()
    const rec = this.recognition
    this.recognition = null
    if (!rec) return
    try {
      rec.stop()
    } catch {
      try {
        rec.abort()
      } catch {
        /* ignore */
      }
    }
  }

  destroyImmediate() {
    this.userStop = true
    this.running = false
    this.detachVisibilityListener()
    this.clearRestartTimer()
    const rec = this.recognition
    this.recognition = null
    if (!rec) return
    rec.onend = null
    rec.onerror = null
    rec.onresult = null
    try {
      rec.abort()
    } catch {
      /* ignore */
    }
  }

  private detachVisibilityListener() {
    if (typeof document === 'undefined') return
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
  }

  private clearRestartTimer() {
    if (this.restartTimer === null) return
    clearTimeout(this.restartTimer)
    this.restartTimer = null
  }

  private launch() {
    if (!this.running || this.userStop) return

    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      this.running = false
      this.callbacks.onFatalError('unsupported')
      return
    }

    const recognition = new Ctor()
    this.recognition = recognition
    recognition.lang = this.lang
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      this.restartAttempt = 0
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0]?.transcript ?? ''
        const trimmed = chunk.trim()
        if (!trimmed) continue
        if (event.results[i].isFinal || this.userStop) {
          this.callbacks.onFinal(trimmed)
        } else {
          interim += chunk
        }
      }
      if (this.userStop) {
        this.callbacks.onInterim('')
      } else if (interim.trim()) {
        this.callbacks.onInterim(interim.trim())
      } else {
        this.callbacks.onInterim('')
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'aborted' || event.error === 'no-speech') return
      if (this.userStop || !this.running) return

      if (event.error === 'not-allowed') {
        this.running = false
        this.userStop = true
        this.callbacks.onFatalError('not-allowed')
        return
      }

      if (event.error === 'network') {
        this.recognition = null
        this.scheduleRestart(this.restartAttempt + 1)
        return
      }

      if (event.error === 'audio-capture' || event.error === 'service-not-allowed') {
        this.running = false
        this.userStop = true
        this.callbacks.onFatalError(event.error)
      }
    }

    recognition.onend = () => {
      this.recognition = null
      if (this.userStop || !this.running) return
      this.scheduleRestart(this.restartAttempt)
    }

    try {
      recognition.start()
    } catch {
      this.recognition = null
      this.scheduleRestart(this.restartAttempt + 1)
    }
  }

  private scheduleRestart(attempt: number) {
    if (!this.running || this.userStop) return
    this.restartAttempt = attempt
    this.clearRestartTimer()
    const delay = Math.min(100 + attempt * 120, 1500)
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null
      this.launch()
    }, delay)
  }
}
