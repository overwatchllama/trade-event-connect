-- 1. Remove user_subscriptions (favorites/follows) that reference orphan vendors,
--    so the vendor delete isn't blocked by stale references.
DELETE FROM public.user_subscriptions
WHERE subscription_type = 'favorite_vendor'
  AND target_id IN (
    SELECT id FROM public.vendors
    WHERE user_id IS NULL
       OR user_id NOT IN (SELECT id FROM auth.users)
  );

-- 2. Remove organizer notes attached to orphan vendors.
DELETE FROM public.organizer_vendor_notes
WHERE vendor_id IN (
  SELECT id FROM public.vendors
  WHERE user_id IS NULL
     OR user_id NOT IN (SELECT id FROM auth.users)
);

-- 3. Remove orphan vendors themselves.
DELETE FROM public.vendors
WHERE user_id IS NULL
   OR user_id NOT IN (SELECT id FROM auth.users);