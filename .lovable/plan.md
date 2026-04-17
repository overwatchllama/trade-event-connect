
## Make Event Contact Info Public Again

The user wants organizer contact info (email/phone) on event detail pages to be visible to **everyone**, including anonymous visitors — reverting the recent security restriction.

### What changes

**1. `src/pages/EventDetails.tsx`**
- Remove the conditional masking logic that nulls out `contact_email` and `contact_phone` for unauthenticated users.
- Remove the `supabase.rpc('get_event_contact_info', ...)` call — no longer needed.
- The event query already returns these columns directly via the public SELECT policy.

**2. Database migration**
- Drop the now-unused `get_event_contact_info(_event_id uuid)` SECURITY DEFINER function (cleanup; keeping it is harmless but unnecessary).
- The existing `Public can view events` RLS policy already allows full row access including contact fields, so no policy change needed.

**3. Security finding management**
- Mark the `events_contact_info_public` finding as **ignored** with reason: "Organizer-provided contact info is intentionally public on event listings to facilitate attendee inquiries — accepted as a product decision."

### Trade-off acknowledgment

Making contact info publicly readable means scrapers and unauthenticated visitors can collect organizer email/phone. This is a deliberate product choice in favor of attendee convenience. The security scan will continue to flag this; it will be marked as accepted rather than fixed.

### Files touched
- `src/pages/EventDetails.tsx` — simplify event fetch
- New migration — drop helper function
- Security scanner — ignore finding
