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
    <div className="login-page">
      <form onSubmit={handleSubmit} className="login-form">
        <div className="login-mobile-heading">
          <img src="/mchugh-logo-white.png" alt="McHugh Jiu Jitsu" />
          <div>
            <h1>McHugh Jiu Jitsu</h1>
            <p>Command Center</p>
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(220, 38, 38, 0.2)',
            border: '1px solid rgba(220, 38, 38, 0.4)',
            color: '#fca5a5',
            fontSize: '0.8rem',
            borderRadius: '8px',
            padding: '8px 12px',
            marginBottom: '3%',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <label style={{
          fontSize: '0.65rem',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.55)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginBottom: '1px'
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
            padding: '6px 0',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            color: '#ffffff',
            fontSize: '0.85rem',
            outline: 'none',
            boxSizing: 'border-box',
            marginBottom: '5%'
          }}
        />

        <label style={{
          fontSize: '0.65rem',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.55)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginBottom: '1px'
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
            padding: '6px 0',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            color: '#ffffff',
            fontSize: '0.85rem',
            outline: 'none',
            boxSizing: 'border-box',
            marginBottom: '6%'
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px',
            background: loading
              ? 'rgba(255,255,255,0.15)'
              : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(235,228,210,0.95) 100%)',
            color: loading ? 'rgba(255,255,255,0.5)' : '#1a1a2e',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.8rem',
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
