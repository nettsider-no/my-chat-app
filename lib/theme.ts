export type ThemeMode = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'messenger-theme'

export function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', mode)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode)
  } catch {
    /* private mode */
  }
}

export function readStoredTheme(): ThemeMode | null {
  try {
    const t = localStorage.getItem(THEME_STORAGE_KEY)
    if (t === 'light' || t === 'dark') return t
  } catch {
    /* ignore */
  }
  return null
}
