import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import CallDetailPanel from '../components/CallDetailPanel'
import { Phone, CalendarCheck, Pin, PinOff, CheckCircle2, Circle, Search, ChevronRight } from 'lucide-react'
import { formatDistanceToNow, parseISO, subDays, isAfter } from 'date-fns'

const TABS = [
  { key: 'all', label: 'All Calls' },
  { key: 'trial', label: 'Trial Classes', color: 'green' },
  { key: 'message', label: 'Messages', color: 'amber' },
  { key: 'question', label: 'Questions', color: 'blue' },
  { key: 'misc', label: 'Miscellaneous', color: 'gray' },
]

const CATEGORY_STYLES = {
  trial: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
  message: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  question: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  misc: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400' },
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
    return `Booked ${program} trial — ${call.trial_day}${time ? ' at ' + time : ''}`
  }
  if (call.summary) {
    const clean = call.summary.replace(/^call_summary\s*/i, '').trim()
    return clean.length > 120 ? clean.slice(0, 120) + '...' : clean
  }
  if (cat === 'trial') return 'Trial class booking'
  if (cat === 'message') return 'Left a message — wants a callback'
  if (cat === 'question') return 'Had questions about classes'
  return 'General inquiry'
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

  // Add category to each call
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
      (c.summary || '').toLowerCase().includes(q)
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

  // Stats
  const totalCalls = enrichedCalls.length
  const trialsBooked = enrichedCalls.filter(c => c._category === 'trial').length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Inbox</h1>
        <p className="text-sm text-gray-500 mt-1">Last 3 days</p>
      </div>

      {/* Stats bar */}
      <div className="flex gap-4">
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-3 flex-1">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
            <Phone size={20} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Calls</p>
            <p className="text-2xl font-semibold text-gray-900">{totalCalls}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-3 flex-1">
          <div className="p-2.5 rounded-lg bg-green-50 text-green-600">
            <CalendarCheck size={20} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Trials Booked</p>
            <p className="text-2xl font-semibold text-gray-900">{trialsBooked}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {TABS.map(tab => {
            const isActive = activeTab === tab.key
            const count = unreadCounts[tab.key] || 0
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {count}
                  </span>
                )}
                {count === 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs text-gray-400">
                    0
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Search bar */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, phone, or keyword..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Call list */}
        <div className="divide-y divide-gray-100">
          {sortedCalls.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-400">No calls in this category</p>
            </div>
          ) : (
            sortedCalls.map(call => {
              const cat = call._category
              const style = CATEGORY_STYLES[cat] || CATEGORY_STYLES.misc
              const isUnread = !call.read_at
              const isHandled = call.handled
              const isPinned = call.pinned
              const summaryLine = getCallSummaryLine(call)

              return (
                <div
                  key={call.id}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                    isUnread ? 'bg-blue-50/40' : ''
                  } ${isHandled ? 'opacity-60' : ''}`}
                  onClick={() => markAsRead(call)}
                >
                  {/* Handled checkbox */}
                  <button
                    onClick={e => { e.stopPropagation(); toggleHandled(call.id, call.handled) }}
                    className="mt-1 flex-shrink-0 text-gray-400 hover:text-green-600 transition-colors"
                    title={isHandled ? 'Mark as unhandled' : 'Mark as handled'}
                  >
                    {isHandled ? (
                      <CheckCircle2 size={20} className="text-green-500" />
                    ) : (
                      <Circle size={20} />
                    )}
                  </button>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {/* Unread dot */}
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                      )}
                      {/* Caller name */}
                      <span className={`text-sm truncate ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {call.caller_name || 'Unknown Caller'}
                      </span>
                      {/* Category pill */}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${style.bg} ${style.text} ${style.border} border flex-shrink-0`}>
                        {cat === 'trial' ? 'Trial' : cat === 'message' ? 'Message' : cat === 'question' ? 'Question' : 'Misc'}
                      </span>
                      {/* Pin icon */}
                      {isPinned && (
                        <Pin size={12} className="text-amber-500 flex-shrink-0" />
                      )}
                    </div>
                    {/* Summary line */}
                    <p className={`text-sm leading-snug ${isUnread ? 'text-gray-800' : 'text-gray-500'}`}>
                      {summaryLine}
                    </p>
                    {/* Meta line */}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>{call.caller_phone || '—'}</span>
                      {call.duration_seconds > 0 && <span>{formatDuration(call.duration_seconds)}</span>}
                      <span>{timeAgo(call.call_date, call.call_time)}</span>
                    </div>
                  </div>

                  {/* Right side actions */}
                  <div className="flex items-center gap-1 flex-shrink-0 mt-1">
                    <button
                      onClick={e => { e.stopPropagation(); togglePin(call.id, call.pinned) }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isPinned
                          ? 'text-amber-500 hover:bg-amber-50'
                          : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'
                      }`}
                      title={isPinned ? 'Unpin' : 'Pin to top'}
                    >
                      {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
                    </button>
                    <ChevronRight size={16} className="text-gray-300" />
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
