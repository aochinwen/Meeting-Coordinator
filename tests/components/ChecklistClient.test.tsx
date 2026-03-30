import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ChecklistClient } from '../../components/ChecklistClient'
import userEvent from '@testing-library/user-event'
import { mockSupabaseClient } from '../mocks/supabase'

describe('ChecklistClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock the channel subscription setup
    mockSupabaseClient.channel = vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn()
    });
  })

  it('renders tasks and overall progress correctly', async () => {
    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'meeting_checklist_tasks') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              { id: 'task-1', meeting_id: 'meeting-1', description: 'Prepare slides', assigned_user_id: 'user-1', is_completed: false, created_at: '', assignee: { name: 'Alice' } },
              { id: 'task-2', meeting_id: 'meeting-1', description: 'Send agenda', assigned_user_id: null, is_completed: true, created_at: '', assignee: null }
            ],
            error: null
          })
        }
      } else if (table === 'meeting_activities') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null })
        }
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
    })

    render(<ChecklistClient meetingId="meeting-1" />)

    await waitFor(() => {
      expect(screen.getByText('Prepare slides')).toBeInTheDocument()
      expect(screen.getByText('Send agenda')).toBeInTheDocument()

      // 1 out of 2 tasks completed = 50%
      expect(screen.getByText('50%')).toBeInTheDocument()
      expect(screen.getByText('1 of 2 completed')).toBeInTheDocument()
    })
  })

  it('toggles task completion status', async () => {
    let mockTasks = [
        { id: 'task-1', meeting_id: 'meeting-1', description: 'Prepare slides', assigned_user_id: 'user-1', is_completed: false, created_at: '', assignee: { name: 'Alice' } }
    ]

    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'meeting_checklist_tasks') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockImplementation(() => Promise.resolve({ data: mockTasks, error: null })),
          update: vi.fn().mockReturnThis(),
        }
      } else if (table === 'meeting_activities') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          insert: vi.fn().mockResolvedValue({ error: null })
        }
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
    })

    render(<ChecklistClient meetingId="meeting-1" />)

    await waitFor(() => {
      expect(screen.getByText('Prepare slides')).toBeInTheDocument()
    })

    // Modify mock data to simulate DB update
    mockTasks = [{ ...mockTasks[0], is_completed: true }]

    // Find the uncompleted task checkbox - the ChecklistClient renders a custom div with a check icon
    // For pending tasks, it renders a div without the check icon. We click the parent container.
    // Easiest is to search for the div that comes right before the text
    const checkboxes = document.querySelectorAll('.cursor-pointer')
    fireEvent.click(checkboxes[0])

    await waitFor(() => {
      // Supabase update should be called with is_completed: true
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('meeting_checklist_tasks')
      // Fetch was called again and now reads the updated mock
      expect(screen.getByText('100%')).toBeInTheDocument()
    })
  })

  it('adds a new task', async () => {
    let mockTasks: any[] = []

    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'meeting_checklist_tasks') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockImplementation(() => Promise.resolve({ data: mockTasks, error: null })),
          insert: vi.fn().mockImplementation(() => {
              mockTasks = [{ id: 'task-3', description: 'New Task', is_completed: false, meeting_id: 'meeting-1', assigned_user_id: null, created_at: '' }]
              return Promise.resolve({ error: null })
          }),
        }
      } else if (table === 'meeting_activities') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          insert: vi.fn().mockResolvedValue({ error: null })
        }
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
    })

    render(<ChecklistClient meetingId="meeting-1" />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add a new action item...')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('Add a new action item...')
    await userEvent.type(input, 'New Task{enter}')

    await waitFor(() => {
      expect(screen.getByText('New Task')).toBeInTheDocument()
    })
  })
})
