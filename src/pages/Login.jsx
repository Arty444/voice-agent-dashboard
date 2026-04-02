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
      width: '100%',
      backgroundImage: 'url("/beacon-login.png")',
      backgroundSize: 'cover',
      backgroundPosition: 'center top',
      backgroundRepeat: 'no-repeat',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Spacer to push form down to match image layout */}
      <div style={{ flex: '1 1 58%' }} />

      {/* Login Form - styled to match the image exactly */}
      <form onSubmit={handleSubmit} style={{
        width: '360px',
        maxWidth: '88vw',
        background: 'rgba(17, 24, 39, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '14px',
        padding: '28px 28px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0px',
      }}>
        {error && (
          <div style={{
            background: 'rgba(220, 38, 38, 0.2)',
            border: '1px solid rgba(220, 38, 38, 0.4)',
            color: '#fca5a5',
            fontSize: '0.85rem',
            borderRadius: '8px',
            padding: '0.65rem 1rem',
            marginBottom: '16px',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        {/* Email */}
        <label style={{
          fontSize: '0.7rem',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.6)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginBottom: '6px',
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
            padding: '10px 0',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            color: '#ffffff',
            fontSize: '0.95rem',
            outline: 'none',
            boxSizing: 'border-box',
            marginBottom: '20px',
          }}
          onFocus={(e) => e.target.style.borderBottomColor = 'rgba(255,255,255,0.5)'}
          onBlur={(e) => e.target.style.borderBottomColor = 'rgba(255,255,255,0.2)'}
        />

        {/* Password */}
        <label style={{
          fontSize: '0.7rem',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.6)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginBottom: '6px',
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
            padding: '10px 0',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            color: '#ffffff',
            fontSize: '0.95rem',
            outline: 'none',
            boxSizing: 'border-box',
            marginBottom: '24px',
          }}
          onFocus={(e) => e.target.style.borderBottomColor = 'rgba(255,255,255,0.5)'}
          onBlur={(e) => e.target.style.borderBottomColor = 'rgba(255,255,255,0.2)'}
        />

        {/* Login Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '13px',
            background: loading
              ? 'rgba(255,255,255,0.15)'
              : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(235,230,215,0.95) 100%)',
            color: loading ? 'rgba(255,255,255,0.5)' : '#1a1a2e',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          {loading ? 'SIGNING IN...' : 'LOGIN'}
        </button>
      </form>

      {/* Bottom spacer */}
      <div style={{ flex: '1 1 12%' }} />
    </div>
  )
}
