import { useEffect, useState } from 'react'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { Send, X, ShieldAlert, CheckCircle2, ChevronRight, ExternalLink, Wifi, WifiOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useBranding } from '../hooks/useBranding'

function whenLabel(ts) {
  if (!ts) return ''
  try {
    const dt = parseISO(ts)
    const day = isToday(dt) ? 'Today' : isYesterday(dt) ? 'Yesterday' : format(dt, 'MMM d')
    return `${day} · ${format(dt, 'h:mm a')}`
  } catch {
    return ''
  }
}

// One-line "what this is about" for the collapsed row: strip the "Member: … ·"
// prefix off the brief so only the situation shows.
function topicLine(d) {
  // Take the situation sentence (after the first ". ") — indexOf('. ') skips
  // decimals like "$104.50" since those have no following space.
  const brief = (d.context_brief || '').trim()
  const idx = brief.indexOf('. ')
  const rest = idx >= 0 ? brief.slice(idx + 2).trim() : ''
  return rest || [d.program, d.billing].filter(Boolean).join(' · ') || brief
}

// Deep-link to a member's EFC tab from the stored base URL.
function efcTab(url, tab) {
  if (!url) return null
  return url.replace(/\/(summary|subscriptions|invoices|messages|tasks|bookings|notes|progression)$/i, '') + '/' + tab
}

export default function Replies({ previewDrafts = null }) {
  const { clientData, isAdmin } = useAuth()
  const branding = useBranding()
  const c = branding.colors
  const [drafts, setDrafts] = useState(previewDrafts || [])
  const [handled, setHandled] = useState([]) // recently answered directly in EFC
  const [loading, setLoading] = useState(!previewDrafts)
  const [edits, setEdits] = useState({})
  const [busy, setBusy] = useState(null)
  const [openId, setOpenId] = useState(null) // accordion — one open at a time
  const [efcStatus, setEfcStatus] = useState(null) // { connected, detail, last_checked_at }

  // Admin sees all clients (RLS scopes everyone else); a gym login without a
  // resolved clients row sees nothing rather than someone else's data.
  const clientId = isAdmin ? null : clientData?.id || null

  async function load() {
    setLoading(true)
    let query = supabase
      .from('member_reply_drafts')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (clientId) query = query.eq('client_id', clientId)
    const { data, error } = await query
    if (error) console.warn('replies load error:', error.message)
    setDrafts(data || [])
    setLoading(false)

    // Threads the bot found already handled in EFC (staff replied there directly).
    let hq = supabase
      .from('member_reply_drafts')
      .select('id, member_name, context_brief, program, billing, updated_at')
      .eq('status', 'answered')
      .order('updated_at', { ascending: false })
      .limit(8)
    if (clientId) hq = hq.eq('client_id', clientId)
    const { data: hd } = await hq
    setHandled(hd || [])
  }

  async function loadStatus() {
    let q = supabase.from('efc_session_status').select('connected, detail, last_checked_at')
    if (clientId) q = q.eq('client_id', clientId)
    const { data } = await q.order('last_checked_at', { ascending: false }).limit(1)
    if (data && data.length) setEfcStatus(data[0])
  }

  useEffect(() => {
    if (previewDrafts) return
    load()
    loadStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  const draftText = (d) => (edits[d.id] !== undefined ? edits[d.id] : d.edited_draft || d.draft || '')

  async function resolve(d, status) {
    setBusy(d.id)
    const patch = { status, updated_at: new Date().toISOString() }
    if (status === 'approved') patch.edited_draft = draftText(d)
    if (!previewDrafts) {
      const { error } = await supabase.from('member_reply_drafts').update(patch).eq('id', d.id)
      if (error) { setBusy(null); alert('Could not save: ' + error.message); return }
    }
    setBusy(null)
    setOpenId(null)
    setDrafts((prev) => prev.filter((x) => x.id !== d.id))
  }

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: c.text, fontFamily: "'Khand', sans-serif", letterSpacing: '0.02em' }}>
            Member Replies
          </h1>
          <p className="text-sm" style={{ color: c.textSecondary }}>
            {drafts.length === 0 ? 'You’re all caught up.' : `${drafts.length} ${drafts.length === 1 ? 'reply' : 'replies'} ready to review.`}
          </p>
        </div>
        {efcStatus && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold shrink-0"
            style={efcStatus.connected ? { backgroundColor: `${c.accent}1a`, color: c.accent } : { backgroundColor: `${c.alert}1a`, color: c.alert }}
            title={`${efcStatus.detail || ''}${efcStatus.last_checked_at ? ' · checked ' + whenLabel(efcStatus.last_checked_at) : ''}`}
          >
            {efcStatus.connected ? <Wifi size={13} /> : <WifiOff size={13} />}
            {efcStatus.connected ? 'EFC Connected' : 'EFC — Re-login needed'}
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-16 text-center" style={{ color: c.textSecondary }}>Loading…</div>
      ) : drafts.length === 0 ? (
        <div className="py-20 text-center" style={{ color: c.textSecondary }}>
          <CheckCircle2 size={40} className="mx-auto mb-3 opacity-40" />
          No replies waiting. New ones appear here as members message in.
        </div>
      ) : (
        <div className="space-y-2.5">
          {drafts.map((d) => {
            const review = d.confidence !== 'high'
            const open = openId === d.id
            const thread = Array.isArray(d.thread) ? d.thread : []
            const badge = review
              ? { bg: `${c.alert}1a`, fg: c.alert, label: 'REVIEW', Icon: ShieldAlert }
              : { bg: `${c.accent}1a`, fg: c.accent, label: 'READY', Icon: CheckCircle2 }
            return (
              <div key={d.id} className="rounded-xl border overflow-hidden transition-shadow"
                style={{ backgroundColor: c.card, borderColor: open ? c.primary : c.border, boxShadow: open ? '0 4px 20px rgba(15,23,42,0.06)' : 'none' }}>
                {/* Collapsed row (always visible) */}
                <button
                  onClick={() => setOpenId(open ? null : d.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-black/[0.015]"
                >
                  <ChevronRight size={18} className="shrink-0 transition-transform" style={{ color: c.textSecondary, transform: open ? 'rotate(90deg)' : 'none' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[15px]" style={{ color: c.text }}>{d.member_name}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: badge.bg, color: badge.fg }}>
                        <badge.Icon size={10} />{badge.label}
                      </span>
                    </div>
                    {!open && (
                      <div className="text-[13px] truncate mt-0.5" style={{ color: c.textSecondary }}>{topicLine(d)}</div>
                    )}
                  </div>
                  <span className="text-[11px] shrink-0" style={{ color: c.textSecondary }}>{whenLabel(d.created_at)}</span>
                </button>

                {/* Expanded detail */}
                {open && (
                  <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: c.border }}>
                    <div className="grid gap-4 lg:grid-cols-2 mt-3">
                      {/* Context + conversation */}
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: c.textSecondary }}>Context</div>
                        <div className="text-[13px] whitespace-pre-line rounded-lg p-3 mb-3" style={{ backgroundColor: c.surface, color: c.text }}>
                          {d.context_brief || `${d.member_name} · ${d.program || ''} · ${d.billing || ''}`}
                          {review && d.flag_reason && (
                            <div className="mt-2 text-[12px] flex items-start gap-1" style={{ color: c.alert }}>
                              <ShieldAlert size={13} className="mt-0.5 shrink-0" /> {d.flag_reason}
                            </div>
                          )}
                        </div>
                        {d.efc_url && (
                          <a href={efcTab(d.efc_url, 'subscriptions')} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 mb-3 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-opacity hover:opacity-80"
                            style={review
                              ? { backgroundColor: `${c.alert}14`, color: c.alert }
                              : { backgroundColor: c.surface, color: c.primary, border: `1px solid ${c.border}` }}>
                            <ExternalLink size={13} /> {review ? `Verify in EFC — open ${d.member_name}'s account` : `Open ${d.member_name} in EFC`}
                          </a>
                        )}
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: c.textSecondary }}>Conversation</div>
                          {d.efc_url && (
                            <a href={efcTab(d.efc_url, 'messages')} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold hover:opacity-80" style={{ color: c.primary }}>
                              View full conversation <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                        <div className="space-y-1.5 max-h-56 overflow-auto rounded-lg p-3" style={{ backgroundColor: c.surface }}>
                          {thread.length === 0 && <div className="text-[12px]" style={{ color: c.textSecondary }}>(no thread)</div>}
                          {thread.map((m, i) => (
                            <div key={i} className="text-[13px] leading-snug" style={{ color: c.text }}>
                              <span className="font-semibold" style={{ color: m.direction === 'inbound' ? c.primary : c.textSecondary }}>
                                {m.direction === 'inbound' ? 'Member' : m.direction === 'outbound' ? 'Coach' : '•'}:
                              </span>{' '}{m.body}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Editable draft + actions */}
                      <div className="flex flex-col">
                        <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: c.textSecondary }}>Draft reply · editable</div>
                        <textarea
                          value={draftText(d)}
                          onChange={(e) => setEdits((prev) => ({ ...prev, [d.id]: e.target.value }))}
                          rows={6}
                          className="flex-1 w-full rounded-lg border p-3 text-[13px] resize-none focus:outline-none"
                          style={{ backgroundColor: c.card, borderColor: c.border, color: c.text }}
                        />
                        <div className="flex items-center gap-2 mt-3">
                          <button disabled={busy === d.id} onClick={() => resolve(d, 'approved')}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50"
                            style={{ backgroundColor: c.primary }}>
                            <Send size={15} /> {busy === d.id ? 'Saving…' : 'Approve & Send'}
                          </button>
                          <button disabled={busy === d.id} onClick={() => resolve(d, 'dismissed')}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold disabled:opacity-50"
                            style={{ backgroundColor: c.card, color: c.textSecondary, border: `1px solid ${c.border}` }}>
                            <X size={15} /> Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Threads handled directly in EFC — the sweep cleared these automatically. */}
      {!loading && handled.length > 0 && (
        <div className="mt-8">
          <div className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: c.textSecondary }}>
            Handled in EFC
          </div>
          <div className="space-y-1">
            {handled.map((d) => (
              <div key={d.id} className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px]"
                style={{ backgroundColor: c.surface, color: c.textSecondary }}>
                <CheckCircle2 size={14} className="shrink-0 opacity-60" />
                <span className="font-semibold" style={{ color: c.text }}>{d.member_name}</span>
                <span className="truncate flex-1">{topicLine(d)}</span>
                <span className="text-[11px] shrink-0">{whenLabel(d.updated_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
