import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import MetricCard from '../components/MetricCard'
import Badge from '../components/Badge'
import { Phone, Users, ShieldX, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { format, subDays, startOfWeek, endOfWeek, parseISO } from 'date-fns'

export default function Dashboard() {
  const { clientData, isAdmin } = useAuth()
  const navigate = useNavigate()
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
      .order('created_at', { ascending: false })

    if (clientId && !isAdmin) {
      query = query.eq('client_id', clientId)
    }

    const { data } = await query
    setCalls(data || [])
    setLoading(false)
  }

  // Compute metrics
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

  const thisWeekCalls = calls.filter(c => {
    if (!c.call_date) return false
    const d = parseISO(c.call_date)
    return d >= weekStart && d <= weekEnd
  })

  const totalCallsThisWeek = thisWeekCalls.length
  const leadsThisWeek = thisWeekCalls.filter(c => c.is_lead).length
  const spamThisWeek = thisWeekCalls.filter(c => c.is_spam).length
  const nonSpamThisWeek = thisWeekCalls.filter(c => !c.is_spam).length
  const conversionRate = nonSpamThisWeek > 0
    ? Math.round((leadsThisWeek / nonSpamThisWeek) * 100)
    : 0

  // Chart data — last 30 days
  const chartData = []
  for (let i = 29; i >= 0; i--) {
    const date = subDays(now, i)
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayLabel = format(date, 'MMM d')
    const dayCalls = calls.filter(c => c.call_date === dateStr)
    chartData.push({
      date: dayLabel,
      leads: dayCalls.filter(c => c.is_lead).length,
      other: dayCalls.filter(c => !c.is_lead).length,
    })
  }

  // Recent 5 calls
  const recentCalls = calls.slice(0, 5)

  // Quick stats
  const thisMonthCalls = calls.filter(c => {
    if (!c.call_date) return false
    const d = parseISO(c.call_date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  function mostCommon(arr, field) {
    const counts = {}
    arr.forEach(item => {
      const val = item[field]
      if (val) counts[val] = (counts[val] || 0) + 1
    })
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    return sorted[0]?.[0] || '—'
  }

  const topProgram = mostCommon(thisMonthCalls.filter(c => !c.is_spam), 'program')
  const topTrialDay = mostCommon(thisMonthCalls.filter(c => c.is_lead), 'trial_day')
  const topTrialTime = mostCommon(thisMonthCalls.filter(c => c.is_lead), 'trial_time')

  function getOutcomeBadge(call) {
    if (call.is_spam) return 'Spam'
    if (call.is_lead) return 'Booked'
    return 'Inquiry'
  }

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
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">This week at a glance</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Calls This Week" value={totalCallsThisWeek} icon={Phone} color="blue" />
        <MetricCard title="Leads Booked" value={leadsThisWeek} icon={Users} color="green" />
        <MetricCard title="Spam Filtered" value={spamThisWeek} icon={ShieldX} color="red" />
        <MetricCard title="Conversion Rate" value={`${conversionRate}%`} icon={TrendingUp} color="purple" />
      </div>

      {/* Call volume chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Call Volume — Last 30 Days</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={12}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                interval={4}
                axisLine={false}
                tickLine={false}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="leads" stackId="a" fill="#22c55e" name="Leads" radius={[2, 2, 0, 0]} />
              <Bar dataKey="other" stackId="a" fill="#d1d5db" name="Other Calls" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent calls */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Calls</h2>
          <div className="space-y-3">
            {recentCalls.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No calls yet</p>
            ) : (
              recentCalls.map(call => (
                <button
                  key={call.id}
                  onClick={() => navigate('/calls', { state: { callId: call.id } })}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {call.caller_name || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {call.program || '—'} &middot; {call.call_date}
                    </p>
                  </div>
                  <Badge text={getOutcomeBadge(call)} />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Stats</h2>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Top Program</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{topProgram}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Popular Trial Day</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{topTrialDay}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Popular Trial Time</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{topTrialTime}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
