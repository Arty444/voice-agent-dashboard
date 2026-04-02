const variants = {
  booked: 'bg-green-100 text-green-700',
  inquiry: 'bg-blue-100 text-blue-700',
  spam: 'bg-red-100 text-red-700',
  converted: 'bg-purple-100 text-purple-700',
  'showed up': 'bg-emerald-100 text-emerald-700',
  'no show': 'bg-gray-100 text-gray-600',
  positive: 'bg-green-100 text-green-700',
  neutral: 'bg-gray-100 text-gray-600',
  negative: 'bg-red-100 text-red-700',
  default: 'bg-gray-100 text-gray-600',
}

export default function Badge({ text }) {
  if (!text) return null
  const key = text.toLowerCase()
  const classes = variants[key] || variants.default

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      {text}
    </span>
  )
}
