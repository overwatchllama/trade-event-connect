import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogIn, LogOut, Clock, MapPin, Calendar, Loader2, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface StaffData {
  id: string;
  name: string;
  role: string;
  checked_in: boolean;
  checked_in_at: string | null;
  checked_out_at: string | null;
  event: {
    title: string;
    date: string;
    venue: string;
    city: string;
    state: string;
  } | null;
}

const FUNCTION_URL = "https://gsjwamfnoezhwlhkqzdn.supabase.co/functions/v1/staff-check-in";

const StaffCheckIn = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<StaffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const res = await fetch(`${FUNCTION_URL}?token=${token}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Invalid or expired link");
        return;
      }
      setData(json);
    } catch {
      setError("Failed to load check-in data");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: "check_in" | "check_out") => {
    setActing(true);
    try {
      const res = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error);
        return;
      }
      // Re-fetch to get updated state
      await fetchData();
    } catch {
      setError("Failed to update check-in status");
    } finally {
      setActing(false);
    }
  };

  const formatHours = (checkinAt: string, checkoutAt: string | null) => {
    const start = new Date(checkinAt);
    const end = checkoutAt ? new Date(checkoutAt) : new Date();
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-medium">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">
              This link may be invalid or expired. Contact your event organizer.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl">Staff Check-in</CardTitle>
          {data.event && (
            <CardDescription className="space-y-1">
              <span className="block text-base font-medium text-foreground">{data.event.title}</span>
              <span className="flex items-center justify-center gap-1 text-sm">
                <Calendar className="h-3.5 w-3.5" />
                {data.event.date}
              </span>
              <span className="flex items-center justify-center gap-1 text-sm">
                <MapPin className="h-3.5 w-3.5" />
                {data.event.venue}, {data.event.city}, {data.event.state}
              </span>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Staff info */}
          <div className="text-center space-y-2">
            <p className="text-xl font-semibold">{data.name}</p>
            <Badge variant="secondary" className="text-sm">{data.role}</Badge>
          </div>

          {/* Status */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-center gap-2">
              {data.checked_in ? (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1 text-sm py-1 px-3">
                  <CheckCircle className="h-4 w-4" />
                  Checked In
                </Badge>
              ) : data.checked_out_at ? (
                <Badge variant="outline" className="gap-1 text-sm py-1 px-3">
                  <LogOut className="h-4 w-4" />
                  Checked Out
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 text-sm py-1 px-3">
                  Not Checked In
                </Badge>
              )}
            </div>

            {data.checked_in_at && (
              <div className="text-center text-sm text-muted-foreground space-y-0.5">
                <p className="flex items-center justify-center gap-1">
                  <LogIn className="h-3.5 w-3.5" />
                  Checked in at {format(new Date(data.checked_in_at), "h:mm a")}
                </p>
                {data.checked_out_at && (
                  <p className="flex items-center justify-center gap-1">
                    <LogOut className="h-3.5 w-3.5" />
                    Checked out at {format(new Date(data.checked_out_at), "h:mm a")}
                  </p>
                )}
                <p className="flex items-center justify-center gap-1 font-medium">
                  <Clock className="h-3.5 w-3.5" />
                  {formatHours(data.checked_in_at, data.checked_out_at)}
                </p>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          {/* Action button */}
          <div className="flex justify-center">
            {data.checked_in ? (
              <Button
                size="lg"
                variant="outline"
                className="w-full text-lg py-6"
                onClick={() => handleAction("check_out")}
                disabled={acting}
              >
                {acting ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <LogOut className="h-5 w-5 mr-2" />
                )}
                Check Out
              </Button>
            ) : (
              <Button
                size="lg"
                className="w-full text-lg py-6"
                onClick={() => handleAction("check_in")}
                disabled={acting}
              >
                {acting ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <LogIn className="h-5 w-5 mr-2" />
                )}
                Check In
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffCheckIn;
