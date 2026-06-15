import { useEffect, useState } from 'react'
import { X, User, MessageSquare, Pin, PinOff, CheckCircle2, Circle, RotateCcw, Trash2, StickyNote, Save } from 'lucide-react'
import Badge from './Badge'

export default function CallDetailPanel({ call, onClose, onToggleHandled, onTogglePin, onDelete, onUndelete, onSaveNote }) {
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)

  useEffect(() => {
    setNoteDraft(call?.staff_note || '')
    setIsEditingNote(false)
    setIsSavingNote(false)
  }, [call?.id, call?.staff_note])

  if (!call) return null

  const hasTrialDate = call.trial_day && !['n/a', 'na', 'none'].includes(call.trial_day.toLowerCase())
  const hasStaffNote = Boolean(call.staff_note?.trim())

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

  async function handleSaveNote() {
    if (!onSaveNote) return
    setIsSavingNote(true)
    const saved = await onSaveNote(call.id, noteDraft)
    setIsSavingNote(false)
    if (saved !== false) setIsEditingNote(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="safe-bottom relative h-full w-full max-w-xl overflow-y-auto bg-white shadow-xl" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Header */}
        <div className="safe-top sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Call Details</h2>
          <button onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Caller info with delete button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <User size={20} className="text-gray-500" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 text-lg">{call.display_name || call.caller_name || 'Unknown'}</p>
                  {call.is_member && <Badge text="Member" />}
                  {call.is_former_member && <Badge text="Inactive Member" />}
                  {call.is_lead && <Badge text="Lead" />}
                </div>
                <p className="text-sm text-gray-500">{call.caller_phone || '—'}</p>
                {(call.is_member || call.is_former_member || call.is_lead) && call.member_account_name && call.member_account_name !== call.member_contact_name && (
                  <p className="text-xs text-indigo-600 mt-0.5">Account: {call.member_account_name}</p>
                )}
                {!call.is_member && !call.is_former_member && !call.is_lead && call.name_source === 'address_book' && (
                  <p className="text-xs text-gray-400 mt-0.5">Name from a previous call</p>
                )}
              </div>
            </div>
            {call.deleted_at && onUndelete ? (
              <button
                onClick={() => onUndelete(call.id)}
                className="flex min-h-11 items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
              >
                <RotateCcw size={16} />
                Undelete
              </button>
            ) : onDelete && (
              <button
                onClick={() => onDelete(call.id)}
                className="flex min-h-11 items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                <Trash2 size={16} />
                Delete
              </button>
            )}
          </div>

          {/* Quick actions */}
          {(onToggleHandled || onTogglePin || onSaveNote) && (
            <div className="flex flex-wrap gap-2">
              {onToggleHandled && (
                <button
                  onClick={() => onToggleHandled(call.id, call.handled)}
                  className={`flex min-h-11 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
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
                  className={`flex min-h-11 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    call.pinned
                      ? 'bg-amber-50 border-amber-200 text-amber-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {call.pinned ? <PinOff size={16} /> : <Pin size={16} />}
                  {call.pinned ? 'Unpin' : 'Pin'}
                </button>
              )}
              {onSaveNote && (
                <button
                  onClick={() => setIsEditingNote(true)}
                  className={`flex min-h-11 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    hasStaffNote
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <StickyNote size={16} />
                  {hasStaffNote ? 'Edit Note' : 'Add Note'}
                </button>
              )}
            </div>
          )}

          {/* Staff note */}
          {(hasStaffNote || isEditingNote) && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
                  <StickyNote size={14} />
                  Staff Note
                </h3>
                {!isEditingNote && (
                  <button
                    onClick={() => setIsEditingNote(true)}
                    className="rounded-md px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                  >
                    Edit
                  </button>
                )}
              </div>
              {isEditingNote ? (
                <div className="space-y-3">
                  <textarea
                    value={noteDraft}
                    onChange={e => setNoteDraft(e.target.value)}
                    placeholder="Write a staff note for this call..."
                    className="min-h-28 w-full resize-y rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  />
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      onClick={() => {
                        setNoteDraft(call.staff_note || '')
                        setIsEditingNote(false)
                      }}
                      className="min-h-10 rounded-lg border border-amber-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-amber-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveNote}
                      disabled={isSavingNote}
                      className="flex min-h-10 items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Save size={16} />
                      {isSavingNote ? 'Saving...' : 'Save Note'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{call.staff_note}</p>
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
              <div className="max-h-[45vh] overflow-y-auto rounded-lg bg-gray-50 p-4" style={{ WebkitOverflowScrolling: 'touch' }}>
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
