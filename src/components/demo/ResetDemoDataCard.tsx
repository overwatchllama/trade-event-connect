import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { RotateCcw, Loader2, ShieldAlert, Lock } from "lucide-react";

const STORAGE_KEY = "cc-demo-last-reset";

export const ResetDemoDataCard = () => {
  const { user } = useAuth();
  const email = user?.email?.toLowerCase() ?? null;
  const isAdminDemo = email === "admin@test.com";
  const [loading, setLoading] = useState(false);
  const [lastReset, setLastReset] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const handleReset = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-demo-data");
      if (error) throw error;
      const stamp = data?.reset_at ?? new Date().toISOString();
      try {
        localStorage.setItem(STORAGE_KEY, stamp);
      } catch {
        /* ignore */
      }
      setLastReset(stamp);
      toast({
        title: "Demo data restored",
        description: `Re-seeded ${data?.deleted_demo_users ?? 0} accounts and the original event set. You'll be signed out — pick a persona to start fresh.`,
      });
      // Caller account was just deleted server-side; clear local session.
      await supabase.auth.signOut();
      // Reload so the rest of the app picks up the new state.
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

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10">
            <ShieldAlert className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <CardTitle className="text-lg">Reset seeded data</CardTitle>
            <CardDescription>
              Restore the original demo snapshot — every demo account and event.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1.5">
          <p className="font-medium text-foreground">What this does:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Deletes all <code className="text-[11px]">@test.com</code> accounts and their data (profiles, vendors, applications, tickets, notifications).</li>
            <li>Removes every event organized by a demo account.</li>
            <li>Re-creates the original demo accounts, vendors, and seeded 2026 events.</li>
          </ul>
          <p className="pt-1">
            Real (non-demo) users and their data are <strong>not</strong> touched.
          </p>
        </div>

        {lastReset && (
          <p className="text-xs text-muted-foreground">
            Last reset: {new Date(lastReset).toLocaleString()}
          </p>
        )}

        {!isAdminDemo ? (
          <div className="flex items-start gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              Only the <Badge variant="outline" className="mx-1 font-mono text-[10px]">admin@test.com</Badge> demo account can reset.
              Switch personas above and choose Admin to enable this action.
            </div>
          </div>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={loading}
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
                  onClick={handleReset}
                  disabled={loading}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, reset everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  );
};
