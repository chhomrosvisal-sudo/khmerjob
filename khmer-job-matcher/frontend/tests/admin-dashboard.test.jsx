import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../src/hooks/auth-context'
import AdminDashboard from '../src/pages/AdminDashboard'
import AdminNavigation from '../src/components/layout/AdminNavigation'

// These fixtures are confined to tests. Production components always call FastAPI.
const overview = {
  users: 10, students: 6, employers: 4, jobs: 8, open_jobs: 5,
  applications: 13, skills: 9, pending_employers: 1,
  statuses: { submitted: 10, reviewing: 2, accepted: 1 },
}
const application = {
  id: 1, applicant_name: 'Dara', applicant_email: 'dara@example.com',
  job_title: 'Python Developer', company_name: 'Test Company',
  status: 'submitted', created_at: '2026-10-01T12:00:00', is_demo: true,
}

function mount(path, api) {
  const originalApi = api
  api = (url, options) => url.startsWith('/api/admin/dashboard?') ? Promise.resolve({
    start: '2026-01-01', end: '2026-01-31', students: 0, employers: 0,
    verified_companies: 0, active_jobs: 0, applications: 0, pending_employers: 0,
    ai_matches: null, pending_jobs: null, student_registrations: [], job_postings: [],
    application_statuses: [], top_skills: [], activities: [], notes: [],
  }) : originalApi(url, options)
  return render(<MemoryRouter initialEntries={[path]}>
    <AuthContext.Provider value={{ api, user: { role: 'admin' } }}>
      <AdminDashboard />
    </AuthContext.Provider>
  </MemoryRouter>)
}

describe('live admin dashboard controls', () => {
  it('loads aggregate skill gaps and can include demo jobs', async () => {
    const api = vi.fn(async path => path === '/api/admin/overview' ? overview : {
      students: 2, jobs: 1, items: [{ skill_id: 1, name: 'Python', jobs_requiring: 1,
        students_with_skill: 1, students_missing_skill: 1, coverage_percent: 50 }],
    })
    mount('/dashboard/skill-gaps', api)
    expect(await screen.findByText('50%')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include fictional demo jobs' }))
    await waitFor(() => expect(api.mock.calls.some(([path]) => path.includes('include_demo=true'))).toBe(true))
  })

  it('filters recorded administrator activity and handles an empty result', async () => {
    const api = vi.fn(async path => path === '/api/admin/overview' ? overview : { items: [], total: 0 })
    mount('/dashboard/activity-logs', api)
    expect(await screen.findByText('No administrator changes recorded for this filter.')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox', { name: 'Action' }), { target: { value: 'skill.created' } })
    await waitFor(() => expect(api.mock.calls.some(([path]) => path.includes('action=skill.created'))).toBe(true))
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('renders API counts and links each statistic to its management section', async () => {
    const api = vi.fn(async path => path === '/api/admin/overview'
      ? overview : { items: [], total: 0 })
    mount('/dashboard', api)
    const studentLink = await screen.findByRole('link', { name: 'Students', exact: true })
    expect(studentLink).toHaveAttribute('href', '/dashboard/students')
    expect(within(studentLink.closest('section')).getByText('6')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Applications', exact: true })).toHaveAttribute('href', '/dashboard/applications')
    expect(screen.getByRole('progressbar', { name: 'submitted' })).toHaveAttribute('value', '10')
  })

  it('approves an employer through FastAPI and reloads the queue and counts', async () => {
    let approved = false
    const api = vi.fn(async (path, options) => {
      if (options?.method === 'PATCH') { approved = true; return { approved: true } }
      if (path === '/api/admin/overview') return { ...overview, pending_employers: approved ? 0 : 1 }
      return { items: approved ? [] : [{ id: 7, name: 'Pending Company', approved: false }], total: approved ? 0 : 1 }
    })
    mount('/dashboard', api)
    fireEvent.click(await screen.findByRole('button', { name: 'Approve employer' }))
    expect(api.mock.calls.some(([, options]) => options?.method === 'PATCH')).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm', exact: true }))
    await waitFor(() => expect(api).toHaveBeenCalledWith('/api/admin/companies/7', { method: 'PATCH', body: { approved: true } }))
    expect(await screen.findByText('No employer accounts are waiting for approval.')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Change saved.')
  })

  it('filters student accounts on the server and sends account changes to the existing API', async () => {
    const api = vi.fn(async (path, options) => {
      if (path === '/api/admin/overview') return overview
      if (options?.method === 'PATCH') return { is_active: false }
      return { items: [{ id: 3, email: 'student@example.com', role: 'student', is_active: true }], total: 1 }
    })
    mount('/dashboard/students', api)
    fireEvent.click(await screen.findByRole('button', { name: 'Disable account' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm', exact: true }))
    await waitFor(() => expect(api).toHaveBeenCalledWith('/api/admin/users/3', { method: 'PATCH', body: { is_active: false } }))
    expect(api.mock.calls.some(([path]) => path.includes('role=student'))).toBe(true)
  })

  it('cancels sensitive changes without sending an update', async () => {
    const api = vi.fn(async path => path === '/api/admin/overview' ? overview : {
      items: [{ id: 3, email: 'student@example.com', role: 'student', is_active: true }], total: 1,
    })
    mount('/dashboard/students', api)
    fireEvent.click(await screen.findByRole('button', { name: 'Disable account' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(api.mock.calls.some(([, options]) => options?.method === 'PATCH')).toBe(false)
  })

  it('paginates applications and resets pagination when search or status changes', async () => {
    const api = vi.fn(async path => path === '/api/admin/overview'
      ? overview : { items: [application], total: 13 })
    mount('/dashboard/applications', api)
    expect(await screen.findByText('dara@example.com')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(api.mock.calls.some(([path]) => path.includes('page=2'))).toBe(true))
    fireEvent.change(screen.getByRole('combobox', { name: 'Application status' }), { target: { value: 'reviewing' } })
    await waitFor(() => expect(api.mock.calls.some(([path]) => path.includes('page=1') && path.includes('status=reviewing'))).toBe(true))
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search applications' }), { target: { value: 'Dara' } })
    await waitFor(() => expect(api.mock.calls.some(([path]) => path.includes('q=Dara') && path.includes('status=reviewing'))).toBe(true))
  })

  it('shows empty applications without substituting demo content', async () => {
    const api = vi.fn(async path => path === '/api/admin/overview'
      ? overview : { items: [], total: 0 })
    mount('/dashboard/applications', api)
    expect(await screen.findByText('No applications recorded yet.')).toBeInTheDocument()
    expect(screen.queryByText('dara@example.com')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('offers a retry after an application API failure', async () => {
    let failed = true
    const api = vi.fn(async path => {
      if (path === '/api/admin/overview') return overview
      if (failed) throw new Error('Database unavailable')
      return { items: [application], total: 1 }
    })
    mount('/dashboard/applications', api)
    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable')
    failed = false
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('dara@example.com')).toBeInTheDocument()
  })

  it('reports unknown admin routes instead of silently showing the overview', () => {
    mount('/dashboard/not-a-page', vi.fn(async () => overview))
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Recruitment overview' })).not.toBeInTheDocument()
  })

  it('connects Applications, Skill Gap Analytics and Activity Logs', () => {
    render(<MemoryRouter initialEntries={['/dashboard/applications']}><AdminNavigation /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Applications', exact: true })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Skill Gap Analytics', exact: true })).toHaveAttribute('href', '/dashboard/skill-gaps')
    expect(screen.getByRole('link', { name: 'Activity Logs', exact: true })).toHaveAttribute('href', '/dashboard/activity-logs')
  })
})
