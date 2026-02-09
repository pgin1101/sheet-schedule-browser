import { useEffect, useMemo, useState } from 'react'

export interface ItineraryItem {
  date: string
  time: string
  title: string
  location: string
  note?: string
}

interface TimelineProps {
  items: ItineraryItem[]
}

type GroupedDay = {
  date: string
  entries: ItineraryItem[]
}

function toDateSortValue(rawDate: string): number {
  const isoMatch = rawDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (isoMatch) {
    const year = Number(isoMatch[1])
    const month = Number(isoMatch[2])
    const day = Number(isoMatch[3])
    return Date.UTC(year, month - 1, day)
  }

  const mdMatch = rawDate.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (mdMatch) {
    const year = new Date().getFullYear()
    const month = Number(mdMatch[1])
    const day = Number(mdMatch[2])
    return Date.UTC(year, month - 1, day)
  }

  return Number.MAX_SAFE_INTEGER
}

function toTimeSortValue(rawTime: string): number {
  const timeMatch = rawTime.match(/^(\d{1,2}):(\d{2})$/)
  if (!timeMatch) return Number.MAX_SAFE_INTEGER

  const hour = Number(timeMatch[1])
  const minute = Number(timeMatch[2])
  return hour * 60 + minute
}

function formatDateLabel(rawDate: string): string {
  const isoMatch = rawDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (isoMatch) {
    const date = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]))
    return date.toLocaleDateString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    })
  }

  return rawDate
}

function toMapLink(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase()
}

export default function Timeline({ items }: TimelineProps) {
  const [query, setQuery] = useState('')
  const [activeDate, setActiveDate] = useState<string>('all')

  const groupedDays = useMemo<GroupedDay[]>(() => {
    const sorted = [...items].sort((a, b) => {
      const dateDelta = toDateSortValue(a.date) - toDateSortValue(b.date)
      if (dateDelta !== 0) return dateDelta
      const timeDelta = toTimeSortValue(a.time) - toTimeSortValue(b.time)
      if (timeDelta !== 0) return timeDelta
      return a.title.localeCompare(b.title)
    })

    const grouped: GroupedDay[] = []

    sorted.forEach((entry) => {
      const lastGroup = grouped[grouped.length - 1]
      if (!lastGroup || lastGroup.date !== entry.date) {
        grouped.push({ date: entry.date, entries: [entry] })
      } else {
        lastGroup.entries.push(entry)
      }
    })

    return grouped
  }, [items])

  const dayCounts = useMemo(() => {
    return groupedDays.map((group) => ({
      date: group.date,
      label: formatDateLabel(group.date),
      count: group.entries.length,
    }))
  }, [groupedDays])

  useEffect(() => {
    if (activeDate === 'all') return
    if (!dayCounts.some((day) => day.date === activeDate)) {
      setActiveDate('all')
    }
  }, [activeDate, dayCounts])

  const normalizedQuery = normalizeText(query)

  const filteredDays = useMemo(() => {
    return groupedDays
      .filter((group) => activeDate === 'all' || group.date === activeDate)
      .map((group) => {
        if (!normalizedQuery) return group

        const entries = group.entries.filter((entry) => {
          const haystack = normalizeText(`${entry.time} ${entry.title} ${entry.location} ${entry.note ?? ''}`)
          return haystack.includes(normalizedQuery)
        })

        return {
          date: group.date,
          entries,
        }
      })
      .filter((group) => group.entries.length > 0)
  }, [groupedDays, activeDate, normalizedQuery])

  const totalItems = items.length
  const visibleItems = filteredDays.reduce((count, day) => count + day.entries.length, 0)

  if (items.length === 0) {
    return null
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur-sm md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">行程總覽</h2>
            <p className="text-sm text-slate-500">旅途中可快速搜尋景點與餐廳，並依日期切換行程。</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs md:text-sm">
            <div className="rounded-2xl bg-slate-50 px-3 py-2">
              <p className="text-slate-500">天數</p>
              <p className="text-base font-semibold text-slate-900 md:text-lg">{dayCounts.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-3 py-2">
              <p className="text-slate-500">事件</p>
              <p className="text-base font-semibold text-slate-900 md:text-lg">{totalItems}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-3 py-2">
              <p className="text-slate-500">符合篩選</p>
              <p className="text-base font-semibold text-slate-900 md:text-lg">{visibleItems}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜尋行程、地點、備註"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-cyan-400 focus:bg-white"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setActiveDate('all')
            }}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            清除篩選
          </button>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition ${
              activeDate === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            onClick={() => setActiveDate('all')}
          >
            全部日期
          </button>

          {dayCounts.map((day) => (
            <button
              type="button"
              key={day.date}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition ${
                activeDate === day.date ? 'bg-cyan-600 text-white' : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'
              }`}
              onClick={() => setActiveDate(day.date)}
            >
              {day.label} · {day.count}
            </button>
          ))}
        </div>
      </section>

      {filteredDays.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-10 text-center text-slate-500">
          找不到符合條件的行程，請調整搜尋關鍵字或日期。
        </section>
      ) : (
        filteredDays.map((group, index) => (
          <section key={group.date} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-cyan-50 to-teal-50 px-4 py-3 md:px-5">
              <h3 className="text-sm font-semibold tracking-wide text-cyan-900 md:text-base">
                Day {index + 1} · {formatDateLabel(group.date)}
              </h3>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-cyan-800 shadow-sm">
                {group.entries.length} 筆
              </span>
            </header>

            <div className="divide-y divide-slate-100">
              {group.entries.map((item, itemIndex) => (
                <article key={`${group.date}-${item.time}-${itemIndex}`} className="relative px-4 py-4 md:px-5">
                  <div className="absolute left-[27px] top-0 h-full w-px bg-slate-200" aria-hidden="true" />
                  <div className="relative flex gap-3">
                    <div className="z-10 mt-1 h-4 w-4 rounded-full border-2 border-cyan-500 bg-white" aria-hidden="true" />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="inline-flex rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">{item.time}</p>
                          <h4 className="mt-2 text-base font-semibold text-slate-900 md:text-lg">{item.title}</h4>
                        </div>
                        <a
                          href={toMapLink(item.location)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex w-fit items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-medium text-cyan-700 transition hover:bg-cyan-100"
                        >
                          地圖
                        </a>
                      </div>

                      <p className="mt-2 text-sm font-medium text-slate-700">{item.location}</p>

                      {item.note && <p className="mt-2 whitespace-pre-line text-sm text-slate-500">{item.note}</p>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
