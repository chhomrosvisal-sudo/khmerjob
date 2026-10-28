import { useState } from 'react'
import { validateAuthForm } from '../services/auth-validation'

// Dependency-free fallback. The Vite alias uses RHF/Zod when both are installed.
export function useAuthForm({ mode, defaultValues }) {
  const [values, setValues] = useState(defaultValues)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setSubmitting] = useState(false)
  const format = data => Object.fromEntries(Object.entries(data).map(([key, message]) => [key, { type: 'validation', message }]))
  function register(name) {
    return { name, ...(typeof values[name] === 'boolean' ? { checked: values[name] } : { value: values[name] ?? '' }), onChange: event => {
      const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
      setValues(current => ({ ...current, [name]: value }))
      setErrors(current => ({ ...current, [name]: undefined }))
    }, onBlur: () => {
      const result = validateAuthForm(mode, values)
      setErrors(current => ({ ...current, [name]: result[name] ? { message: result[name] } : undefined }))
    } }
  }
  return {
    register, watch: name => values[name], getValues: () => values,
    setValue: (name, value, options = {}) => {
      setValues(current => ({ ...current, [name]: value }))
      const message = options.shouldValidate ? validateAuthForm(mode, { ...values, [name]: value })[name] : undefined
      setErrors(current => ({ ...current, [name]: message ? { message } : undefined }))
    },
    reset: (next = defaultValues) => { setValues(next); setErrors({}) },
    formState: { errors, isSubmitting },
    handleSubmit: callback => async event => {
      event.preventDefault()
      if (isSubmitting) return
      const result = validateAuthForm(mode, values)
      setErrors(format(result))
      if (Object.keys(result).length) {
        event.currentTarget.elements.namedItem(Object.keys(result)[0])?.focus()
        return
      }
      setSubmitting(true)
      try { await callback(values) } finally { setSubmitting(false) }
    },
  }
}
