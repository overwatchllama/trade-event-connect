import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, X, LogOut, Users } from "lucide-react";
import { useDemoSession } from "@/hooks/useDemoSession";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

/**
 * Persistent banner shown across the app when the active session
 * belongs to a @test.com demo account. Lets visitors switch persona
 * or exit the demo without hunting through profile menus.
 */
export const DemoBanner = () => {
  const { isDemo, email } = useDemoSession();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (!isDemo || dismissed) return null;

  const personaLabel = email?.split("@")[0] ?? "demo";

  const handleExit = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="sticky top-0 z-50 w-full border-b border-primary/30 bg-gradient-to-r from-primary/15 via-primary/10 to-primary/15 backdrop-blur supports-[backdrop-filter]:bg-primary/10">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <span className="font-medium truncate">
            Demo mode &mdash; signed in as{" "}
            <span className="font-mono text-primary">{personaLabel}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
            <Link to="/demo">
              <Users className="mr-1 h-3 w-3" />
              Switch persona
            </Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={handleExit}
          >
            <LogOut className="mr-1 h-3 w-3" />
            Exit demo
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setDismissed(true)}
            aria-label="Hide demo banner"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
