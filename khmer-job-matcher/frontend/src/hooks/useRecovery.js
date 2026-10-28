import { useContext } from 'react'
import { RecoveryContext } from '../context/recovery-context'

export function useRecovery() {
  const value = useContext(RecoveryContext)
  if (!value) throw new Error('Recovery pages need RecoveryProvider.')
  return value
}
