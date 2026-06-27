import { useAuth } from '../context/AuthContext'
import { getBranding } from '../config/clientBranding'

// Returns the branding config for the currently logged-in client.
// Re-resolves whenever clientData changes (login/logout).
export function useBranding() {
  const { clientData } = useAuth()
  return getBranding(clientData)
}
