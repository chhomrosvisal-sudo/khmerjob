import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import SmartHomeDashboard from '../src/smart-home/SmartHomeDashboard'

function mount() { return render(<MemoryRouter initialEntries={['/smart-home']}><SmartHomeDashboard /></MemoryRouter>) }

describe('Smart Home frontend controls', () => {
  it('keeps refrigerator switches in sync across widgets', () => {
    mount()
    const home = screen.getByRole('switch', { name: 'Refrigerator in Home power' })
    const side = screen.getByRole('switch', { name: 'Refrigerator in My Devices power' })
    expect(home).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(side)
    expect(home).toHaveAttribute('aria-checked', 'false')
    expect(side).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(home)
    expect(side).toHaveAttribute('aria-checked', 'true')
  })

  it('keeps room targets independent and disables the dial when off', () => {
    mount()
    const room = screen.getByRole('combobox', { name: 'Select room' })
    fireEvent.change(room, { target: { value: 'Bedroom' } })
    expect(screen.getByRole('button', { name: 'Increase temperature' })).toBeDisabled()
    fireEvent.click(screen.getByRole('switch', { name: 'Bedroom temperature controller power' }))
    fireEvent.click(screen.getByRole('button', { name: 'Increase temperature' }))
    expect(screen.getByRole('slider')).toHaveValue('24')
    fireEvent.change(room, { target: { value: 'Living Room' } })
    expect(screen.getByRole('slider')).toHaveValue('25')
    fireEvent.change(screen.getByRole('slider'), { target: { value: '30' } })
    expect(screen.getByRole('button', { name: 'Increase temperature' })).toBeDisabled()
  })

  it('filters devices by search and changes the power chart period', () => {
    mount()
    fireEvent.change(screen.getByRole('textbox', { name: 'Search devices' }), { target: { value: 'Router' } })
    expect(screen.queryByRole('heading', { name: 'Refrigerator' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: 'Router' })).toHaveLength(2)
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter My Devices by status' }), { target: { value: 'off' } })
    expect(screen.getByText('No devices match this status or search.')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox', { name: 'Power chart period' }), { target: { value: 'September – December' } })
    expect(screen.getByText('Oct: 51% of illustrative energy budget')).toBeInTheDocument()
  })
})
