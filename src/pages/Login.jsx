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
      background: '#0a1628',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Full image displayed without cropping */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '900px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <img
          src="/beacon-login.png"
          alt="Beacon"
          style={{
            width: '100%',
            height: 'auto',
            display: 'block'
          }}
        />
        {/* Real form overlaid on top of the image's form */}
        <form onSubmit={handleSubmit} style={{
          position: 'absolute',
          bottom: '4%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '52%',
          background: 'rgba(15, 20, 30, 1)',
          borderRadius: '14px',
          padding: '28px 32px 24px',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 2
        }}>
          {error && (
            <div style={{
              background: 'rgba(220, 38, 38, 0.2)',
              border: '1px solid rgba(220, 38, 38, 0.4)',
              color: '#fca5a5',
              fontSize: '0.85rem',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '14px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <label style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginBottom: '2px'
          }}>
            EMAIL
          </label>
          <input
            type="email"
            value={email}
            onChange={function(e) { setEmail(e.target.value) }}
            required
            placeholder="you@example.com"
            style={{
              width: '100%',
              padding: '8px 0',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.2)',
              color: '#ffffff',
              fontSize: '0.9rem',
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: '16px'
            }}
          />

          <label style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginBottom: '2px'
          }}>
            PASSWORD
          </label>
          <input
            type="password"
            value={password}
            onChange={function(e) { setPassword(e.target.value) }}
            required
            placeholder="••••••••"
            style={{
              width: '100%',
              padding: '8px 0',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.2)',
              color: '#ffffff',
              fontSize: '0.9rem',
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: '20px'
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading
                ? 'rgba(255,255,255,0.15)'
                : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(235,228,210,0.95) 100%)',
              color: loading ? 'rgba(255,255,255,0.5)' : '#1a1a2e',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'SIGNING IN...' : 'LOGIN'}
          </button>
        </form>
      </div>
    </div>
  )
}
