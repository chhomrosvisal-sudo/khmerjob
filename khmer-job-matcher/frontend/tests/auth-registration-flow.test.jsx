import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AuthContext } from '../src/hooks/auth-context'
import ApplyForJob from '../src/components/jobs/ApplyForJob'
import Login from '../src/pages/auth/Login'
import Register from '../src/pages/auth/Register'
import { authService } from '../src/services/authService'

const job = { id: 42, is_demo: true }

function CurrentPath() {
  const location = useLocation()
  return <output aria-label="Current path">{location.pathname + location.search}</output>
}

function AuthFlow() {
  const [user, setUser] = useState(null)
  const api = vi.fn(async (path, options) => options?.method === 'POST'
    ? { id: 1, status: 'submitted' }
    : { items: [] })
  const signIn = vi.fn(async () => {
    const account = { role: 'student' }
    setUser(account)
    return account
  })

  return <AuthContext.Provider value={{ user, api, signIn }}>
    <Routes>
      <Route path="/" element={<h1>Public website</h1>} />
      <Route path="/jobs/:id" element={<ApplyForJob job={job} />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
    </Routes>
    <CurrentPath />
  </AuthContext.Provider>
}

describe('job application authentication journey', () => {
  it('returns a job seeker who signs in directly to the public website', async () => {
    render(<MemoryRouter initialEntries={['/login']}><AuthFlow /></MemoryRouter>)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'sokha@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'A secure password 123!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Login', exact: true }))

    expect(await screen.findByRole('heading', { name: 'Public website' })).toBeInTheDocument()
    expect(screen.getByLabelText('Current path')).toHaveTextContent('/')
  })

  it('lets a guest register, log in, return to the job, and apply', async () => {
    const register = vi.spyOn(authService, 'register').mockResolvedValue({ role: 'student' })
    render(<MemoryRouter initialEntries={['/jobs/42']}><AuthFlow /></MemoryRouter>)

    fireEvent.click(screen.getByRole('link', { name: 'Create Account' }))
    expect(await screen.findByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Sokha Chan' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'sokha@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'A secure password 123!' } })
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'A secure password 123!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }))

    expect(await screen.findByText('Account created. Log in to find a job.')).toBeInTheDocument()
    expect(screen.getByLabelText('Current path')).toHaveTextContent('/login?next=%2Fjobs%2F42')
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'sokha@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'A secure password 123!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Login', exact: true }))

    expect(await screen.findByRole('button', { name: 'Submit demo application' })).toBeInTheDocument()
    expect(screen.getByLabelText('Current path')).toHaveTextContent('/jobs/42')
    fireEvent.click(screen.getByRole('button', { name: 'Submit demo application' }))
    expect(await screen.findByRole('heading', { name: 'Application recorded' })).toBeInTheDocument()
    expect(register).toHaveBeenCalledOnce()
    register.mockRestore()
  })
})
