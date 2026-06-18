-- Allow the frontend Supabase anon key to save clinic visits.
-- Run this in Supabase Dashboard > SQL Editor.
--
-- The visit form writes to:
--   students or staff: creates/updates the patient concern/status
--   visits: creates the actual clinic visit row

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinic anon can read students" ON public.students;
DROP POLICY IF EXISTS "clinic anon can insert students" ON public.students;
DROP POLICY IF EXISTS "clinic anon can update students" ON public.students;

CREATE POLICY "clinic anon can read students"
ON public.students
FOR SELECT
TO anon
USING (true);

CREATE POLICY "clinic anon can insert students"
ON public.students
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "clinic anon can update students"
ON public.students
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "clinic anon can read staff" ON public.staff;
DROP POLICY IF EXISTS "clinic anon can insert staff" ON public.staff;
DROP POLICY IF EXISTS "clinic anon can update staff" ON public.staff;

CREATE POLICY "clinic anon can read staff"
ON public.staff
FOR SELECT
TO anon
USING (true);

CREATE POLICY "clinic anon can insert staff"
ON public.staff
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "clinic anon can update staff"
ON public.staff
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "clinic anon can read visits" ON public.visits;
DROP POLICY IF EXISTS "clinic anon can insert visits" ON public.visits;

CREATE POLICY "clinic anon can read visits"
ON public.visits
FOR SELECT
TO anon
USING (true);

CREATE POLICY "clinic anon can insert visits"
ON public.visits
FOR INSERT
TO anon
WITH CHECK (true);
