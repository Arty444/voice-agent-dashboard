import { useEffect, useState } from 'react'
import { X, User, MessageSquare, Pin, PinOff, CheckCircle2, Circle, RotateCcw, Trash2, StickyNote, Save, Ban, Loader2, AlertTriangle } from 'lucide-react'
import Badge from './Badge'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useClientFlags } from '../hooks/useClientFlags'

// A call is a cancellation request if its outcome/type says so.
function isCancellationCall(call) {
  const outcome = String(call?.final_outcome || '').trim().toLowerCase()
  if (outcome === 'cancelled' || outcome === 'canceled') return true
  return String(call?.call_type || '').toLowerCase().includes('cancel')
}

export default function CallDetailPanel({ call, onClose, onToggleHandled, onTogglePin, onDelete, onUndelete, onSaveNote }) {
  const { user } = useAuth()
  // The cancel-membership bot only runs for EFC-enabled clients (clients.efc_enabled).
  const { efcEnabled } = useClientFlags(call?.client_id)
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)

  // Cancel-membership controls
  const [showCancelMenu, setShowCancelMenu] = useState(false)
  const [pendingMode, setPendingMode] = useState(null) // '30day' | 'immediate' awaiting confirm
  const [cancelJob, setCancelJob] = useState(null)      // latest job for this call
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setNoteDraft(call?.staff_note || '')
    setIsEditingNote(false)
    setIsSavingNote(false)
    setShowCancelMenu(false)
    setPendingMode(null)
  }, [call?.id, call?.staff_note])

  // Track this call's cancellation job (initial fetch + live updates).
  useEffect(() => {
    if (!call?.id) return
    let alive = true
    async function fetchJob() {
      const { data } = await supabase
        .from('cancellation_jobs')
        .select('*')
        .eq('call_id', call.id)
        .order('created_at', { ascending: false })
        .limit(1)
      if (alive) setCancelJob((data && data[0]) || null)
    }
    fetchJob()
    const ch = supabase
      .channel(`cxl_job_${call.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cancellation_jobs', filter: `call_id=eq.${call.id}` }, fetchJob)
      .subscribe()
    return () => { alive = false; supabase.removeChannel(ch) }
  }, [call?.id])

  async function submitCancellation(mode) {
    setSubmitting(true)
    const { data, error } = await supabase.from('cancellation_jobs').insert({
      client_id: call.client_id,
      call_id: call.id,
      efc_reference: call.member_efc_reference,
      member_name: call.member_account_name || call.display_name || call.caller_name,
      caller_phone: call.caller_phone || null,
      requested_by: user?.email || null,
      cancel_mode: mode,            // '30day' | 'immediate'
      dry_run: false,
      status: 'queued',
    }).select()
    setSubmitting(false)
    setPendingMode(null)
    setShowCancelMenu(false)
    if (error) { window.alert(`Could not queue cancellation: ${error.message}`); return }
    setCancelJob(data[0])
  }

  if (!call) return null

  const hasTrialDate = call.trial_day && !['n/a', 'na', 'none'].includes(call.trial_day.toLowerCase())
  const hasStaffNote = Boolean(call.staff_note?.trim())
  const canShowCancel = isCancellationCall(call) && efcEnabled
  const hasEfcRef = Boolean(call.member_efc_reference && String(call.member_efc_reference).trim())

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
                  {call.is_prospect && <Badge text="Lead" />}
                </div>
                <p className="text-sm text-gray-500">{call.caller_phone || '—'}</p>
                {(call.is_member || call.is_former_member || call.is_prospect) && call.member_account_name && call.member_account_name !== call.member_contact_name && (
                  <p className="text-xs text-indigo-600 mt-0.5">Account: {call.member_account_name}</p>
                )}
                {!call.is_member && !call.is_former_member && !call.is_prospect && call.name_source === 'address_book' && (
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
          {(onToggleHandled || onTogglePin || onSaveNote || canShowCancel) && (
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
              {/* Cancel membership — only for cancellation-request calls */}
              {canShowCancel && (
                <button
                  onClick={() => { setShowCancelMenu(v => !v); setPendingMode(null) }}
                  className={`flex min-h-11 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    showCancelMenu
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Ban size={16} />
                  Cancel
                </button>
              )}
            </div>
          )}

          {/* Cancel-membership dropdown / confirm / status */}
          {canShowCancel && (showCancelMenu || cancelJob) && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
              {/* The two options (only while the menu is open and nothing pending/queued) */}
              {showCancelMenu && !pendingMode && (
                !hasEfcRef ? (
                  <p className="flex items-center gap-2 text-sm text-amber-700">
                    <AlertTriangle size={15} /> This caller isn’t matched to an EFC member, so it can’t be auto-cancelled. Match them in EFC first.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Cancel {call.member_account_name || call.display_name || 'this member'}’s membership</p>
                    {/* 30 day FIRST, then Immediately */}
                    <button
                      onClick={() => setPendingMode('30day')}
                      className="flex w-full items-center justify-between rounded-lg border border-red-200 bg-white px-4 py-3 text-left text-sm font-medium text-gray-800 hover:bg-red-100/40"
                    >
                      <span>30 day notice</span>
                      <span className="text-xs text-gray-500">bills next 2 payments, then cancels</span>
                    </button>
                    <button
                      onClick={() => setPendingMode('immediate')}
                      className="flex w-full items-center justify-between rounded-lg border border-red-200 bg-white px-4 py-3 text-left text-sm font-medium text-gray-800 hover:bg-red-100/40"
                    >
                      <span>Immediately</span>
                      <span className="text-xs text-gray-500">cancels right away</span>
                    </button>
                  </div>
                )
              )}

              {/* Confirm step */}
              {pendingMode && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-800">
                    {pendingMode === '30day'
                      ? <>Cancel <b>{call.member_account_name || call.display_name}</b>’s membership on <b>30-day notice</b> (bill the next 2 payments, then cancel)?</>
                      : <>Cancel <b>{call.member_account_name || call.display_name}</b>’s membership <b>immediately</b>?</>}
                  </p>
                  <p className="text-xs text-red-600">This is a real cancellation in EFC.</p>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setPendingMode(null)} disabled={submitting} className="min-h-10 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Back</button>
                    <button onClick={() => submitCancellation(pendingMode)} disabled={submitting} className="min-h-10 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                      {submitting ? 'Submitting…' : pendingMode === '30day' ? 'Confirm 30-day cancel' : 'Confirm immediate cancel'}
                    </button>
                  </div>
                </div>
              )}

              {/* Status of the queued/processed job */}
              {cancelJob && !pendingMode && (
                <div className="flex items-start gap-2 text-sm">
                  {cancelJob.status === 'queued' && <><Loader2 size={15} className="mt-0.5 animate-spin text-amber-600" /><span className="text-amber-700">Cancellation queued ({cancelJob.cancel_mode === '30day' ? '30-day' : 'immediate'}) — waiting for the bot.</span></>}
                  {cancelJob.status === 'running' && <><Loader2 size={15} className="mt-0.5 animate-spin text-blue-600" /><span className="text-blue-700">Bot is processing the cancellation…</span></>}
                  {cancelJob.status === 'done' && <><CheckCircle2 size={15} className="mt-0.5 text-green-600" /><span className="text-green-700">{cancelJob.result_note || 'Cancelled.'}{cancelJob.screenshot_url && <> · <a className="underline" href={cancelJob.screenshot_url} target="_blank" rel="noreferrer">proof</a></>}</span></>}
                  {cancelJob.status === 'failed' && <><AlertTriangle size={15} className="mt-0.5 text-red-600" /><span className="text-red-700">Cancellation failed: {cancelJob.error || 'unknown error'}</span></>}
                  {cancelJob.status === 'skipped' && <><AlertTriangle size={15} className="mt-0.5 text-amber-600" /><span className="text-amber-700">{cancelJob.error || 'Skipped — needs manual handling.'}</span></>}
                </div>
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
