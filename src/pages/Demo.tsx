import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Shield,
  CalendarDays,
  Store,
  User as UserIcon,
  Sparkles,
  Loader2,
} from "lucide-react";

type Persona = {
  key: string;
  email: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badges: string[];
  highlight?: boolean;
};

const PERSONAS: Persona[] = [
  {
    key: "admin",
    email: "admin@test.com",
    title: "Admin",
    description:
      "Full platform oversight: manage users, roles, and review every event.",
    icon: Shield,
    badges: ["Admin", "Moderator tools"],
  },
  {
    key: "organizer",
    email: "event@test.com",
    title: "Event Organizer",
    description:
      "Create events, approve vendors, manage attendees and on-site staff.",
    icon: CalendarDays,
    badges: ["Organizer", "Vendor"],
    highlight: true,
  },
  {
    key: "vendor",
    email: "vendor@test.com",
    title: "Vendor",
    description:
      "Apply to events, manage your booth, list inventory, and rate organizers.",
    icon: Store,
    badges: ["Vendor"],
    highlight: true,
  },
  {
    key: "collector",
    email: "user@test.com",
    title: "Collector",
    description:
      "Browse events, buy tickets, scan cards for pricing, build your collection.",
    icon: UserIcon,
    badges: ["Attendee"],
    highlight: true,
  },
  {
    key: "vendor2",
    email: "vendor2@test.com",
    title: "Pokémon Paradise",
    description: "An additional vendor account with a different inventory.",
    icon: Store,
    badges: ["Vendor"],
  },
  {
    key: "vendor3",
    email: "vendor3@test.com",
    title: "Magic Masters",
    description: "MTG-focused vendor account.",
    icon: Store,
    badges: ["Vendor"],
  },
  {
    key: "vendor4",
    email: "vendor4@test.com",
    title: "Collectible Corner",
    description: "Mixed-inventory vendor account.",
    icon: Store,
    badges: ["Vendor"],
  },
  {
    key: "vendor5",
    email: "vendor5@test.com",
    title: "Retro Cards Plus",
    description: "Vintage-focused vendor account.",
    icon: Store,
    badges: ["Vendor"],
  },
  {
    key: "vendor6",
    email: "vendor6@test.com",
    title: "Dragon's Den Cards",
    description: "TCG vendor account.",
    icon: Store,
    badges: ["Vendor"],
  },
];

const Demo = () => {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleEnter = async (persona: Persona) => {
    setLoadingKey(persona.key);
    try {
      // Always start fresh — clear any existing session first.
      await signOut();

      const { data, error } = await supabase.functions.invoke("demo-login", {
        body: { persona: persona.key },
      });

      if (error) throw error;
      if (!data?.access_token || !data?.refresh_token) {
        throw new Error("No session returned");
      }

      const { error: setErr } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (setErr) throw setErr;

      toast({
        title: `Welcome, ${persona.title}`,
        description: "You're now exploring in demo mode.",
      });

      // Land somewhere meaningful for each persona.
      const landingByPersona: Record<string, string> = {
        admin: "/admin",
        organizer: "/organize",
        vendor: "/vending",
        collector: "/events",
      };
      navigate(landingByPersona[persona.key] ?? "/");
    } catch (e) {
      console.error("Demo login error", e);
      toast({
        title: "Couldn't start demo session",
        description:
          e instanceof Error
            ? e.message
            : "Please try again or pick a different persona.",
        variant: "destructive",
      });
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Try the Demo · Collector Companion</title>
        <meta
          name="description"
          content="Explore Collector Companion as an organizer, vendor, or collector with one-click demo accounts."
        />
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="container mx-auto max-w-5xl px-4 py-10 md:py-16">
        <header className="mb-10 text-center">
          <Badge variant="secondary" className="mb-4 gap-1">
            <Sparkles className="h-3 w-3" />
            Live Demo
          </Badge>
          <h1 className="mb-3 text-3xl font-bold tracking-tight md:text-5xl">
            Step into Collector Companion
          </h1>
          <p className="mx-auto max-w-2xl text-muted-foreground md:text-lg">
            Pick a role and you'll be signed in instantly with realistic data.
            No email, no password, no signup. Demo data resets every Sunday.
          </p>
        </header>

        <section aria-labelledby="primary-personas" className="mb-10">
          <h2 id="primary-personas" className="sr-only">
            Primary personas
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PERSONAS.filter((p) => p.highlight || p.key === "admin").map(
              (p) => (
                <PersonaCard
                  key={p.key}
                  persona={p}
                  loading={loadingKey === p.key}
                  disabled={loadingKey !== null && loadingKey !== p.key}
                  onClick={() => handleEnter(p)}
                />
              ),
            )}
          </div>
        </section>

        <section aria-labelledby="more-vendors">
          <div className="mb-4 flex items-center justify-between">
            <h2
              id="more-vendors"
              className="text-sm font-medium uppercase tracking-wide text-muted-foreground"
            >
              More vendor accounts
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PERSONAS.filter((p) => !p.highlight && p.key !== "admin").map(
              (p) => (
                <PersonaCard
                  key={p.key}
                  persona={p}
                  loading={loadingKey === p.key}
                  disabled={loadingKey !== null && loadingKey !== p.key}
                  onClick={() => handleEnter(p)}
                  compact
                />
              ),
            )}
          </div>
        </section>

        <p className="mt-12 text-center text-xs text-muted-foreground">
          Demo accounts share data. Anything you create may be visible to other
          demo visitors and will be reset weekly.
        </p>
      </div>
    </div>
  );
};

const PersonaCard = ({
  persona,
  loading,
  disabled,
  onClick,
  compact,
}: {
  persona: Persona;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
  compact?: boolean;
}) => {
  const Icon = persona.icon;
  return (
    <Card
      className={`transition-all ${
        persona.highlight
          ? "border-primary/40 hover:border-primary hover:shadow-lg"
          : "hover:border-foreground/20"
      }`}
    >
      <CardHeader className={compact ? "pb-2" : undefined}>
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <CardTitle className={compact ? "text-base" : "text-lg"}>
          {persona.title}
        </CardTitle>
        {!compact && (
          <CardDescription>{persona.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {!compact && (
          <div className="flex flex-wrap gap-1.5">
            {persona.badges.map((b) => (
              <Badge key={b} variant="outline" className="text-xs">
                {b}
              </Badge>
            ))}
          </div>
        )}
        <Button
          className="w-full"
          onClick={onClick}
          disabled={disabled || loading}
          variant={persona.highlight ? "default" : "outline"}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Entering…
            </>
          ) : (
            "Enter as " + persona.title
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default Demo;
