import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDemoSession } from "@/hooks/useDemoSession";
import { RotateCcw, Loader2, ShieldAlert, Lock, Eraser } from "lucide-react";

const STORAGE_KEY = "cc-demo-last-reset";

/**
 * Local browser keys we wipe on any reset so the next visitor sees a true
 * clean slate (no leftover persona, dismissed tour, cart items, etc.).
 *
 * Anything matching one of these prefixes is also removed.
 */
const LOCAL_KEYS_EXACT = ["ticket-cart", STORAGE_KEY];
const LOCAL_KEY_PREFIXES = ["cc-demo-tour-dismissed:", "cc-demo-"];

function clearLocalDemoState() {
  try {
    LOCAL_KEYS_EXACT.forEach((k) => localStorage.removeItem(k));
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (LOCAL_KEY_PREFIXES.some((p) => k.startsWith(p))) toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* no-op */
  }
}

export const ResetDemoDataCard = () => {
  const { user } = useAuth();
  const { isDemo } = useDemoSession();
  const email = user?.email?.toLowerCase() ?? null;
  const isAdminDemo = email === "admin@test.com";
  const [loading, setLoading] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [lastReset, setLastReset] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const handleFullReset = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-demo-data");
      if (error) throw error;
      const stamp = data?.reset_at ?? new Date().toISOString();
      // Clear local demo state too — persona, tour, cart, etc.
      clearLocalDemoState();
      try {
        localStorage.setItem(STORAGE_KEY, stamp);
      } catch {
        /* ignore */
      }
      setLastReset(stamp);
      toast({
        title: "Demo fully reset",
        description: `Re-seeded ${data?.deleted_demo_users ?? 0} accounts and the original event set. Signing you out…`,
      });
      // Caller account was just deleted server-side; clear local session.
      await supabase.auth.signOut();
      setTimeout(() => window.location.assign("/demo"), 1200);
    } catch (e) {
      console.error("reset-demo-data error", e);
      toast({
        title: "Couldn't reset demo data",
        description:
          e instanceof Error ? e.message : "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLocalReset = async () => {
    setLocalLoading(true);
    try {
      clearLocalDemoState();
      // Sign the user out so they land on the persona picker fresh.
      await supabase.auth.signOut();
      toast({
        title: "Local demo state cleared",
        description:
          "Persona, tour progress, and cart have been wiped on this browser. Shared seeded data is unchanged.",
      });
      setTimeout(() => window.location.assign("/demo"), 800);
    } catch (e) {
      console.error("local reset error", e);
      toast({
        title: "Couldn't clear local state",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLocalLoading(false);
    }
  };

  const anyLoading = loading || localLoading;

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10">
            <ShieldAlert className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <CardTitle className="text-lg">Reset the demo</CardTitle>
            <CardDescription>
              Two options: clear just your browser, or wipe & re-seed the shared snapshot.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* ----- Local-only reset (anyone in demo mode) ----- */}
        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <Eraser className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold">Clear this browser only</h3>
              <p className="text-xs text-muted-foreground">
                Sign out and erase persona, guided-tour progress, and cart items
                stored in this browser. Shared demo data is untouched.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLocalReset}
            disabled={anyLoading || !isDemo}
            className="w-full sm:w-auto"
          >
            {localLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Clearing…
              </>
            ) : (
              <>
                <Eraser className="mr-2 h-4 w-4" />
                Clear local demo state
              </>
            )}
          </Button>
          {!isDemo && (
            <p className="text-xs text-muted-foreground">
              Sign in as a demo persona to enable.
            </p>
          )}
        </div>

        <Separator />

        {/* ----- Full server reset (admin only) ----- */}
        <div className="space-y-3">
          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1.5">
            <p className="font-medium text-foreground">Full re-seed (admin only):</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Deletes all <code className="text-[11px]">@test.com</code> accounts and their data (profiles, vendors, applications, tickets, notifications).</li>
              <li>Removes every event organized by a demo account.</li>
              <li>Re-creates the original demo accounts, vendors, and seeded 2026 events.</li>
              <li>Also clears local browser state for this visitor.</li>
            </ul>
            <p className="pt-1">
              Real (non-demo) users and their data are <strong>not</strong> touched.
            </p>
          </div>

          {lastReset && (
            <p className="text-xs text-muted-foreground">
              Last full reset: {new Date(lastReset).toLocaleString()}
            </p>
          )}

          {!isAdminDemo ? (
            <div className="flex items-start gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                Only the <Badge variant="outline" className="mx-1 font-mono text-[10px]">admin@test.com</Badge> demo account can run a full re-seed.
                Switch personas above and choose Admin to enable this action.
              </div>
            </div>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={anyLoading}
                  className="w-full sm:w-auto"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting…
                    </>
                  ) : (
                    <>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset seeded data
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Restore the original demo snapshot?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Every demo account, vendor profile, application, ticket, and event
                    created during the demo will be deleted and re-created from the
                    original seed. This affects all demo visitors. You'll be signed out
                    and returned to the persona picker. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleFullReset}
                    disabled={loading}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, reset everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
