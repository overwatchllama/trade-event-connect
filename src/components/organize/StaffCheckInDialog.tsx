import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogIn, LogOut, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface StaffAssignment {
  id: string;
  assigned_name: string;
  assigned_email: string | null;
  assigned_phone: string | null;
  checked_in: boolean;
  checked_in_at: string | null;
  checked_out_at: string | null;
  notes: string | null;
  role_name: string;
  staff_role_id: string;
}

interface StaffCheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
}

const StaffCheckInDialog = ({ open, onOpenChange, eventId, eventTitle }: StaffCheckInDialogProps) => {
  const [staff, setStaff] = useState<StaffAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) fetchStaff();
  }, [open, eventId]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const { data: assignments, error: aErr } = await supabase
        .from("event_staff_assignments")
        .select("*, event_staff_roles!inner(role_name)")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });

      if (aErr) throw aErr;

      const mapped = (assignments || []).map((a: any) => ({
        id: a.id,
        assigned_name: a.assigned_name,
        assigned_email: a.assigned_email,
        assigned_phone: a.assigned_phone,
        checked_in: a.checked_in,
        checked_in_at: a.checked_in_at,
        checked_out_at: a.checked_out_at,
        notes: a.notes,
        role_name: a.event_staff_roles.role_name,
        staff_role_id: a.staff_role_id,
      }));

      setStaff(mapped);
    } catch (error) {
      console.error("Error fetching staff:", error);
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  const checkIn = async (id: string) => {
    try {
      const { error } = await supabase
        .from("event_staff_assignments")
        .update({ checked_in: true, checked_in_at: new Date().toISOString(), checked_out_at: null })
        .eq("id", id);
      if (error) throw error;
      setStaff((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, checked_in: true, checked_in_at: new Date().toISOString(), checked_out_at: null } : s
        )
      );
      toast.success("Staff member checked in");
    } catch {
      toast.error("Failed to check in");
    }
  };

  const checkOut = async (id: string) => {
    try {
      const { error } = await supabase
        .from("event_staff_assignments")
        .update({ checked_in: false, checked_out_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      setStaff((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, checked_in: false, checked_out_at: new Date().toISOString() } : s
        )
      );
      toast.success("Staff member checked out");
    } catch {
      toast.error("Failed to check out");
    }
  };

  const getHoursWorked = (s: StaffAssignment) => {
    if (!s.checked_in_at) return null;
    const start = new Date(s.checked_in_at);
    const end = s.checked_out_at ? new Date(s.checked_out_at) : new Date();
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return hours;
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  // Group by role
  const roleGroups = staff.reduce<Record<string, StaffAssignment[]>>((acc, s) => {
    if (!acc[s.role_name]) acc[s.role_name] = [];
    acc[s.role_name].push(s);
    return acc;
  }, {});

  const checkedInCount = staff.filter((s) => s.checked_in).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Staff Check-in — {eventTitle}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {checkedInCount}/{staff.length} staff checked in
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : staff.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No staff assigned yet. Add staff members in the Staff tab first.
          </p>
        ) : (
          <div className="space-y-4">
            {Object.entries(roleGroups).map(([roleName, members]) => (
              <div key={roleName}>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Badge variant="secondary">{roleName}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {members.filter((m) => m.checked_in).length}/{members.length}
                  </span>
                </h4>
                <div className="space-y-1.5">
                  {members.map((member) => {
                    const hours = getHoursWorked(member);
                    return (
                      <div
                        key={member.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-sm ${
                          member.checked_in ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800" : "bg-card"
                        }`}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium truncate">{member.assigned_name}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {member.checked_in_at && (
                              <span className="flex items-center gap-0.5">
                                <LogIn className="h-3 w-3" />
                                {format(new Date(member.checked_in_at), "h:mm a")}
                              </span>
                            )}
                            {member.checked_out_at && (
                              <span className="flex items-center gap-0.5">
                                <LogOut className="h-3 w-3" />
                                {format(new Date(member.checked_out_at), "h:mm a")}
                              </span>
                            )}
                            {hours !== null && (
                              <span className="flex items-center gap-0.5">
                                <Clock className="h-3 w-3" />
                                {formatHours(hours)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          {member.checked_in ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => checkOut(member.id)}
                            >
                              <LogOut className="h-3 w-3 mr-1" />
                              Check Out
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => checkIn(member.id)}
                            >
                              <LogIn className="h-3 w-3 mr-1" />
                              Check In
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StaffCheckInDialog;
