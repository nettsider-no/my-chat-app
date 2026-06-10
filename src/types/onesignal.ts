export interface OneSignalClient {
  login: (externalId: string) => Promise<void>
  logout: () => Promise<void>
}

declare global {
  interface Window {
    OneSignalDeferred?: Array<(oneSignal: OneSignalClient) => void | Promise<void>>
  }
}

export {}
