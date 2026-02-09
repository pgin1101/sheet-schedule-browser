import type { ItineraryItem } from './Timeline'

export type ParsedSheetInput = {
  sheetId: string
  gid?: string
}

type DirectRowColumnIndexes = {
  dateIndex: number
  timeIndex: number
  titleIndex: number
  locationIndex: number
  noteIndex: number
}

const directColumnAliases = {
  date: ['date', '日期'],
  time: ['time', '時間'],
  title: ['title', '標題', 'event', '行程'],
  location: ['location', '地點'],
  note: ['note', '備註'],
}

const sectionTimeHints: Array<{ pattern: RegExp; time: string }> = [
  { pattern: /早餐|breakfast/i, time: '08:00' },
  { pattern: /上午|morning/i, time: '10:00' },
  { pattern: /午餐|中午|lunch/i, time: '12:30' },
  { pattern: /下午|afternoon/i, time: '15:00' },
  { pattern: /晚餐|dinner/i, time: '18:30' },
  { pattern: /晚上|夜|night|hotel|住宿|飯店/i, time: '21:00' },
  { pattern: /主要行程|大綱|overview/i, time: '09:00' },
]

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/^\uFEFF/, '')
}

export function parseSheetInput(raw: string): ParsedSheetInput | null {
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

export function buildCsvUrl(sheet: ParsedSheetInput): string {
  const gidQuery = sheet.gid ? `&gid=${encodeURIComponent(sheet.gid)}` : ''
  return `https://docs.google.com/spreadsheets/d/${sheet.sheetId}/export?format=csv${gidQuery}`
}

export function parseCsv(text: string): string[][] {
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

function indexOfHeader(headers: string[], aliases: string[]): number {
  return headers.findIndex((header) => aliases.includes(header))
}

function resolveDirectColumnIndexes(headers: string[]): DirectRowColumnIndexes {
  const dateIndex = indexOfHeader(headers, directColumnAliases.date)
  const timeIndex = indexOfHeader(headers, directColumnAliases.time)
  const titleIndex = indexOfHeader(headers, directColumnAliases.title)
  const locationIndex = indexOfHeader(headers, directColumnAliases.location)
  const noteIndex = indexOfHeader(headers, directColumnAliases.note)

  if ([dateIndex, timeIndex, titleIndex, locationIndex].some((idx) => idx < 0)) {
    throw new Error('CSV 欄位需包含 date/time/title/location（可用中文欄名：日期/時間/標題/地點）')
  }

  return { dateIndex, timeIndex, titleIndex, locationIndex, noteIndex }
}

function parseDirectRows(rows: string[][]): ItineraryItem[] {
  if (rows.length < 2) {
    throw new Error('CSV 內容不足，請確認 Sheet 至少有標題列與一筆資料')
  }

  const headers = rows[0].map(normalizeHeader)
  const indexes = resolveDirectColumnIndexes(headers)

  const items = rows
    .slice(1)
    .map((cols) => {
      const date = cols[indexes.dateIndex]?.trim() ?? ''
      const time = cols[indexes.timeIndex]?.trim() ?? ''
      const title = cols[indexes.titleIndex]?.trim() ?? ''
      const location = cols[indexes.locationIndex]?.trim() ?? ''
      const note = indexes.noteIndex >= 0 ? cols[indexes.noteIndex]?.trim() ?? '' : ''

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

function normalizeDateCell(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null

  const ymdMatch = value.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/)
  if (ymdMatch) {
    const year = ymdMatch[1]
    const month = ymdMatch[2].padStart(2, '0')
    const day = ymdMatch[3].padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const mdMatch = value.match(/^(\d{1,2})[/-](\d{1,2})$/)
  if (mdMatch) {
    const month = mdMatch[1].padStart(2, '0')
    const day = mdMatch[2].padStart(2, '0')
    return `${month}/${day}`
  }

  return value
}

function inferTimeBySection(rowLabel: string, rowIndex: number): string {
  for (const hint of sectionTimeHints) {
    if (hint.pattern.test(rowLabel)) {
      return hint.time
    }
  }

  const safeHour = Math.min(23, 6 + rowIndex)
  return `${String(safeHour).padStart(2, '0')}:00`
}

function parseMatrixRows(rows: string[][]): ItineraryItem[] {
  if (rows.length < 3) return []

  const dateRowIndex = rows.findIndex((row) => normalizeHeader(row[0] ?? '') === 'date')
  if (dateRowIndex < 0) return []

  const dayHeader = rows[0] ?? []
  const dateRow = rows[dateRowIndex]
  const maxColumns = rows.reduce((max, row) => Math.max(max, row.length), 0)

  const activeColumns: number[] = []
  const normalizedDates: Record<number, string> = {}

  for (let column = 1; column < maxColumns; column += 1) {
    const normalizedDate = normalizeDateCell(dateRow[column] ?? '')
    if (!normalizedDate) continue
    activeColumns.push(column)
    normalizedDates[column] = normalizedDate
  }

  if (activeColumns.length === 0) return []

  const ignoredRowLabels = new Set(['date', 'weekday'])
  const items: ItineraryItem[] = []

  for (let rowIndex = dateRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex]
    const rowLabel = (row[0] ?? '').trim()
    const normalizedLabel = normalizeHeader(rowLabel)

    if (!rowLabel || ignoredRowLabels.has(normalizedLabel)) {
      continue
    }

    for (const column of activeColumns) {
      const rawCell = (row[column] ?? '').trim()
      if (!rawCell) continue

      const lines = rawCell
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)

      if (lines.length === 0) continue

      const location = lines[0]
      const dayLabel = (dayHeader[column] ?? '').trim()
      const noteParts: string[] = []

      if (dayLabel) noteParts.push(dayLabel)
      if (lines.length > 1) noteParts.push(lines.slice(1).join(' / '))

      const item: ItineraryItem = {
        date: normalizedDates[column],
        time: inferTimeBySection(rowLabel, rowIndex),
        title: rowLabel,
        location,
      }

      if (noteParts.length > 0) {
        item.note = noteParts.join(' | ')
      }

      items.push(item)
    }
  }

  return items
}

export function toItineraryItems(csvText: string): ItineraryItem[] {
  const rows = parseCsv(csvText)

  try {
    return parseDirectRows(rows)
  } catch (directError) {
    const matrixItems = parseMatrixRows(rows)
    if (matrixItems.length > 0) {
      return matrixItems
    }
    throw directError
  }
}
