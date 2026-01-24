-- Delete all existing users (cascades to profiles and user_roles via triggers)
DELETE FROM auth.users;