import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthContext } from '../src/hooks/auth-context'
import RequireAuth from '../src/components/common/RequireAuth'

function LoginDestination() { const location = useLocation(); return <p>Login destination: {location.search}</p> }
function mount(user) {
  return render(<MemoryRouter initialEntries={['/smart-home/devices']}><AuthContext.Provider value={{ user }}><Routes><Route path="/smart-home/*" element={<RequireAuth role="admin"><h1>Private devices</h1></RequireAuth>} /><Route path="/login" element={<LoginDestination />} /><Route path="/jobs" element={<h1>Find jobs</h1>} /></Routes></AuthContext.Provider></MemoryRouter>)
}
describe('dashboard authentication', () => {
  it('redirects guests before private dashboard content mounts', async () => {
    mount(null)
    expect(await screen.findByText(/Login destination:/)).toHaveTextContent('next=%2Fsmart-home%2Fdevices')
    expect(screen.queryByRole('heading', { name: 'Private devices' })).not.toBeInTheDocument()
  })
  it('allows an admin account to see the dashboard', () => {
    mount({ id: 1, role: 'admin' })
    expect(screen.getByRole('heading', { name: 'Private devices' })).toBeInTheDocument()
  })
  it('keeps normal users on the jobs website instead of the admin dashboard', async () => {
    mount({ id: 2, role: 'student' })
    expect(await screen.findByRole('heading', { name: 'Find jobs' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Private devices' })).not.toBeInTheDocument()
  })
})
