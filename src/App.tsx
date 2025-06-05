import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import './i18n'
import Timeline, { type ItineraryItem } from './Timeline'
import sample from './sampleItinerary.json'
import './App.css'

function App() {
  const { t } = useTranslation()
  const [url, setUrl] = useState('')
  const [items, setItems] = useState<ItineraryItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // load sample on first render
    setItems(sample as ItineraryItem[])
  }, [])

  const handleLoad = async () => {
    setLoading(true)
    try {
      // placeholder: in real app, call backend API with url
      setItems(sample as ItineraryItem[])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4 text-center">Sheet Schedule Browser</h1>
      <div className="flex gap-2 mb-4">
        <input
          aria-label={t('pasteLink')}
          className="flex-grow border rounded px-2 py-1"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t('pasteLink')}
        />
        <button
          onClick={handleLoad}
          className="bg-blue-500 text-white px-4 py-1 rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? t('loading') : t('load')}
        </button>
      </div>
      <Timeline items={items} />
    </div>
  )
}

export default App
