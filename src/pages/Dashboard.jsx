import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import CallDetailPanel from '../components/CallDetailPanel'
import branding from '../config/clientBranding'
import {
  Phone, CalendarCheck, MessageSquare, AlertCircle,
  Pin, PinOff, CheckCircle2, Circle, Search, ChevronRight
} from 'lucide-react'
import { formatDistanceToNow, parseISO, subDays, format } from 'date-fns'

const TABS = [
  { key: 'all', label: 'All Calls' },
  { key: 'followup', label: 'Needs Follow-Up' },
  { key: 'trial', label: branding.tabs.trial },
  { key: 'message', label: branding.tabs.message },
  { key: 'question', label: branding.tabs.question },
  { key: 'cancellation', label: branding.tabs.cancellation },
  { key: 'misc', label: branding.tabs.misc },
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

const CATEGORY_LABELS = {
  trial: 'Trial',
  followup: 'Follow Up',
  message: 'Message',
  question: 'Question',
  misc: 'Other',
  cancellation: 'Cancel',
  spam: 'Spam',
  deleted: 'Deleted',
}

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

function getTrialLine(call) {
  if (isBlankValue(call.trial_day)) return null
  const program = call.program || 'Class'
  try {
    const d = parseISO(call.trial_day)
    const dateStr = format(d, 'EEEE, MMMM do, yyyy')
    const time = call.trial_time || ''
    return `Scheduled ${program} trial — ${dateStr}${time ? ' at ' + time : ''}`
  } catch {
    const time = call.trial_time || ''
    return `Scheduled ${program} trial — ${call.trial_day}${time ? ' at ' + time : ''}`
  }
}

function getSummaryLine(call) {
  if (call.summary) {
    const clean = call.summary.replace(/^call_summary\s*/i, '').trim()
    return clean.length > 150 ? clean.slice(0, 150) + '...' : clean
  }
  const cat = categorizeCall(call)
  if (cat === 'trial') return 'Trial class inquiry'
  if (cat === 'message') return 'Left a message — wants a callback'
  if (cat === 'question') return 'Had questions about classes'
  return 'General inquiry'
}

function getCallerName(call) {
  return isBlankValue(call.caller_name) ? 'Unknown Caller' : call.caller_name
}

function getProgramName(call) {
  return isBlankValue(call.program) ? null : call.program
}

function getActionLine(call) {
  if (call.needs_follow_up) {
    return isBlankValue(call.follow_up_reason) ? 'Staff follow-up requested' : call.follow_up_reason
  }

  const trialLine = getTrialLine(call)
  if (trialLine) return trialLine

  return getSummaryLine(call)
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
    const now = new Date()
    const diff = now - dt
    const hours = diff / (1000 * 60 * 60)
    if (hours < 24) return 'Today'
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
    const cutoff = subDays(new Date(), dayRange).toISOString().split('T')[0]
    let query = supabase
      .from('calls')
      .select('*')
      .gte('call_date', cutoff)
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
      (c.caller_name || '').toLowerCase().includes(q) ||
      (c.caller_phone || '').includes(q) ||
      (c.summary || '').toLowerCase().includes(q) ||
      (c.program || '').toLowerCase().includes(q)
    )
  }, [filteredByTab, searchQuery])

  const sortedCalls = useMemo(() => {
    return [...filteredCalls].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      if (needsStaffFollowUp(a) && !needsStaffFollowUp(b)) return -1
      if (!needsStaffFollowUp(a) && needsStaffFollowUp(b)) return 1
      if (!a.handled && b.handled) return -1
      if (a.handled && !b.handled) return 1
      return new Date(b.created_at) - new Date(a.created_at)
    })
  }, [filteredCalls])

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
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Khand', sans-serif", color: branding.colors.text, fontSize: '1.75rem', letterSpacing: '0.01em' }}>
            {branding.name} {branding.terminology.dashboard}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: branding.colors.textSecondary }}>
            {branding.terminology.subtitle} — Last {dayRange} days
          </p>
        </div>
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: branding.colors.border }}>
          <button
            onClick={() => setDayRange(3)}
            className="px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              backgroundColor: dayRange === 3 ? branding.colors.primary : branding.colors.card,
              color: dayRange === 3 ? '#ffffff' : branding.colors.textSecondary,
            }}
          >
            3 Days
          </button>
          <button
            onClick={() => setDayRange(7)}
            className="px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              backgroundColor: dayRange === 7 ? branding.colors.primary : branding.colors.card,
              color: dayRange === 7 ? '#ffffff' : branding.colors.textSecondary,
            }}
          >
            7 Days
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {/* Inquiries Captured */}
        <div className="rounded-lg border px-5 py-4" style={{ backgroundColor: branding.colors.card, borderColor: branding.colors.border }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'rgba(24, 103, 192, 0.08)' }}>
              <Phone size={20} style={{ color: branding.colors.primary }} />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: branding.colors.textSecondary }}>{branding.terminology.totalCalls}</p>
              <p className="text-3xl font-bold" style={{ fontFamily: "'Khand', sans-serif", color: branding.colors.text }}>{totalCalls}</p>
            </div>
          </div>
        </div>

        {/* Trials Scheduled */}
        <div className="rounded-lg border px-5 py-4" style={{ backgroundColor: branding.colors.card, borderColor: branding.colors.border }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'rgba(72, 169, 166, 0.1)' }}>
              <CalendarCheck size={20} style={{ color: branding.colors.accent }} />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: branding.colors.textSecondary }}>{branding.terminology.trialsBooked}</p>
              <p className="text-3xl font-bold" style={{ fontFamily: "'Khand', sans-serif", color: branding.colors.text }}>{trialsScheduled}</p>
            </div>
          </div>
        </div>

        {/* Follow-Ups */}
        <div className="rounded-lg border px-5 py-4" style={{ backgroundColor: branding.colors.card, borderColor: branding.colors.border }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-50">
              <AlertCircle size={20} className="text-rose-600" />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: branding.colors.textSecondary }}>Needs Follow-Up</p>
              <p className="text-3xl font-bold" style={{ fontFamily: "'Khand', sans-serif", color: branding.colors.text }}>{followUps}</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="rounded-lg border px-5 py-4" style={{ backgroundColor: branding.colors.card, borderColor: branding.colors.border }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-50">
              <MessageSquare size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: branding.colors.textSecondary }}>Messages</p>
              <p className="text-3xl font-bold" style={{ fontFamily: "'Khand', sans-serif", color: branding.colors.text }}>{messages}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity feed */}
      <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: branding.colors.card, borderColor: branding.colors.border }}>
        {/* Tabs */}
        <div className="flex border-b overflow-x-auto" style={{ borderColor: branding.colors.border }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key
            const count = categoryCounts[tab.key] || 0
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
              placeholder="Search by name, phone, or program..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg focus:outline-none focus:ring-2"
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
            paginatedCalls.map(call => {
              const cat = call._category
              const rowCat = activeTab === 'deleted' ? 'deleted' : call.needs_follow_up && !call.handled ? 'followup' : cat
              const style = CATEGORY_STYLES[rowCat] || CATEGORY_STYLES.misc
              const isUnread = !call.read_at
              const isHandled = call.handled
              const isPinned = call.pinned
              const callerName = getCallerName(call)
              const programName = getProgramName(call)
              const actionLine = getActionLine(call)
              const callTimeLabel = getCallTimeLabel(call)

              return (
                <div
                  key={call.id}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-slate-50 ${
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
                    {/* Row 1: Name — Program — Category */}
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: branding.colors.primary }} />
                      )}
                      <span className={`text-sm ${isUnread ? 'font-bold' : 'font-semibold'}`} style={{ color: branding.colors.text }}>
                        {callerName}
                      </span>
                      {programName && (
                        <span className="text-[11px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                          {programName}
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${style.bg} ${style.text} ${style.border} border flex-shrink-0`}>
                        {CATEGORY_LABELS[rowCat]}
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

        {sortedCalls.length > CALLS_PER_PAGE && (
          <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: '#f1f5f9' }}>
            <p className="text-xs font-medium" style={{ color: branding.colors.textSecondary }}>
              Showing {(currentPage - 1) * CALLS_PER_PAGE + 1}-{Math.min(currentPage * CALLS_PER_PAGE, sortedCalls.length)} of {sortedCalls.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="rounded-md border px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
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
                    className="flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-semibold"
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
                className="rounded-md border px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
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
        />
      )}
    </div>
  )
}
