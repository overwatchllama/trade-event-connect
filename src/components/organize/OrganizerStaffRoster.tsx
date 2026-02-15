import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2, Users, UserPlus, Edit2, Check, X, Tags } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface RosterMember {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  default_role: string | null;
  notes: string | null;
}

interface SavedRole {
  id: string;
  role_name: string;
}

export const OrganizerStaffRoster = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<RosterMember[]>([]);
  const [roles, setRoles] = useState<SavedRole[]>([]);
  const [loading, setLoading] = useState(true);

  // Add member form
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  // Add role form
  const [newRoleName, setNewRoleName] = useState("");
  const [addingRole, setAddingRole] = useState(false);

  // Edit member
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", default_role: "", notes: "" });

  useEffect(() => {
    if (user) fetchAll();
  }, [user]);

  const fetchAll = async () => {
    if (!user) return;
    try {
      const [membersRes, rolesRes] = await Promise.all([
        supabase
          .from("organizer_staff_roster")
          .select("id, name, email, phone, default_role, notes")
          .eq("organizer_id", user.id)
          .order("name"),
        supabase
          .from("organizer_staff_roles")
          .select("id, role_name")
          .eq("organizer_id", user.id)
          .order("role_name"),
      ]);
      setMembers(membersRes.data || []);
      setRoles(rolesRes.data || []);
    } catch (error) {
      console.error("Error fetching staff roster:", error);
    } finally {
      setLoading(false);
    }
  };

  const addMember = async () => {
    if (!user || !newName.trim()) return;
    setAddingMember(true);
    try {
      const { error } = await supabase.from("organizer_staff_roster").insert({
        organizer_id: user.id,
        name: newName.trim(),
        email: newEmail.trim() || null,
        phone: newPhone.trim() || null,
        default_role: newRole || null,
        notes: newNotes.trim() || null,
      });
      if (error) throw error;
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setNewRole("");
      setNewNotes("");
      toast.success("Staff member added to roster");
      fetchAll();
    } catch (error) {
      console.error(error);
      toast.error("Failed to add staff member");
    } finally {
      setAddingMember(false);
    }
  };

  const deleteMember = async (id: string) => {
    try {
      const { error } = await supabase.from("organizer_staff_roster").delete().eq("id", id);
      if (error) throw error;
      setMembers((prev) => prev.filter((m) => m.id !== id));
      toast.success("Staff member removed");
    } catch {
      toast.error("Failed to remove");
    }
  };

  const startEdit = (m: RosterMember) => {
    setEditingId(m.id);
    setEditForm({
      name: m.name,
      email: m.email || "",
      phone: m.phone || "",
      default_role: m.default_role || "",
      notes: m.notes || "",
    });
  };

  const saveEdit = async () => {
    if (!editingId || !editForm.name.trim()) return;
    try {
      const { error } = await supabase
        .from("organizer_staff_roster")
        .update({
          name: editForm.name.trim(),
          email: editForm.email.trim() || null,
          phone: editForm.phone.trim() || null,
          default_role: editForm.default_role || null,
          notes: editForm.notes.trim() || null,
        })
        .eq("id", editingId);
      if (error) throw error;
      setEditingId(null);
      toast.success("Updated");
      fetchAll();
    } catch {
      toast.error("Failed to update");
    }
  };

  const addRole = async () => {
    if (!user || !newRoleName.trim()) return;
    setAddingRole(true);
    try {
      const { error } = await supabase.from("organizer_staff_roles").insert({
        organizer_id: user.id,
        role_name: newRoleName.trim(),
      });
      if (error) {
        if (error.code === "23505") {
          toast.error("This role already exists");
        } else {
          throw error;
        }
      } else {
        setNewRoleName("");
        toast.success("Role added");
        fetchAll();
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to add role");
    } finally {
      setAddingRole(false);
    }
  };

  const deleteRole = async (id: string) => {
    try {
      const { error } = await supabase.from("organizer_staff_roles").delete().eq("id", id);
      if (error) throw error;
      setRoles((prev) => prev.filter((r) => r.id !== id));
      toast.success("Role removed");
    } catch {
      toast.error("Failed to remove role");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Staff Roster</h2>
        <p className="text-sm text-muted-foreground">
          Save your go-to staff and roles here, then quickly assign them when managing event staff.
        </p>
      </div>

      <Tabs defaultValue="people">
        <TabsList>
          <TabsTrigger value="people" className="gap-2">
            <Users className="w-4 h-4" />
            People ({members.length})
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Tags className="w-4 h-4" />
            Roles ({roles.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="people" className="mt-4 space-y-4">
          {/* Add member form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Add Staff Member
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  placeholder="Name *"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addMember()}
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
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Default role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No default role</SelectItem>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.role_name}>
                        {r.role_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                placeholder="Notes (optional)"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
              />
              <Button onClick={addMember} disabled={addingMember || !newName.trim()} size="sm">
                {addingMember ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                Add to Roster
              </Button>
            </CardContent>
          </Card>

          {/* Members list */}
          {members.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No staff members saved yet. Add people above to build your roster.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <Card key={m.id}>
                  <CardContent className="py-3 px-4">
                    {editingId === m.id ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                            placeholder="Name"
                            className="h-8 text-sm"
                          />
                          <Input
                            value={editForm.email}
                            onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                            placeholder="Email"
                            className="h-8 text-sm"
                          />
                          <Input
                            value={editForm.phone}
                            onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                            placeholder="Phone"
                            className="h-8 text-sm"
                          />
                          <Select
                            value={editForm.default_role || "none"}
                            onValueChange={(v) => setEditForm((p) => ({ ...p, default_role: v === "none" ? "" : v }))}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No default role</SelectItem>
                              {roles.map((r) => (
                                <SelectItem key={r.id} value={r.role_name}>
                                  {r.role_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Input
                          value={editForm.notes}
                          onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                          placeholder="Notes"
                          className="h-8 text-sm"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" className="h-7 text-xs" onClick={saveEdit} disabled={!editForm.name.trim()}>
                            <Check className="h-3 w-3 mr-1" /> Save
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{m.name}</span>
                            {m.default_role && (
                              <Badge variant="secondary" className="text-xs">
                                {m.default_role}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {[m.email, m.phone].filter(Boolean).join(" · ") || "No contact info"}
                          </div>
                          {m.notes && (
                            <div className="text-xs text-muted-foreground italic">{m.notes}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => startEdit(m)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => deleteMember(m.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="roles" className="mt-4 space-y-4">
          {/* Add role form */}
          <div className="flex gap-2">
            <Input
              placeholder="New role name (e.g. Security, Registration, Manager)..."
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addRole()}
              className="flex-1"
            />
            <Button onClick={addRole} disabled={addingRole || !newRoleName.trim()} size="sm">
              {addingRole ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Add Role
            </Button>
          </div>

          {roles.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Tags className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No roles saved yet. Add common roles like Security, Registration, or Manager above.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => (
                <Badge key={r.id} variant="secondary" className="text-sm py-1.5 px-3 gap-2">
                  {r.role_name}
                  <button
                    onClick={() => deleteRole(r.id)}
                    className="hover:text-destructive ml-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
