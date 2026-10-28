import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../src/hooks/auth-context'
import ApplyForJob from '../src/components/jobs/ApplyForJob'

const job = { id: 3, is_demo: true }
describe('job application actions', () => {
  it('preserves the requested job when a guest signs in to apply', () => {
    render(<MemoryRouter><AuthContext.Provider value={{ user: null }}><ApplyForJob job={job} /></AuthContext.Provider></MemoryRouter>)
    expect(screen.getByRole('link', { name: /Login to apply/ })).toHaveAttribute('href', '/login?next=%2Fjobs%2F3')
  })
  it('records a student application and replaces the apply button with its status', async () => {
    const api = vi.fn(async (path, options) => options?.method === 'POST' ? { id: 1, status: 'submitted' } : { items: [], total: 0 })
    render(<MemoryRouter><AuthContext.Provider value={{ user: { role: 'student' }, api }}><ApplyForJob job={job} /></AuthContext.Provider></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: 'Submit demo application' }))
    expect(await screen.findByRole('heading', { name: 'Application recorded' })).toBeInTheDocument()
    expect(api).toHaveBeenCalledWith('/api/applications/3', { method: 'POST', body: { attach_resume: true } })
    expect(screen.queryByRole('button', { name: 'Submit demo application' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View my applications' })).toHaveAttribute('href', '/account/applications')
  })
})
