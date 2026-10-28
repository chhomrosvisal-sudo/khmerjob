import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../src/hooks/auth-context'
import Login from '../src/pages/auth/Login'
import OTPInput from '../src/components/auth/OTPInput'

describe('authentication UI interactions', () => {
  it('shows and hides the password and validates a demo without creating a real session', async () => {
    const signIn = vi.fn()
    render(<MemoryRouter initialEntries={['/login?demo=1']}><AuthContext.Provider value={{ signIn, user: null }}><Login /></AuthContext.Provider></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'demo@example.com' } })
    const password = screen.getByLabelText('Password')
    fireEvent.change(password, { target: { value: 'a long demo password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password).toHaveAttribute('type', 'text')
    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(password).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByRole('button', { name: 'Login', exact: true }))
    expect(await screen.findByRole('status')).toHaveTextContent('No session was created')
    expect(signIn).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Google' })).toBeDisabled()
  })

  it('accepts a pasted OTP, preserves positions on deletion, and supports backspace navigation', () => {
    function Entry() { const [value, setValue] = useState(''); return <OTPInput value={value} onChange={setValue} /> }
    render(<Entry />)
    const digit = index => screen.getByLabelText(`Code digit ${index}`)
    fireEvent.paste(digit(1), { clipboardData: { getData: () => '123456' } })
    expect(digit(6)).toHaveValue('6')
    expect(digit(6)).toHaveFocus()
    fireEvent.change(digit(3), { target: { value: '' } })
    expect(digit(3)).toHaveValue('')
    expect(digit(4)).toHaveValue('4')
    fireEvent.keyDown(digit(3), { key: 'Backspace' })
    expect(digit(2)).toHaveFocus()
    expect(digit(2)).toHaveValue('')
    expect(digit(4)).toHaveValue('4')
  })
})
