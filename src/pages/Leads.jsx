import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Badge from '../components/Badge'
import { Check, X as XIcon } from 'lucide-react'

const STATUS_OPTIONS = ['Booked', 'Showed Up', 'Converted', 'No Show']

export default function Leads() {
  const { clientData, isAdmin } = useAuth()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editStatus, setEditStatus] = useState('')

  const clientId = clientData?.id

  useEffect(() => {
    if (!clientId && !isAdmin) return
    fetchLeads()
  }, [clientId, isAdmin])

  async function fetchLeads() {
    let query = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })

    if (clientId && !isAdmin) {
      query = query.eq('client_id', clientId)
    }

    const { data } = await query
    setLeads(data || [])
    setLoading(false)
  }

  async function updateStatus(leadId) {
    const { error } = await supabase
      .from('leads')
      .update({ status: editStatus })
      .eq('id', leadId)

    if (!error) {
      setLeads(prev => prev.map(l =>
        l.id === leadId ? { ...l, status: editStatus } : l
      ))
    }
    setEditingId(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Leads</h1>
        <p className="text-sm text-gray-500 mt-1">{leads.length} booked trials</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {leads.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No leads yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500">Name</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Phone</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Program</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Trial Day</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Trial Time</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Booked</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {lead.caller_name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{lead.caller_phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{lead.program || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{lead.trial_day || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{lead.trial_time || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === lead.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editStatus}
                            onChange={e => setEditStatus(e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                          >
                            {STATUS_OPTIONS.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => updateStatus(lead.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <XIcon size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingId(lead.id); setEditStatus(lead.status) }}
                          className="hover:opacity-80"
                        >
                          <Badge text={lead.status} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
