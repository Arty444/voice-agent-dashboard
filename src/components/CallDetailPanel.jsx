import { X, Clock, Phone, User, MessageSquare } from 'lucide-react'
import Badge from './Badge'

export default function CallDetailPanel({ call, onClose }) {
  if (!call) return null

  function formatDuration(seconds) {
    if (!seconds) return '—'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  function getOutcomeBadge(call) {
    if (call.is_spam) return 'Spam'
    if (call.is_lead) return 'Booked'
    return call.call_type || 'Inquiry'
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Call Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Caller info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <User size={18} className="text-gray-500" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{call.caller_name || 'Unknown'}</p>
                <p className="text-sm text-gray-500">{call.caller_phone || '—'}</p>
              </div>
            </div>
          </div>

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
            {call.trial_day && (
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

          {/* Summary */}
          {call.summary && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <MessageSquare size={14} />
                Summary
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">{call.summary}</p>
            </div>
          )}

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
