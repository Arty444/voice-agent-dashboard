import { useAuth } from '../context/AuthContext'

/**
 * Returns the client_id to use for data queries.
 * Admin users viewing a specific client will have selectedClientId set.
 * Regular users use their own clientData.id.
 */
export function useClientId(selectedClientId = null) {
  const { clientData, isAdmin } = useAuth()

  if (isAdmin && selectedClientId) {
    return selectedClientId
  }

  return clientData?.id ?? null
}
