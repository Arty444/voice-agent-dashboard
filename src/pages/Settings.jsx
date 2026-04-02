import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Check, AlertCircle } from 'lucide-react'

export default function Settings() {
  const { user, clientData, updatePassword } = useAuth()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })
  const [loading, setLoading] = useState(false)

  async function handlePasswordChange(e) {
    e.preventDefault()
    setMessage({ type: '', text: '' })

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }

    setLoading(true)
    const { error } = await updatePassword(newPassword)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Password updated successfully' })
      setNewPassword('')
      setConfirmPassword('')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account</p>
      </div>

      {/* Agent info */}
      {clientData && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Your Agent</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Agent Name</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{clientData.agent_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
              <p className="text-sm font-medium mt-1">
                <span className={`inline-flex items-center gap-1.5 ${clientData.active ? 'text-green-600' : 'text-gray-500'}`}>
                  <span className={`w-2 h-2 rounded-full ${clientData.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                  {clientData.active ? 'Active' : 'Inactive'}
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Business</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{clientData.business_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Timezone</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{clientData.timezone}</p>
            </div>
          </div>
        </div>
      )}

      {/* Account info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Account</h2>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
          <p className="text-sm font-medium text-gray-900 mt-1">{user?.email}</p>
        </div>
      </div>

      {/* Change password */}
      <form onSubmit={handlePasswordChange} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Change Password</h2>

        {message.text && (
          <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
            {message.text}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="At least 6 characters"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Re-enter password"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}
