import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, Loader2, UserCog, ChevronDown, ChevronRight, UserPlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StaffRole {
  id: string;
  role_name: string;
  required_count: number;
}

interface StaffAssignment {
  id: string;
  staff_role_id: string;
  assigned_name: string;
  assigned_email: string | null;
  assigned_phone: string | null;
  notes: string | null;
  user_id: string | null;
}

interface EventStaffRolesProps {
  eventId: string;
}

export const EventStaffRoles = ({ eventId }: EventStaffRolesProps) => {
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [assignments, setAssignments] = useState<StaffAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleCount, setNewRoleCount] = useState(1);
  const [adding, setAdding] = useState(false);
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
  const [addingToRole, setAddingToRole] = useState<string | null>(null);
  const [newAssignment, setNewAssignment] = useState({ name: "", email: "", phone: "", notes: "" });

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      const [rolesRes, assignmentsRes] = await Promise.all([
        supabase
          .from("event_staff_roles")
          .select("*")
          .eq("event_id", eventId)
          .order("created_at", { ascending: true }),
        supabase
          .from("event_staff_assignments")
          .select("*")
          .eq("event_id", eventId)
          .order("created_at", { ascending: true }),
      ]);

      if (rolesRes.error) throw rolesRes.error;
      if (assignmentsRes.error) throw assignmentsRes.error;
      setRoles(rolesRes.data || []);
      setAssignments(assignmentsRes.data || []);
    } catch (error) {
      console.error("Error fetching staff data:", error);
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
      fetchData();
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
      setAssignments((prev) => prev.filter((a) => a.staff_role_id !== id));
      toast.success("Staff role removed");
    } catch {
      toast.error("Failed to remove staff role");
    }
  };

  const addAssignment = async (roleId: string) => {
    if (!newAssignment.name.trim()) return;
    try {
      const { error } = await supabase.from("event_staff_assignments").insert({
        event_id: eventId,
        staff_role_id: roleId,
        assigned_name: newAssignment.name.trim(),
        assigned_email: newAssignment.email.trim() || null,
        assigned_phone: newAssignment.phone.trim() || null,
        notes: newAssignment.notes.trim() || null,
      });
      if (error) throw error;
      setNewAssignment({ name: "", email: "", phone: "", notes: "" });
      setAddingToRole(null);
      toast.success("Staff member assigned!");
      fetchData();
    } catch (error) {
      console.error("Error assigning staff:", error);
      toast.error("Failed to assign staff member");
    }
  };

  const removeAssignment = async (id: string) => {
    try {
      const { error } = await supabase
        .from("event_staff_assignments")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      toast.success("Staff member removed");
    } catch {
      toast.error("Failed to remove staff member");
    }
  };

  const toggleExpanded = (roleId: string) => {
    setExpandedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  };

  const getAssignmentsForRole = (roleId: string) =>
    assignments.filter((a) => a.staff_role_id === roleId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalRequired = roles.reduce((sum, r) => sum + r.required_count, 0);
  const totalAssigned = assignments.length;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">Event Staff Roles</h3>
        <p className="text-sm text-muted-foreground">
          Define roles, set headcount, and assign staff members.
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
          {roles.map((role) => {
            const roleAssignments = getAssignmentsForRole(role.id);
            const filled = roleAssignments.length;
            const isExpanded = expandedRoles.has(role.id);
            const isFull = filled >= role.required_count;

            return (
              <Collapsible key={role.id} open={isExpanded} onOpenChange={() => toggleExpanded(role.id)}>
                <div className="rounded-lg border bg-card">
                  <div className="flex items-center justify-between p-3">
                    <CollapsibleTrigger className="flex items-center gap-3 cursor-pointer hover:opacity-80">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Badge variant="secondary" className="font-medium">
                        {role.role_name}
                      </Badge>
                      <span className={`text-xs font-medium ${isFull ? 'text-green-600' : 'text-amber-600'}`}>
                        {filled}/{role.required_count} filled
                      </span>
                    </CollapsibleTrigger>
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

                  <CollapsibleContent>
                    <div className="border-t px-3 pb-3 pt-2 space-y-2">
                      {/* Assigned staff list */}
                      {roleAssignments.length > 0 ? (
                        <div className="space-y-1">
                          {roleAssignments.map((assignment) => (
                            <div
                              key={assignment.id}
                              className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/50 text-sm"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{assignment.assigned_name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {[assignment.assigned_email, assignment.assigned_phone]
                                    .filter(Boolean)
                                    .join(" · ") || "No contact info"}
                                </span>
                                {assignment.notes && (
                                  <span className="text-xs text-muted-foreground italic">{assignment.notes}</span>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => removeAssignment(assignment.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic py-1">
                          No staff assigned to this role yet.
                        </p>
                      )}

                      {/* Add staff form */}
                      {addingToRole === role.id ? (
                        <div className="space-y-2 pt-1 border-t">
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              placeholder="Name *"
                              value={newAssignment.name}
                              onChange={(e) => setNewAssignment((p) => ({ ...p, name: e.target.value }))}
                              className="h-8 text-sm"
                            />
                            <Input
                              placeholder="Email"
                              value={newAssignment.email}
                              onChange={(e) => setNewAssignment((p) => ({ ...p, email: e.target.value }))}
                              className="h-8 text-sm"
                            />
                            <Input
                              placeholder="Phone"
                              value={newAssignment.phone}
                              onChange={(e) => setNewAssignment((p) => ({ ...p, phone: e.target.value }))}
                              className="h-8 text-sm"
                            />
                            <Input
                              placeholder="Notes"
                              value={newAssignment.notes}
                              onChange={(e) => setNewAssignment((p) => ({ ...p, notes: e.target.value }))}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => addAssignment(role.id)}
                              disabled={!newAssignment.name.trim()}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Assign
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                setAddingToRole(null);
                                setNewAssignment({ name: "", email: "", phone: "", notes: "" });
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs w-full"
                          onClick={() => {
                            setAddingToRole(role.id);
                            setNewAssignment({ name: "", email: "", phone: "", notes: "" });
                          }}
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          Add Staff Member
                        </Button>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
          <div className="text-right text-sm text-muted-foreground pt-1">
            Staff: <span className="font-semibold text-foreground">{totalAssigned}/{totalRequired}</span> assigned
          </div>
        </div>
      )}
    </div>
  );
};
