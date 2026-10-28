import { useState } from 'react'
export function useStoredState(key, initial, valid = () => true) {
  const [value, setValue] = useState(() => {
    try { const data = JSON.parse(localStorage.getItem(key)); return data !== null && valid(data) ? data : initial } catch { return initial }
  })
  const [error, setError] = useState('')
  function update(next) {
    setValue(next)
    try { localStorage.setItem(key, JSON.stringify(next)); setError('') }
    catch { setError('Browser storage is unavailable. Changes last only for this session.') }
  }
  return [value, update, error]
}
