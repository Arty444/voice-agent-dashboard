import { useEffect, useState, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import CallDetailPanel from '../components/CallDetailPanel'
import { useBranding } from '../hooks/useBranding'
import { hexTint } from '../lib/colorTint'
import {
  Phone, CalendarCheck, MessageSquare, AlertCircle,
  Pin, PinOff, CheckCircle2, Circle, Search, ChevronRight
} from 'lucide-react'
import { format, isToday, isYesterday, parseISO, subDays } from 'date-fns'

// Animate a stat toward its target (ease-out); honors prefers-reduced-motion.
function useCountUp(target, duration = 700) {
  const [value, setValue] = useState(target)
  const fromRef = useRef(0)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      fromRef.current = target
      setValue(target)
      return
    }
    const from = fromRef.current
    const start = performance.now()
    let raf
    const tick = now => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(from + (target - from) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

// Tiny 7-day trend line for a stat card; pure SVG, brand-colored.
function Sparkline({ points, color }) {
  if (!points || points.length < 2 || points.every(v => v === 0)) return null
  const w = 64, h = 24, max = Math.max(...points, 1)
  const step = w / (points.length - 1)
  const coords = points.map((v, i) => `${(i * step).toFixed(1)},${(h - 2 - (v / max) * (h - 6)).toFixed(1)}`)
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      <circle cx={coords[coords.length - 1].split(',')[0]} cy={coords[coords.length - 1].split(',')[1]} r="2.5" fill={color} />
    </svg>
  )
}

// Tab + badge labels depend on the tenant's vocabulary (a chiropractic office
// captures "Appointment Requests", not "Trial Classes"), so they are built from
// the branding lexicon rather than hardcoded.
const buildTabs = lx => [
  { key: 'all', label: 'All Calls' },
  { key: 'followup', label: 'Needs Follow-Up' },
  { key: 'trial', label: lx.bookingTab },
  { key: 'message', label: 'Messages' },
  { key: 'question', label: 'Questions' },
  { key: 'cancellation', label: 'Cancellations' },
  { key: 'misc', label: 'Other Activity' },
  { key: 'spam', label: 'Spam' },
  { key: 'deleted', label: 'Deleted Calls' },
]

const CALLS_PER_PAGE = 15

const CATEGORY_STYLES = {
  trial: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  followup: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  message: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  question: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  misc: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
  cancellation: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  spam: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  deleted: { bg: 'bg-zinc-50', text: 'text-zinc-600', border: 'border-zinc-200' },
}

const buildCategoryLabels = lx => ({
  trial: lx.bookingBadge,
  followup: 'Follow Up',
  message: 'Message',
  question: 'Question',
  misc: 'Other',
  cancellation: 'Cancel',
  spam: 'Spam',
  deleted: 'Deleted',
})

function isBlankValue(value) {
  if (value === null || value === undefined) return true
  return ['', 'n/a', 'na', 'none', 'null'].includes(String(value).trim().toLowerCase())
}

function normalizeChoice(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
}

function categorizeCall(call) {
  if (call.is_spam) return 'spam'
  const outcome = normalizeChoice(call.final_outcome)
  if (outcome === 'spam') return 'spam'
  if (outcome === 'message') return 'message'
  if (outcome === 'info_only') return 'question'
  if (outcome === 'cancelled' || outcome === 'canceled') return 'cancellation'
  if (outcome === 'booked' || outcome === 'book' || outcome === 'rescheduled') return 'trial'
  if (outcome === 'abandoned') return 'misc'
  if (call.category && call.category !== 'misc') return call.category
  const ct = (call.call_type || '').toLowerCase()
  const hasTrialDay = call.trial_day && call.trial_day.length > 0 && !['n/a', 'na', 'none'].includes(call.trial_day.toLowerCase())
  if (ct.includes('cancel')) return 'cancellation'
  if (call.is_lead || hasTrialDay) return 'trial'
  if (ct.includes('question') || ct.includes('inquiry')) return 'question'
  if (ct.includes('message') || ct.includes('voicemail')) return 'message'
  return 'misc'
}

function getTrialLine(call, lx) {
  if (isBlankValue(call.trial_day)) return null
  const program = call.program || lx.programFallback
  // bookingNoun is empty for tenants whose program names already read as a
  // noun ("New Patient Visit"), so it drops out rather than doubling up.
  const label = [lx.bookingVerb, program, lx.bookingNoun].filter(Boolean).join(' ')
  try {
    const d = parseISO(call.trial_day)
    const dateStr = format(d, 'EEEE, MMMM do, yyyy')
    const time = call.trial_time || ''
    return `${label} — ${dateStr}${time ? ' at ' + time : ''}`
  } catch {
    const time = call.trial_time || ''
    return `${label} — ${call.trial_day}${time ? ' at ' + time : ''}`
  }
}

function getSummaryLine(call, lx) {
  if (call.summary) {
    const clean = call.summary.replace(/^call_summary\s*/i, '').trim()
    return clean.length > 150 ? clean.slice(0, 150) + '...' : clean
  }
  const cat = categorizeCall(call)
  if (cat === 'trial') return lx.bookingFallbackSummary
  if (cat === 'message') return 'Left a message — wants a callback'
  if (cat === 'question') return lx.questionFallbackSummary
  return 'General inquiry'
}

function getCallerName(call) {
  // Prefer the member/address-book resolved name from the calls_with_member view.
  if (!isBlankValue(call.display_name)) return call.display_name
  return isBlankValue(call.caller_name) ? 'Unknown Caller' : call.caller_name
}

function getProgramName(call) {
  return isBlankValue(call.program) ? null : call.program
}

function getActionLine(call, lx) {
  if (call.needs_follow_up) {
    return isBlankValue(call.follow_up_reason) ? 'Staff follow-up requested' : call.follow_up_reason
  }

  const trialLine = getTrialLine(call, lx)
  if (trialLine) return trialLine

  return getSummaryLine(call, lx)
}

function getCallTimeLabel(call) {
  if (!call.call_time) return ''
  try {
    return format(parseISO(`${call.call_date}T${call.call_time}`), 'h:mm a')
  } catch {
    return ''
  }
}

function needsStaffFollowUp(call) {
  return !call.handled && (call.needs_follow_up || call._category === 'trial')
}

function timeAgo(dateStr, timeStr) {
  if (!dateStr) return ''
  try {
    const dt = timeStr ? parseISO(dateStr + 'T' + timeStr) : parseISO(dateStr)
    if (isToday(dt)) return 'Today'
    if (isYesterday(dt)) return 'Yesterday'
    return format(dt, 'MMM d')
  } catch {
    return dateStr
  }
}

function formatDuration(seconds) {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function Dashboard() {
  const { clientData, isAdmin } = useAuth()
  const branding = useBranding()
  const lexicon = branding.lexicon
  const tabs = buildTabs(lexicon)
  const categoryLabels = buildCategoryLabels(lexicon)
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [selectedCall, setSelectedCall] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [dayRange, setDayRange] = useState(7)
  const [currentPage, setCurrentPage] = useState(1)

  const clientId = clientData?.id

  useEffect(() => {
    if (!clientId && !isAdmin) return
    fetchCalls()
  }, [clientId, isAdmin, dayRange])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery, dayRange])

  async function fetchCalls() {
    const buildQuery = (table) => {
      let q = supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false })
      if (dayRange !== 'all') {
        const cutoff = subDays(new Date(), dayRange).toISOString().split('T')[0]
        q = q.gte('call_date', cutoff)
      }
      if (clientId && !isAdmin) q = q.eq('client_id', clientId)
      return q
    }

    // Prefer the member-match view; fall back to base calls if it's not present.
    let { data, error } = await buildQuery('calls_with_member')
    if (error) {
      ({ data } = await buildQuery('calls'))
    }
    setCalls(data || [])
    setLoading(false)
  }

  async function togglePin(callId, currentPinned) {
    const newPinned = !currentPinned
    await supabase.from('calls').update({ pinned: newPinned }).eq('id', callId)
    setCalls(prev => prev.map(c => c.id === callId ? { ...c, pinned: newPinned } : c))
  }

  async function toggleHandled(callId, currentHandled) {
    const newHandled = !currentHandled
    await supabase.from('calls').update({ handled: newHandled }).eq('id', callId)
    setCalls(prev => prev.map(c => c.id === callId ? { ...c, handled: newHandled } : c))
  }

  async function deleteCall(callId) {
    const deletedAt = new Date().toISOString()
    const { error } = await supabase.from('calls').update({ deleted_at: deletedAt, handled: true }).eq('id', callId)
    if (error) {
      window.alert('Could not delete this call yet. The deleted_at column may need to be added in Supabase.')
      return
    }
    setCalls(prev => prev.map(c => c.id === callId ? { ...c, deleted_at: deletedAt, handled: true } : c))
    setSelectedCall(null)
    setActiveTab('deleted')
  }

  async function undeleteCall(callId) {
    const { error } = await supabase.from('calls').update({ deleted_at: null, handled: false }).eq('id', callId)
    if (error) {
      window.alert('Could not undelete this call. Please try again.')
      return
    }
    setCalls(prev => prev.map(c => c.id === callId ? { ...c, deleted_at: null, handled: false } : c))
    setSelectedCall(prev => prev ? { ...prev, deleted_at: null, handled: false } : null)
    setActiveTab('all')
  }

  async function saveCallNote(callId, note) {
    const staffNote = note.trim() || null
    const { error } = await supabase.from('calls').update({ staff_note: staffNote }).eq('id', callId)
    if (error) {
      window.alert('Could not save this note yet. The staff_note column may need to be added in Supabase.')
      return false
    }
    setCalls(prev => prev.map(c => c.id === callId ? { ...c, staff_note: staffNote } : c))
    setSelectedCall(prev => prev && prev.id === callId ? { ...prev, staff_note: staffNote } : prev)
    return true
  }

  async function markAsRead(call) {
    if (!call.read_at) {
      await supabase.from('calls').update({ read_at: new Date().toISOString() }).eq('id', call.id)
      setCalls(prev => prev.map(c => c.id === call.id ? { ...c, read_at: new Date().toISOString() } : c))
    }
    setSelectedCall(call)
  }

  const enrichedCalls = useMemo(() => {
    return calls.map(c => ({ ...c, _category: categorizeCall(c) }))
  }, [calls])

  const activeCalls = useMemo(() => {
    return enrichedCalls.filter(c => !c.deleted_at)
  }, [enrichedCalls])

  const deletedCalls = useMemo(() => {
    return enrichedCalls.filter(c => c.deleted_at)
  }, [enrichedCalls])

  const filteredByTab = useMemo(() => {
    if (activeTab === 'deleted') return deletedCalls
    if (activeTab === 'all') return activeCalls
    if (activeTab === 'followup') return activeCalls.filter(needsStaffFollowUp)
    return activeCalls.filter(c => c._category === activeTab)
  }, [activeCalls, deletedCalls, activeTab])

  const filteredCalls = useMemo(() => {
    if (!searchQuery.trim()) return filteredByTab
    const q = searchQuery.toLowerCase()
    return filteredByTab.filter(c =>
      (c.display_name || c.caller_name || '').toLowerCase().includes(q) ||
      (c.caller_phone || '').includes(q) ||
      (c.summary || '').toLowerCase().includes(q) ||
      (c.program || '').toLowerCase().includes(q)
    )
  }, [filteredByTab, searchQuery])

  const sortedCalls = useMemo(() => {
    return [...filteredCalls].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      // Handled calls sink below unhandled ones on every tab, including All
      // Calls. The webhook never marks a fresh call handled, so the live feed
      // still shows what just ended at the top — sinking only what staff have
      // already cleared.
      if (!a.handled && b.handled) return -1
      if (a.handled && !b.handled) return 1
      // Follow-up priority ranking stays off the All Calls tab so fresh
      // hang-ups are never buried behind older unhandled trials.
      if (activeTab !== 'all') {
        if (needsStaffFollowUp(a) && !needsStaffFollowUp(b)) return -1
        if (!needsStaffFollowUp(a) && needsStaffFollowUp(b)) return 1
      }
      return new Date(b.created_at) - new Date(a.created_at)
    })
  }, [filteredCalls, activeTab])

  const totalPages = Math.max(1, Math.ceil(sortedCalls.length / CALLS_PER_PAGE))
  const paginatedCalls = useMemo(() => {
    const start = (currentPage - 1) * CALLS_PER_PAGE
    return sortedCalls.slice(start, start + CALLS_PER_PAGE)
  }, [sortedCalls, currentPage])

  useEffect(() => {
    setCurrentPage(page => Math.min(page, totalPages))
  }, [totalPages])

  const unreadCounts = useMemo(() => {
    const counts = { all: 0, followup: 0, trial: 0, message: 0, question: 0, misc: 0, cancellation: 0, spam: 0, deleted: 0 }
    activeCalls.forEach(c => {
      if (!c.read_at) {
        counts[c._category] = (counts[c._category] || 0) + 1
        if (needsStaffFollowUp(c)) counts.followup += 1
        counts.all += 1
      }
    })
    return counts
  }, [activeCalls])

  const categoryCounts = useMemo(() => {
    const counts = { all: 0, followup: 0, trial: 0, message: 0, question: 0, misc: 0, cancellation: 0, spam: 0, deleted: 0 }
    activeCalls.forEach(c => {
      if (c.handled) return
      counts[c._category] = (counts[c._category] || 0) + 1
      if (needsStaffFollowUp(c)) counts.followup += 1
      counts.all += 1
    })
    counts.deleted = deletedCalls.length
    return counts
  }, [activeCalls, deletedCalls])

  const totalCalls = enrichedCalls.length
  const trialsScheduled = categoryCounts.trial
  const followUps = categoryCounts.followup
  const messages = categoryCounts.message

  const totalCallsShown = useCountUp(totalCalls)
  const trialsScheduledShown = useCountUp(trialsScheduled)
  const followUpsShown = useCountUp(followUps)
  const messagesShown = useCountUp(messages)

  // Daily counts for the last 7 days — the stat-card sparklines.
  const sparkSeries = useMemo(() => {
    const days = [...Array(7)].map((_, i) => format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'))
    const count = pred => days.map(d => activeCalls.filter(c => c.call_date === d && pred(c)).length)
    return {
      total: count(() => true),
      trial: count(c => c._category === 'trial'),
      followup: count(c => needsStaffFollowUp(c)),
      message: count(c => c._category === 'message'),
    }
  }, [activeCalls])

  // Live feed: refetch (and flash the new row) the moment a call lands.
  const [flashId, setFlashId] = useState(null)
  const [liveReady, setLiveReady] = useState(false)
  useEffect(() => {
    const opts = { event: 'INSERT', schema: 'public', table: 'calls' }
    if (clientId && !isAdmin) opts.filter = `client_id=eq.${clientId}`
    const ch = supabase
      .channel('calls-live')
      .on('postgres_changes', opts, payload => {
        setFlashId(payload.new?.id ?? null)
        fetchCalls()
        setTimeout(() => setFlashId(null), 3000)
      })
      .subscribe(status => setLiveReady(status === 'SUBSCRIBED'))
    return () => { supabase.removeChannel(ch) }
  }, [clientId, isAdmin, dayRange])

  // Sliding underline for the category tabs.
  const tabRefs = useRef({})
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0 })
  useEffect(() => {
    const el = tabRefs.current[activeTab]
    if (el) setTabIndicator({ left: el.offsetLeft, width: el.offsetWidth })
  }, [activeTab, categoryCounts, loading])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 rounded-full" style={{ borderWidth: 4, borderColor: branding.colors.primary, borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div
      className="space-y-6 rounded-2xl"
      style={{
        fontFamily: "'Poppins', sans-serif",
        // Soft brand wash behind the header, fading into the page surface.
        backgroundImage: `radial-gradient(120% 220px at 20% 0%, ${hexTint(branding.colors.primary, 0.07)}, rgba(255,255,255,0) 70%)`,
      }}
    >
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1
            className="font-bold leading-tight"
            style={{
              fontFamily: "'Khand', sans-serif",
              color: branding.colors.text,
              fontSize: 'clamp(1.5rem, 6vw, 1.75rem)',
              letterSpacing: '0.01em',
            }}
          >
            {branding.name} {branding.terminology.dashboard}
          </h1>
          <p className="text-sm mt-0.5 flex items-center gap-2" style={{ color: branding.colors.textSecondary }}>
            {branding.terminology.subtitle} — {dayRange === 'all' ? 'All time' : `Last ${dayRange} days`}
            {liveReady && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: branding.colors.accent }}>
                <span className="live-dot" style={{ backgroundColor: branding.colors.accent }} />
                Live
              </span>
            )}
          </p>
        </div>
        <div
          className="flex shrink-0 self-start overflow-hidden rounded-lg border sm:self-auto"
          style={{ borderColor: branding.colors.border }}
        >
          {[
            { value: 3, label: '3 Days' },
            { value: 7, label: '7 Days' },
            { value: 'all', label: 'All' },
          ].map(({ value, label }) => (
            <button
              key={label}
              onClick={() => setDayRange(value)}
              className="min-h-11 whitespace-nowrap px-5 py-2 text-sm font-medium transition-colors"
              style={{
                backgroundColor: dayRange === value ? branding.colors.primary : branding.colors.card,
                color: dayRange === value ? '#ffffff' : branding.colors.textSecondary,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: branding.terminology.totalCalls, value: totalCallsShown, Icon: Phone, color: branding.colors.primary, delay: '0ms', spark: sparkSeries.total },
          { label: branding.terminology.trialsBooked, value: trialsScheduledShown, Icon: CalendarCheck, color: branding.colors.accent, delay: '60ms', spark: sparkSeries.trial },
          { label: 'Needs Follow-Up', value: followUpsShown, Icon: AlertCircle, color: '#e11d48', delay: '120ms', spark: sparkSeries.followup },
          { label: 'Messages', value: messagesShown, Icon: MessageSquare, color: '#d97706', delay: '180ms', spark: sparkSeries.message },
        ].map(({ label, value, Icon, color, delay, spark }) => (
          <div
            key={label}
            className="anim-rise card-3d relative overflow-hidden rounded-xl border px-5 py-4"
            style={{
              animationDelay: delay,
              '--card-glow': hexTint(color, 0.45),
              backgroundColor: branding.colors.card,
              backgroundImage: `linear-gradient(160deg, rgba(255,255,255,0) 55%, ${hexTint(color, 0.06)})`,
              borderColor: branding.colors.border,
            }}
          >
            {/* Watermark icon — depth layer behind the number */}
            <Icon size={76} className="pointer-events-none absolute -bottom-4 -right-3" style={{ color, opacity: 0.07 }} />
            <div className="flex items-center gap-3">
              <div
                className="chip-3d rounded-lg p-2.5"
                style={{
                  '--chip-glow': hexTint(color, 0.5),
                  backgroundImage: `linear-gradient(135deg, ${hexTint(color, 0.22)}, ${hexTint(color, 0.08)})`,
                }}
              >
                <Icon size={20} style={{ color }} />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: branding.colors.textSecondary }}>{label}</p>
                <p className="text-3xl font-bold" style={{ fontFamily: "'Khand', sans-serif", color: branding.colors.text }}>{value}</p>
              </div>
              <div className="relative ml-auto hidden sm:block">
                <Sparkline points={spark} color={color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Activity feed */}
      <div className="surface-3d rounded-xl border overflow-hidden" style={{ backgroundColor: branding.colors.card, borderColor: branding.colors.border }}>
        {/* Tabs */}
        <div className="relative flex overflow-x-auto border-b" style={{ borderColor: branding.colors.border, WebkitOverflowScrolling: 'touch' }}>
          {/* Sliding active-tab underline */}
          <div
            className="pointer-events-none absolute bottom-0 h-0.5 rounded-full transition-all duration-300 ease-out"
            style={{ left: tabIndicator.left, width: tabIndicator.width, backgroundColor: branding.colors.primary }}
          />
          {tabs.map(tab => {
            const isActive = activeTab === tab.key
            const count = categoryCounts[tab.key] || 0
            return (
              <button
                key={tab.key}
                ref={el => { tabRefs.current[tab.key] = el }}
                onClick={() => setActiveTab(tab.key)}
                className="flex min-h-12 items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors active:scale-95"
                style={{
                  color: isActive ? branding.colors.primary : branding.colors.textSecondary,
                }}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: isActive ? branding.colors.primary : '#e2e8f0',
                      color: isActive ? '#ffffff' : branding.colors.textSecondary,
                    }}
                  >
                    {count}
                  </span>
                )}
                {count === 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs" style={{ color: '#94a3b8' }}>
                    0
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b" style={{ borderColor: '#f1f5f9' }}>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by name, phone, or program..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="min-h-11 w-full rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2"
              style={{
                backgroundColor: branding.colors.surface,
                border: `1px solid ${branding.colors.border}`,
                color: branding.colors.text,
              }}
            />
          </div>
        </div>

        {/* Activity rows */}
        <div className="divide-y" style={{ borderColor: '#f1f5f9' }}>
          {sortedCalls.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm" style={{ color: '#94a3b8' }}>No activity in this category</p>
            </div>
          ) : (
            paginatedCalls.map((call, rowIndex) => {
              const cat = call._category
              const rowCat = activeTab === 'deleted' ? 'deleted' : call.needs_follow_up && !call.handled ? 'followup' : cat
              const style = CATEGORY_STYLES[rowCat] || CATEGORY_STYLES.misc
              const isUnread = !call.read_at
              const isHandled = call.handled
              const isPinned = call.pinned
              const callerName = getCallerName(call)
              const programName = getProgramName(call)
              const actionLine = getActionLine(call, lexicon)
              const callTimeLabel = getCallTimeLabel(call)

              return (
                <div
                  key={call.id}
                  className={`anim-rise flex min-h-[76px] cursor-pointer items-start gap-3 px-4 py-4 transition-all duration-200 hover:bg-slate-50 ${
                    isHandled ? 'opacity-50' : ''
                  } ${call.id === flashId ? 'row-new' : ''}`}
                  style={{
                    animationDelay: `${Math.min(rowIndex, 8) * 45}ms`,
                    backgroundColor: isUnread ? 'rgba(24, 103, 192, 0.03)' : 'transparent',
                  }}
                  onClick={() => markAsRead(call)}
                >
                  {/* Handled checkbox */}
                  <button
                    onClick={e => { e.stopPropagation(); toggleHandled(call.id, call.handled) }}
                    className="-ml-2 -mt-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg transition-colors"
                    style={{ color: isHandled ? branding.colors.accent : '#cbd5e1' }}
                    title={isHandled ? 'Mark as unhandled' : 'Mark as handled'}
                  >
                    {isHandled ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </button>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    {/* Row 1: Name — Program — Category */}
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: branding.colors.primary }} />
                      )}
                      <span className={`text-sm ${isUnread ? 'font-bold' : 'font-semibold'}`} style={{ color: branding.colors.text }}>
                        {callerName}
                      </span>
                      {call.is_member && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-indigo-100 text-indigo-700 flex-shrink-0">
                          Member
                        </span>
                      )}
                      {call.is_former_member && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-slate-100 text-slate-600 flex-shrink-0">
                          Inactive Member
                        </span>
                      )}
                      {call.is_prospect && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 flex-shrink-0">
                          Lead
                        </span>
                      )}
                      {programName && (
                        <span className="text-[11px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                          {programName}
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${style.bg} ${style.text} ${style.border} border flex-shrink-0`}>
                        {categoryLabels[rowCat]}
                      </span>
                      {isPinned && (
                        <Pin size={12} className="text-amber-500 flex-shrink-0" />
                      )}
                    </div>

                    {/* Row 2: Staff action line */}
                    <p className="text-sm mb-1 leading-snug" style={{ color: rowCat === 'followup' ? '#be123c' : branding.colors.textSecondary, fontWeight: rowCat === 'trial' || rowCat === 'followup' ? 600 : 500 }}>
                      {actionLine}
                    </p>

                    {/* Row 3: Bold phone number — When they called */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                      <span className="text-sm font-bold" style={{ color: branding.colors.text }}>
                        {call.caller_phone || 'No phone number'}
                      </span>
                      {callTimeLabel && (
                        <span className="text-xs" style={{ color: '#64748b' }}>
                          {callTimeLabel}
                        </span>
                      )}
                      <span className="text-xs" style={{ color: '#94a3b8' }}>
                        {timeAgo(call.call_date, call.call_time)}
                      </span>
                    </div>
                  </div>

                  {/* Right actions */}
                  <div className="flex items-center gap-1 flex-shrink-0 mt-1">
                    <button
                      onClick={e => { e.stopPropagation(); togglePin(call.id, call.pinned) }}
                      className="flex h-11 w-11 items-center justify-center rounded-lg transition-colors"
                      style={{ color: isPinned ? '#f59e0b' : '#cbd5e1' }}
                      title={isPinned ? 'Unpin' : 'Pin to top'}
                    >
                      {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
                    </button>
                    <ChevronRight size={16} style={{ color: '#cbd5e1' }} />
                  </div>
                </div>
              )
            })
          )}
        </div>

        {sortedCalls.length > CALLS_PER_PAGE && (
          <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: '#f1f5f9' }}>
            <p className="text-xs font-medium" style={{ color: branding.colors.textSecondary }}>
              Showing {(currentPage - 1) * CALLS_PER_PAGE + 1}-{Math.min(currentPage * CALLS_PER_PAGE, sortedCalls.length)} of {sortedCalls.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="min-h-11 rounded-md border px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                style={{ borderColor: branding.colors.border, color: branding.colors.textSecondary }}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, index) => {
                const page = index + 1
                const isActive = page === currentPage
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className="flex h-11 min-w-11 items-center justify-center rounded-md border px-2 text-xs font-semibold"
                    style={{
                      backgroundColor: isActive ? branding.colors.primary : branding.colors.card,
                      borderColor: isActive ? branding.colors.primary : branding.colors.border,
                      color: isActive ? '#ffffff' : branding.colors.textSecondary,
                    }}
                  >
                    {page}
                  </button>
                )
              })}
              <button
                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="min-h-11 rounded-md border px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                style={{ borderColor: branding.colors.border, color: branding.colors.textSecondary }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Call detail panel */}
      {selectedCall && (
        <CallDetailPanel
          call={selectedCall}
          onClose={() => setSelectedCall(null)}
          onToggleHandled={(id, current) => {
            toggleHandled(id, current)
            setSelectedCall(prev => prev ? { ...prev, handled: !current } : null)
          }}
          onTogglePin={(id, current) => {
            togglePin(id, current)
            setSelectedCall(prev => prev ? { ...prev, pinned: !current } : null)
          }}
          onDelete={deleteCall}
          onUndelete={undeleteCall}
          onSaveNote={saveCallNote}
        />
      )}
    </div>
  )
}
