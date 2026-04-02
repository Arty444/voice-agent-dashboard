import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await signIn(email, password)
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Background Image */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'url("https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=80")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }} />
      {/* Dark overlay for readability */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.45) 0%, rgba(15, 23, 42, 0.65) 100%)',
      }} />

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '400px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        {/* Lighthouse Logo */}
        <div style={{
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          border: '4px solid rgba(255,255,255,0.9)',
          overflow: 'hidden',
          marginBottom: '1.25rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          background: 'linear-gradient(135deg, #1a365d 0%, #2d3748 50%, #1a202c 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg viewBox="0 0 200 200" width="140" height="140" xmlns="http://www.w3.org/2000/svg">
            {/* Sky gradient */}
            <defs>
              <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1a365d" />
                <stop offset="60%" stopColor="#2a4a7f" />
                <stop offset="100%" stopColor="#c4a44a" />
              </linearGradient>
              <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1a3a5c" />
                <stop offset="100%" stopColor="#0f2540" />
              </linearGradient>
              <linearGradient id="beam" x1="0.5" y1="0" x2="0.5" y2="1">
                <stop offset="0%" stopColor="rgba(255,220,120,0.9)" />
                <stop offset="100%" stopColor="rgba(255,220,120,0)" />
              </linearGradient>
            </defs>
            {/* Sky */}
            <rect x="0" y="0" width="200" height="200" fill="url(#sky)" />
            {/* Water */}
            <ellipse cx="100" cy="200" rx="140" ry="70" fill="url(#water)" />
            {/* Rock/island */}
            <ellipse cx="100" cy="150" rx="45" ry="18" fill="#374151" />
            <ellipse cx="100" cy="148" rx="40" ry="14" fill="#4a5568" />
            {/* Light beams */}
            <polygon points="100,72 30,30 50,28" fill="rgba(255,220,120,0.25)" />
            <polygon points="100,72 170,30 150,28" fill="rgba(255,220,120,0.25)" />
            <polygon points="100,72 20,55 40,50" fill="rgba(255,220,120,0.15)" />
            <polygon points="100,72 180,55 160,50" fill="rgba(255,220,120,0.15)" />
            {/* Lighthouse body */}
            <rect x="92" y="80" width="16" height="65" fill="#e2e8f0" rx="1" />
            {/* Lighthouse stripes */}
            <rect x="92" y="95" width="16" height="8" fill="#c53030" />
            <rect x="92" y="115" width="16" height="8" fill="#c53030" />
            <rect x="92" y="135" width="16" height="8" fill="#c53030" />
            {/* Lighthouse top/lantern room */}
            <rect x="89" y="72" width="22" height="10" fill="#2d3748" rx="1" />
            <rect x="93" y="74" width="14" height="6" fill="#fbd38d" rx="1" />
            {/* Lantern dome */}
            <path d="M89,72 Q100,62 111,72" fill="#2d3748" />
            {/* Light glow */}
            <circle cx="100" cy="75" r="5" fill="rgba(255,220,120,0.7)" />
            <circle cx="100" cy="75" r="10" fill="rgba(255,220,120,0.2)" />
            {/* Base */}
            <rect x="86" y="143" width="28" height="5" fill="#a0aec0" rx="1" />
            {/* Birds */}
            <path d="M45,45 Q48,42 51,45" fill="none" stroke="#94a3b8" strokeWidth="1.2" />
            <path d="M55,38 Q57,36 59,38" fill="none" stroke="#94a3b8" strokeWidth="1" />
            <path d="M140,50 Q143,47 146,50" fill="none" stroke="#94a3b8" strokeWidth="1.2" />
            {/* Water reflection */}
            <line x1="85" y1="165" x2="115" y2="165" stroke="rgba(255,220,120,0.2)" strokeWidth="1.5" />
            <line x1="90" y1="172" x2="110" y2="172" stroke="rgba(255,220,120,0.15)" strokeWidth="1" />
          </svg>
        </div>

        {/* Brand Name */}
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 300,
          color: '#ffffff',
          letterSpacing: '0.45em',
          marginBottom: '0.25rem',
          textTransform: 'uppercase',
          textShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}>
          BEACON
        </h1>
        <p style={{
          fontSize: '0.7rem',
          color: 'rgba(255,255,255,0.75)',
          letterSpacing: '0.35em',
          marginBottom: '2rem',
          textTransform: 'uppercase',
          fontWeight: 400,
        }}>
          Focus. Performance. Flow.
        </p>

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{
          width: '100%',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '12px',
          padding: '2rem',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          {error && (
            <div style={{
              background: 'rgba(220, 38, 38, 0.15)',
              border: '1px solid rgba(220, 38, 38, 0.3)',
              color: '#fca5a5',
              fontSize: '0.85rem',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.7rem',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '0.5rem',
            }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(196,164,74,0.6)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
            />
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.7rem',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '0.5rem',
            }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(196,164,74,0.6)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.85rem',
              background: loading
                ? 'rgba(255,255,255,0.1)'
                : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(230,225,210,0.95) 100%)',
              color: loading ? 'rgba(255,255,255,0.5)' : '#1a202c',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: loading ? 'none' : '0 2px 12px rgba(0,0,0,0.2)',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-1px)'
                e.target.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)'
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = '0 2px 12px rgba(0,0,0,0.2)'
            }}
          >
            {loading ? 'Signing in...' : 'LOGIN'}
          </button>
        </form>
      </div>
    </div>
  )
}
