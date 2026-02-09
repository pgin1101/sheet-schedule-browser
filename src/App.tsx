import { useMemo, useState } from 'react'
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
  const [loadedFrom, setLoadedFrom] = useState<'sample' | 'sheet'>('sample')
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(new Date())

  const headerSummary = useMemo(() => {
    const dayCount = new Set(items.map((item) => item.date)).size
    return {
      dayCount,
      itemCount: items.length,
    }
  }, [items])

  const loadSample = () => {
    setItems(sample as ItineraryItem[])
    setError(null)
    setLoadedFrom('sample')
    setLastLoadedAt(new Date())
  }

  const handleLoad = async () => {
    setLoading(true)
    setError(null)

    try {
      const parsed = parseSheetInput(url)

      if (!parsed) {
        loadSample()
        return
      }

      const response = await fetch(buildCsvUrl(parsed))
      if (!response.ok) {
        throw new Error(`載入失敗，HTTP ${response.status}`)
      }

      const csv = await response.text()
      const loadedItems = toItineraryItems(csv)
      setItems(loadedItems)
      setLoadedFrom('sheet')
      setLastLoadedAt(new Date())
    } catch (e) {
      const message = e instanceof Error ? e.message : '載入失敗'
      setError(message)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const formatLoadedTime = (date: Date | null): string => {
    if (!date) return '尚未載入'
    return date.toLocaleString('zh-TW', {
      hour12: false,
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="app-shell min-h-screen px-4 py-6 md:px-6 md:py-10">
      <div className="app-aurora" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-6xl space-y-6">
        <header className="app-panel overflow-hidden rounded-[28px] border border-white/70 px-5 py-5 shadow-lg md:px-8 md:py-7">
          <div className="absolute right-0 top-0 h-40 w-40 -translate-y-1/3 translate-x-1/4 rounded-full bg-cyan-200/50 blur-2xl" aria-hidden="true" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-slate-500">SHEET SCHEDULE BROWSER</p>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
                旅途中的即時行程儀表板
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                將 Google Sheet 轉成可查詢的行程介面。你可以用手機快速找餐廳、景點與交通安排，減少旅途中反覆滑表格的時間。
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs md:text-sm">
              <div className="rounded-2xl bg-slate-900 px-4 py-3 text-white">
                <p className="text-slate-300">行程天數</p>
                <p className="mt-1 text-lg font-semibold md:text-xl">{headerSummary.dayCount}</p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 text-slate-800 ring-1 ring-slate-200">
                <p className="text-slate-500">事件總數</p>
                <p className="mt-1 text-lg font-semibold md:text-xl">{headerSummary.itemCount}</p>
              </div>
            </div>
          </div>
        </header>

        <section className="app-panel rounded-[28px] border border-white/70 p-4 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="segmented inline-flex w-full max-w-md rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
                  view === 'schedule' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
                onClick={() => setView('schedule')}
              >
                旅行行程
              </button>
              <button
                type="button"
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
                  view === 'market' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
                onClick={() => setView('market')}
              >
                市場盤面
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 md:text-sm">
              <span className="rounded-full bg-slate-100 px-3 py-1.5">
                資料來源：{loadedFrom === 'sheet' ? 'Google Sheet' : '示範資料'}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5">
                最後同步：{formatLoadedTime(lastLoadedAt)}
              </span>
            </div>
          </div>

          <main className="mt-5">
            {view === 'schedule' ? (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white p-3 md:p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <input
                      type="text"
                      aria-label="貼上 Google Sheet 連結"
                      className="w-full flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-400 focus:bg-white"
                      placeholder="貼上公開 Google Sheet 連結或 Sheet ID"
                      value={url}
                      onChange={(event) => setUrl(event.target.value)}
                    />

                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                      <button
                        type="button"
                        onClick={handleLoad}
                        className={`rounded-xl px-4 py-2.5 text-sm font-medium text-white transition ${
                          loading ? 'cursor-not-allowed bg-cyan-400' : 'bg-cyan-600 hover:bg-cyan-700'
                        }`}
                        disabled={loading}
                      >
                        {loading ? '同步中' : '同步 Sheet'}
                      </button>
                      <button
                        type="button"
                        onClick={loadSample}
                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        載入示範
                      </button>
                    </div>
                  </div>

                  <p className="mt-3 text-xs leading-5 text-slate-500 md:text-sm">
                    支援直式欄位格式（date/time/title/location）與 Day 1 到 Day N 的橫向旅遊表格。
                  </p>
                </div>

                {error && (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                )}

                <div className="mt-4">
                  {items.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-12 text-center text-slate-500">
                      目前尚無行程資料，請先同步 Google Sheet 或載入示範資料。
                    </div>
                  ) : (
                    <Timeline items={items} />
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <MarketDashboard />
              </div>
            )}
          </main>
        </section>
      </div>
    </div>
  )
}

export default App
