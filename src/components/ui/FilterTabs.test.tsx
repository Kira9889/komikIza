import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import FilterTabs from './FilterTabs'

describe('FilterTabs', () => {
  it('marks the active tab and reports a selected tab', () => {
    const onChange = vi.fn()
    render(<FilterTabs tabs={[{ value: 'all', label: 'Semua' }, { value: 'manhwa', label: 'Manhwa' }]} active="all" onChange={onChange} />)

    const all = screen.getByRole('button', { name: 'Semua' })
    const manhwa = screen.getByRole('button', { name: 'Manhwa' })
    expect(all.className).toContain('bg-primary-500')
    expect(manhwa.className).toContain('bg-(--card)')

    fireEvent.click(manhwa)
    expect(onChange).toHaveBeenCalledWith('manhwa')
  })
})
