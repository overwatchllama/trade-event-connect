import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Sparkles,
  Shield,
  CalendarDays,
  Store,
  User as UserIcon,
  Loader2,
  ArrowRight,
} from "lucide-react";

type PersonaCard = {
  key: "admin" | "organizer" | "vendor" | "collector";
  title: string;
  blurb: string;
  icon: React.ComponentType<{ className?: string }>;
  landing: string;
  accent: string;
};

const PERSONAS: PersonaCard[] = [
  {
    key: "collector",
    title: "Collector",
    blurb: "Browse events, buy tickets, scan cards, build a collection.",
    icon: UserIcon,
    landing: "/events",
    accent: "from-primary/20 to-primary/5",
  },
  {
    key: "vendor",
    title: "Vendor",
    blurb: "Apply to events, manage your booth, list inventory.",
    icon: Store,
    landing: "/vending",
    accent: "from-primary/20 to-primary/5",
  },
  {
    key: "organizer",
    title: "Organizer",
    blurb: "Create events, approve vendors, manage attendees & staff.",
    icon: CalendarDays,
    landing: "/organize",
    accent: "from-primary/20 to-primary/5",
  },
  {
    key: "admin",
    title: "Admin",
    blurb: "Full platform oversight: users, roles, every event.",
    icon: Shield,
    landing: "/admin",
    accent: "from-primary/20 to-primary/5",
  },
];

export const TryTheDemoSection = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const enterAs = async (p: PersonaCard) => {
    setLoadingKey(p.key);
    try {
      await signOut();
      const { data, error } = await supabase.functions.invoke("demo-login", {
        body: { persona: p.key },
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
        title: `Welcome, ${p.title}`,
        description: "You're now exploring in demo mode.",
      });
      navigate(p.landing);
    } catch (e) {
      console.error("Demo login error", e);
      toast({
        title: "Couldn't start demo session",
        description:
          e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <section
      aria-labelledby="try-the-demo-heading"
      className="py-10 md:py-20 bg-muted/30 border-y"
    >
      <div className="container mx-auto px-3 md:px-4">
        <div className="text-center mb-6 md:mb-10">
          <Badge variant="secondary" className="mb-3 gap-1">
            <Sparkles className="h-3 w-3" />
            No signup required
          </Badge>
          <h2
            id="try-the-demo-heading"
            className="text-2xl md:text-4xl font-bold text-foreground mb-2 md:mb-3"
          >
            Try the demo as any persona
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Pick a role and we'll sign you in instantly with realistic data.
            A guided tour walks you through each flow.
          </p>
        </div>

        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
          {PERSONAS.map((p) => {
            const Icon = p.icon;
            const loading = loadingKey === p.key;
            const disabled = loadingKey !== null && !loading;
            return (
              <Card
                key={p.key}
                className="group relative overflow-hidden transition-all hover:border-primary hover:shadow-lg"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${p.accent} opacity-0 transition-opacity group-hover:opacity-100`}
                  aria-hidden
                />
                <CardContent className="relative p-4 md:p-5 flex flex-col h-full">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-base md:text-lg mb-1">
                    {p.title}
                  </h3>
                  <p className="text-xs md:text-sm text-muted-foreground mb-4 flex-1">
                    {p.blurb}
                  </p>
                  <Button
                    onClick={() => enterAs(p)}
                    disabled={disabled || loading}
                    size="sm"
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entering…
                      </>
                    ) : (
                      <>
                        Enter as {p.title}
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-6 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/demo")}
            className="text-muted-foreground"
          >
            See all demo accounts
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </section>
  );
};
