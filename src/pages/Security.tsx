import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Shield, Eye, EyeOff, Lock, CheckCircle2, AlertTriangle, FileLock2, KeyRound, ShieldCheck, Copy, Check, HelpCircle, Download, ExternalLink, Database, FolderLock, ServerCog, Globe, UserCheck } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type Visibility = "public" | "signed-in" | "owner" | "organizer" | "admin" | "never";

const visibilityMeta: Record<Visibility, { label: string; className: string; icon: typeof Eye }> = {
  public: { label: "Public", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30", icon: Eye },
  "signed-in": { label: "Signed-in users", className: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30", icon: KeyRound },
  owner: { label: "Owner only", className: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30", icon: Lock },
  organizer: { label: "Event organizer", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30", icon: FileLock2 },
  admin: { label: "Platform admin", className: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30", icon: Shield },
  never: { label: "Never exposed", className: "bg-muted text-muted-foreground border-border", icon: EyeOff },
};

function VBadge({ v }: { v: Visibility }) {
  const meta = visibilityMeta[v];
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={`gap-1 ${meta.className}`}>
      <Icon className="h-3 w-3" aria-hidden />
      {meta.label}
    </Badge>
  );
}

// Backend enforcement reference shown inline next to each row.
// Links jump to the exact place in the Supabase dashboard so technically-minded
// readers (and auditors) can verify the rule themselves.
const SUPABASE_PROJECT_REF = "gsjwamfnoezhwlhkqzdn";

type SourceKind = "table" | "view" | "function" | "storage" | "server";

type Source = {
  kind: SourceKind;
  name: string;
  policy?: string;
};

function sourceHref(s: Source): string | null {
  const base = `https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}`;
  switch (s.kind) {
    case "table":
      return `${base}/auth/policies?schema=public&search=${encodeURIComponent(s.name)}`;
    case "view":
      return `${base}/database/tables?schema=public&search=${encodeURIComponent(s.name)}`;
    case "function":
      return `${base}/database/functions?schema=public&search=${encodeURIComponent(s.name)}`;
    case "storage":
      return `${base}/storage/buckets/${encodeURIComponent(s.name)}`;
    case "server":
      return null;
  }
}

const sourceKindMeta: Record<SourceKind, { label: string; icon: typeof Database }> = {
  table: { label: "RLS policy", icon: Database },
  view: { label: "Public view", icon: Eye },
  function: { label: "Security function", icon: ServerCog },
  storage: { label: "Storage policy", icon: FolderLock },
  server: { label: "Server-only", icon: Lock },
};

function SourceLink({ source }: { source: Source }) {
  const meta = sourceKindMeta[source.kind];
  const Icon = meta.icon;
  const href = sourceHref(source);
  const label = source.policy ? `${source.name} · ${source.policy}` : source.name;
  const title = `${meta.label}: ${label}`;

  const inner = (
    <>
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      <span className="font-mono">{source.name}</span>
      {source.policy && (
        <>
          <span className="opacity-50">·</span>
          <span className="truncate">{source.policy}</span>
        </>
      )}
      {href && <ExternalLink className="h-3 w-3 shrink-0 opacity-60" aria-hidden />}
    </>
  );

  const className =
    "inline-flex items-center gap-1.5 max-w-full text-[11px] leading-none px-2 py-1 rounded-md border border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors";

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        title={title}
        aria-label={`Open ${title} in Supabase dashboard`}
      >
        {inner}
      </a>
    );
  }
  return (
    <span className={className} title={title} aria-label={title}>
      {inner}
    </span>
  );
}

type Row = { field: string; visibility: Visibility; note?: string; source: Source };

const sections: { title: string; description: string; rows: Row[] }[] = [
  {
    title: "Your account profile",
    description: "What other people can and cannot see about you.",
    rows: [
      { field: "Display name & avatar", visibility: "signed-in", note: "Visible to other signed-in members in vendor and event contexts.", source: { kind: "function", name: "get_public_vendor_profiles" } },
      { field: "City & state (general location)", visibility: "signed-in", note: "Used for distance sorting and vendor cards.", source: { kind: "function", name: "get_public_vendor_profiles" } },
      { field: "Email address", visibility: "owner", note: "Only you and platform admins can see your email.", source: { kind: "table", name: "profiles", policy: "Users can view profiles" } },
      { field: "Street address & ZIP", visibility: "owner", source: { kind: "table", name: "profiles", policy: "Users can view profiles" } },
      { field: "Birthday", visibility: "owner", source: { kind: "table", name: "profiles", policy: "Users can view profiles" } },
      { field: "Phone number", visibility: "owner", source: { kind: "table", name: "profiles", policy: "Users can view profiles" } },
      { field: "Communication preferences", visibility: "owner", source: { kind: "table", name: "profiles", policy: "Users can update profiles" } },
      { field: "Account status / block reason", visibility: "admin", source: { kind: "function", name: "is_admin" } },
    ],
  },
  {
    title: "Events",
    description: "Event listings are public by design so collectors can discover shows.",
    rows: [
      { field: "Title, date, venue, address, flyer", visibility: "public", source: { kind: "table", name: "events", policy: "Public can view events" } },
      { field: "Pricing, ticket info, age pricing notes", visibility: "public", source: { kind: "table", name: "events", policy: "Public can view events" } },
      { field: "Vendor & sponsor counts", visibility: "public", note: "Aggregated through a restricted public view.", source: { kind: "view", name: "public_vendor_applications" } },
      { field: "Organizer contact email/phone", visibility: "public", note: "Only if the organizer chose to display it.", source: { kind: "table", name: "events", policy: "Public can view events" } },
      { field: "Vendor instruction notes", visibility: "organizer", note: "Shared only with approved & paid vendors.", source: { kind: "table", name: "events", policy: "Organizers can update their own events" } },
      { field: "Day-of checklist", visibility: "organizer", source: { kind: "table", name: "event_checklist_items", policy: "Event organizers can manage their checklist items" } },
      { field: "Uploaded contracts & receipts", visibility: "organizer", note: "Private storage bucket, signed-URL access only.", source: { kind: "storage", name: "event-files" } },
    ],
  },
  {
    title: "Vendor applications",
    description: "Vendors only appear publicly on an event after they are approved AND paid.",
    rows: [
      { field: "Business name & logo (approved + paid)", visibility: "public", source: { kind: "view", name: "public_vendor_applications" } },
      { field: "Approved table count (aggregate)", visibility: "public", source: { kind: "view", name: "public_vendor_applications" } },
      { field: "Application status before approval/payment", visibility: "owner", note: "Hidden from the public; only the vendor and event organizer see it.", source: { kind: "table", name: "vendor_applications", policy: "Vendors can view their own applications" } },
      { field: "Stripe session ID & payment metadata", visibility: "never", note: "Never exposed to the browser. Server-side only.", source: { kind: "server", name: "edge: stripe-webhook" } },
      { field: "Organizer's private notes about a vendor", visibility: "organizer", source: { kind: "table", name: "organizer_vendor_notes", policy: "Organizers can view their own vendor notes" } },
      { field: "Uploaded files (contracts, receipts)", visibility: "organizer", source: { kind: "storage", name: "event-files" } },
      { field: "Private 1–5 star vendor ratings", visibility: "organizer", note: "Only the rating organizer can see their own notes.", source: { kind: "table", name: "organizer_vendor_notes", policy: "Organizers can view their own vendor notes" } },
    ],
  },
  {
    title: "Tickets & orders",
    description: "Your purchases stay yours.",
    rows: [
      { field: "Your tickets and QR codes", visibility: "owner", source: { kind: "table", name: "order_items", policy: "Users can view their own tickets" } },
      { field: "Order totals & promo code used", visibility: "owner", source: { kind: "table", name: "orders", policy: "Users can view their own orders" } },
      { field: "Ticket scan / check-in status", visibility: "organizer", note: "Shown to the event organizer for the relevant event only.", source: { kind: "table", name: "order_items", policy: "Event organizers can view tickets for their events" } },
      { field: "Stripe payment intent IDs", visibility: "never", source: { kind: "server", name: "edge: create-checkout" } },
      { field: "Shared ticket link (you generate)", visibility: "public", note: "Only people with the unguessable link can view.", source: { kind: "table", name: "order_items", policy: "Users can view their own tickets" } },
    ],
  },
  {
    title: "Subscriptions & billing",
    description: "Billing data is locked down to you and our payment processor.",
    rows: [
      { field: "Subscription tier & renewal date", visibility: "owner", source: { kind: "table", name: "subscribers", policy: "Owners can view their subscription" } },
      { field: "Stripe customer ID", visibility: "never", note: "Stored server-side; never returned to the browser.", source: { kind: "server", name: "edge: check-subscription" } },
      { field: "Payment card details", visibility: "never", note: "Handled entirely by Stripe — Collector Companion never stores them.", source: { kind: "server", name: "Stripe (PCI)" } },
    ],
  },
  {
    title: "Your collection & wishlist",
    description: "Personal collection data is private unless you choose to share.",
    rows: [
      { field: "Cards, sealed product, slabs you own", visibility: "owner", source: { kind: "table", name: "collection_items", policy: "Users can view their own collection items" } },
      { field: "Estimated value & purchase prices", visibility: "owner", source: { kind: "table", name: "collection_items", policy: "Users can view their own collection items" } },
      { field: "Deal list / want list", visibility: "owner", source: { kind: "table", name: "deal_list_items", policy: "Users view their own deal items" } },
      { field: "Card scan images", visibility: "owner", note: "Stored in a private bucket scoped to your user ID.", source: { kind: "storage", name: "card-scans" } },
    ],
  },
  {
    title: "Staff & raffles",
    description: "Operational data tied to a specific event.",
    rows: [
      { field: "Staff assignment (your own)", visibility: "owner", source: { kind: "table", name: "event_staff_assignments", policy: "Staff view their own assignment" } },
      { field: "Other staff members' contact info", visibility: "organizer", source: { kind: "table", name: "event_staff_assignments", policy: "Organizers manage their event staff" } },
      { field: "Staff check-in tokens", visibility: "never", note: "Single-purpose tokens used only by the check-in flow.", source: { kind: "server", name: "edge: staff-checkin" } },
      { field: "Raffle entries (yours)", visibility: "owner", source: { kind: "table", name: "raffle_entries", policy: "Users can view their own raffle entries" } },
      { field: "Raffle winners list", visibility: "organizer", source: { kind: "table", name: "raffle_draws", policy: "Organizers can manage raffle draws" } },
    ],
  },
];

const principles = [
  {
    icon: Lock,
    title: "Default-deny on every table",
    body: "Every database table starts locked. We then add narrow, owner-scoped rules — nothing is exposed by accident.",
  },
  {
    icon: Eye,
    title: "Public views, not public tables",
    body: "When something needs to be public (like vendor counts), we expose a curated view that only contains safe columns.",
  },
  {
    icon: KeyRound,
    title: "Server-side payments",
    body: "Stripe IDs, customer references and webhook secrets stay on the server. Your browser never sees them.",
  },
  {
    icon: FileLock2,
    title: "Private file storage",
    body: "Contracts, receipts and card scans live in private buckets. Access requires an authenticated, scoped request.",
  },
  {
    icon: CheckCircle2,
    title: "Automated regression tests",
    body: "A security test suite re-runs after every change to confirm PII fields stay blocked and public views stay safe.",
  },
  {
    icon: AlertTriangle,
    title: "Least-privilege roles",
    body: "Organizer, vendor, sponsor and admin roles each see only what their job requires — nothing more.",
  },
];

export default function Security() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Security & Data Visibility | Collector Companion</title>
        <meta
          name="description"
          content="Plain-language overview of which data is public, which stays private, and how Collector Companion protects your information."
        />
        <link rel="canonical" href="https://collectorcompanion.com/security" />
      </Helmet>

      <Header />

      <main className="container mx-auto px-4 py-10 max-w-5xl">
        {/* Hero */}
        <section className="text-center mb-10">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary mb-4">
            <Shield className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Your data, in plain English
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Collector Companion is built so that the right people see the right things — and nobody else.
            Here's a clear breakdown of what's public, what stays between you and the people you do business with,
            and what we never expose at all.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <VBadge v="public" />
            <VBadge v="signed-in" />
            <VBadge v="owner" />
            <VBadge v="organizer" />
            <VBadge v="admin" />
            <VBadge v="never" />
          </div>

          {/* Last verified indicator */}
          <div
            className="mt-6 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-700 dark:text-emerald-400"
            aria-label="Security contract last verified"
          >
            <span className="inline-flex items-center gap-1.5 font-medium">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              RLS checks passing
            </span>
            <span className="text-emerald-700/70 dark:text-emerald-400/70">
              Last verified{" "}
              <time dateTime={__SECURITY_VERIFIED_AT__}>
                {new Date(__SECURITY_VERIFIED_AT__).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </time>
            </span>
            <span className="text-emerald-700/70 dark:text-emerald-400/70">
              build{" "}
              <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-emerald-500/15">
                {__SECURITY_VERIFIED_COMMIT__}
              </code>
            </span>
          </div>
        </section>

        {/* Principles */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">How we protect your information</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {principles.map((p) => {
              const Icon = p.icon;
              return (
                <Card key={p.title} className="border-border/60">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <CardTitle className="text-base">{p.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">{p.body}</CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Data visibility tables */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-2">Who sees what</h2>
          <p className="text-muted-foreground mb-6">
            Browse by area. Each row shows where a piece of information appears and who can see it.
          </p>

          <Tabs defaultValue="cards" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-xs mb-4">
              <TabsTrigger value="cards">Card view</TabsTrigger>
              <TabsTrigger value="table">Table view</TabsTrigger>
            </TabsList>

            <TabsContent value="cards" className="space-y-4">
              <Accordion type="multiple" defaultValue={[sections[0].title]} className="space-y-3">
                {sections.map((s) => (
                  <AccordionItem
                    key={s.title}
                    value={s.title}
                    className="border rounded-lg px-4 bg-card"
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="text-left">
                        <div className="font-semibold">{s.title}</div>
                        <div className="text-sm text-muted-foreground font-normal">{s.description}</div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="divide-y divide-border">
                        {s.rows.map((r) => (
                          <li key={r.field} className="py-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                            <div className="min-w-0 space-y-1.5">
                              <div className="font-medium">{r.field}</div>
                              {r.note && (
                                <div className="text-sm text-muted-foreground">{r.note}</div>
                              )}
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                <SourceLink source={r.source} />
                              </div>
                            </div>
                            <div className="shrink-0">
                              <VBadge v={r.visibility} />
                            </div>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </TabsContent>

            <TabsContent value="table">
              <div className="space-y-8">
                {sections.map((s) => (
                  <Card key={s.title}>
                    <CardHeader>
                      <CardTitle className="text-lg">{s.title}</CardTitle>
                      <CardDescription>{s.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-1/4">Information</TableHead>
                            <TableHead>Who can see it</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead>Enforced by</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {s.rows.map((r) => (
                            <TableRow key={r.field}>
                              <TableCell className="font-medium">{r.field}</TableCell>
                              <TableCell><VBadge v={r.visibility} /></TableCell>
                              <TableCell className="text-muted-foreground text-sm">{r.note ?? "—"}</TableCell>
                              <TableCell><SourceLink source={r.source} /></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </section>

        {/* Your controls */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Controls in your hands</h2>
          <Card>
            <CardContent className="pt-6 grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium mb-1">Manage your account</div>
                <p className="text-muted-foreground">
                  Update your profile, change communication preferences, or delete your account at any time.
                </p>
                <Button asChild variant="link" className="px-0">
                  <Link to="/settings">Open settings →</Link>
                </Button>
              </div>
              <div>
                <div className="font-medium mb-1">Hide your vendor profile</div>
                <p className="text-muted-foreground">
                  Vendors can withdraw or cancel applications, and only show up publicly on events you've fully confirmed.
                </p>
                <Button asChild variant="link" className="px-0">
                  <Link to="/my-vendor-profile">Manage vendor profile →</Link>
                </Button>
              </div>
              <div>
                <div className="font-medium mb-1">Your collection stays yours</div>
                <p className="text-muted-foreground">
                  Cards, sealed product, slabs, and want lists are private to your account.
                </p>
                <Button asChild variant="link" className="px-0">
                  <Link to="/my-collection">View collection →</Link>
                </Button>
              </div>
              <div>
                <div className="font-medium mb-1">Questions?</div>
                <p className="text-muted-foreground">
                  Reach out to support and we'll walk you through anything on this page.
                </p>
                <Button asChild variant="link" className="px-0">
                  <a href="mailto:support@collectorcompanion.com">Contact support →</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Privacy FAQ */}
        <PrivacyFAQ />

        <p className="text-xs text-muted-foreground text-center">
          This page describes how Collector Companion handles your data today. We may improve protections over time —
          we'll never reduce them without telling you.
        </p>
      </main>
    </div>
  );
}

const faqs: { q: string; a: string }[] = [
  {
    q: "Who can see my email address?",
    a: "Only you and platform admins. Other members — including event organizers and vendors — never see your email through the app.",
  },
  {
    q: "When does my vendor application become public?",
    a: "Only after it is BOTH approved by the organizer AND marked paid. Pending, rejected, or unpaid applications stay private to you and the organizer.",
  },
  {
    q: "Does Collector Companion store my credit card?",
    a: "No. All card data is handled by Stripe. We only store a Stripe customer reference on the server, which is never sent to your browser.",
  },
  {
    q: "Can organizers see my home address or phone number?",
    a: "No. Organizers only see information you explicitly provide on a vendor application or ticket purchase, and never your full account profile.",
  },
  {
    q: "Is my collection visible to anyone else?",
    a: "No. Your cards, sealed product, slabs, want list, and card scans are private to your account.",
  },
  {
    q: "What happens to my data if I delete my account?",
    a: "Your profile, collection, and personal data are removed. Records required for legal/financial reasons (like paid orders) may be retained in a de-identified form.",
  },
  {
    q: "Are there automated checks to make sure private data stays private?",
    a: "Yes. A Row Level Security test suite re-runs after every change and verifies that PII fields stay blocked and public views only expose safe columns.",
  },
  {
    q: "Where can I report a security concern?",
    a: "Email security@collectorcompanion.com with details. We triage every report and respond within two business days.",
  },
];

async function generateSecurityPdf() {
  const [{ default: jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = (autoTableMod as { default: typeof import("jspdf-autotable").default }).default;

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Collector Companion", margin, 64);
  doc.setFontSize(14);
  doc.text("Security & Data Visibility Summary", margin, 86);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  const verifiedAt = new Date(__SECURITY_VERIFIED_AT__).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  doc.text(
    `Last verified: ${verifiedAt}  •  Build: ${__SECURITY_VERIFIED_COMMIT__}  •  Generated: ${new Date().toLocaleString()}`,
    margin,
    104,
  );
  doc.setTextColor(0);

  doc.setFontSize(10);
  const intro =
    "This document summarizes which fields in Collector Companion are public, which are restricted to specific roles (owner, organizer, admin), and which are never exposed outside our servers. Restrictions are enforced at the database level via Row Level Security (RLS) policies and dedicated public views.";
  const introLines = doc.splitTextToSize(intro, pageWidth - margin * 2);
  doc.text(introLines, margin, 124);

  let cursorY = 124 + introLines.length * 13 + 8;

  for (const section of sections) {
    if (cursorY > 700) {
      doc.addPage();
      cursorY = 64;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(section.title, margin, cursorY);
    cursorY += 16;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110);
    const descLines = doc.splitTextToSize(section.description, pageWidth - margin * 2);
    doc.text(descLines, margin, cursorY);
    cursorY += descLines.length * 11 + 4;
    doc.setTextColor(0);

    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      head: [["Information", "Who can see it", "Notes", "Enforced by"]],
      body: section.rows.map((r) => [
        r.field,
        visibilityMeta[r.visibility].label,
        r.note ?? "—",
        `${sourceKindMeta[r.source.kind].label}: ${r.source.name}${r.source.policy ? ` · ${r.source.policy}` : ""}`,
      ]),
      styles: { fontSize: 9, cellPadding: 6, valign: "top" },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 130, fontStyle: "bold" },
        1: { cellWidth: 90 },
        2: { cellWidth: "auto", textColor: 80 },
        3: { cellWidth: 150, textColor: 80, font: "courier", fontSize: 8 },
      },
      didDrawPage: () => {
        doc.setFontSize(8);
        doc.setTextColor(140);
        doc.text(
          "collectorcompanion.com/security  •  Summary provided in good faith.",
          margin,
          doc.internal.pageSize.getHeight() - 24,
        );
        doc.setTextColor(0);
      },
    });

    // @ts-expect-error autoTable attaches lastAutoTable to the doc instance
    cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 22;
  }

  doc.save(`collector-companion-security-${__SECURITY_VERIFIED_COMMIT__}.pdf`);
}

function PrivacyFAQ() {
  const [copied, setCopied] = useState(false);

  const buildSummary = () => {
    const lines = [
      "Collector Companion — Privacy Summary",
      `Verified: ${new Date(__SECURITY_VERIFIED_AT__).toISOString()} (build ${__SECURITY_VERIFIED_COMMIT__})`,
      "Source: https://collectorcompanion.com/security",
      "",
      "Key guarantees:",
      "• Email, phone, address, and birthday are visible only to the account owner and admins.",
      "• Vendor applications become public only after approved AND paid.",
      "• Stripe IDs and payment metadata are never sent to the browser.",
      "• Collections, want lists, and card scans are private to the owner.",
      "• Organizer notes, contracts, and uploaded files are restricted to the event organizer.",
      "• Storage buckets for files and card scans are private and require authenticated, scoped access.",
      "• Row Level Security regression tests run after every change.",
      "",
      "FAQ:",
      ...faqs.flatMap((f) => [`Q: ${f.q}`, `A: ${f.a}`, ""]),
    ];
    return lines.join("\n");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildSummary());
      setCopied(true);
      toast.success("Privacy summary copied to clipboard");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Couldn't copy. Please try selecting the text manually.");
    }
  };

  const handleDownloadPdf = async () => {
    try {
      await generateSecurityPdf();
      toast.success("Security summary PDF downloaded");
    } catch (err) {
      console.error("PDF generation failed", err);
      toast.error("Couldn't generate PDF. Please try again.");
    }
  };

  return (
    <section className="mb-12">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-primary" aria-hidden />
            Privacy FAQ
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Quick answers to the questions we hear most often.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleDownloadPdf}
            variant="default"
            size="sm"
            aria-label="Download security summary as PDF"
          >
            <Download className="h-4 w-4 mr-2" aria-hidden />
            Download PDF
          </Button>
          <Button
            onClick={handleCopy}
            variant="outline"
            size="sm"
            aria-label="Copy privacy summary to clipboard for support tickets"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" aria-hidden />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" aria-hidden />
                Copy for support
              </>
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={f.q} value={`faq-${i}`}>
                <AccordionTrigger className="text-left hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </section>
  );
}
