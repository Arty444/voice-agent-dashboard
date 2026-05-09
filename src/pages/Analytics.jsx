import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import branding from '../config/clientBranding'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import {
  AlertCircle, CalendarCheck, CheckCircle2, CirclePause, Clock, MessageSquare,
  Phone, Target, TrendingUp, Users
} from 'lucide-react'
import {
  differenceInCalendarDays, format, getDay, parseISO, startOfDay, subDays
} from 'date-fns'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const PROGRAM_COLORS = ['#1867C0', '#48A9A6', '#f59e0b', '#ef4444', '#8b5cf6']
const RANGE_OPTIONS = [
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
]

function normalizeChoice(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
}

function isBlankValue(value) {
  if (value === null || value === undefined) return true
  return ['', 'n/a', 'na', 'none', 'null'].includes(String(value).trim().toLowerCase())
}

function normalizeProgramName(value) {
  if (isBlankValue(value)) return 'Unknown Program'

  const raw = String(value).trim()
  const normalized = raw.toLowerCase()

  if (normalized.includes(';') || normalized.includes(',')) return 'Multiple Programs'
  if (normalized.includes('adult')) return 'Adult Jiu Jitsu'
  if (normalized.includes('tiny shark')) return 'Tiny Sharks'
  if (normalized.includes('little shark')) return 'Little Sharks'
  if (normalized.includes('junior shark') || normalized.includes('jr shark')) return 'Junior Sharks'
  if (normalized === 'multiple') return 'Multiple Programs'

  return raw
}

function getCategory(call) {
  if (call.deleted_at) return 'deleted'
  if (call.is_spam) return 'spam'
  const outcome = normalizeChoice(call.final_outcome)
  if (outcome === 'spam') return 'spam'
  if (outcome === 'message') return 'message'
  if (outcome === 'info_only') return 'question'
  if (outcome === 'cancelled' || outcome === 'canceled') return 'cancellation'
  if (outcome === 'booked' || outcome === 'book' || outcome === 'rescheduled') return 'trial'
  if (outcome === 'abandoned') return 'other'

  const callType = String(call.call_type || '').toLowerCase()
  const hasTrialDay = !isBlankValue(call.trial_day)
  if (callType.includes('cancel')) return 'cancellation'
  if (call.is_lead || hasTrialDay) return 'trial'
  if (callType.includes('question') || callType.includes('inquiry')) return 'question'
  if (callType.includes('message') || callType.includes('voicemail')) return 'message'
  return 'other'
}

function isTrial(call) {
  return getCategory(call) === 'trial'
}

function isOpenFollowUp(call) {
  return !call.deleted_at && !call.handled && (call.needs_follow_up || isTrial(call))
}

function isPauseOrHold(call) {
  const text = [
    call.final_outcome,
    call.call_type,
    call.follow_up_reason,
    call.summary,
    call.transcript,
  ].filter(Boolean).join(' ').toLowerCase()

  return /\b(pause|paused|hold|freeze|frozen|suspend|suspended)\b/.test(text)
}

function getCallHour(call) {
  if (call.call_time) {
    const hour = Number.parseInt(String(call.call_time).split(':')[0], 10)
    if (Number.isFinite(hour)) return hour
  }

  if (call.created_at) {
    const createdAt = new Date(call.created_at)
    if (!Number.isNaN(createdAt.getTime())) return createdAt.getHours()
  }

  return null
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '0%'
  return `${Math.round(value)}%`
}

function formatMinutes(seconds) {
  if (!seconds) return '0m'
  const minutes = Math.round(seconds / 60)
  return `${minutes}m`
}

function metricDelta(current, previous) {
  if (previous === 0 && current > 0) return 'New activity'
  if (previous === 0) return 'No prior activity'
  const change = ((current - previous) / previous) * 100
  const sign = change > 0 ? '+' : ''
  return `${sign}${Math.round(change)}% vs prior period`
}

function StatCard({ icon: Icon, label, value, detail, tone = 'blue' }) {
  const tones = {
    blue: ['rgba(24, 103, 192, 0.08)', branding.colors.primary],
    teal: ['rgba(72, 169, 166, 0.1)', branding.colors.accent],
    amber: ['#fffbeb', '#d97706'],
    rose: ['#fff1f2', '#e11d48'],
    slate: ['#f8fafc', '#475569'],
  }
  const [bg, color] = tones[tone] || tones.blue

  return (
    <div className="rounded-lg border px-5 py-4" style={{ backgroundColor: branding.colors.card, borderColor: branding.colors.border }}>
      <div className="flex items-start gap-3">
        <div className="rounded-lg p-2.5" style={{ backgroundColor: bg }}>
          <Icon size={20} style={{ color }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold" style={{ color: branding.colors.textSecondary }}>{label}</p>
          <p className="mt-1 text-3xl font-bold" style={{ fontFamily: "'Khand', sans-serif", color: branding.colors.text }}>{value}</p>
          {detail && <p className="mt-1 text-xs" style={{ color: branding.colors.textSecondary }}>{detail}</p>}
        </div>
      </div>
    </div>
  )
}

function EmptyChart() {
  return <div className="flex h-full items-center justify-center text-sm text-slate-400">No call data yet</div>
}

export default function Analytics() {
  const { clientData, isAdmin } = useAuth()
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [rangeDays, setRangeDays] = useState(7)

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

  const analytics = useMemo(() => {
    const today = startOfDay(new Date())
    const currentStart = subDays(today, rangeDays - 1)
    const priorStart = subDays(currentStart, rangeDays)

    const withMeta = calls.map(call => ({
      ...call,
      _category: getCategory(call),
      _date: call.call_date ? parseISO(call.call_date) : null,
    }))

    const active = withMeta.filter(call => !call.deleted_at)
    const current = active.filter(call => call._date && call._date >= currentStart && call._date <= today)
    const previous = active.filter(call => call._date && call._date >= priorStart && call._date < currentStart)
    const nonSpam = current.filter(call => call._category !== 'spam')
    const trials = current.filter(isTrial)
    const openFollowUps = current.filter(isOpenFollowUp)
    const messages = current.filter(call => call._category === 'message')
    const questions = current.filter(call => call._category === 'question')
    const cancellations = current.filter(call => call._category === 'cancellation')
    const pausesOrHolds = current.filter(isPauseOrHold)
    const handled = current.filter(call => call.handled)
    const avgDuration = current.length
      ? current.reduce((sum, call) => sum + (call.duration_seconds || 0), 0) / current.length
      : 0

    const priorTrials = previous.filter(isTrial)
    const trialRate = nonSpam.length ? (trials.length / nonSpam.length) * 100 : 0
    const handledRate = current.length ? (handled.length / current.length) * 100 : 0

    const dailyMap = new Map()
    for (let i = rangeDays - 1; i >= 0; i--) {
      const date = subDays(today, i)
      const key = format(date, 'yyyy-MM-dd')
      dailyMap.set(key, {
        date: key,
        label: rangeDays <= 7 ? format(date, 'EEE') : format(date, 'MMM d'),
        calls: 0,
        trials: 0,
        followUps: 0,
      })
    }
    current.forEach(call => {
      if (!call.call_date || !dailyMap.has(call.call_date)) return
      const day = dailyMap.get(call.call_date)
      day.calls += 1
      if (isTrial(call)) day.trials += 1
      if (isOpenFollowUp(call)) day.followUps += 1
    })

    const categoryData = [
      { name: 'Trials', value: trials.length, fill: '#22c55e' },
      { name: 'Messages', value: messages.length, fill: '#f59e0b' },
      { name: 'Questions', value: questions.length, fill: '#38bdf8' },
      { name: 'Cancellations', value: cancellations.length, fill: '#f97316' },
      { name: 'Other', value: current.filter(call => call._category === 'other').length, fill: '#94a3b8' },
      { name: 'Spam', value: current.filter(call => call._category === 'spam').length, fill: '#ef4444' },
    ].filter(item => item.value > 0)

    const programCounts = {}
    trials.forEach(call => {
      const program = normalizeProgramName(call.program)
      programCounts[program] = (programCounts[program] || 0) + 1
    })
    const programData = Object.entries(programCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    const dayCounts = Array(7).fill(0)
    const trialDayCounts = Array(7).fill(0)
    current.forEach(call => {
      if (!call._date) return
      const day = getDay(call._date)
      dayCounts[day] += 1
      if (isTrial(call)) trialDayCounts[day] += 1
    })
    const dayData = DAYS.map((day, index) => ({
      day,
      calls: dayCounts[index],
      trials: trialDayCounts[index],
    }))

    const hourBuckets = [
      { label: 'Morning', range: '5 AM - 11 AM', start: 5, end: 11, calls: 0, trials: 0 },
      { label: 'Midday', range: '11 AM - 3 PM', start: 11, end: 15, calls: 0, trials: 0 },
      { label: 'Afternoon', range: '3 PM - 6 PM', start: 15, end: 18, calls: 0, trials: 0 },
      { label: 'Evening', range: '6 PM - 11 PM', start: 18, end: 23, calls: 0, trials: 0 },
    ]
    current.forEach(call => {
      const hour = getCallHour(call)
      if (hour === null) return
      const bucket = hourBuckets.find(item => hour >= item.start && hour < item.end)
      if (!bucket) return
      bucket.calls += 1
      if (isTrial(call)) bucket.trials += 1
    })

    const staleFollowUps = openFollowUps.filter(call => {
      if (!call._date) return false
      return differenceInCalendarDays(today, call._date) >= 2
    })

    const insights = [
      {
        title: 'Open Work',
        body: openFollowUps.length
          ? `${openFollowUps.length} calls need staff follow-up. ${staleFollowUps.length} have been waiting 2+ days.`
          : 'No open follow-up work in this period.',
        tone: openFollowUps.length ? 'rose' : 'teal',
      },
      {
        title: 'Trial Demand',
        body: trials.length
          ? `${trials.length} trials booked from ${nonSpam.length} real calls. Booking rate is ${formatPercent(trialRate)}.`
          : 'No trials booked in this period yet.',
        tone: trials.length ? 'teal' : 'amber',
      },
      {
        title: 'Cancellation Calls',
        body: cancellations.length
          ? `${cancellations.length} calls mentioned cancelling. Review them to see if staff should follow up.`
          : 'No cancellation calls in this period.',
        tone: cancellations.length ? 'amber' : 'slate',
      },
    ]

    return {
      totalCalls: current.length,
      priorCalls: previous.length,
      nonSpam: nonSpam.length,
      trials: trials.length,
      priorTrials: priorTrials.length,
      trialRate,
      openFollowUps: openFollowUps.length,
      messages: messages.length,
      questions: questions.length,
      cancellations: cancellations.length,
      pausesOrHolds: pausesOrHolds.length,
      handledRate,
      avgDuration,
      dailyData: Array.from(dailyMap.values()),
      categoryData,
      programData,
      dayData,
      hourBuckets,
      insights,
    }
  }, [calls, rangeDays])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full" style={{ borderWidth: 4, borderColor: branding.colors.primary, borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Khand', sans-serif", color: branding.colors.text, fontSize: '1.75rem', letterSpacing: '0.01em' }}>
            Owner Analytics
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: branding.colors.textSecondary }}>
            How the phone agent is affecting trials, staff follow-up, and member experience.
          </p>
        </div>
        <div className="flex overflow-hidden rounded-lg border" style={{ borderColor: branding.colors.border }}>
          {RANGE_OPTIONS.map(option => (
            <button
              key={option.days}
              onClick={() => setRangeDays(option.days)}
              className="px-3 py-1.5 text-sm font-semibold transition-colors"
              style={{
                backgroundColor: rangeDays === option.days ? branding.colors.primary : branding.colors.card,
                color: rangeDays === option.days ? '#ffffff' : branding.colors.textSecondary,
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          icon={Phone}
          label="Real Calls"
          value={analytics.nonSpam}
          detail={`${analytics.totalCalls} total including spam`}
        />
        <StatCard
          icon={CalendarCheck}
          label="Trials Scheduled"
          value={analytics.trials}
          detail={metricDelta(analytics.trials, analytics.priorTrials)}
          tone="teal"
        />
        <StatCard
          icon={Target}
          label="Booking Rate"
          value={formatPercent(analytics.trialRate)}
          detail="Trials divided by non-spam calls"
          tone="amber"
        />
        <StatCard
          icon={AlertCircle}
          label="Open Follow-Up"
          value={analytics.openFollowUps}
          detail={`${formatPercent(analytics.handledRate)} handled this period`}
          tone={analytics.openFollowUps ? 'rose' : 'teal'}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {analytics.insights.map(insight => (
          <div key={insight.title} className="rounded-lg border p-4" style={{ backgroundColor: branding.colors.card, borderColor: branding.colors.border }}>
            <p className="text-sm font-bold" style={{ color: branding.colors.text }}>{insight.title}</p>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: branding.colors.textSecondary }}>{insight.body}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-lg border p-5 xl:col-span-2" style={{ backgroundColor: branding.colors.card, borderColor: branding.colors.border }}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold" style={{ color: branding.colors.text }}>Call Volume and Trial Bookings</h2>
              <p className="text-xs" style={{ color: branding.colors.textSecondary }}>Daily trend for the selected period</p>
            </div>
            <TrendingUp size={18} style={{ color: branding.colors.primary }} />
          </div>
          <div className="h-72">
            {analytics.dailyData.some(day => day.calls > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.dailyData} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="calls" name="Calls" stroke={branding.colors.primary} strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="trials" name="Trials" stroke={branding.colors.accent} strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="followUps" name="Open Follow-Up" stroke="#e11d48" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </div>

        <div className="rounded-lg border p-5" style={{ backgroundColor: branding.colors.card, borderColor: branding.colors.border }}>
          <h2 className="text-base font-bold" style={{ color: branding.colors.text }}>Call Outcomes</h2>
          <p className="mb-4 text-xs" style={{ color: branding.colors.textSecondary }}>What callers needed from the front desk</p>
          <div className="h-72">
            {analytics.categoryData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics.categoryData} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={55} outerRadius={88} paddingAngle={2}>
                    {analytics.categoryData.map(item => <Cell key={item.name} fill={item.fill} />)}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border p-5" style={{ backgroundColor: branding.colors.card, borderColor: branding.colors.border }}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold" style={{ color: branding.colors.text }}>Program Demand</h2>
              <p className="text-xs" style={{ color: branding.colors.textSecondary }}>Which programs are generating trials</p>
            </div>
            <Users size={18} style={{ color: branding.colors.accent }} />
          </div>
          <div className="h-64">
            {analytics.programData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.programData} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 70 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={96} />
                  <Tooltip />
                  <Bar dataKey="value" name="Trials" radius={[0, 6, 6, 0]}>
                    {analytics.programData.map((_, index) => <Cell key={index} fill={PROGRAM_COLORS[index % PROGRAM_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </div>

        <div className="rounded-lg border p-5" style={{ backgroundColor: branding.colors.card, borderColor: branding.colors.border }}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold" style={{ color: branding.colors.text }}>Best Days for Trial Interest</h2>
              <p className="text-xs" style={{ color: branding.colors.textSecondary }}>Use this to spot staffing and ad timing patterns</p>
            </div>
            <Clock size={18} style={{ color: branding.colors.primary }} />
          </div>
          <div className="h-64">
            {analytics.dayData.some(day => day.calls > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.dayData} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="calls" name="Calls" fill={branding.colors.primary} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="trials" name="Trials" fill={branding.colors.accent} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-lg border p-5 xl:col-span-2" style={{ backgroundColor: branding.colors.card, borderColor: branding.colors.border }}>
          <h2 className="text-base font-bold" style={{ color: branding.colors.text }}>Calls by Time of Day</h2>
          <p className="mb-4 text-xs" style={{ color: branding.colors.textSecondary }}>When prospects and members tend to reach out</p>
          <div className="grid gap-3 sm:grid-cols-4">
            {analytics.hourBuckets.map(bucket => (
              <div key={bucket.label} className="rounded-lg border p-4" style={{ borderColor: branding.colors.border, backgroundColor: branding.colors.surface }}>
                <p className="text-sm font-bold" style={{ color: branding.colors.text }}>{bucket.label}</p>
                <p className="mt-0.5 text-xs" style={{ color: branding.colors.textSecondary }}>{bucket.range}</p>
                <p className="mt-2 text-2xl font-bold" style={{ fontFamily: "'Khand', sans-serif", color: branding.colors.text }}>{bucket.calls}</p>
                <p className="text-xs" style={{ color: branding.colors.textSecondary }}>{bucket.trials} trials booked</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border p-5" style={{ backgroundColor: branding.colors.card, borderColor: branding.colors.border }}>
          <h2 className="text-base font-bold" style={{ color: branding.colors.text }}>Service Mix</h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2" style={{ color: branding.colors.textSecondary }}><CalendarCheck size={15} /> Trials Booked</span>
              <strong style={{ color: branding.colors.text }}>{analytics.trials}</strong>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2" style={{ color: branding.colors.textSecondary }}><MessageSquare size={15} /> Messages</span>
              <strong style={{ color: branding.colors.text }}>{analytics.messages}</strong>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2" style={{ color: branding.colors.textSecondary }}><Phone size={15} /> Questions</span>
              <strong style={{ color: branding.colors.text }}>{analytics.questions}</strong>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2" style={{ color: branding.colors.textSecondary }}><AlertCircle size={15} /> Cancellations</span>
              <strong style={{ color: branding.colors.text }}>{analytics.cancellations}</strong>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2" style={{ color: branding.colors.textSecondary }}><CirclePause size={15} /> Pauses/Holds</span>
              <strong style={{ color: branding.colors.text }}>{analytics.pausesOrHolds}</strong>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2" style={{ color: branding.colors.textSecondary }}><CheckCircle2 size={15} /> Handled Rate</span>
              <strong style={{ color: branding.colors.text }}>{formatPercent(analytics.handledRate)}</strong>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2" style={{ color: branding.colors.textSecondary }}><Clock size={15} /> Avg Call Length</span>
              <strong style={{ color: branding.colors.text }}>{formatMinutes(analytics.avgDuration)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
