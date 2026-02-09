import { describe, expect, it } from 'vitest'
import { parseSheetInput, toItineraryItems } from './sheetParser'

describe('sheetParser', () => {
  it('parses Google Sheet URL to sheet id and gid', () => {
    const parsed = parseSheetInput(
      'https://docs.google.com/spreadsheets/d/1PTA6YysWIE5XVwFPLQGRm8a4h56O017PZV8IwpFVQ34/edit?gid=0#gid=0',
    )

    expect(parsed).toEqual({
      sheetId: '1PTA6YysWIE5XVwFPLQGRm8a4h56O017PZV8IwpFVQ34',
      gid: '0',
    })
  })

  it('parses direct table format', () => {
    const csv = `date,time,title,location,note
2026-02-09,09:00,啟程,台北車站,集合
2026-02-09,12:30,午餐,中山區,便當`

    const items = toItineraryItems(csv)

    expect(items).toHaveLength(2)
    expect(items[0]).toEqual({
      date: '2026-02-09',
      time: '09:00',
      title: '啟程',
      location: '台北車站',
      note: '集合',
    })
  })

  it('parses day-column matrix format', () => {
    const csv = `,,Day 1,Day 2,Day 3
DATE,10/14,10/15,10/16,10/17
WEEKDAY,六,日,一,二
早餐,,,便利商店,咖啡店
上午,,,池袋站搭山手線30min到新宿車站,
午餐,,,壽司郎,烏龍麵
晚上,,回飯店,夜景散步,泡湯`

    const items = toItineraryItems(csv)

    expect(items.length).toBeGreaterThan(0)
    expect(items.some((item) => item.date === '10/16' && item.title === '早餐' && item.location === '便利商店')).toBe(true)
    expect(items.some((item) => item.date === '10/17' && item.title === '午餐' && item.location === '烏龍麵')).toBe(true)
  })
})
