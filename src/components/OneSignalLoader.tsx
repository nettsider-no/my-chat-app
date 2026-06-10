'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'
import { isOneSignalHost, ONESIGNAL_APP_ID } from '@/src/lib/onesignal'

export function OneSignalLoader() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    setEnabled(isOneSignalHost(window.location.hostname))
  }, [])

  if (!enabled) return null

  return (
    <>
      <Script
        src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
        strategy="afterInteractive"
      />
      <Script
        id="onesignal-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            OneSignalDeferred.push(async function(OneSignal) {
              try {
                await OneSignal.init({
                  appId: "${ONESIGNAL_APP_ID}",
                });
              } catch (err) {
                console.warn("[OneSignal] init failed", err);
              }
            });
          `,
        }}
      />
    </>
  )
}
