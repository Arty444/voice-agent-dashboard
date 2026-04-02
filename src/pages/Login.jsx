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
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-end',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    }}>
      {/* Real functional form styled to match the image */}
      <form onSubmit={handleSubmit} style={{
        width: '380px',
        maxWidth: '90vw',
        background: 'rgba(15, 20, 30, 0.88)',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
        padding: '32px 32px 28px',
        marginBottom: '6vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {error && (
          <div style={{
            background: 'rgba(220, 38, 38, 0.2)',
            border: '1px solid rgba(220, 38, 38, 0.4)',
            color: '#fca5a5',
            fontSize: '0.85rem',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '16px',
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
          marginBottom: '4px'
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
            padding: '10px 0',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid rgba(255,255,255,0.18)',
            color: '#ffffff',
            fontSize: '0.95rem',
            outline: 'none',
            boxSizing: 'border-box',
            marginBottom: '22px'
          }}
        />

        <label style={{
          fontSize: '0.7rem',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.55)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginBottom: '4px'
        }}>
          PASSWORD
        </label>
        <input
          type="password"
          value={password}
          onChange={function(e) { setPassword(e.target.value) }}
          required
          placeholder="Enter your password"
          style={{
            width: '100%',
            padding: '10px 0',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid rgba(255,255,255,0.18)',
            color: '#ffffff',
            fontSize: '0.95rem',
            outline: 'none',
            boxSizing: 'border-box',
            marginBottom: '26px'
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            background: loading
              ? 'rgba(255,255,255,0.15)'
              : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(235,228,210,0.95) 100%)',
            color: loading ? 'rgba(255,255,255,0.5)' : '#1a1a2e',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.85rem',
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
  )
}
