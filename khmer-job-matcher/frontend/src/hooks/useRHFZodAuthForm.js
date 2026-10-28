import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { validateAuthForm } from '../services/auth-validation'

export function useAuthForm({ mode, defaultValues }) {
  const schema = z.unknown().superRefine((values, context) => {
    for (const [field, message] of Object.entries(validateAuthForm(mode, values))) context.addIssue({ code: 'custom', path: [field], message })
  })
  return useForm({ defaultValues, mode: 'onBlur', resolver: async values => {
    const result = schema.safeParse(values)
    if (result.success) return { values: result.data, errors: {} }
    return { values: {}, errors: Object.fromEntries(result.error.issues.map(issue => [issue.path[0], { type: 'validation', message: issue.message }])) }
  } })
}
