import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

export const resources = {
  'zh-TW': {
    translation: {
      'load': '載入',
      'pasteLink': '貼上 Google Sheet 連結',
      'loading': '載入中...'
    }
  }
} as const

void i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh-TW',
    fallbackLng: 'zh-TW',
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
