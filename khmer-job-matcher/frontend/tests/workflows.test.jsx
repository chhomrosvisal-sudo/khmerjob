import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../src/hooks/auth-context'
import { Jobs } from '../src/pages/Jobs'
import Auth from '../src/pages/Auth'
import Profile from '../src/pages/Profile'

const job = { id: 1, title: 'React Developer', employer: { id: 1, name: 'Fictional Studio' }, is_demo: true, location: 'Remote', job_type: 'Internship', requirements: [] }
const cardProps = { skills: [], savedIds: [], pendingIds: [], canSave: true, savedLoading: false, showCoverage: false, toggle: vi.fn() }
function mount(element, auth) {
  return render(<MemoryRouter><AuthContext.Provider value={auth}>{element}</AuthContext.Provider></MemoryRouter>)
}

describe('API-backed workflows', () => {
  it('search and saved filters request new results; empty responses show no demo fallback', async () => {
    const api = vi.fn(async path => {
      const params = new URLSearchParams(path.split('?')[1])
      return { items: params.get('q') === 'absent' ? [] : [job], total: params.get('q') === 'absent' ? 0 : 1 }
    })
    mount(<Jobs cardProps={cardProps} revision={0} />, { api, user: { role: 'student' } })
    expect(await screen.findByRole('heading', { name: 'React Developer' })).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Saved only'))
    await waitFor(() => expect(api.mock.calls.some(([path]) => path.includes('saved_only=true'))).toBe(true))
    fireEvent.change(screen.getByLabelText('Search jobs'), { target: { value: 'absent' } })
    expect(await screen.findByRole('heading', { name: 'No jobs found' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'React Developer' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(await screen.findByRole('heading', { name: 'React Developer' })).toBeInTheDocument()
  })

  it('failed job requests expose an error and can be retried', async () => {
    const api = vi.fn().mockRejectedValueOnce(new Error('Backend unavailable')).mockResolvedValue({ items: [job], total: 1 })
    mount(<Jobs cardProps={cardProps} revision={0} />, { api })
    expect(await screen.findByRole('alert')).toHaveTextContent('Backend unavailable')
    expect(screen.queryByText('Fictional Studio')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'React Developer' })).toBeInTheDocument()
  })

  it('login submits credentials and displays server failures', async () => {
    const signIn = vi.fn().mockRejectedValue(new Error('Invalid or expired credentials'))
    mount(<Auth />, { signIn })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'student@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-password-123' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Login' }).closest('form'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid or expired credentials')
    expect(signIn).toHaveBeenCalledWith({ email: 'student@example.com', password: 'correct-password-123' })
    expect(screen.getByRole('button', { name: 'Login' })).toBeEnabled()
  })

  it('profile updates send catalog skill IDs and show confirmed save feedback', async () => {
    const changed = vi.fn()
    const api = vi.fn(async (path, options) => {
      if (options?.method === 'PATCH') return { name: 'Updated' }
      if (path === '/api/skills') return [{ id: 7, name: 'React', name_km: null }]
      return { id: 1, name: 'Sokha', education: '', interests: '', skills: [] }
    })
    mount(<Profile onChanged={changed} />, { api })
    const name = await screen.findByLabelText('Name')
    fireEvent.change(name, { target: { value: 'Updated' } })
    fireEvent.click(screen.getByLabelText('React'))
    fireEvent.submit(screen.getByRole('button', { name: 'Save profile' }).closest('form'))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Profile saved to your account.'))
    expect(api).toHaveBeenCalledWith('/api/students/me', { method: 'PATCH', body: { name: 'Updated', education: '', interests: '', experience: '', preferred_location: '', preferred_category: '', skill_ids: [7] } })
    expect(changed).toHaveBeenCalledOnce()
  })
})
