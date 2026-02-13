import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StaffRole {
  id: string;
  role_name: string;
  required_count: number;
}

interface EventStaffRolesProps {
  eventId: string;
}

export const EventStaffRoles = ({ eventId }: EventStaffRolesProps) => {
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleCount, setNewRoleCount] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, [eventId]);

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from("event_staff_roles")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error("Error fetching staff roles:", error);
    } finally {
      setLoading(false);
    }
  };

  const addRole = async () => {
    if (!newRoleName.trim()) return;
    setAdding(true);
    try {
      const { error } = await supabase.from("event_staff_roles").insert({
        event_id: eventId,
        role_name: newRoleName.trim(),
        required_count: newRoleCount,
      });
      if (error) throw error;
      setNewRoleName("");
      setNewRoleCount(1);
      toast.success("Staff role added!");
      fetchRoles();
    } catch (error) {
      console.error("Error adding role:", error);
      toast.error("Failed to add staff role");
    } finally {
      setAdding(false);
    }
  };

  const updateCount = async (id: string, count: number) => {
    if (count < 1) return;
    try {
      const { error } = await supabase
        .from("event_staff_roles")
        .update({ required_count: count })
        .eq("id", id);
      if (error) throw error;
      setRoles((prev) =>
        prev.map((r) => (r.id === id ? { ...r, required_count: count } : r))
      );
    } catch {
      toast.error("Failed to update count");
    }
  };

  const deleteRole = async (id: string) => {
    try {
      const { error } = await supabase
        .from("event_staff_roles")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setRoles((prev) => prev.filter((r) => r.id !== id));
      toast.success("Staff role removed");
    } catch {
      toast.error("Failed to remove staff role");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalRequired = roles.reduce((sum, r) => sum + r.required_count, 0);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">Event Staff Roles</h3>
        <p className="text-sm text-muted-foreground">
          Define the roles and number of staff needed for this event.
        </p>
      </div>

      {/* Add new role */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Role Name
          </label>
          <Input
            placeholder="e.g. Manager, Security, Registration..."
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addRole()}
          />
        </div>
        <div className="w-20">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Needed
          </label>
          <Input
            type="number"
            min={1}
            value={newRoleCount}
            onChange={(e) => setNewRoleCount(parseInt(e.target.value) || 1)}
          />
        </div>
        <Button onClick={addRole} disabled={adding || !newRoleName.trim()} size="sm">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add
        </Button>
      </div>

      {/* Roles list */}
      {roles.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <UserCog className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              No staff roles defined yet. Add roles like Manager, Security, or Registration above.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {roles.map((role) => (
            <div
              key={role.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="font-medium">
                  {role.role_name}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground mr-1">Required:</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => updateCount(role.id, role.required_count - 1)}
                  disabled={role.required_count <= 1}
                >
                  −
                </Button>
                <span className="w-6 text-center font-medium text-sm">
                  {role.required_count}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => updateCount(role.id, role.required_count + 1)}
                >
                  +
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => deleteRole(role.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          <div className="text-right text-sm text-muted-foreground pt-1">
            Total staff needed: <span className="font-semibold text-foreground">{totalRequired}</span>
          </div>
        </div>
      )}
    </div>
  );
};
