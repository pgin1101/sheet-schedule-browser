import { render, screen } from '@testing-library/react'
import Timeline from './Timeline'
import type { ItineraryItem } from './Timeline'
import { describe, it, expect } from 'vitest'

const items: ItineraryItem[] = [
  { date: '2025-07-15', time: '09:30', title: 'Flight', location: 'JFK' }
]

describe('Timeline', () => {
  it('renders titles', () => {
    render(<Timeline items={items} />)
    expect(screen.getByText('Flight')).toBeDefined()
  })
})
