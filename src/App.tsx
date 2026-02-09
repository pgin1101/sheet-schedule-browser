import { useState } from 'react'
import Timeline from './Timeline'
import type { ItineraryItem } from './Timeline'
import sample from './sampleItinerary.json'
import './index.css'
import './App.css'
import MarketDashboard from './MarketDashboard'

type ParsedSheetInput = {
  sheetId: string
  gid?: string
}

function parseSheetInput(raw: string): ParsedSheetInput | null {
  const input = raw.trim()
  if (!input) return null

  if (/^[a-zA-Z0-9-_]{20,}$/.test(input)) {
    return { sheetId: input }
  }

  try {
    const url = new URL(input)
    const match = url.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    if (!match) {
      throw new Error('invalid sheet url')
    }

    const gid = url.searchParams.get('gid') ?? undefined
    return { sheetId: match[1], gid }
  } catch {
    throw new Error('請輸入公開 Google Sheet 連結或 Sheet ID')
  }
}

function buildCsvUrl(sheet: ParsedSheetInput): string {
  const gidQuery = sheet.gid ? `&gid=${encodeURIComponent(sheet.gid)}` : ''
  return `https://docs.google.com/spreadsheets/d/${sheet.sheetId}/export?format=csv${gidQuery}`
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let cell = ''
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]

    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cell += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (!inQuotes && char === ',') {
      row.push(cell.trim())
      cell = ''
      continue
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && text[i + 1] === '\n') {
        i += 1
      }
      row.push(cell.trim())
      cell = ''
      if (row.some((value) => value.length > 0)) {
        rows.push(row)
      }
      row = []
      continue
    }

    cell += char
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim())
    if (row.some((value) => value.length > 0)) {
      rows.push(row)
    }
  }

  return rows
}

function toItineraryItems(csvText: string): ItineraryItem[] {
  const rows = parseCsv(csvText)
  if (rows.length < 2) {
    throw new Error('CSV 內容不足，請確認 Sheet 至少有標題列與一筆資料')
  }

  const headers = rows[0].map((h, index) => {
    const clean = h.trim().toLowerCase()
    return index === 0 ? clean.replace(/^\uFEFF/, '') : clean
  })

  const indexOf = (aliases: string[]): number => headers.findIndex((h) => aliases.includes(h))

  const dateIndex = indexOf(['date', '日期'])
  const timeIndex = indexOf(['time', '時間'])
  const titleIndex = indexOf(['title', '標題', 'event', '行程'])
  const locationIndex = indexOf(['location', '地點'])
  const noteIndex = indexOf(['note', '備註'])

  if ([dateIndex, timeIndex, titleIndex, locationIndex].some((idx) => idx < 0)) {
    throw new Error('CSV 欄位需包含 date/time/title/location（可用中文欄名：日期/時間/標題/地點）')
  }

  const items = rows
    .slice(1)
    .map((cols) => {
      const date = cols[dateIndex]?.trim() ?? ''
      const time = cols[timeIndex]?.trim() ?? ''
      const title = cols[titleIndex]?.trim() ?? ''
      const location = cols[locationIndex]?.trim() ?? ''
      const note = noteIndex >= 0 ? cols[noteIndex]?.trim() ?? '' : ''

      if (!date || !time || !title || !location) {
        return null
      }

      const item: ItineraryItem = { date, time, title, location }
      if (note) item.note = note
      return item
    })
    .filter((item): item is ItineraryItem => item !== null)

  if (items.length === 0) {
    throw new Error('資料列缺少必要欄位內容，無法轉成行程')
  }

  return items
}

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
              欄位需包含 date、time、title、location，或使用中文欄名 日期、時間、標題、地點。
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
