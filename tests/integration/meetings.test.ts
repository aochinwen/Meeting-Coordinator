import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMeetingSeries, copyTemplateTasksToMeetings, checkConflicts } from '../../lib/meetings'
import { mockSupabaseClient } from '../mocks/supabase'

describe('Meetings Library (Integration Tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createMeetingSeries', () => {
    it('creates a series and instances without auto-copying template tasks (caller handles task insertion)', async () => {
      const input = {
        title: 'Weekly Standup',
        frequency: 'weekly' as const,
        days_of_week: ['M'],
        start_date: '2024-05-01',
        start_time: '10:00',
        end_time: '11:00',
        duration_minutes: 60,
        participants: ['user-1'],
        template_id: 'template-1',
        buffer_minutes: 0,
      }

      // Mock sequence for createMeetingSeries
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'meeting_series') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'series-1' }, error: null })
          }
        } else if (table === 'meetings') {
          // Chainable AND thenable: every method returns the same chain object
          // so any call order (select().eq().order().limit(), or
          // insert().select()) can be awaited at whichever step is terminal.
          // Resolves to an empty result set everywhere, which keeps
          // downstream branches (meeting_activities insert, participants
          // backfill) untriggered without needing to mock those tables too.
          interface MeetingsChain {
            insert: (...args: unknown[]) => MeetingsChain
            select: (...args: unknown[]) => MeetingsChain
            eq: (...args: unknown[]) => MeetingsChain
            order: (...args: unknown[]) => MeetingsChain
            in: (...args: unknown[]) => MeetingsChain
            limit: (...args: unknown[]) => Promise<{ data: never[]; error: null }>
            then: (resolve: (value: { data: never[]; error: null }) => unknown) => unknown
          }
          const meetingsChain: MeetingsChain = {
            insert: vi.fn(() => meetingsChain),
            select: vi.fn(() => meetingsChain),
            eq: vi.fn(() => meetingsChain),
            order: vi.fn(() => meetingsChain),
            in: vi.fn(() => meetingsChain),
            limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
            then: (resolve) => resolve({ data: [], error: null })
          }
          return meetingsChain
        } else if (table === 'meeting_participants') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [], error: null })
          }
        } else if (table === 'template_checklist_tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [
                { description: 'Review metrics' },
                { description: 'Update board' }
              ],
              error: null
            })
          }
        } else if (table === 'meeting_checklist_tasks') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null })
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null })
        }
      })

      const seriesId = await createMeetingSeries(input, 'creator-1')

      expect(seriesId).toBe('series-1')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('meeting_series')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('meetings')
      // Template tasks must NOT be auto-copied here. The caller (UI) is the
      // source of truth for tasks (with user edits and resolved due_days_before),
      // so auto-copying here would create duplicates with null due dates.
      expect(mockSupabaseClient.from).not.toHaveBeenCalledWith('template_checklist_tasks')
      expect(mockSupabaseClient.from).not.toHaveBeenCalledWith('meeting_checklist_tasks')
    })
  })

  describe('copyTemplateTasksToMeetings', () => {
    it('copies tasks to given meetings', async () => {
      const templateId = 'template-1'
      const meetings = [{ id: 'meeting-1', date: '2024-05-06', series_id: 'series-1' }] as any

      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'template_checklist_tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [{ description: 'Task A' }],
              error: null
            })
          }
        } else if (table === 'meetings') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
                data: [{ id: 'meeting-1' }],
                error: null
            })
          }
        } else if (table === 'meeting_checklist_tasks') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null })
          }
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: [], error: null }) }
      })

      await copyTemplateTasksToMeetings(templateId, meetings)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('template_checklist_tasks')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('meeting_checklist_tasks')
    })
  })

  describe('checkConflicts', () => {
    it('detects conflicts properly', async () => {
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'meeting_participants') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  user_id: 'user-1',
                  meetings: {
                    title: 'Another meeting',
                    date: '2024-05-01',
                    start_time: '10:30:00',
                    end_time: '11:30:00'
                  }
                }
              ],
              error: null
            })
          }
        } else if (table === 'people') {
          // checkConflicts looks up participant names via `people`
          // (select('id, name').in('id', participantIds)) — a separate
          // query from meeting_participants, so it needs its own mock.
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [{ id: 'user-1', name: 'Alice' }],
              error: null
            })
          }
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: [], error: null }) }
      })

      const result = await checkConflicts('2024-05-01', '10:00:00', '11:00:00', ['user-1'])

      expect(result.hasConflicts).toBe(true)
      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts[0].userName).toBe('Alice')
      expect(result.conflicts[0].meetingTitle).toBe('Another meeting')
    })

    it('excludes the meeting being edited from its own conflict check', async () => {
      // Same participant, same date/time overlap as the meeting under edit
      // (e.g. changing only the room while keeping date/start/end unchanged).
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'meeting_participants') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  user_id: 'user-1',
                  meetings: {
                    id: 'meeting-1',
                    title: 'Meeting Being Edited',
                    date: '2024-05-01',
                    start_time: '10:00:00',
                    end_time: '11:00:00'
                  }
                }
              ],
              error: null
            })
          }
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: [], error: null }) }
      })

      const result = await checkConflicts('2024-05-01', '10:00:00', '11:00:00', ['user-1'], 'meeting-1')

      expect(result.hasConflicts).toBe(false)
      expect(result.conflicts).toHaveLength(0)
    })

    it('still reports a conflict from a different meeting when excludeMeetingId is set', async () => {
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'meeting_participants') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  user_id: 'user-1',
                  meetings: {
                    id: 'meeting-1',
                    title: 'Meeting Being Edited',
                    date: '2024-05-01',
                    start_time: '10:00:00',
                    end_time: '11:00:00'
                  }
                },
                {
                  user_id: 'user-1',
                  meetings: {
                    id: 'meeting-2',
                    title: 'Another meeting',
                    date: '2024-05-01',
                    start_time: '10:30:00',
                    end_time: '11:30:00'
                  }
                }
              ],
              error: null
            })
          }
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: [], error: null }) }
      })

      const result = await checkConflicts('2024-05-01', '10:00:00', '11:00:00', ['user-1'], 'meeting-1')

      expect(result.hasConflicts).toBe(true)
      expect(result.conflicts).toHaveLength(1)
      expect(result.conflicts[0].meetingTitle).toBe('Another meeting')
    })
  })
})
