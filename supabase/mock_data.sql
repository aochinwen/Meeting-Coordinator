-- Mock Users
INSERT INTO public.users (id, name, division, rank) VALUES
  ('user-1111-1111-1111-111111111111', 'Alice Chen', 'Engineering', 'Manager'),
  ('user-2222-2222-2222-222222222222', 'Bob Smith', 'Product', 'Director'),
  ('user-3333-3333-3333-333333333333', 'Charlie Davis', 'Design', 'Lead'),
  ('user-4444-4444-4444-444444444444', 'Diana Evans', 'Marketing', 'VP');

-- Mock Templates
INSERT INTO public.templates (id, name, description, chairman_id, coordinator_id) VALUES
  ('tmpl-1111-1111-1111-111111111111', 'Weekly Product Sync', 'Weekly synchronization meeting for all product teams.', 'user-2222-2222-2222-222222222222', 'user-1111-1111-1111-111111111111'),
  ('tmpl-2222-2222-2222-222222222222', 'Monthly All-Hands', 'Company wide monthly all-hands meeting.', 'user-4444-4444-4444-444444444444', 'user-3333-3333-3333-333333333333');

-- Mock Template Checklist Tasks
INSERT INTO public.template_checklist_tasks (template_id, description, order_index) VALUES
  ('tmpl-1111-1111-1111-111111111111', 'Review previous meeting minutes', 0),
  ('tmpl-1111-1111-1111-111111111111', 'Update JIRA board', 1),
  ('tmpl-1111-1111-1111-111111111111', 'Confirm speaker availability', 2),
  ('tmpl-2222-2222-2222-222222222222', 'Prepare slides', 0),
  ('tmpl-2222-2222-2222-222222222222', 'Send out agenda', 1);

-- Mock Meetings (A few scheduled for the upcoming dates)
INSERT INTO public.meetings (id, template_id, title, date, start_time, end_time, status) VALUES
  ('meet-1111-1111-1111-111111111111', 'tmpl-1111-1111-1111-111111111111', 'Q3 Planning Kickoff', CURRENT_DATE + INTERVAL '2 days', '10:00:00', '11:00:00', 'scheduled'),
  ('meet-2222-2222-2222-222222222222', 'tmpl-2222-2222-2222-222222222222', 'Design System Review', CURRENT_DATE + INTERVAL '5 days', '14:00:00', '15:30:00', 'scheduled'),
  ('meet-3333-3333-3333-333333333333', 'tmpl-1111-1111-1111-111111111111', 'Weekly Product Sync', CURRENT_DATE - INTERVAL '1 day', '09:00:00', '10:00:00', 'completed'),
  ('meet-4444-4444-4444-444444444444', NULL, 'Ad-hoc Strategy Sync', CURRENT_DATE + INTERVAL '10 days', '11:00:00', '12:00:00', 'cancelled');

-- Mock Meeting Checklist Tasks
INSERT INTO public.meeting_checklist_tasks (meeting_id, description, assigned_user_id, is_completed) VALUES
  ('meet-1111-1111-1111-111111111111', 'Review previous meeting minutes', 'user-1111-1111-1111-111111111111', false),
  ('meet-1111-1111-1111-111111111111', 'Update JIRA board', 'user-2222-2222-2222-222222222222', false),
  ('meet-1111-1111-1111-111111111111', 'Confirm speaker availability', 'user-3333-3333-3333-333333333333', false),
  ('meet-3333-3333-3333-333333333333', 'Review previous meeting minutes', 'user-1111-1111-1111-111111111111', true),
  ('meet-3333-3333-3333-333333333333', 'Update JIRA board', 'user-2222-2222-2222-222222222222', true);

-- Mock Holidays
INSERT INTO public.holidays (date, name) VALUES
  (CURRENT_DATE + INTERVAL '14 days', 'Company Retreat Day 1'),
  (CURRENT_DATE + INTERVAL '15 days', 'Company Retreat Day 2'),
  ('2024-12-25', 'Christmas Day'),
  ('2024-01-01', 'New Year Day');
