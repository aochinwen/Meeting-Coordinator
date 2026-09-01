import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ScheduleClient } from '../../components/ScheduleClient'
import userEvent from '@testing-library/user-event'
import { mockSupabaseClient } from '../mocks/supabase'

// canvas-confetti relies on a real canvas context, which jsdom doesn't
// implement — stub it out so the success modal's confetti effect is a no-op.
vi.mock('@/lib/useConfetti', () => ({
  useConfetti: () => vi.fn(),
}))

describe('ScheduleClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'templates') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              { id: 'template-1', name: 'Weekly Sync', description: 'Weekly team sync' },
              { id: 'template-2', name: 'Monthly All-Hands', description: 'Monthly company meeting' }
            ],
            error: null
          })
        }
      } else if (table === 'people') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              { id: 'user-1', name: 'Alice', division: 'Engineering', rank: 'Manager' },
              { id: 'user-2', name: 'Bob', division: 'Product', rank: 'Director' }
            ],
            error: null
          })
        }
      } else if (table === 'meetings') {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'meeting-123', title: 'Strategy Review' },
            error: null
          })
        }
      } else if (table === 'meeting_participants') {
          return {
             insert: vi.fn().mockResolvedValue({ error: null })
          }
      } else if (table === 'user_approvals') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [], error: null })
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: vi.fn().mockResolvedValue({ error: null })
      }
    })
  })

  it('renders schedule form correctly', async () => {
    render(<ScheduleClient />)

    await waitFor(() => {
      expect(screen.getByText('Schedule New Meeting')).toBeInTheDocument()
      expect(screen.getByText('Start Date')).toBeInTheDocument()
    })
  })

  it('allows filling out the form and submitting a meeting', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    render(<ScheduleClient />)

    await waitFor(() => {
      expect(screen.getAllByText('Publish Schedule').length).toBeGreaterThan(0)
    })

    // The Publish Schedule button stays disabled until a title is entered,
    // so fill out the title field first.
    const titleInput = screen.getByPlaceholderText('Enter meeting name...')
    fireEvent.change(titleInput, { target: { value: 'Strategy Review' } })

    // The button is rendered twice (desktop header + mobile sticky footer), so grab the first.
    const [saveButton] = screen.getAllByText('Publish Schedule')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Meeting Created!')).toBeInTheDocument()
    })

    consoleSpy.mockRestore()
  })

  it('toggles recurring options when clicking the toggle', async () => {
    render(<ScheduleClient />)

    await waitFor(() => {
      expect(screen.getByText('Recurrence Settings')).toBeInTheDocument()
    })

    // Recurrence options are hidden until the toggle switch is turned on.
    const recurrenceHeader = screen.getByText('Recurrence Settings').closest('.flex.items-center.justify-between')
    const recurrenceToggle = recurrenceHeader?.querySelector('button')
    fireEvent.click(recurrenceToggle as HTMLElement)

    expect(screen.getByText('Frequency')).toBeInTheDocument()

    // Test frequency toggle
    const monthlyButton = screen.getByText('Monthly')
    fireEvent.click(monthlyButton)

    await waitFor(() => {
      expect(monthlyButton).toHaveClass('bg-white')
    })
  })
})
