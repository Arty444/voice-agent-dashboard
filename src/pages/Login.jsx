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
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background image - your exact Beacon design */}
      <img
        src="/beacon-login.png"
        alt="Beacon Login"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
        }}
      />

      {/* Invisible functional form overlay - positioned over the image's form */}
      <form onSubmit={handleSubmit} style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: '18vh',
      }}>
        {error && (
          <div style={{
            background: 'rgba(220, 38, 38, 0.9)',
            color: '#ffffff',
            fontSize: '0.85rem',
            borderRadius: '8px',
            padding: '0.65rem 1.2rem',
            marginBottom: '8px',
            textAlign: 'center',
            zIndex: 20,
            maxWidth: '320px',
          }}>
            {error}
          </div>
        )}

        <div style={{
          width: '340px',
          maxWidth: '85vw',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Email input - invisible, sits over the image's email field */}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder=""
            autoComplete="email"
            style={{
              width: '100%',
              height: '52px',
              padding: '24px 12px 8px',
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.9)',
              fontSize: '0.95rem',
              outline: 'none',
              boxSizing: 'border-box',
              caretColor: 'white',
            }}
          />

          {/* Password input - invisible, sits over the image's password field */}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder=""
            autoComplete="current-password"
            style={{
              width: '100%',
              height: '58px',
              padding: '24px 12px 8px',
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.9)',
              fontSize: '0.95rem',
              outline: 'none',
              boxSizing: 'border-box',
              caretColor: 'white',
            }}
          />

          {/* Login button - invisible, sits over the image's LOGIN button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              height: '50px',
              marginTop: '4px',
              background: 'transparent',
              color: 'transparent',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
            }}
          >
            LOGIN
          </button>
        </div>
      </form>
    </div>
  )
}
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
