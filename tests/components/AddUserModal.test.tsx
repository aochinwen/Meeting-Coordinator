import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AddUserModal } from '../../components/AddUserModal'
import userEvent from '@testing-library/user-event'

describe('AddUserModal', () => {
  const onClose = vi.fn()
  const onAdd = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('submits user form correctly', async () => {
    render(<AddUserModal isOpen={true} onClose={onClose} onAdd={onAdd} />)

    await userEvent.type(screen.getByLabelText('Full Name'), 'John Doe')
    await userEvent.type(screen.getByLabelText('Division'), 'Sales')
    await userEvent.selectOptions(screen.getByLabelText('Rank / Role'), 'Manager')

    fireEvent.click(screen.getByText('Add Member'))

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith({ name: 'John Doe', email: '', organization: '', division: 'Sales', rank: 'Manager' })
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('shows error if submission fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failingOnAdd = vi.fn().mockRejectedValue(new Error('Failed'))

    render(<AddUserModal isOpen={true} onClose={onClose} onAdd={failingOnAdd} />)

    await userEvent.type(screen.getByLabelText('Full Name'), 'Jane Doe')
    await userEvent.type(screen.getByLabelText('Division'), 'Sales')
    await userEvent.selectOptions(screen.getByLabelText('Rank / Role'), 'Executive')

    fireEvent.click(screen.getByText('Add Member'))

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error adding user:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })
})
