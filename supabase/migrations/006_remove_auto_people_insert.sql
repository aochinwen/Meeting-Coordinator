-- Remove the trigger that automatically adds auth users to the people table
-- This allows for manual approval workflow before users appear in the directory

drop trigger if exists on_auth_user_created on auth.users;

drop function if exists public.handle_new_user();
