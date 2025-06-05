import { motion } from 'framer-motion'

export interface ItineraryItem {
  date: string
  time: string
  title: string
  location: string
  note?: string
}

export default function Timeline({ items }: { items: ItineraryItem[] }) {
  return (
    <div className="space-y-4 p-4">
      {items.map((item, idx) => (
        <motion.div
          key={idx}
          layout
          className="border rounded-lg p-4 shadow-md bg-white text-gray-900"
        >
          <div className="text-sm text-gray-500">{item.date} {item.time}</div>
          <div className="font-semibold">{item.title}</div>
          {item.location && <div className="text-sm">{item.location}</div>}
          {item.note && <div className="text-sm text-gray-600">{item.note}</div>}
        </motion.div>
      ))}
    </div>
  )
}
