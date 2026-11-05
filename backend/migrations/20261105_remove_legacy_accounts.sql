-- One-time cleanup for the unused legacy public.accounts table.
-- Review/backup its contents before running. This intentionally does not use CASCADE.
-- The public.users table is required for nurse registration and login and is not changed.
DROP TABLE IF EXISTS public.accounts;