# Supabase Row Level Security (RLS) — Setup Guide

> **Run these SQL commands in Supabase Dashboard → SQL Editor**

RLS ensures that even if someone obtains your anon key, they can only
access data they are authorized to see.

---

## Step 1: Enable RLS on all tables

```sql
-- Enable RLS on every table
ALTER TABLE public.meetings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_series    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_checklist_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_checklist_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people            ENABLE ROW LEVEL SECURITY;
```

---

## Step 2: Create policies (authenticated users only)

Since this is a private internal tool, the simplest and safest policy
is: **only authenticated users can read/write data**.

```sql
-- ============================================================
-- meetings
-- ============================================================
CREATE POLICY "Authenticated users can view meetings"
  ON public.meetings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert meetings"
  ON public.meetings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update meetings"
  ON public.meetings FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete meetings"
  ON public.meetings FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- meeting_series
-- ============================================================
CREATE POLICY "Authenticated users can view series"
  ON public.meeting_series FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert series"
  ON public.meeting_series FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update series"
  ON public.meeting_series FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete series"
  ON public.meeting_series FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- meeting_participants
-- ============================================================
CREATE POLICY "Authenticated users can view participants"
  ON public.meeting_participants FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage participants"
  ON public.meeting_participants FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- meeting_checklist_tasks
-- ============================================================
CREATE POLICY "Authenticated users can manage checklist tasks"
  ON public.meeting_checklist_tasks FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- template_checklist_tasks
-- ============================================================
CREATE POLICY "Authenticated users can manage template tasks"
  ON public.template_checklist_tasks FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- people
-- ============================================================
CREATE POLICY "Authenticated users can view people"
  ON public.people FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage people"
  ON public.people FOR ALL
  TO authenticated USING (true) WITH CHECK (true);
```

---

## Step 3: Block anonymous access

Unauthenticated (`anon`) users should get nothing.
The policies above already achieve this by scoping to `authenticated` only.
Verify in Dashboard → Authentication → Policies — each table should show
**no** policies for the `anon` role.

---

## Step 4: Verify

Run these checks to confirm RLS is blocking anonymous access:

```sql
-- Should return 0 rows (anon cannot see data)
SET role anon;
SELECT count(*) FROM public.meetings;
RESET role;

-- Should return rows (authenticated users can see data)
SET role authenticated;
SELECT count(*) FROM public.meetings;
RESET role;
```

---

## ⚠️ Important: Supabase Free Tier — Inactivity Pause

Your Supabase project pauses after **7 days of inactivity**.
- **Production**: unlikely to be an issue with active users.
- **Staging**: may pause if untouched. To wake it, simply open the Supabase
  Dashboard or make any API call to the project.
- **Long-term fix**: Upgrade to Pro ($25/mo) for no-pause guarantee, or
  set up a weekly cron ping (e.g., via Vercel Cron or a free uptime monitor).
