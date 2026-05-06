import { X, Clock, Phone, User, MessageSquare, Pin, PinOff, CheckCircle2, Circle, PhoneCall } from 'lucide-react'
import Badge from './Badge'

export default function CallDetailPanel({ call, onClose, onToggleHandled, onTogglePin }) {
  if (!call) return null

  const hasTrialDate = call.trial_day && !['n/a', 'na', 'none'].includes(call.trial_day.toLowerCase())

  function formatDuration(seconds) {
    if (!seconds) return '—'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  function getOutcomeBadge(call) {
    if (call.is_spam) return 'Spam'
    if (call.final_outcome) return call.final_outcome.replace('_', ' ')
    if (call.is_lead) return 'Booked'
    return call.call_type || 'Inquiry'
  }

  function cleanSummary(summary) {
    if (!summary) return ''
    return summary.replace(/^call_summary\s*/i, '').trim()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-gray-900">Call Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Caller info with call-back button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <User size={20} className="text-gray-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-lg">{call.caller_name || 'Unknown'}</p>
                <p className="text-sm text-gray-500">{call.caller_phone || '—'}</p>
              </div>
            </div>
            {call.caller_phone && (
              <a
                href={`tel:${call.caller_phone}`}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                <PhoneCall size={16} />
                Call Back
              </a>
            )}
          </div>

          {/* Quick actions */}
          {(onToggleHandled || onTogglePin) && (
            <div className="flex gap-2">
              {onToggleHandled && (
                <button
                  onClick={() => onToggleHandled(call.id, call.handled)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    call.handled
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {call.handled ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                  {call.handled ? 'Handled' : 'Mark Handled'}
                </button>
              )}
              {onTogglePin && (
                <button
                  onClick={() => onTogglePin(call.id, call.pinned)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    call.pinned
                      ? 'bg-amber-50 border-amber-200 text-amber-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {call.pinned ? <PinOff size={16} /> : <Pin size={16} />}
                  {call.pinned ? 'Unpin' : 'Pin'}
                </button>
              )}
            </div>
          )}

          {/* Summary — prominent */}
          {call.summary && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2 flex items-center gap-2">
                <MessageSquare size={14} />
                Summary
              </h3>
              <p className="text-sm text-gray-800 leading-relaxed">{cleanSummary(call.summary)}</p>
            </div>
          )}

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Date</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{call.call_date || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Duration</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{formatDuration(call.duration_seconds)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Program</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{call.program || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Outcome</p>
              <div className="mt-1"><Badge text={getOutcomeBadge(call)} /></div>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Sentiment</p>
              <div className="mt-1"><Badge text={call.sentiment || '—'} /></div>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Type</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{call.call_type || '—'}</p>
            </div>
            {hasTrialDate && (
              <>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Trial Day</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{call.trial_day}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Trial Time</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{call.trial_time || '—'}</p>
                </div>
              </>
            )}
          </div>

          {/* Transcript */}
          {call.transcript && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Transcript</h3>
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">
                  {call.transcript}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
