import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [clientData, setClientData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSession(session) {
    const currentUser = session?.user ?? null
    setUser(currentUser)
    // Admin is a server-set JWT claim (auth.users app_metadata, see
    // migrations/001_admin_role.sql) — the same claim the RLS policies check.
    setIsAdmin(currentUser?.app_metadata?.role === 'admin')

    if (currentUser) {
      // Fetch client data for this user
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('email', currentUser.email)
        .single()
      setClientData(data)
    } else {
      setClientData(null)
    }

    setLoading(false)
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setClientData(null)
    setIsAdmin(false)
  }

  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error }
  }

  return (
    <AuthContext.Provider value={{
      user,
      clientData,
      loading,
      isAdmin,
      signIn,
      signOut,
      updatePassword,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
