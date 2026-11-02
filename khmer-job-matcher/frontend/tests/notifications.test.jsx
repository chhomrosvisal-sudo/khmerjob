import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../src/hooks/auth-context'
import Notifications from '../src/pages/Notifications'

describe('persisted notification controls', () => {
  it('filters unread messages and marks all read through the API', async () => {
    let read = false
    const api = vi.fn(async (path, options) => {
      if (options?.method === 'POST') { read = true; return }
      const unread = new URLSearchParams(path.split('?')[1]).get('unread_only') === 'true'
      return read && unread ? [] : [{ id: 1, message: 'Test update', created_at: '2026-10-28T01:00:00', is_read: read }]
    })
    render(<AuthContext.Provider value={{ api }}><Notifications /></AuthContext.Provider>)
    expect(await screen.findByText('Test update')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Unread only' }))
    await waitFor(() => expect(api.mock.calls.some(([path]) => path.includes('unread_only=true'))).toBe(true))
    await screen.findByText('Test update')
    fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }))
    await waitFor(() => expect(api).toHaveBeenCalledWith('/api/notifications/read-all', { method: 'POST' }))
    expect(await screen.findByText('No notifications yet. Application updates will appear here.')).toBeInTheDocument()
  })

  it('keeps a failed read action visible and enables retry', async () => {
    const api = vi.fn(async (path, options) => {
      if (options?.method === 'POST') throw new Error('Update failed')
      return [{ id: 7, message: 'Unread update', created_at: '2026-10-28T01:00:00', is_read: false }]
    })
    render(<AuthContext.Provider value={{ api }}><Notifications /></AuthContext.Provider>)
    fireEvent.click(await screen.findByRole('button', { name: 'Mark as read' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Update failed')
    expect(screen.getByRole('button', { name: 'Mark as read' })).toBeEnabled()
    expect(screen.getByText('Unread update')).toBeInTheDocument()
  })
})
