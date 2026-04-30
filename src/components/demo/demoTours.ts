// Persona-specific guided tour scripts shown after a user enters the demo.
// Each step targets a specific route; the tour overlay only renders steps
// whose `route` matches the current pathname (with simple prefix matching).

export type TourStep = {
  /** Pathname (or prefix) where this step is shown. Use "*" to show on any route. */
  route: string;
  title: string;
  body: string;
  /** Optional CTA at the bottom of the card, e.g. "Open My Tables". */
  cta?: { label: string; to: string };
};

export type PersonaKey = "admin" | "organizer" | "vendor" | "collector";

export const DEMO_TOURS: Record<PersonaKey, { label: string; steps: TourStep[] }> = {
  admin: {
    label: "Admin tour",
    steps: [
      {
        route: "/admin",
        title: "Welcome, Admin 👋",
        body: "You have full platform oversight. From here you can manage users, approve role requests, and review every event.",
      },
      {
        route: "/admin",
        title: "Role requests & users",
        body: "Use the tabs at the top to switch between user management, role requests, and announcements.",
      },
      {
        route: "*",
        title: "Jump anywhere",
        body: "As Admin you can browse events, vendors, and the security dashboard. Try the header links any time.",
        cta: { label: "Open Security", to: "/security" },
      },
    ],
  },
  organizer: {
    label: "Organizer tour",
    steps: [
      {
        route: "/organize",
        title: "Your organizer dashboard",
        body: "This is where you'll manage every event you host: vendors, staff, visitors, and day-of operations.",
      },
      {
        route: "/organize",
        title: "Tabs walk you through the workflow",
        body: "Status → Vendors → Staff → Visitors → Manage. Critical actions live in Manage; vendor approvals and invoices are in Vendors.",
      },
      {
        route: "/organize",
        title: "Create or import events",
        body: "Use the create button to launch a new event, or import a batch from an external listing URL.",
      },
      {
        route: "/event/",
        title: "Event detail tools",
        body: "On any event page you own, organizer-only tools (manage vendors, raffles, attendees) appear inline.",
      },
    ],
  },
  vendor: {
    label: "Vendor tour",
    steps: [
      {
        route: "/vending",
        title: "Your vending dashboard",
        body: "Track every event you've applied to, your assigned tables, and nearby events worth applying for.",
      },
      {
        route: "/vending",
        title: "My Tables",
        body: "Open the My Tables tab to see application status, pay invoices, request cancellations, or list tables on the marketplace.",
      },
      {
        route: "/vending",
        title: "Nearby Discovery",
        body: "We score upcoming events by distance from your profile location so you never miss a local show.",
      },
      {
        route: "/events",
        title: "Apply to an event",
        body: "Open any event and click Apply to vend. Your application is private until you're approved AND paid.",
      },
    ],
  },
  collector: {
    label: "Collector tour",
    steps: [
      {
        route: "/events",
        title: "Browse upcoming events",
        body: "Filter by state, date, and popularity. Favorite vendors so you're notified when they confirm at a show.",
      },
      {
        route: "/event/",
        title: "Event details",
        body: "See the floor plan, attending vendors, raffles, and ticket options. Buy tickets right from the page.",
      },
      {
        route: "/my-collection",
        title: "Your collection",
        body: "Track cards, sealed product, and slabs. Use the scanner to identify cards by photo and pull live pricing.",
        cta: { label: "Open Scanner", to: "/scanner" },
      },
      {
        route: "*",
        title: "Tickets travel with you",
        body: "Every ticket is in the Tickets tab of your profile, with QR codes ready for the door.",
        cta: { label: "View Tickets", to: "/profile?tab=tickets" },
      },
    ],
  },
};

const STORAGE_PREFIX = "cc-demo-tour-dismissed:";

export const tourStorageKey = (persona: PersonaKey) => `${STORAGE_PREFIX}${persona}`;

export function isTourDismissed(persona: PersonaKey): boolean {
  try {
    return localStorage.getItem(tourStorageKey(persona)) === "1";
  } catch {
    return false;
  }
}

export function setTourDismissed(persona: PersonaKey, dismissed: boolean) {
  try {
    if (dismissed) localStorage.setItem(tourStorageKey(persona), "1");
    else localStorage.removeItem(tourStorageKey(persona));
  } catch {
    /* no-op */
  }
}

/** Map a demo email to a persona key. Returns null if not a recognized persona. */
export function personaFromEmail(email: string | null | undefined): PersonaKey | null {
  if (!email) return null;
  const e = email.toLowerCase();
  if (e === "admin@test.com") return "admin";
  if (e === "event@test.com") return "organizer";
  if (e === "user@test.com") return "collector";
  if (e.startsWith("vendor") && e.endsWith("@test.com")) return "vendor";
  return null;
}
