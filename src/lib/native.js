// Native (Capacitor) initialization — runs only on iOS/Android, no-op on web.
// Keeps web/Vercel deployment unchanged while adding native iOS behavior.

import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { Keyboard } from '@capacitor/keyboard'
import { App } from '@capacitor/app'
import { PushNotifications } from '@capacitor/push-notifications'
import { supabase } from './supabase'

export async function initNative() {
  if (!Capacitor.isNativePlatform()) return

  try {
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#1a1a2e' })
  } catch (e) {
    console.warn('StatusBar setup failed:', e)
  }

  try {
    await SplashScreen.hide({ fadeOutDuration: 300 })
  } catch (e) {
    console.warn('SplashScreen.hide failed:', e)
  }

  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back()
    } else {
      App.exitApp()
    }
  })

  Keyboard.addListener('keyboardWillShow', (info) => {
    document.documentElement.style.setProperty('--kb-height', `${info.keyboardHeight}px`)
  })
  Keyboard.addListener('keyboardWillHide', () => {
    document.documentElement.style.setProperty('--kb-height', '0px')
  })

  await registerPushNotifications()
}

async function registerPushNotifications() {
  try {
    const permission = await PushNotifications.checkPermissions()

    if (permission.receive !== 'granted') {
      const result = await PushNotifications.requestPermissions()
      if (result.receive !== 'granted') {
        console.info('Push notifications not granted')
        return
      }
    }

    await PushNotifications.register()

    PushNotifications.addListener('registration', async (token) => {
      console.info('APNs token:', token.value)
      await saveDeviceToken(token.value)
    })

    PushNotifications.addListener('registrationError', (err) => {
      const message = String(err?.error || err?.message || err || '')
      const isExpectedDevError = message.includes('aps-environment')
      if (isExpectedDevError) {
        console.info('Push registration skipped — no aps-environment entitlement (free dev account). Enroll in the Apple Developer Program to enable push.')
      } else {
        console.warn('Push registration error:', err)
      }
    })

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.info('Push received in foreground:', notification)
    })

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.info('Push tapped:', action)
      const callId = action.notification.data?.call_id
      if (callId) {
        window.location.hash = `#/calls?call_id=${callId}`
      }
    })
  } catch (e) {
    console.warn('Push setup failed:', e)
  }
}

async function saveDeviceToken(token) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  try {
    await supabase.from('device_tokens').upsert({
      user_id: user.id,
      token,
      platform: 'ios',
      updated_at: new Date().toISOString(),
    })
  } catch (e) {
    console.warn('Could not save device token:', e)
  }
}
