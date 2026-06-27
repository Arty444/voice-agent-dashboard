import { useEffect, useMemo, useState } from 'react'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { CheckCircle2, Circle, MessageSquarePlus, Pin, PinOff, Search, StickyNote } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import CallDetailPanel from '../components/CallDetailPanel'
import { useBranding } from '../hooks/useBranding'

const FALLBACK_CLIENT_ID = '6d047c8a-bedf-4feb-9223-803c57a8ce1a'

function hasText(value) {
  return Boolean(String(value || '').trim())
}

function isMessageOrNote(call) {
  const outcome = String(call.final_outcome || '').toLowerCase()
  const type = String(call.call_type || '').toLowerCase()
  return (
    hasText(call.staff_note) ||
    outcome === 'message' ||
    type.includes('message') ||
    type.includes('voicemail') ||
    type.includes('manual')
  )
}

function cleanSummary(summary) {
  return String(summary || '').replace(/^call_summary\s*/i, '').trim()
}

function getDisplayMessage(call) {
  return call.staff_note || cleanSummary(call.summary) || call.follow_up_reason || 'No message details yet.'
}

function getWhenLabel(call) {
  if (!call.call_date) return ''
  try {
    const dt = call.call_time ? parseISO(`${call.call_date}T${call.call_time}`) : parseISO(call.call_date)
    const day = isToday(dt) ? 'Today' : isYesterday(dt) ? 'Yesterday' : format(dt, 'MMM d')
    const time = call.call_time ? format(dt, 'h:mm a') : ''
    return [day, time].filter(Boolean).join(' at ')
  } catch {
    return call.call_date
  }
}

export default function Messages() {
  const { clientData, isAdmin } = useAuth()
  const branding = useBranding()
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedCall, setSelectedCall] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [view, setView] = useState('open')
  const [form, setForm] = useState({
    callerName: '',
    callerPhone: '',
    message: '',
  })

  const clientId = clientData?.id
  const writableClientId = clientId || FALLBACK_CLIENT_ID

  useEffect(() => {
    fetchMessages()
  }, [clientId, isAdmin])

  async function fetchMessages() {
    setLoading(true)
    let query = supabase
      .from('calls')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000)

    if (clientId && !isAdmin) {
      query = query.eq('client_id', clientId)
    }

    const { data } = await query
    setCalls((data || []).filter(isMessageOrNote))
    setLoading(false)
  }

  async function createManualMessage(event) {
    event.preventDefault()
    const callerName = form.callerName.trim() || 'Unknown Caller'
    const callerPhone = form.callerPhone.trim()
    const message = form.message.trim()

    if (!callerPhone || !message) {
      window.alert('Please add the caller phone number and message.')
      return
    }

    setSaving(true)
    const now = new Date()
    const summary = `Front desk message from ${callerName}: ${message}`
    const { data, error } = await supabase
      .from('calls')
      .insert({
        client_id: writableClientId,
        call_date: format(now, 'yyyy-MM-dd'),
        call_time: format(now, 'HH:mm:ss'),
        caller_name: callerName,
        caller_phone: callerPhone,
        call_type: 'Manual Message',
        final_outcome: 'message',
        needs_follow_up: true,
        follow_up_reason: message,
        summary,
        staff_note: message,
        transcript: `Front desk manually entered this message.\n\nCaller: ${callerName}\nPhone: ${callerPhone}\nMessage: ${message}`,
        is_spam: false,
        is_lead: false,
        trial_booked: false,
        trial_cancelled: false,
        handled: false,
        pinned: false,
      })
      .select()
      .single()

    setSaving(false)
    if (error) {
      window.alert('Could not save this message yet. Please check the calls table permissions.')
      return
    }

    setCalls(prev => [data, ...prev])
    setForm({ callerName: '', callerPhone: '', message: '' })
    setView('open')
  }

  async function toggleHandled(callId, currentHandled) {
    const newHandled = !currentHandled
    await supabase.from('calls').update({ handled: newHandled }).eq('id', callId)
    setCalls(prev => prev.map(call => call.id === callId ? { ...call, handled: newHandled } : call))
    setSelectedCall(prev => prev && prev.id === callId ? { ...prev, handled: newHandled } : prev)
  }

  async function togglePin(callId, currentPinned) {
    const newPinned = !currentPinned
    await supabase.from('calls').update({ pinned: newPinned }).eq('id', callId)
    setCalls(prev => prev.map(call => call.id === callId ? { ...call, pinned: newPinned } : call))
    setSelectedCall(prev => prev && prev.id === callId ? { ...prev, pinned: newPinned } : prev)
  }

  async function saveCallNote(callId, note) {
    const staffNote = note.trim() || null
    const { error } = await supabase.from('calls').update({ staff_note: staffNote }).eq('id', callId)
    if (error) {
      window.alert('Could not save this note yet.')
      return false
    }

    setCalls(prev => prev.map(call => call.id === callId ? { ...call, staff_note: staffNote } : call).filter(isMessageOrNote))
    setSelectedCall(prev => prev && prev.id === callId ? { ...prev, staff_note: staffNote } : prev)
    return true
  }

  const visibleMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return calls
      .filter(call => {
        if (view === 'open' && call.handled) return false
        if (view === 'handled' && !call.handled) return false
        if (!q) return true
        return (
          String(call.caller_name || '').toLowerCase().includes(q) ||
          String(call.caller_phone || '').includes(q) ||
          getDisplayMessage(call).toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        if (!a.handled && b.handled) return -1
        if (a.handled && !b.handled) return 1
        return new Date(b.created_at) - new Date(a.created_at)
      })
  }, [calls, searchQuery, view])

  const openCount = calls.filter(call => !call.handled).length
  const handledCount = calls.filter(call => call.handled).length
  const noteCount = calls.filter(call => hasText(call.staff_note)).length

  return (
    <div className="space-y-6" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Khand', sans-serif", color: branding.colors.text, fontSize: '1.75rem' }}>
          Messages
        </h1>
        <p className="text-sm mt-1" style={{ color: branding.colors.textSecondary }}>
          Front desk notes and caller messages for the program director.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-4" style={{ borderColor: branding.colors.border }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: branding.colors.textSecondary }}>Open Messages</p>
          <p className="mt-2 text-3xl font-bold" style={{ fontFamily: "'Khand', sans-serif", color: branding.colors.text }}>{openCount}</p>
        </div>
        <div className="rounded-lg border bg-white p-4" style={{ borderColor: branding.colors.border }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: branding.colors.textSecondary }}>Calls With Notes</p>
          <p className="mt-2 text-3xl font-bold" style={{ fontFamily: "'Khand', sans-serif", color: branding.colors.text }}>{noteCount}</p>
        </div>
        <div className="rounded-lg border bg-white p-4" style={{ borderColor: branding.colors.border }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: branding.colors.textSecondary }}>Handled</p>
          <p className="mt-2 text-3xl font-bold" style={{ fontFamily: "'Khand', sans-serif", color: branding.colors.text }}>{handledCount}</p>
        </div>
      </div>

      <form onSubmit={createManualMessage} className="rounded-lg border bg-white p-4 sm:p-5" style={{ borderColor: branding.colors.border }}>
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600">
            <MessageSquarePlus size={20} />
          </div>
          <div>
            <h2 className="font-semibold" style={{ color: branding.colors.text }}>New Front Desk Message</h2>
            <p className="text-xs" style={{ color: branding.colors.textSecondary }}>Use this instead of a legal pad when staff answers the phone.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: branding.colors.textSecondary }}>Caller Name</span>
            <input
              value={form.callerName}
              onChange={event => setForm(prev => ({ ...prev, callerName: event.target.value }))}
              placeholder="Caller name"
              className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: branding.colors.textSecondary }}>Phone Number</span>
            <input
              value={form.callerPhone}
              onChange={event => setForm(prev => ({ ...prev, callerPhone: event.target.value }))}
              placeholder="Best callback number"
              className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>
        <label className="mt-3 block">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: branding.colors.textSecondary }}>Message For Program Director</span>
          <textarea
            value={form.message}
            onChange={event => setForm(prev => ({ ...prev, message: event.target.value }))}
            placeholder="Write exactly what the program director needs to know..."
            className="mt-1 min-h-32 w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="min-h-11 rounded-lg px-5 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: branding.colors.primary }}
          >
            {saving ? 'Saving...' : 'Save Message'}
          </button>
        </div>
      </form>

      <div className="rounded-lg border bg-white" style={{ borderColor: branding.colors.border }}>
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: branding.colors.border }}>
          <div className="flex rounded-lg border p-1" style={{ borderColor: branding.colors.border }}>
            {[
              { key: 'open', label: 'Open' },
              { key: 'all', label: 'All' },
              { key: 'handled', label: 'Handled' },
            ].map(option => (
              <button
                key={option.key}
                type="button"
                onClick={() => setView(option.key)}
                className="min-h-10 rounded-md px-4 py-2 text-sm font-semibold"
                style={{
                  backgroundColor: view === option.key ? branding.colors.primary : 'transparent',
                  color: view === option.key ? '#ffffff' : branding.colors.textSecondary,
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Search messages..."
              className="min-h-11 w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex h-56 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full" style={{ borderWidth: 4, borderColor: branding.colors.primary, borderTopColor: 'transparent' }} />
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: '#94a3b8' }}>
            No messages here.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#f1f5f9' }}>
            {visibleMessages.map(call => {
              const message = getDisplayMessage(call)
              return (
                <div
                  key={call.id}
                  onClick={() => setSelectedCall(call)}
                  className={`flex cursor-pointer items-start gap-3 px-4 py-4 transition-colors hover:bg-slate-50 ${call.handled ? 'opacity-60' : ''}`}
                >
                  <button
                    type="button"
                    onClick={event => {
                      event.stopPropagation()
                      toggleHandled(call.id, call.handled)
                    }}
                    className="-ml-2 -mt-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ color: call.handled ? branding.colors.accent : '#cbd5e1' }}
                  >
                    {call.handled ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold" style={{ color: branding.colors.text }}>{call.caller_name || 'Unknown Caller'}</p>
                      {call.call_type === 'Manual Message' && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">Manual</span>
                      )}
                      {hasText(call.staff_note) && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                          <StickyNote size={11} />
                          Note
                        </span>
                      )}
                      {call.deleted_at && (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Deleted from Command Center
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm font-medium" style={{ color: branding.colors.textSecondary }}>{message}</p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                      <span className="font-bold" style={{ color: branding.colors.text }}>{call.caller_phone || 'No phone number'}</span>
                      <span style={{ color: '#94a3b8' }}>{getWhenLabel(call)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={event => {
                      event.stopPropagation()
                      togglePin(call.id, call.pinned)
                    }}
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ color: call.pinned ? '#f59e0b' : '#cbd5e1' }}
                  >
                    {call.pinned ? <PinOff size={16} /> : <Pin size={16} />}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selectedCall && (
        <CallDetailPanel
          call={selectedCall}
          onClose={() => setSelectedCall(null)}
          onToggleHandled={toggleHandled}
          onTogglePin={togglePin}
          onSaveNote={saveCallNote}
        />
      )}
    </div>
  )
}
