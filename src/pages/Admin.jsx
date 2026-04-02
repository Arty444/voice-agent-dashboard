import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import MetricCard from '../components/MetricCard'
import { Users, Phone, Plus, Eye, X } from 'lucide-react'

export default function Admin() {
  const { isAdmin } = useAuth()
  const [clients, setClients] = useState([])
  const [allCalls, setAllCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newClient, setNewClient] = useState({
    business_name: '',
    agent_name: '',
    owner_name: '',
    email: '',
    phone_number: '',
    timezone: 'America/New_York',
  })
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    if (!isAdmin) return
    fetchData()
  }, [isAdmin])

  async function fetchData() {
    const [clientsRes, callsRes] = await Promise.all([
      supabase.from('clients').select('*').order('created_at', { ascending: false }),
      supabase.from('calls').select('id, client_id', { count: 'exact' }),
    ])
    setClients(clientsRes.data || [])
    setAllCalls(callsRes.data || [])
    setLoading(false)
  }

  function getCallCount(clientId) {
    return allCalls.filter(c => c.client_id === clientId).length
  }

  async function handleAddClient(e) {
    e.preventDefault()
    setFormError('')
    setFormLoading(true)

    // Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: newClient.email,
      password: 'ChangeMe123!', // temporary password
      email_confirm: true,
    })

    if (authError) {
      // If admin API isn't available, just create the client row
      // The admin can manually create the auth user in Supabase dashboard
      console.warn('Could not create auth user (admin API may not be available):', authError.message)
    }

    // Create client row
    const { error: insertError } = await supabase.from('clients').insert({
      business_name: newClient.business_name,
      agent_name: newClient.agent_name,
      owner_name: newClient.owner_name,
      email: newClient.email,
      phone_number: newClient.phone_number,
      timezone: newClient.timezone,
      active: true,
    })

    if (insertError) {
      setFormError(insertError.message)
      setFormLoading(false)
      return
    }

    setShowAddForm(false)
    setNewClient({ business_name: '', agent_name: '', owner_name: '', email: '', phone_number: '', timezone: 'America/New_York' })
    setFormLoading(false)
    fetchData()
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p>Admin access required</p>
      </div>
    )
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Admin Panel</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all clients</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Add Client
        </button>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard title="Total Clients" value={clients.length} icon={Users} color="blue" />
        <MetricCard title="Active Clients" value={clients.filter(c => c.active).length} icon={Users} color="green" />
        <MetricCard title="Total Calls" value={allCalls.length} icon={Phone} color="purple" />
      </div>

      {/* Clients list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500">Business</th>
                <th className="px-4 py-3 font-medium text-gray-500">Agent</th>
                <th className="px-4 py-3 font-medium text-gray-500">Owner</th>
                <th className="px-4 py-3 font-medium text-gray-500">Calls</th>
                <th className="px-4 py-3 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.map(client => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{client.business_name}</td>
                  <td className="px-4 py-3 text-gray-500">{client.agent_name}</td>
                  <td className="px-4 py-3 text-gray-500">{client.owner_name}</td>
                  <td className="px-4 py-3 text-gray-500">{getCallCount(client.id)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${client.active ? 'text-green-600' : 'text-gray-500'}`}>
                      <span className={`w-2 h-2 rounded-full ${client.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {client.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add client modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAddForm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Add New Client</h2>
              <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddClient} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                <input
                  type="text"
                  required
                  value={newClient.business_name}
                  onChange={e => setNewClient({ ...newClient, business_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agent Name</label>
                <input
                  type="text"
                  required
                  value={newClient.agent_name}
                  onChange={e => setNewClient({ ...newClient, agent_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name</label>
                <input
                  type="text"
                  required
                  value={newClient.owner_name}
                  onChange={e => setNewClient({ ...newClient, owner_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Login Email</label>
                <input
                  type="email"
                  required
                  value={newClient.email}
                  onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newClient.phone_number}
                  onChange={e => setNewClient({ ...newClient, phone_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <select
                  value={newClient.timezone}
                  onChange={e => setNewClient({ ...newClient, timezone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="America/New_York">Eastern (New York)</option>
                  <option value="America/Chicago">Central (Chicago)</option>
                  <option value="America/Denver">Mountain (Denver)</option>
                  <option value="America/Los_Angeles">Pacific (Los Angeles)</option>
                  <option value="Europe/London">UK (London)</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 mt-2"
              >
                {formLoading ? 'Creating...' : 'Create Client'}
              </button>
            </form>

            <p className="text-xs text-gray-400 mt-3">
              Note: You may need to create the auth user manually in Supabase dashboard, then share the temporary password with the client.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
