import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useBranding } from '../hooks/useBranding'
import Badge from '../components/Badge'
import CallDetailPanel from '../components/CallDetailPanel'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 20

const buildTypeFilters = lx => [
  { value: 'all', label: 'All Calls' },
  { value: 'followup', label: 'Needs Follow-Up' },
  { value: 'trial', label: lx.bookingTab },
  { value: 'message', label: 'Messages' },
  { value: 'question', label: 'Questions' },
  { value: 'cancellation', label: 'Cancellations' },
  { value: 'pause_hold', label: 'Pauses/Holds' },
  { value: 'misc', label: 'Other Activity' },
  { value: 'spam', label: 'Spam' },
  { value: 'deleted', label: 'Deleted Calls' },
]

const BADGE_LABELS = {
  trial: 'Booked',
  followup: 'Follow Up',
  message: 'Message',
  question: 'Question',
  cancellation: 'Cancellation',
  pause_hold: 'Pause/Hold',
  misc: 'Other',
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

function categorizeCall(call) {
  if (call.deleted_at) return 'deleted'
  if (call.is_spam) return 'spam'
  if (isPauseOrHold(call)) return 'pause_hold'

  const outcome = normalizeChoice(call.final_outcome)
  if (outcome === 'spam') return 'spam'
  if (outcome === 'message') return 'message'
  if (outcome === 'info_only') return 'question'
  if (outcome === 'cancelled' || outcome === 'canceled') return 'cancellation'
  if (outcome === 'booked' || outcome === 'book' || outcome === 'rescheduled') return 'trial'
  if (outcome === 'abandoned') return 'misc'

  const callType = String(call.call_type || '').toLowerCase()
  const hasTrialDay = !isBlankValue(call.trial_day)
  if (callType.includes('cancel')) return 'cancellation'
  if (call.is_lead || hasTrialDay) return 'trial'
  if (callType.includes('question') || callType.includes('inquiry')) return 'question'
  if (callType.includes('message') || callType.includes('voicemail')) return 'message'
  return 'misc'
}

function isOpenFollowUp(call) {
  const category = categorizeCall(call)
  return !call.deleted_at && !call.handled && (call.needs_follow_up || category === 'trial')
}

export default function Calls() {
  const { clientData, isAdmin } = useAuth()
  const location = useLocation()
  const branding = useBranding()
  const typeFilters = buildTypeFilters(branding.lexicon)
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [selectedCall, setSelectedCall] = useState(null)

  // Filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [programFilter, setProgramFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const clientId = clientData?.id

  useEffect(() => {
    fetchCalls()
  }, [clientId, isAdmin, dateFrom, dateTo, programFilter])

  // If navigated from dashboard with a specific call
  useEffect(() => {
    if (location.state?.callId && calls.length) {
      const found = calls.find(c => c.id === location.state.callId)
      if (found) setSelectedCall(found)
    }
  }, [location.state, calls])

  function buildCallsQuery(table) {
    let query = supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000)

    if (clientId && !isAdmin) {
      query = query.eq('client_id', clientId)
    }

    if (dateFrom) query = query.gte('call_date', dateFrom)
    if (dateTo) query = query.lte('call_date', dateTo)

    if (programFilter) query = query.ilike('program', `%${programFilter}%`)

    return query
  }

  async function fetchCalls() {
    setLoading(true)
    // Prefer the member-match view; if it hasn't been created yet, fall back to
    // the base calls table so the page works regardless of migration/deploy order.
    let { data, error } = await buildCallsQuery('calls_with_member')
    if (error) {
      ({ data } = await buildCallsQuery('calls'))
    }
    setCalls(data || [])
    setLoading(false)
  }

  async function saveCallNote(callId, note) {
    const staffNote = note.trim() || null
    const { error } = await supabase.from('calls').update({ staff_note: staffNote }).eq('id', callId)
    if (error) {
      window.alert('Could not save this note yet. The staff_note column may need to be added in Supabase.')
      return false
    }
    setCalls(prev => prev.map(call => call.id === callId ? { ...call, staff_note: staffNote } : call))
    setSelectedCall(prev => prev && prev.id === callId ? { ...prev, staff_note: staffNote } : prev)
    return true
  }

  function getOutcomeBadge(call) {
    const category = categorizeCall(call)
    return BADGE_LABELS[category] || 'Other'
  }

  const filteredCalls = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()
    return calls.filter(call => {
      const category = categorizeCall(call)
      const matchesDeletedState = typeFilter === 'deleted' ? category === 'deleted' : category !== 'deleted'
      const matchesType =
        typeFilter === 'all'
          ? matchesDeletedState
          : typeFilter === 'followup'
            ? isOpenFollowUp(call)
            : category === typeFilter
      const matchesSearch = !normalizedSearch ||
        (call.display_name || call.caller_name || '').toLowerCase().includes(normalizedSearch) ||
        (call.caller_phone || '').includes(normalizedSearch)

      return matchesType && matchesSearch
    })
  }, [calls, searchQuery, typeFilter])

  const totalPages = Math.ceil(filteredCalls.length / PAGE_SIZE)
  const displayCalls = filteredCalls.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)', color: '#1e293b' }}>Call History</h1>
        <p className="text-sm mt-1" style={{ color: '#64748b' }}>{filteredCalls.length} matching calls</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(0) }}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(0) }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(0) }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setPage(0) }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {typeFilters.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Calls table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : displayCalls.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No calls found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500">Caller</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Phone</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Program</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayCalls.map(call => (
                  <tr
                    key={call.id}
                    onClick={() => setSelectedCall(call)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <span>{call.display_name || call.caller_name || 'Unknown'}</span>
                        {call.is_member && <Badge text="Member" />}
                        {call.is_former_member && <Badge text="Inactive Member" />}
                        {call.is_prospect && <Badge text="Lead" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{call.caller_phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{call.call_date ? new Date(call.call_date + 'T00:00:00').toLocaleDateString('en-US') : '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{call.program || '—'}</td>
                    <td className="px-4 py-3"><Badge text={getOutcomeBadge(call)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredCalls.length)} of {filteredCalls.length}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedCall && (
        <CallDetailPanel call={selectedCall} onClose={() => setSelectedCall(null)} onSaveNote={saveCallNote} />
      )}
    </div>
  )
}
