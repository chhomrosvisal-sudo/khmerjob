export function passwordStrength(value = '') {
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter(pattern => pattern.test(value)).length
  if (!value) return { score: 0, label: 'Use at least 12 characters', color: '#d9dee8' }
  if (value.length < 12) return { score: 1, label: 'Too short · use at least 12 characters', color: '#ef7272' }
  if (variety < 3) return { score: 2, label: 'Fair · try a mix of characters', color: '#e7b34b' }
  if (value.length < 16) return { score: 3, label: 'Good password', color: '#67b58c' }
  return { score: 4, label: 'Strong password', color: '#22a768' }
}

export function validateAuthForm(mode, values) {
  const errors = {}
  if (['login', 'register', 'employer-register', 'forgot'].includes(mode)) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((values.email || '').trim()) || values.email.trim().length > 254) errors.email = 'Enter a valid email address.'
  }
  if (['login', 'register', 'employer-register', 'reset'].includes(mode)) {
    if (!values.password || values.password.length < 12 || values.password.length > 128) errors.password = 'Use a password between 12 and 128 characters.'
  }
  if (mode === 'register') {
    if (!values.firstName?.trim()) errors.firstName = 'Enter your first name.'
    if (!values.lastName?.trim()) errors.lastName = 'Enter your last name.'
    if (`${values.firstName || ''} ${values.lastName || ''}`.trim().length > 80) errors.lastName = 'Your full name must be 80 characters or fewer.'
    if (values.phone && !/^\+?[0-9 ()-]{7,24}$/.test(values.phone)) errors.phone = 'Enter a valid phone number or leave it blank.'
    if (!values.terms) errors.terms = 'Please read and accept the terms and privacy notice.'
  }
  if (mode === 'employer-register') {
    if (!values.company?.trim() || values.company.trim().length > 160) errors.company = 'Enter a company name of 1–160 characters.'
    if (!values.terms) errors.terms = 'Please accept the employer onboarding notice.'
  }
  if (['register', 'employer-register', 'reset'].includes(mode) && values.confirmPassword !== values.password) errors.confirmPassword = 'Your passwords do not match.'
  if (mode === 'verify' && !/^\d{6}$/.test(values.code || '')) errors.code = 'Enter the complete six-digit code.'
  return errors
}

export function maskEmail(value = '') {
  const [name, domain] = value.split('@')
  return domain ? `${name.slice(0, 2)}•••@${domain}` : 'your email address'
}

export function editOtp(value, index, text) {
  const digits = Array.from({ length: 6 }, (_, i) => /^\d$/.test(value[i] || '') ? value[i] : '')
  const cleaned = text.replace(/\D/g, '')
  if (!cleaned) digits[index] = ''
  else cleaned.slice(0, 6 - index).split('').forEach((digit, offset) => { digits[index + offset] = digit })
  // Spaces preserve empty positions when a digit in the middle is deleted.
  return digits.map(digit => digit || ' ').join('').trimEnd()
}
