import type { OneSignalClient } from '@/src/types/onesignal'

const PRODUCTION_HOST = 'my-chat-app-brown-nine.vercel.app'

const ALLOWED_HOSTS = new Set<string>([
  PRODUCTION_HOST,
  ...(process.env.NEXT_PUBLIC_ONESIGNAL_DEV === '1' ? ['localhost', '127.0.0.1'] : []),
])

export const ONESIGNAL_APP_ID = '9485fb3c-fdf8-4d2c-b4d3-8cecaf4e347c'

export function isOneSignalHost(hostname: string) {
  return ALLOWED_HOSTS.has(hostname)
}

export function isOneSignalEnabled() {
  if (typeof window === 'undefined') return false
  return isOneSignalHost(window.location.hostname)
}

export function runOneSignal(fn: (oneSignal: OneSignalClient) => void | Promise<void>) {
  if (!isOneSignalEnabled()) return

  window.OneSignalDeferred = window.OneSignalDeferred ?? []
  window.OneSignalDeferred.push(async (oneSignal) => {
    try {
      await fn(oneSignal)
    } catch (err) {
      console.warn('[OneSignal]', err)
    }
  })
}

export function oneSignalLogin(userId: string) {
  runOneSignal((oneSignal) => oneSignal.login(userId))
}

export function oneSignalLogout() {
  runOneSignal((oneSignal) => oneSignal.logout())
}
