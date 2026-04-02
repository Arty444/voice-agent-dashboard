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

  const pageStyle = {
    minHeight: '100vh',
    width: '100%',
    position: 'relative',
    overflow: 'hidden'
  }

  const imgStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center'
  }

  const formStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: '18vh'
  }

  const wrapperStyle = {
    width: '340px',
    maxWidth: '85vw',
    display: 'flex',
    flexDirection: 'column'
  }

  const inputStyle = {
    width: '100%',
    height: '52px',
    padding: '24px 12px 8px',
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.9)',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
    caretColor: 'white'
  }

  const buttonStyle = {
    width: '100%',
    height: '50px',
    marginTop: '4px',
    background: 'transparent',
    color: 'transparent',
    border: 'none',
    cursor: loading ? 'not-allowed' : 'pointer',
    fontSize: '0.9rem'
  }

  const errorStyle = {
    background: 'rgba(220, 38, 38, 0.9)',
    color: '#ffffff',
    fontSize: '0.85rem',
    borderRadius: '8px',
    padding: '10px 16px',
    marginBottom: '8px',
    textAlign: 'center',
    zIndex: 20,
    maxWidth: '320px'
  }

  return (
    <div style={pageStyle}>
      <img src="/beacon-login.png" alt="Beacon" style={imgStyle} />
      <form onSubmit={handleSubmit} style={formStyle}>
        {error && <div style={errorStyle}>{error}</div>}
        <div style={wrapperStyle}>
          <input
            type="email"
            value={email}
            onChange={function(e) { setEmail(e.target.value) }}
            required
            style={inputStyle}
          />
          <input
            type="password"
            value={password}
            onChange={function(e) { setPassword(e.target.value) }}
            required
            style={inputStyle}
          />
          <button type="submit" disabled={loading} style={buttonStyle}>
            LOGIN
          </button>
        </div>
      </form>
    </div>
  )
}
