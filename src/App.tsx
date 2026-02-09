import { useState } from 'react'
import Timeline from './Timeline'
import type { ItineraryItem } from './Timeline'
import sample from './sampleItinerary.json'
import './index.css'
import './App.css'
import MarketDashboard from './MarketDashboard'
import { buildCsvUrl, parseSheetInput, toItineraryItems } from './sheetParser'

function App() {
  const [items, setItems] = useState<ItineraryItem[]>(sample as ItineraryItem[])
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'schedule' | 'market'>('schedule')

  const handleLoad = async () => {
    setLoading(true)
    setError(null)

    try {
      const parsed = parseSheetInput(url)

      if (!parsed) {
        setItems(sample as ItineraryItem[])
        return
      }

      const response = await fetch(buildCsvUrl(parsed))
      if (!response.ok) {
        throw new Error(`載入失敗，HTTP ${response.status}`)
      }

      const csv = await response.text()
      const loadedItems = toItineraryItems(csv)
      setItems(loadedItems)
    } catch (e) {
      const message = e instanceof Error ? e.message : '載入失敗'
      setError(message)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800">
          Sheet Schedule Browser / 美股盤面速看
        </h1>
        <div className="mt-4 flex gap-2 justify-center">
          <button
            className={`px-3 py-1 rounded border ${view === 'schedule' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}
            onClick={() => setView('schedule')}
          >
            行程
          </button>
          <button
            className={`px-3 py-1 rounded border ${view === 'market' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}
            onClick={() => setView('market')}
          >
            盤面
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4">
        {view === 'schedule' ? (
          <>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                aria-label="貼上 Google Sheet 連結"
                className="flex-grow border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="貼上公開 Google Sheet 連結或 Sheet ID"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <button
                onClick={handleLoad}
                className={`bg-blue-500 text-white px-4 py-2 rounded ${
                  loading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-blue-600'
                }`}
                disabled={loading}
              >
                {loading ? '載入中…' : '載入'}
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              支援 date/time/title/location 直式欄位，也支援 Day 1~Day N 橫向行程表。
            </p>

            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            {items.length === 0 ? (
              <p className="text-center text-gray-500">目前尚無行程資料</p>
            ) : (
              <Timeline items={items} />
            )}
          </>
        ) : (
          <MarketDashboard />
        )}
      </main>
    </div>
  )
}

export default App
