export {}

declare global {
  interface OneSignalClient {
    login: (externalId: string) => Promise<void>
    logout: () => Promise<void>
  }

  interface Window {
    OneSignalDeferred?: Array<(oneSignal: OneSignalClient) => void | Promise<void>>
  }
}
