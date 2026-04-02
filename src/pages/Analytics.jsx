import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { format, subWeeks, startOfWeek, parseISO, getDay, getHours } from 'date-fns'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function Analytics() {
  const { clientData, isAdmin } = useAuth()
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)

  const clientId = clientData?.id

  useEffect(() => {
    if (!clientId && !isAdmin) return
    fetchCalls()
  }, [clientId, isAdmin])

  async function fetchCalls() {
    let query = supabase
      .from('calls')
      .select('*')
      .order('call_date', { ascending: true })

    if (clientId && !isAdmin) {
      query = query.eq('client_id', clientId)
    }

    const { data } = await query
    setCalls(data || [])
    setLoading(false)
  }

  // ---- Weekly trends (last 12 weeks) ----
  const now = new Date()
  const weeklyData = []
  for (let i = 11; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 })
    const weekEnd = startOfWeek(subWeeks(now, i - 1), { weekStartsOn: 1 })
    const label = format(weekStart, 'MMM d')

    const weekCalls = calls.filter(c => {
      if (!c.call_date) return false
      const d = parseISO(c.call_date)
      return d >= weekStart && d < weekEnd
    })

    const nonSpam = weekCalls.filter(c => !c.is_spam)
    const leads = weekCalls.filter(c => c.is_lead)
    const rate = nonSpam.length > 0 ? Math.round((leads.length / nonSpam.length) * 100) : 0

    weeklyData.push({
      week: label,
      calls: weekCalls.length,
      leads: leads.length,
      conversionRate: rate,
    })
  }

  // ---- Calls by program (donut) ----
  const programCounts = {}
  calls.filter(c => !c.is_spam && c.program).forEach(c => {
    programCounts[c.program] = (programCounts[c.program] || 0) + 1
  })
  const programData = Object.entries(programCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // ---- Calls by day of week ----
  const dayOfWeekCounts = Array(7).fill(0)
  calls.forEach(c => {
    if (c.call_date) {
      const day = getDay(parseISO(c.call_date))
      dayOfWeekCounts[day]++
    }
  })
  const dayOfWeekData = DAYS.map((name, i) => ({ day: name, calls: dayOfWeekCounts[i] }))

  // ---- Heatmap: hours vs days ----
  const heatmapData = []
  const heatCounts = {}
  calls.forEach(c => {
    if (c.call_date && c.call_time) {
      const day = getDay(parseISO(c.call_date))
      const hour = parseInt(c.call_time.split(':')[0], 10)
      const key = `${day}-${hour}`
      heatCounts[key] = (heatCounts[key] || 0) + 1
    }
  })

  // ---- Sentiment over time ----
  const sentimentWeekly = weeklyData.map((w, i) => {
    const weekStart = startOfWeek(subWeeks(now, 11 - i), { weekStartsOn: 1 })
    const weekEnd = startOfWeek(subWeeks(now, 10 - i), { weekStartsOn: 1 })

    const weekCalls = calls.filter(c => {
      if (!c.call_date) return false
      const d = parseISO(c.call_date)
      return d >= weekStart && d < weekEnd
    })

    return {
      week: w.week,
      positive: weekCalls.filter(c => c.sentiment?.toLowerCase() === 'positive').length,
      neutral: weekCalls.filter(c => c.sentiment?.toLowerCase() === 'neutral').length,
      negative: weekCalls.filter(c => c.sentiment?.toLowerCase() === 'negative').length,
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Trends and insights over time</p>
      </div>

      {/* Calls per week + Leads per week */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Calls Per Week</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <XAxis dataKey="week" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="calls" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Leads Per Week</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <XAxis dataKey="week" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="leads" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Conversion rate + Programs donut */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Conversion Rate Trend</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <XAxis dataKey="week" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis unit="%" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={v => `${v}%`} />
                <Line type="monotone" dataKey="conversionRate" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Calls by Program</h2>
          <div className="h-56">
            {programData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={programData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {programData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Day of week + Sentiment */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Calls by Day of Week</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayOfWeekData} barSize={28}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="calls" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Sentiment Over Time</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sentimentWeekly} barSize={12}>
                <XAxis dataKey="week" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="positive" stackId="a" fill="#22c55e" name="Positive" />
                <Bar dataKey="neutral" stackId="a" fill="#fbbf24" name="Neutral" />
                <Bar dataKey="negative" stackId="a" fill="#ef4444" name="Negative" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Heatmap — simplified as a table */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Calls by Time of Day</h2>
        <div className="overflow-x-auto">
          <table className="text-xs w-full">
            <thead>
              <tr>
                <th className="p-1 text-gray-500 text-left w-12">Hour</th>
                {DAYS.map(d => (
                  <th key={d} className="p-1 text-gray-500 text-center">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 14 }, (_, i) => i + 7).map(hour => (
                <tr key={hour}>
                  <td className="p-1 text-gray-500">
                    {hour > 12 ? `${hour - 12}pm` : hour === 12 ? '12pm' : `${hour}am`}
                  </td>
                  {Array.from({ length: 7 }, (_, dayIdx) => {
                    const count = heatCounts[`${dayIdx}-${hour}`] || 0
                    const intensity = count === 0 ? 'bg-gray-50'
                      : count <= 2 ? 'bg-blue-100'
                      : count <= 5 ? 'bg-blue-300'
                      : 'bg-blue-500 text-white'
                    return (
                      <td key={dayIdx} className={`p-1 text-center rounded ${intensity}`}>
                        {count || ''}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
