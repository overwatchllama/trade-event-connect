
-- Delete all related data first, then events
DELETE FROM vendor_applications;
DELETE FROM event_announcements;
DELETE FROM event_checklist_items;
DELETE FROM event_days;
DELETE FROM event_files;
DELETE FROM event_social_media;
DELETE FROM event_sponsors;
DELETE FROM sponsor_applications;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM vendor_employee_events;
DELETE FROM events;

-- Create Saturday events for 2026 (Feb-Dec = ~47 Saturdays)
-- organizer_id: e35aa19d-36e4-4bfb-a1a2-4763f1066611
INSERT INTO events (title, description, date, venue, address, city, state, zip_code, event_type, card_types, organizer_name, organizer_id, max_attendees, entry_fee, vendor_table_price, total_tables, tables_available)
SELECT
  'Saturday Card Show - ' || to_char(d::date, 'Mon DD'),
  'Weekly Saturday trading card show. Buy, sell, and trade Pokemon, MTG, Yu-Gi-Oh, and more!',
  to_char(d::date, 'YYYY-MM-DD'),
  'Convention Center',
  '123 Main Street',
  'Austin',
  'TX',
  '78701',
  'show',
  ARRAY['pokemon', 'mtg', 'yugioh', 'sports'],
  'Event Organizer',
  'e35aa19d-36e4-4bfb-a1a2-4763f1066611',
  500,
  10,
  150,
  30,
  30
FROM generate_series('2026-02-14'::date, '2026-12-26'::date, '7 days'::interval) AS d;

-- Now sign up vendor for first and last Saturday of each month
-- vendor_id: 789396e1-47b5-42cf-a00e-4c9712fa01dd
-- user_id: 88e6ef84-5dfd-43b5-9e7e-c6e7c83e0797
INSERT INTO vendor_applications (event_id, vendor_id, user_id, application_status, payment_status, requested_tables, approved_tables, approved_date)
SELECT 
  e.id,
  '789396e1-47b5-42cf-a00e-4c9712fa01dd',
  '88e6ef84-5dfd-43b5-9e7e-c6e7c83e0797',
  'approved',
  'paid',
  1,
  1,
  now()
FROM events e
WHERE e.organizer_id = 'e35aa19d-36e4-4bfb-a1a2-4763f1066611'
AND (
  -- First Saturday of each month
  e.date::date = (
    SELECT min(e2.date::date) 
    FROM events e2 
    WHERE e2.organizer_id = 'e35aa19d-36e4-4bfb-a1a2-4763f1066611'
    AND extract(month from e2.date::date) = extract(month from e.date::date)
    AND extract(year from e2.date::date) = extract(year from e.date::date)
  )
  OR
  -- Last Saturday of each month
  e.date::date = (
    SELECT max(e2.date::date) 
    FROM events e2 
    WHERE e2.organizer_id = 'e35aa19d-36e4-4bfb-a1a2-4763f1066611'
    AND extract(month from e2.date::date) = extract(month from e.date::date)
    AND extract(year from e2.date::date) = extract(year from e.date::date)
  )
);
