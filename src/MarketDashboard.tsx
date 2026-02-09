import { useEffect, useMemo, useRef, useState } from 'react'
import { BACKEND_URL } from './config'

type TickerMetrics = {
  symbol: string
  price?: number
  change_pct?: number
  volume?: number
  avg_vol_30d?: number
  vol_ratio?: number
  rsi14?: number
  atr14?: number
  high_52w?: number
  low_52w?: number
  rel_to_bench_pct?: number
  error?: string
}

type MetricsResponse = {
  benchmark: string
  asof: number
  tickers: TickerMetrics[]
}

const defaultList = 'SPY,QQQ,AAPL,NVDA,TSM'

function formatNumber(n?: number, digits = 2) {
  if (n === undefined || n === null) return '-'
  return n.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })
}

function pctColor(v?: number) {
  if (v === undefined || v === null) return ''
  if (v > 0) return 'text-green-600'
  if (v < 0) return 'text-red-600'
  return ''
}

export default function MarketDashboard() {
  const [tickers, setTickers] = useState(defaultList)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<MetricsResponse | null>(null)
  const [refreshSec, setRefreshSec] = useState(60)
  const [ttl, setTtl] = useState(120)
  const timerRef = useRef<number | null>(null)

  const symbols = useMemo(() => tickers.split(',').map(s => s.trim()).filter(Boolean), [tickers])

  const fetchData = async () => {
    const qs = new URLSearchParams({ tickers: symbols.join(','), ttl: String(ttl) })
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${BACKEND_URL}/metrics?${qs.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: MetricsResponse = await res.json()
      setData(json)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '載入失敗'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (timerRef.current) window.clearInterval(timerRef.current)
    if (refreshSec > 0) {
      timerRef.current = window.setInterval(fetchData, refreshSec * 1000) as unknown as number
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSec, tickers, ttl])

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
        <div className="flex-1 flex gap-2 w-full">
          <input
            className="flex-grow border rounded px-3 py-2"
            value={tickers}
            onChange={(e) => setTickers(e.target.value)}
            placeholder="輸入代號（逗號分隔）"
          />
          <button onClick={fetchData} className={`px-4 py-2 rounded text-white ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`} disabled={loading}>
            {loading ? '更新中…' : '更新'}
          </button>
        </div>
        <div className="flex gap-2 items-center text-sm">
          <label className="flex items-center gap-1">
            TTL
            <input type="number" min={10} max={3600} className="w-20 border rounded px-2 py-1" value={ttl} onChange={(e)=> setTtl(Number(e.target.value))} />
          </label>
          <label className="flex items-center gap-1">
            Auto
            <input type="number" min={0} className="w-20 border rounded px-2 py-1" value={refreshSec} onChange={(e)=> setRefreshSec(Number(e.target.value))} />
            秒
          </label>
        </div>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Symbol</th>
              <th className="p-2 text-right">Price</th>
              <th className="p-2 text-right">% Chg</th>
              <th className="p-2 text-right">Volume</th>
              <th className="p-2 text-right">Vol/30d</th>
              <th className="p-2 text-right">RSI(14)</th>
              <th className="p-2 text-right">Rel vs {data?.benchmark ?? 'SPY'}</th>
              <th className="p-2 text-right">52w Low</th>
              <th className="p-2 text-right">52w High</th>
              <th className="p-2 text-left">Note</th>
            </tr>
          </thead>
          <tbody>
            {symbols.map(sym => {
              const row = data?.tickers.find(t => t.symbol.toUpperCase() === sym.toUpperCase())
              return (
                <tr key={sym} className="border-t">
                  <td className="p-2 font-mono">{sym.toUpperCase()}</td>
                  <td className="p-2 text-right">{formatNumber(row?.price, 2)}</td>
                  <td className={`p-2 text-right ${pctColor(row?.change_pct)}`}>{formatNumber(row?.change_pct, 2)}%</td>
                  <td className="p-2 text-right">{row?.volume?.toLocaleString() ?? '-'}</td>
                  <td className="p-2 text-right">{row?.vol_ratio ? formatNumber(row?.vol_ratio, 2) + 'x' : '-'}</td>
                  <td className="p-2 text-right">{formatNumber(row?.rsi14, 1)}</td>
                  <td className={`p-2 text-right ${pctColor(row?.rel_to_bench_pct)}`}>{formatNumber(row?.rel_to_bench_pct, 2)}%</td>
                  <td className="p-2 text-right">{formatNumber(row?.low_52w, 2)}</td>
                  <td className="p-2 text-right">{formatNumber(row?.high_52w, 2)}</td>
                  <td className="p-2 text-left text-xs text-gray-500">{row?.error ?? ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {data && (
        <div className="text-xs text-gray-500">
          更新時間: {new Date(data.asof * 1000).toLocaleString()}; 基準: {data.benchmark}
        </div>
      )}
    </div>
  )
}

