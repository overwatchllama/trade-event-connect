-- Grant organizer role to christopher.mllr@gmail.com for testing event workflows
UPDATE profiles 
SET role = 'organizer' 
WHERE email = 'christopher.mllr@gmail.com';

-- If the user doesn't exist yet, we can also prepare for when they sign up
-- by creating a trigger or we can run this after they create their account