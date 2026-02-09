// src/Timeline.tsx

export interface ItineraryItem {
  date: string    // e.g. "2025-07-15"
  time: string    // e.g. "08:00"
  title: string   // e.g. "Flight to NYC"
  location: string
  note?: string
}

interface TimelineProps {
  items: ItineraryItem[]
}

/**
 * 先把 items 按日期、時間排序，然後按日分組顯示
 */
export default function Timeline({ items }: TimelineProps) {
  // 1. 先排序
  const sorted = [...items].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return a.time.localeCompare(b.time)
  })

  // 2. 把排序後的列表「依 date 分組」，變成 { date: '2025-07-15', entries: [ ... ] } 這樣的陣列
  const grouped: { date: string; entries: ItineraryItem[] }[] = []
  sorted.forEach((it) => {
    const lastGroup = grouped[grouped.length - 1]
    if (!lastGroup || lastGroup.date !== it.date) {
      grouped.push({ date: it.date, entries: [it] })
    } else {
      lastGroup.entries.push(it)
    }
  })

  return (
    <div className="space-y-8">
      {grouped.map((group, idx) => (
        <div key={idx}>
          {/* 分組標題：日期 */}
          <h2 className="text-xl font-bold text-gray-700 mb-3">
            {group.date}
          </h2>
          {/* 條列這一天的所有卡片 */}
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
            {group.entries.map((item, i) => (
              <div
                key={i}
                className="border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 bg-white"
              >
                {/* 卡片內距 */}
                <div className="p-4">
                  {/* 時間 + 標題 */}
                  <div className="flex items-baseline justify-between mb-2">
                    <div className="text-sm font-medium text-gray-500">
                      {item.time}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {item.title}
                    </h3>
                  </div>
                  {/* 地點 */}
                  <div className="mb-1"> 
                    <span className="text-sm text-gray-600">
                      {item.location.trim()}
                    </span>
                  </div>
                  {/* 備註 (若有) */}
                  {item.note && (
                    <div className="mt-2 text-sm text-gray-500">
                      {item.note}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}