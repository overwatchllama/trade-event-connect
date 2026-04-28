import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Shield, Eye, EyeOff, Lock, CheckCircle2, AlertTriangle, FileLock2, KeyRound, ShieldCheck, Copy, Check, HelpCircle, Download } from "lucide-react";
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

type Row = { field: string; visibility: Visibility; note?: string };

const sections: { title: string; description: string; rows: Row[] }[] = [
  {
    title: "Your account profile",
    description: "What other people can and cannot see about you.",
    rows: [
      { field: "Display name & avatar", visibility: "signed-in", note: "Visible to other signed-in members in vendor and event contexts." },
      { field: "City & state (general location)", visibility: "signed-in", note: "Used for distance sorting and vendor cards." },
      { field: "Email address", visibility: "owner", note: "Only you and platform admins can see your email." },
      { field: "Street address & ZIP", visibility: "owner" },
      { field: "Birthday", visibility: "owner" },
      { field: "Phone number", visibility: "owner" },
      { field: "Communication preferences", visibility: "owner" },
      { field: "Account status / block reason", visibility: "admin" },
    ],
  },
  {
    title: "Events",
    description: "Event listings are public by design so collectors can discover shows.",
    rows: [
      { field: "Title, date, venue, address, flyer", visibility: "public" },
      { field: "Pricing, ticket info, age pricing notes", visibility: "public" },
      { field: "Vendor & sponsor counts", visibility: "public", note: "Aggregated through a restricted public view." },
      { field: "Organizer contact email/phone", visibility: "public", note: "Only if the organizer chose to display it." },
      { field: "Vendor instruction notes", visibility: "organizer", note: "Shared only with approved & paid vendors." },
      { field: "Day-of checklist", visibility: "organizer" },
      { field: "Uploaded contracts & receipts", visibility: "organizer", note: "Private storage bucket, signed-URL access only." },
    ],
  },
  {
    title: "Vendor applications",
    description: "Vendors only appear publicly on an event after they are approved AND paid.",
    rows: [
      { field: "Business name & logo (approved + paid)", visibility: "public" },
      { field: "Approved table count (aggregate)", visibility: "public" },
      { field: "Application status before approval/payment", visibility: "owner", note: "Hidden from the public; only the vendor and event organizer see it." },
      { field: "Stripe session ID & payment metadata", visibility: "never", note: "Never exposed to the browser. Server-side only." },
      { field: "Organizer's private notes about a vendor", visibility: "organizer" },
      { field: "Uploaded files (contracts, receipts)", visibility: "organizer" },
      { field: "Private 1–5 star vendor ratings", visibility: "organizer", note: "Only the rating organizer can see their own notes." },
    ],
  },
  {
    title: "Tickets & orders",
    description: "Your purchases stay yours.",
    rows: [
      { field: "Your tickets and QR codes", visibility: "owner" },
      { field: "Order totals & promo code used", visibility: "owner" },
      { field: "Ticket scan / check-in status", visibility: "organizer", note: "Shown to the event organizer for the relevant event only." },
      { field: "Stripe payment intent IDs", visibility: "never" },
      { field: "Shared ticket link (you generate)", visibility: "public", note: "Only people with the unguessable link can view." },
    ],
  },
  {
    title: "Subscriptions & billing",
    description: "Billing data is locked down to you and our payment processor.",
    rows: [
      { field: "Subscription tier & renewal date", visibility: "owner" },
      { field: "Stripe customer ID", visibility: "never", note: "Stored server-side; never returned to the browser." },
      { field: "Payment card details", visibility: "never", note: "Handled entirely by Stripe — Collector Companion never stores them." },
    ],
  },
  {
    title: "Your collection & wishlist",
    description: "Personal collection data is private unless you choose to share.",
    rows: [
      { field: "Cards, sealed product, slabs you own", visibility: "owner" },
      { field: "Estimated value & purchase prices", visibility: "owner" },
      { field: "Deal list / want list", visibility: "owner" },
      { field: "Card scan images", visibility: "owner", note: "Stored in a private bucket scoped to your user ID." },
    ],
  },
  {
    title: "Staff & raffles",
    description: "Operational data tied to a specific event.",
    rows: [
      { field: "Staff assignment (your own)", visibility: "owner" },
      { field: "Other staff members' contact info", visibility: "organizer" },
      { field: "Staff check-in tokens", visibility: "never", note: "Single-purpose tokens used only by the check-in flow." },
      { field: "Raffle entries (yours)", visibility: "owner" },
      { field: "Raffle winners list", visibility: "organizer" },
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
                            <div className="min-w-0">
                              <div className="font-medium">{r.field}</div>
                              {r.note && (
                                <div className="text-sm text-muted-foreground">{r.note}</div>
                              )}
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
                            <TableHead className="w-1/3">Information</TableHead>
                            <TableHead>Who can see it</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {s.rows.map((r) => (
                            <TableRow key={r.field}>
                              <TableCell className="font-medium">{r.field}</TableCell>
                              <TableCell><VBadge v={r.visibility} /></TableCell>
                              <TableCell className="text-muted-foreground text-sm">{r.note ?? "—"}</TableCell>
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
