// src/App.tsx
import React, { useEffect, useState } from 'react'
import Timeline, { ItineraryItem } from './Timeline'
import sample from './sampleItinerary.json'
import './index.css'   // 放 @tailwind 指令
import './App.css'     // 只放純 CSS，被動式覆寫

function App() {
  const [items, setItems] = useState<ItineraryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [url, setUrl] = useState('')

  useEffect(() => {
    // 預設用 sample 資料
    setItems(sample as ItineraryItem[])
  }, [])

  const handleLoad = async () => {
    setLoading(true)
    try {
      // 這裡以 sample 代替。未來可換成真正從 Google Sheet 抓回來的資料
      setItems(sample as ItineraryItem[])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* 頁首 */}
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800">
          Sheet Schedule Browser
        </h1>
      </header>

      {/* 主區塊：置中、最大寬度 */}
      <main className="max-w-3xl mx-auto px-4">
        {/* URL 輸入 + 按鈕 */}
        <div className="flex gap-2 mb-8">
          <input
            type="text"
            aria-label="貼上 Google Sheet 連結"
            className="flex-grow border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="貼上 Google Sheet 連結"
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

        {/* 如果沒有任何資料就顯示提示 */}
        {items.length === 0 ? (
          <p className="text-center text-gray-500">
            目前尚無行程資料
          </p>
        ) : (
          <Timeline items={items} />
        )}
      </main>
    </div>
  )
}

export default App