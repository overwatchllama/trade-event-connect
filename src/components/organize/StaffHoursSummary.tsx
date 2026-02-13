import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface StaffHourEntry {
  id: string;
  assigned_name: string;
  role_name: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
}

interface StaffHoursSummaryProps {
  eventId: string;
}

export const StaffHoursSummary = ({ eventId }: StaffHoursSummaryProps) => {
  const [staff, setStaff] = useState<StaffHourEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaffHours();
  }, [eventId]);

  const fetchStaffHours = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("event_staff_assignments")
        .select("id, assigned_name, checked_in_at, checked_out_at, event_staff_roles!inner(role_name)")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const mapped = (data || []).map((a: any) => ({
        id: a.id,
        assigned_name: a.assigned_name,
        role_name: a.event_staff_roles.role_name,
        checked_in_at: a.checked_in_at,
        checked_out_at: a.checked_out_at,
      }));

      setStaff(mapped);
    } catch (error) {
      console.error("Error fetching staff hours:", error);
    } finally {
      setLoading(false);
    }
  };

  const getHoursWorked = (entry: StaffHourEntry): number | null => {
    if (!entry.checked_in_at) return null;
    if (!entry.checked_out_at) return null;
    const start = new Date(entry.checked_in_at);
    const end = new Date(entry.checked_out_at);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const staffWithHours = staff.filter(s => s.checked_in_at);
  const totalHours = staffWithHours.reduce((sum, s) => {
    const h = getHoursWorked(s);
    return sum + (h || 0);
  }, 0);
  const completedShifts = staff.filter(s => s.checked_in_at && s.checked_out_at).length;

  if (loading) {
    return <p className="text-sm text-muted-foreground py-4">Loading hours summary...</p>;
  }

  if (staff.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No staff assigned to this event yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{staffWithHours.length}</p>
            <p className="text-xs text-muted-foreground">Staff Worked</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <Timer className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{formatHours(totalHours)}</p>
            <p className="text-xs text-muted-foreground">Total Hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{completedShifts}/{staff.length}</p>
            <p className="text-xs text-muted-foreground">Shifts Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Hours table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Check In</TableHead>
              <TableHead>Check Out</TableHead>
              <TableHead className="text-right">Hours</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map(entry => {
              const hours = getHoursWorked(entry);
              return (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.assigned_name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{entry.role_name}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {entry.checked_in_at ? format(new Date(entry.checked_in_at), "h:mm a") : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {entry.checked_out_at ? format(new Date(entry.checked_out_at), "h:mm a") : 
                      entry.checked_in_at ? <Badge variant="outline" className="text-xs">Active</Badge> : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {hours !== null ? formatHours(hours) : 
                      entry.checked_in_at ? <span className="text-muted-foreground text-xs">In progress</span> : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
