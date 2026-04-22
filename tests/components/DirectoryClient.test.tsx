import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DirectoryClient } from '../../components/DirectoryClient'
import { mockSupabaseClient } from '../mocks/supabase'

describe('DirectoryClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders users table properly', async () => {
    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'people') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              { id: '1', name: 'Alice', email: 'alice@example.com', organization: 'Acme', division: 'Engineering', rank: 'Manager' },
              { id: '2', name: 'Bob', email: 'bob@example.com', organization: 'Acme', division: 'Product', rank: 'Director' }
            ],
            error: null
          })
        }
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
    })

    const initialUsers = [
        { id: '1', name: 'Alice', email: 'alice@example.com', organization: 'Acme', division: 'Engineering', rank: 'Manager', created_at: '', updated_at: '' },
        { id: '2', name: 'Bob', email: 'bob@example.com', organization: 'Acme', division: 'Product', rank: 'Director', created_at: '', updated_at: '' }
    ];

    render(<DirectoryClient initialUsers={initialUsers} activeTeamsCount={2} />)

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Engineering')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
    })
  })

  it('opens AddUserModal when clicking "Add User"', async () => {
    render(<DirectoryClient initialUsers={[]} activeTeamsCount={0} />)

    const addButton = screen.getByText('Add User')
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByText('Add New Member')).toBeInTheDocument()
      expect(screen.getByLabelText('Full Name')).toBeInTheDocument()
    })
  })
})
