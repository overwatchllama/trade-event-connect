import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2, UserCog, ChevronDown, ChevronRight, UserPlus, X, Store, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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

interface RosterMember {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  default_role: string | null;
  notes: string | null;
  allow_vend: boolean;
  vendor_id: string | null;
}

interface VendorOption {
  id: string;
  business_name: string;
}

interface SavedRole {
  id: string;
  role_name: string;
}

interface EventStaffRolesProps {
  eventId: string;
}

const parseRoles = (roleStr: string | null): string[] => {
  if (!roleStr) return [];
  return roleStr.split(",").map((r) => r.trim()).filter(Boolean);
};

const joinRoles = (roles: string[]): string | null => {
  return roles.length > 0 ? roles.join(", ") : null;
};

export const EventStaffRoles = ({ eventId }: EventStaffRolesProps) => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [assignments, setAssignments] = useState<StaffAssignment[]>([]);
  const [rosterMembers, setRosterMembers] = useState<RosterMember[]>([]);
  const [organizerRoles, setOrganizerRoles] = useState<SavedRole[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleCount, setNewRoleCount] = useState(1);
  const [adding, setAdding] = useState(false);
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());

  // Roster picker state
  const [selectingForRole, setSelectingForRole] = useState<string | null>(null);
  const [selectedRosterId, setSelectedRosterId] = useState("");

  // New member dialog state
  const [newMemberDialogOpen, setNewMemberDialogOpen] = useState(false);
  const [newMemberForRole, setNewMemberForRole] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRoles2, setNewRoles2] = useState<string[]>([]);
  const [newNotes, setNewNotes] = useState("");
  const [newAllowVend, setNewAllowVend] = useState(false);
  const [newVendorId, setNewVendorId] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    fetchData();
  }, [eventId, user]);

  const fetchData = async () => {
    if (!user) return;
    try {
      const [rolesRes, assignmentsRes, rosterRes, orgRolesRes, vendorsRes] = await Promise.all([
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
        supabase
          .from("organizer_staff_roster")
          .select("id, name, email, phone, default_role, notes, allow_vend, vendor_id")
          .eq("organizer_id", user.id)
          .order("name"),
        supabase
          .from("organizer_staff_roles")
          .select("id, role_name")
          .eq("organizer_id", user.id)
          .order("role_name"),
        supabase
          .from("vendors")
          .select("id, business_name")
          .order("business_name"),
      ]);

      if (rolesRes.error) throw rolesRes.error;
      if (assignmentsRes.error) throw assignmentsRes.error;
      setRoles(rolesRes.data || []);
      setAssignments(assignmentsRes.data || []);
      setRosterMembers((rosterRes.data || []).map((m: any) => ({
        ...m,
        allow_vend: m.allow_vend ?? false,
        vendor_id: m.vendor_id ?? null,
      })));
      setOrganizerRoles(orgRolesRes.data || []);
      setVendors(vendorsRes.data || []);
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

  const assignRosterMember = async (roleId: string) => {
    if (!selectedRosterId) return;
    const member = rosterMembers.find((m) => m.id === selectedRosterId);
    if (!member) return;

    try {
      const { error } = await supabase.from("event_staff_assignments").insert({
        event_id: eventId,
        staff_role_id: roleId,
        assigned_name: member.name,
        assigned_email: member.email,
        assigned_phone: member.phone,
        notes: member.notes,
      });
      if (error) throw error;
      setSelectedRosterId("");
      setSelectingForRole(null);
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

  const openNewMemberDialog = (roleId: string) => {
    setNewMemberForRole(roleId);
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setNewRoles2([]);
    setNewNotes("");
    setNewAllowVend(false);
    setNewVendorId("");
    setNewMemberDialogOpen(true);
  };

  const createAndAssignMember = async () => {
    if (!user || !newName.trim() || !newMemberForRole) return;
    setAddingMember(true);
    try {
      // 1. Add to organizer roster
      const { data: rosterData, error: rosterError } = await supabase
        .from("organizer_staff_roster")
        .insert({
          organizer_id: user.id,
          name: newName.trim(),
          email: newEmail.trim() || null,
          phone: newPhone.trim() || null,
          default_role: joinRoles(newRoles2),
          notes: newNotes.trim() || null,
          allow_vend: newAllowVend,
          vendor_id: newVendorId || null,
        })
        .select("id")
        .single();
      if (rosterError) throw rosterError;

      // 2. Assign to event role
      const { error: assignError } = await supabase.from("event_staff_assignments").insert({
        event_id: eventId,
        staff_role_id: newMemberForRole,
        assigned_name: newName.trim(),
        assigned_email: newEmail.trim() || null,
        assigned_phone: newPhone.trim() || null,
        notes: newNotes.trim() || null,
      });
      if (assignError) throw assignError;

      setNewMemberDialogOpen(false);
      toast.success("Staff member created and assigned!");
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create staff member");
    } finally {
      setAddingMember(false);
    }
  };

  const roleOptions = organizerRoles.map((r) => ({ label: r.role_name, value: r.role_name }));

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
          Define roles, set headcount, and assign staff from your roster.
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

                      {/* Select from roster or add new */}
                      {selectingForRole === role.id ? (
                        <div className="space-y-2 pt-1 border-t">
                          <label className="text-xs font-medium text-muted-foreground">Select from roster</label>
                          <Select value={selectedRosterId} onValueChange={setSelectedRosterId}>
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Choose a staff member..." />
                            </SelectTrigger>
                            <SelectContent>
                              {rosterMembers.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.name}
                                  {m.default_role ? ` (${m.default_role})` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => assignRosterMember(role.id)}
                              disabled={!selectedRosterId}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Assign
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => openNewMemberDialog(role.id)}
                            >
                              <UserPlus className="h-3 w-3 mr-1" />
                              Add Staff Member
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                setSelectingForRole(null);
                                setSelectedRosterId("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs flex-1"
                            onClick={() => {
                              setSelectingForRole(role.id);
                              setSelectedRosterId("");
                            }}
                          >
                            <Users className="h-3 w-3 mr-1" />
                            Assign from Roster
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => openNewMemberDialog(role.id)}
                          >
                            <UserPlus className="h-3 w-3 mr-1" />
                            Add Staff Member
                          </Button>
                        </div>
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

      {/* New Staff Member Dialog (mirrors Manage Staff roster fields) */}
      <Dialog open={newMemberDialogOpen} onOpenChange={setNewMemberDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add Staff Member
            </DialogTitle>
            <DialogDescription>
              Create a new staff member. They'll be added to your roster and assigned to this role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="Name *"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Input
                placeholder="Email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <Input
                placeholder="Phone"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
            </div>
            <MultiSelect
              options={roleOptions}
              onChange={setNewRoles2}
              selected={newRoles2}
              placeholder="Select default roles"
            />
            <Input
              placeholder="Notes (optional)"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
            />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="dialog-allow-vend"
                  checked={newAllowVend}
                  onCheckedChange={(v) => setNewAllowVend(!!v)}
                />
                <label htmlFor="dialog-allow-vend" className="text-sm cursor-pointer">Allow to vend</label>
              </div>
              {newAllowVend && vendors.length > 0 && (
                <Select value={newVendorId} onValueChange={setNewVendorId}>
                  <SelectTrigger className="w-[200px] h-8 text-sm">
                    <SelectValue placeholder="Associate vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No vendor</SelectItem>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.business_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={createAndAssignMember} disabled={addingMember || !newName.trim()} size="sm">
                {addingMember ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                Create & Assign
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setNewMemberDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
