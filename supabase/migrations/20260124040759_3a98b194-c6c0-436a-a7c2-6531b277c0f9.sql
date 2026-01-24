-- Clear all data from tables (order matters due to foreign keys)

-- Delete vendor-related data
DELETE FROM public.vendor_employee_events;
DELETE FROM public.vendor_employee_hours;
DELETE FROM public.vendor_employees;
DELETE FROM public.vendor_applications;
DELETE FROM public.organizer_vendor_notes;

-- Delete sponsor-related data
DELETE FROM public.sponsor_applications;
DELETE FROM public.event_sponsors;

-- Delete event-related data
DELETE FROM public.event_announcements;
DELETE FROM public.event_days;
DELETE FROM public.event_files;
DELETE FROM public.event_social_media;

-- Delete collection data
DELETE FROM public.collection_items;
DELETE FROM public.collections;

-- Delete user-related data
DELETE FROM public.user_subscriptions;
DELETE FROM public.notifications;
DELETE FROM public.role_requests;
DELETE FROM public.admin_actions;
DELETE FROM public.organizer_saved_locations;

-- Delete venue-related data
DELETE FROM public.venue_claims;

-- Delete main entities
DELETE FROM public.events;
DELETE FROM public.vendors;
DELETE FROM public.sponsors;
DELETE FROM public.venues;
DELETE FROM public.subscribers;

-- Delete user roles (before deleting users)
DELETE FROM public.user_roles;

-- Delete profiles (this will be cascaded when we delete auth users, but clear it anyway)
DELETE FROM public.profiles;

-- Delete all auth users (this is the key step - requires service role)
DELETE FROM auth.users;