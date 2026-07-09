import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Per-client feature flags read from the clients table (see
// migrations/004_clients_agent_config.sql). RLS lets a gym read its own row
// and the admin read any row, so this resolves for both viewer types.
// Flags are effectively static per session — cache per client id.
const cache = new Map()

export function useClientFlags(clientId) {
  const [flags, setFlags] = useState(() => cache.get(clientId) || null)

  useEffect(() => {
    if (!clientId) { setFlags(null); return }
    if (cache.has(clientId)) { setFlags(cache.get(clientId)); return }
    let alive = true
    supabase
      .from('clients')
      .select('efc_enabled')
      .eq('id', clientId)
      .maybeSingle()
      .then(({ data }) => {
        const resolved = { efcEnabled: Boolean(data?.efc_enabled) }
        cache.set(clientId, resolved)
        if (alive) setFlags(resolved)
      })
    return () => { alive = false }
  }, [clientId])

  return flags || { efcEnabled: false }
}
