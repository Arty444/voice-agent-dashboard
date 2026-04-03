import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import branding from '../config/clientBranding'
import {
  LayoutDashboard,
  Phone,
  Users,
  BarChart3,
  Settings,
  Shield,
  LogOut,
  Menu,
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { to: '/', label: branding.terminology.dashboard, icon: LayoutDashboard },
  { to: '/calls', label: branding.terminology.calls, icon: Phone },
  { to: '/leads', label: branding.terminology.leads, icon: Users },
  { to: '/analytics', label: branding.terminology.analytics, icon: BarChart3 },
  { to: '/settings', label: branding.terminology.settings, icon: Settings },
]

export default function Layout() {
  const { user, clientData, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const displayName = clientData?.business_name || user?.email || ''

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: branding.colors.surface, fontFamily: "'Poppins', sans-serif" }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-72
          transform transition-transform lg:translate-x-0 lg:static lg:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ backgroundColor: branding.colors.sidebar }}
      >
        <div className="flex flex-col h-full">
          {/* Logo area — large and prominent */}
          <div className="px-6 pt-8 pb-6 border-b border-white/10 flex flex-col items-center text-center">
            <img
              src={branding.logo}
              alt={branding.name}
              className="w-24 h-24 object-contain mb-3"
            />
            <h1
              className="text-xl font-bold text-white"
              style={{ fontFamily: "'Khand', sans-serif", letterSpacing: '0.03em' }}
            >
              {branding.name}
            </h1>
            <p className="text-[11px] tracking-widest mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Powered by {branding.poweredBy}
            </p>
            {displayName && (
              <p className="text-xs mt-3 truncate w-full" style={{ color: branding.colors.sidebarText }}>
                {displayName}
              </p>
            )}
          </div>

          {/* Nav links */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-4 px-4 py-3 rounded-lg text-[15px] font-medium transition-colors"
                style={({ isActive }) => ({
                  backgroundColor: isActive ? 'rgba(24, 103, 192, 0.15)' : 'transparent',
                  color: isActive ? '#60a5fa' : branding.colors.sidebarText,
                })}
              >
                <Icon size={20} />
                {label}
              </NavLink>
            ))}

            {isAdmin && (
              <NavLink
                to="/admin"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-4 px-4 py-3 rounded-lg text-[15px] font-medium transition-colors"
                style={({ isActive }) => ({
                  backgroundColor: isActive ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                  color: isActive ? '#c084fc' : 'rgba(168, 85, 247, 0.7)',
                })}
              >
                <Shield size={20} />
                Admin
              </NavLink>
            )}
          </nav>

          {/* Sign out */}
          <div className="p-4 border-t border-white/10">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-4 px-4 py-3 rounded-lg text-[15px] font-medium w-full transition-colors hover:bg-white/5"
              style={{ color: branding.colors.sidebarText }}
            >
              <LogOut size={20} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <header
          className="lg:hidden flex items-center justify-between p-4 border-b"
          style={{ backgroundColor: branding.colors.sidebar, borderColor: 'rgba(255,255,255,0.1)' }}
        >
          <button onClick={() => setSidebarOpen(true)} className="text-white">
            <Menu size={24} />
          </button>
          <img src={branding.logo} alt={branding.name} className="w-8 h-8 object-contain" />
          <div className="w-6" />
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
