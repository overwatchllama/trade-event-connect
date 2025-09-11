-- Update profiles to have vendor role for existing vendor accounts
UPDATE profiles 
SET role = 'vendor'::user_role 
WHERE id IN (
  SELECT user_id 
  FROM vendors
);