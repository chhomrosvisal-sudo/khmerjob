import { useMemo, useState } from 'react'
import { RECOVERY_TTL_MS, RESEND_DELAY_MS } from '../services/authService'
import { RecoveryContext } from './recovery-context'

export function RecoveryProvider({ children }) {
  const [flow, setFlow] = useState(null)
  const value = useMemo(() => ({ flow, begin: (email, options = {}) => {
    const now = Date.now()
    setFlow({ email, mode: options.mode || 'demo', requestId: options.requestId, resetToken: null, stage: 'requested',
      expiresAt: now + (options.mode === 'real' ? 600000 : RECOVERY_TTL_MS), resendAt: now + (options.resendSeconds ? options.resendSeconds * 1000 : RESEND_DELAY_MS) })
  }, verify: token => setFlow(current => current ? { ...current, resetToken: token, stage: 'verified' } : current), complete: () => setFlow(current => current ? { ...current, resetToken: null, stage: 'complete' } : current) }), [flow])
  return <RecoveryContext.Provider value={value}>{children}</RecoveryContext.Provider>
}
