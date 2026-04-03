import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import CallDetailPanel from '../components/CallDetailPanel'
import branding from '../config/clientBranding'
import {
  Phone, CalendarCheck, AlertTriangle, UserX,
  Pin, PinOff, CheckCircle2, Circle, Search, ChevronRight
} from 'lucide-react'
import { formatDistanceToNow, parseISO, subDays, isAfter, isToday, subHours } from 'date-fns'

// Use branding config for tab labels
const TABS = [
  { key: 'all', label: branding.tabs.all },
  { key: 'trial', label: branding.tabs.trial },
  { key: 'message', label: branding.tabs.message },
  { key: 'question', label: branding.tabs.question },
  { key: 'misc', label: branding.tabs.misc },
]

const CATEGORY_STYLES = {
  trial: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  message: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  question: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  misc: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
}

const CATEGORY_LABELS = {
  trial: 'Trial',
  message: 'Message',
  question: 'Question',
  misc: 'Other',
}

function categorizeCall(call) {
  if (call.category && call.category !== 'misc') return call.category
  if (call.is_lead || (call.trial_day && call.trial_day.length > 0)) return 'trial'
  if (call.call_type && (call.call_type.toLowerCase().includes('question') || call.call_type.toLowerCase().includes('inquiry'))) return 'question'
  if (call.call_type && (call.call_type.toLowerCase().includes('message') || call.call_type.toLowerCase().includes('voicemail'))) return 'message'
  if (call.is_lead) return 'trial'
  return 'misc'
}

function getCallSummaryLine(call) {
  const cat = categorizeCall(call)
  if (cat === 'trial' && call.trial_day) {
    const program = call.program || 'Class'
    const time = call.trial_time || ''
    return `Scheduled ${program} trial — ${call.trial_day}${time ? ' at ' + time : ''}`
  }
  if (call.summary) {
    const clean = call.summary.replace(/^call_summary\s*/i, '').trim()
    return clean.length > 120 ? clean.slice(0, 120) + '...' : clean
  }
  if (cat === 'trial') return 'Trial class inquiry'
  if (cat === 'message') return 'Left a message — wants a callback'
  if (cat === 'question') return 'Had questions about classes'
  return 'General inquiry'
}

function getCallStatus(call) {
  const name = call.caller_name
  const phone = call.caller_phone
  const hasMissingInfo = !name || name === 'N/A' || !phone || phone === 'N/A'
  if (hasMissingInfo) return { label: branding.statuses.missingInfo, color: 'text-red-600 bg-red-50 border-red-200' }

  const cat = categorizeCall(call)
  if (cat === 'trial' && call.trial_day) return { label: branding.statuses.confirmed, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' }

  if (!call.handled && call.created_at) {
    const createdAt = parseISO(call.created_at)
    if (isAfter(subHours(new Date(), 24), createdAt)) {
      return { label: branding.statuses.needsFollowUp, color: 'text-amber-700 bg-amber-50 border-amber-200' }
    }
  }

  if (!call.read_at) return { label: branding.statuses.newInquiry, color: 'text-sky-700 bg-sky-50 border-sky-200' }
  return { label: branding.statuses.confirmed, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
}

function timeAgo(dateStr, timeStr) {
  if (!dateStr) return ''
  try {
    const dt = timeStr ? parseISO(dateStr + 'T' + timeStr) : parseISO(dateStr)
    return formatDistanceToNow(dt, { addSuffix: true })
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
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [selectedCall, setSelectedCall] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const clientId = clientData?.id

  useEffect(() => {
    if (!clientId && !isAdmin) return
    fetchCalls()
  }, [clientId, isAdmin])

  async function fetchCalls() {
    const threeDaysAgo = subDays(new Date(), 3).toISOString().split('T')[0]
    let query = supabase
      .from('calls')
      .select('*')
      .gte('call_date', threeDaysAgo)
      .order('created_at', { ascending: false })

    if (clientId && !isAdmin) {
      query = query.eq('client_id', clientId)
    }

    const { data } = await query
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

  async function markAsRead(call) {
    if (!call.read_at) {
      await supabase.from('calls').update({ read_at: new Date().toISOString() }).eq('id', call.id)
      setCalls(prev => prev.map(c => c.id === call.id ? { ...c, read_at: new Date().toISOString() } : c))
    }
    setSelectedCall(call)
  }

  // Enrich calls with category
  const enrichedCalls = useMemo(() => {
    return calls.map(c => ({ ...c, _category: categorizeCall(c) }))
  }, [calls])

  // Filter by tab
  const filteredByTab = useMemo(() => {
    if (activeTab === 'all') return enrichedCalls
    return enrichedCalls.filter(c => c._category === activeTab)
  }, [enrichedCalls, activeTab])

  // Filter by search
  const filteredCalls = useMemo(() => {
    if (!searchQuery.trim()) return filteredByTab
    const q = searchQuery.toLowerCase()
    return filteredByTab.filter(c =>
      (c.caller_name || '').toLowerCase().includes(q) ||
      (c.caller_phone || '').includes(q) ||
      (c.summary || '').toLowerCase().includes(q) ||
      (c.program || '').toLowerCase().includes(q)
    )
  }, [filteredByTab, searchQuery])

  // Sort: pinned first, then unhandled, then by date
  const sortedCalls = useMemo(() => {
    return [...filteredCalls].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      if (!a.handled && b.handled) return -1
      if (a.handled && !b.handled) return 1
      return new Date(b.created_at) - new Date(a.created_at)
    })
  }, [filteredCalls])

  // Unread counts per tab
  const unreadCounts = useMemo(() => {
    const counts = { all: 0, trial: 0, message: 0, question: 0, misc: 0 }
    enrichedCalls.forEach(c => {
      if (!c.read_at) {
        counts[c._category] = (counts[c._category] || 0) + 1
        counts.all += 1
      }
    })
    return counts
  }, [enrichedCalls])

  // Computed stats
  const totalCalls = enrichedCalls.length
  const trialsScheduled = enrichedCalls.filter(c => c._category === 'trial').length

  const followUpsNeeded = useMemo(() => {
    const cutoff = subHours(new Date(), 24)
    return enrichedCalls.filter(c =>
      !c.handled && c.created_at && isAfter(cutoff, parseISO(c.created_at))
    ).length
  }, [enrichedCalls])

  const missingInfoCount = useMemo(() => {
    return enrichedCalls.filter(c => {
      const n = c.caller_name
      const p = c.caller_phone
      return !n || n === 'N/A' || !p || p === 'N/A'
    }).length
  }, [enrichedCalls])

  // Needs Attention items
  const attentionItems = useMemo(() => {
    const items = []
    const today = new Date().toISOString().split('T')[0]

    enrichedCalls.forEach(c => {
      const n = c.caller_name
      const p = c.caller_phone
      if (!n || n === 'N/A' || !p || p === 'N/A') {
        items.push({
          id: c.id,
          call: c,
          type: 'missing',
          label: `Missing ${!n || n === 'N/A' ? 'name' : 'phone'} — ${c.program || 'inquiry'} on ${c.call_date || 'unknown date'}`,
        })
      }
      if (!c.handled && c.created_at && isAfter(subHours(new Date(), 24), parseISO(c.created_at))) {
        items.push({
          id: c.id + '-followup',
          call: c,
          type: 'followup',
          label: `${n || 'Unknown'} — ${c._category === 'trial' ? 'trial inquiry' : 'needs callback'} (${timeAgo(c.call_date, c.call_time)})`,
        })
      }
      if (c.trial_day === today) {
        items.push({
          id: c.id + '-today',
          call: c,
          type: 'today',
          label: `${n || 'Someone'} has a ${c.program || 'class'} trial today at ${c.trial_time || 'TBD'}`,
        })
      }
    })

    return items.slice(0, 6)
  }, [enrichedCalls])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 rounded-full" style={{ borderWidth: 4, borderColor: branding.colors.primary, borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Khand', sans-serif", color: branding.colors.text, fontSize: '1.75rem', letterSpacing: '0.01em' }}>
          {branding.name} {branding.terminology.dashboard}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: branding.colors.textSecondary }}>
          {branding.terminology.subtitle} — Last 3 days
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Inquiries Captured */}
        <div className="rounded-xl border px-4 py-4" style={{ backgroundColor: branding.colors.card, borderColor: branding.colors.border }}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(24, 103, 192, 0.08)' }}>
              <Phone size={18} style={{ color: branding.colors.primary }} />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: branding.colors.textSecondary }}>{branding.terminology.totalCalls}</p>
              <p className="text-2xl font-bold" style={{ fontFamily: "'Khand', sans-serif", color: branding.colors.text }}>{totalCalls}</p>
            </div>
          </div>
        </div>

        {/* Trials Scheduled */}
        <div className="rounded-xl border px-4 py-4" style={{ backgroundColor: branding.colors.card, borderColor: branding.colors.border }}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(72, 169, 166, 0.1)' }}>
              <CalendarCheck size={18} style={{ color: branding.colors.accent }} />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: branding.colors.textSecondary }}>{branding.terminology.trialsBooked}</p>
              <p className="text-2xl font-bold" style={{ fontFamily: "'Khand', sans-serif", color: branding.colors.text }}>{trialsScheduled}</p>
            </div>
          </div>
        </div>

        {/* Follow-Ups Needed */}
        <div className="rounded-xl border px-4 py-4" style={{ backgroundColor: branding.colors.card, borderColor: branding.colors.border }}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg" style={{ backgroundColor: followUpsNeeded > 0 ? 'rgba(213, 36, 44, 0.08)' : 'rgba(100,116,139,0.08)' }}>
              <AlertTriangle size={18} style={{ color: followUpsNeeded > 0 ? branding.colors.alert : branding.colors.textSecondary }} />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: branding.colors.textSecondary }}>{branding.terminology.followUps}</p>
              <p className="text-2xl font-bold" style={{ fontFamily: "'Khand', sans-serif", color: followUpsNeeded > 0 ? branding.colors.alert : branding.colors.text }}>{followUpsNeeded}</p>
            </div>
          </div>
        </div>

        {/* Missing Info */}
        <div className="rounded-xl border px-4 py-4" style={{ backgroundColor: branding.colors.card, borderColor: branding.colors.border }}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg" style={{ backgroundColor: missingInfoCount > 0 ? 'rgba(213, 36, 44, 0.08)' : 'rgba(100,116,139,0.08)' }}>
              <UserX size={18} style={{ color: missingInfoCount > 0 ? branding.colors.alert : branding.colors.textSecondary }} />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: branding.colors.textSecondary }}>{branding.terminology.missingInfo}</p>
              <p className="text-2xl font-bold" style={{ fontFamily: "'Khand', sans-serif", color: missingInfoCount > 0 ? branding.colors.alert : branding.colors.text }}>{missingInfoCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Needs Attention */}
      {attentionItems.length > 0 && (
        <div className="rounded-xl border px-5 py-4" style={{ backgroundColor: '#FFFBF5', borderColor: '#f0dcc0' }}>
          <h2 className="text-sm font-semibold mb-3" style={{ fontFamily: "'Khand', sans-serif", color: branding.colors.text, fontSize: '1rem' }}>
            Today's Priorities
          </h2>
          <div className="space-y-2">
            {attentionItems.map(item => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-white/60"
                onClick={() => markAsRead(item.call)}
              >
                <div className="flex-shrink-0">
                  {item.type === 'missing' && <UserX size={14} style={{ color: branding.colors.alert }} />}
                  {item.type === 'followup' && <AlertTriangle size={14} style={{ color: '#d97706' }} />}
                  {item.type === 'today' && <CalendarCheck size={14} style={{ color: branding.colors.accent }} />}
                </div>
                <p className="text-sm" style={{ color: branding.colors.text }}>{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity feed */}
      <div className="rounded-xl border" style={{ backgroundColor: branding.colors.card, borderColor: branding.colors.border }}>
        {/* Tabs */}
        <div className="flex border-b overflow-x-auto" style={{ borderColor: branding.colors.border }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key
            const count = unreadCounts[tab.key] || 0
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
                style={{
                  borderColor: isActive ? branding.colors.primary : 'transparent',
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
              placeholder="Search by name, phone, program, or keyword..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg focus:outline-none focus:ring-2"
              style={{
                backgroundColor: branding.colors.surface,
                border: `1px solid ${branding.colors.border}`,
                color: branding.colors.text,
                '--tw-ring-color': branding.colors.primary,
              }}
            />
          </div>
        </div>

        {/* Activity rows */}
        <div className="divide-y" style={{ '--tw-divide-opacity': 1, borderColor: '#f1f5f9' }}>
          {sortedCalls.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm" style={{ color: '#94a3b8' }}>No activity in this category</p>
            </div>
          ) : (
            sortedCalls.map(call => {
              const cat = call._category
              const style = CATEGORY_STYLES[cat] || CATEGORY_STYLES.misc
              const isUnread = !call.read_at
              const isHandled = call.handled
              const isPinned = call.pinned
              const summaryLine = getCallSummaryLine(call)
              const status = getCallStatus(call)

              return (
                <div
                  key={call.id}
                  className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-slate-50 ${
                    isHandled ? 'opacity-50' : ''
                  }`}
                  style={{ backgroundColor: isUnread ? 'rgba(24, 103, 192, 0.03)' : 'transparent' }}
                  onClick={() => markAsRead(call)}
                >
                  {/* Handled checkbox */}
                  <button
                    onClick={e => { e.stopPropagation(); toggleHandled(call.id, call.handled) }}
                    className="mt-0.5 flex-shrink-0 transition-colors"
                    style={{ color: isHandled ? branding.colors.accent : '#cbd5e1' }}
                    title={isHandled ? 'Mark as unhandled' : 'Mark as handled'}
                  >
                    {isHandled ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </button>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: branding.colors.primary }} />
                      )}
                      <span className={`text-sm truncate ${isUnread ? 'font-semibold' : 'font-medium'}`} style={{ color: isUnread ? branding.colors.text : '#475569' }}>
                        {call.caller_name || 'Unknown Caller'}
                      </span>
                      {/* Program tag */}
                      {call.program && (
                        <span className="text-[11px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                          {call.program}
                        </span>
                      )}
                      {/* Category pill */}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${style.bg} ${style.text} ${style.border} border flex-shrink-0`}>
                        {CATEGORY_LABELS[cat]}
                      </span>
                      {/* Status badge */}
                      <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border flex-shrink-0 ${status.color}`}>
                        {status.label}
                      </span>
                      {isPinned && (
                        <Pin size={12} className="text-amber-500 flex-shrink-0" />
                      )}
                    </div>
                    {/* Summary */}
                    <p className="text-sm leading-snug" style={{ color: isUnread ? branding.colors.text : branding.colors.textSecondary }}>
                      {summaryLine}
                    </p>
                    {/* Meta */}
                    <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: '#94a3b8' }}>
                      <span>{call.caller_phone || '—'}</span>
                      {call.duration_seconds > 0 && <span>{formatDuration(call.duration_seconds)}</span>}
                      <span>{timeAgo(call.call_date, call.call_time)}</span>
                    </div>
                  </div>

                  {/* Right actions */}
                  <div className="flex items-center gap-1 flex-shrink-0 mt-1">
                    <button
                      onClick={e => { e.stopPropagation(); togglePin(call.id, call.pinned) }}
                      className="p-1.5 rounded-lg transition-colors"
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
        />
      )}
    </div>
  )
}
