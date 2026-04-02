import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Badge from '../components/Badge'
import CallDetailPanel from '../components/CallDetailPanel'
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 20

export default function Calls() {
  const { clientData, isAdmin } = useAuth()
  const location = useLocation()
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [selectedCall, setSelectedCall] = useState(null)

  // Filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [programFilter, setProgramFilter] = useState('')
  const [sentimentFilter, setSentimentFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const clientId = clientData?.id

  useEffect(() => {
    fetchCalls()
  }, [clientId, isAdmin, page, dateFrom, dateTo, typeFilter, programFilter, sentimentFilter])

  // If navigated from dashboard with a specific call
  useEffect(() => {
    if (location.state?.callId && calls.length) {
      const found = calls.find(c => c.id === location.state.callId)
      if (found) setSelectedCall(found)
    }
  }, [location.state, calls])

  async function fetchCalls() {
    let query = supabase
      .from('calls')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (clientId && !isAdmin) {
      query = query.eq('client_id', clientId)
    }

    if (dateFrom) query = query.gte('call_date', dateFrom)
    if (dateTo) query = query.lte('call_date', dateTo)

    if (typeFilter === 'leads') query = query.eq('is_lead', true)
    else if (typeFilter === 'spam') query = query.eq('is_spam', true)
    else if (typeFilter === 'inquiries') query = query.eq('is_lead', false).eq('is_spam', false)

    if (programFilter) query = query.ilike('program', `%${programFilter}%`)
    if (sentimentFilter) query = query.eq('sentiment', sentimentFilter)

    const { data, count } = await query
    setCalls(data || [])
    setTotal(count || 0)
    setLoading(false)
  }

  function getOutcomeBadge(call) {
    if (call.is_spam) return 'Spam'
    if (call.is_lead) return 'Booked'
    return 'Inquiry'
  }

  function getSentimentDot(sentiment) {
    if (!sentiment) return 'bg-gray-300'
    const s = sentiment.toLowerCase()
    if (s === 'positive') return 'bg-green-400'
    if (s === 'negative') return 'bg-red-400'
    return 'bg-yellow-400'
  }

  function formatDuration(seconds) {
    if (!seconds) return '—'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Filter displayed calls by search
  const displayCalls = searchQuery
    ? calls.filter(c =>
        (c.caller_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.caller_phone || '').includes(searchQuery)
      )
    : calls

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Calls</h1>
        <p className="text-sm text-gray-500 mt-1">{total} total calls</p>
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
              onChange={e => setSearchQuery(e.target.value)}
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
            <option value="all">All Types</option>
            <option value="leads">Leads</option>
            <option value="inquiries">Inquiries</option>
            <option value="spam">Spam</option>
          </select>
          <select
            value={sentimentFilter}
            onChange={e => { setSentimentFilter(e.target.value); setPage(0) }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Sentiments</option>
            <option value="Positive">Positive</option>
            <option value="Neutral">Neutral</option>
            <option value="Negative">Negative</option>
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
                  <th className="px-4 py-3 font-medium text-gray-500">Duration</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Outcome</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Mood</th>
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
                      {call.caller_name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{call.caller_phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{call.call_date}</td>
                    <td className="px-4 py-3 text-gray-500">{call.program || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDuration(call.duration_seconds)}</td>
                    <td className="px-4 py-3"><Badge text={getOutcomeBadge(call)} /></td>
                    <td className="px-4 py-3">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${getSentimentDot(call.sentiment)}`} />
                    </td>
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
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
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
        <CallDetailPanel call={selectedCall} onClose={() => setSelectedCall(null)} />
      )}
    </div>
  )
}
