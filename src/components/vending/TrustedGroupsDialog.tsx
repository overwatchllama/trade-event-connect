import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Users, ArrowLeft, Heart, Search, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId: string;
  /** Vendors available to add as members (excludes self). */
  vendors: { id: string; business_name: string }[];
  /** Favorited vendor ids, used to surface trusted vendors first. */
  shortlistedVendorIds: Set<string>;
  /** Notify parent when groups change so create dialog can refresh. */
  onChanged?: () => void;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  owner_vendor_id: string;
  memberCount?: number;
}

interface Member {
  id: string;
  vendor_id: string;
  business_name: string;
}

export const TrustedGroupsDialog = ({ open, onOpenChange, vendorId, vendors, shortlistedVendorIds, onChanged }: Props) => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [savingMember, setSavingMember] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) fetchGroups();
    if (!open) {
      setActiveGroupId(null);
      setShowCreate(false);
      setNewName('');
      setNewDescription('');
      setMemberSearch('');
    }
  }, [open, user]);

  useEffect(() => {
    if (activeGroupId) fetchMembers(activeGroupId);
    else setMembers([]);
  }, [activeGroupId]);

  const fetchGroups = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendor_trusted_groups' as any)
        .select('id, name, description, owner_vendor_id')
        .eq('owner_user_id', user.id)
        .order('name');
      if (error) throw error;
      const list = (data ?? []) as any as Group[];

      // counts
      if (list.length > 0) {
        const { data: mems } = await supabase
          .from('vendor_trusted_group_members' as any)
          .select('group_id')
          .in('group_id', list.map((g) => g.id));
        const counts = new Map<string, number>();
        for (const m of (mems ?? []) as any[]) counts.set(m.group_id, (counts.get(m.group_id) ?? 0) + 1);
        list.forEach((g) => (g.memberCount = counts.get(g.id) ?? 0));
      }
      setGroups(list);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (groupId: string) => {
    const { data, error } = await supabase
      .from('vendor_trusted_group_members' as any)
      .select('id, vendor_id')
      .eq('group_id', groupId);
    if (error) {
      toast.error(error.message);
      return;
    }
    const rows = (data ?? []) as any[];
    const byId = new Map(vendors.map((v) => [v.id, v.business_name]));
    setMembers(
      rows.map((r) => ({
        id: r.id,
        vendor_id: r.vendor_id,
        business_name: byId.get(r.vendor_id) ?? 'Unknown vendor',
      })),
    );
  };

  const handleCreateGroup = async () => {
    if (!user || !newName.trim()) return;
    try {
      const { data, error } = await supabase
        .from('vendor_trusted_groups' as any)
        .insert({
          owner_vendor_id: vendorId,
          owner_user_id: user.id,
          name: newName.trim(),
          description: newDescription.trim() || null,
        })
        .select('id')
        .single();
      if (error) throw error;
      toast.success('Group created');
      setShowCreate(false);
      setNewName('');
      setNewDescription('');
      await fetchGroups();
      setActiveGroupId((data as any).id);
      onChanged?.();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create group');
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Delete this group? Members will lose access to its listings.')) return;
    const { error } = await supabase.from('vendor_trusted_groups' as any).delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Group deleted');
    setActiveGroupId(null);
    fetchGroups();
    onChanged?.();
  };

  const handleAddMember = async (memberVendorId: string) => {
    if (!user || !activeGroupId) return;
    setSavingMember(memberVendorId);
    try {
      const { error } = await supabase
        .from('vendor_trusted_group_members' as any)
        .insert({ group_id: activeGroupId, vendor_id: memberVendorId, added_by: user.id });
      if (error) throw error;
      await fetchMembers(activeGroupId);
      await fetchGroups();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add member');
    } finally {
      setSavingMember(null);
    }
  };

  const handleRemoveMember = async (memberRowId: string) => {
    const { error } = await supabase.from('vendor_trusted_group_members' as any).delete().eq('id', memberRowId);
    if (error) return toast.error(error.message);
    if (activeGroupId) await fetchMembers(activeGroupId);
    await fetchGroups();
  };

  const activeGroup = useMemo(() => groups.find((g) => g.id === activeGroupId) ?? null, [groups, activeGroupId]);

  const memberIds = useMemo(() => new Set(members.map((m) => m.vendor_id)), [members]);

  const candidateVendors = useMemo(() => {
    const q = memberSearch.toLowerCase().trim();
    return vendors
      .filter((v) => !memberIds.has(v.id))
      .filter((v) => !q || v.business_name.toLowerCase().includes(q))
      .sort((a, b) => {
        const aFav = shortlistedVendorIds.has(a.id);
        const bFav = shortlistedVendorIds.has(b.id);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return a.business_name.localeCompare(b.business_name);
      })
      .slice(0, 50);
  }, [vendors, memberIds, memberSearch, shortlistedVendorIds]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Trusted Vendor Groups
          </DialogTitle>
          <DialogDescription>
            Create private groups of trusted vendors. You can post table listings visible only to a group's members.
          </DialogDescription>
        </DialogHeader>

        {!activeGroup ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-1" /> New group
              </Button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                You don't have any trusted groups yet.
              </div>
            ) : (
              <div className="grid gap-2 max-h-[50vh] overflow-y-auto">
                {groups.map((g) => (
                  <Card key={g.id} className="hover:bg-accent/40 transition-colors">
                    <CardContent className="p-3 flex items-center justify-between gap-3">
                      <button
                        className="text-left flex-1 min-w-0"
                        onClick={() => setActiveGroupId(g.id)}
                      >
                        <div className="font-medium truncate">{g.name}</div>
                        {g.description && (
                          <div className="text-xs text-muted-foreground truncate">{g.description}</div>
                        )}
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {g.memberCount ?? 0} member{(g.memberCount ?? 0) === 1 ? '' : 's'}
                        </div>
                      </button>
                      <Button size="icon" variant="ghost" onClick={() => handleDeleteGroup(g.id)} aria-label="Delete group">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {showCreate && (
              <div className="rounded-md border p-3 space-y-3">
                <div className="space-y-1.5">
                  <Label>Group name</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Local card shop circle" />
                </div>
                <div className="space-y-1.5">
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Who's in this group?"
                    rows={2}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleCreateGroup} disabled={!newName.trim()}>Create</Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setActiveGroupId(null)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{activeGroup.name}</div>
                {activeGroup.description && (
                  <div className="text-xs text-muted-foreground truncate">{activeGroup.description}</div>
                )}
              </div>
              <Badge variant="secondary">{members.length} member{members.length === 1 ? '' : 's'}</Badge>
            </div>

            <div>
              <div className="text-xs uppercase text-muted-foreground mb-1.5">Members</div>
              {members.length === 0 ? (
                <div className="text-sm text-muted-foreground py-2">No members yet. Add vendors below.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => (
                    <Badge key={m.id} variant="outline" className="gap-1 pr-1 max-w-full">
                      <span className="truncate">{m.business_name}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-4 w-4 ml-1"
                        onClick={() => handleRemoveMember(m.id)}
                        aria-label={`Remove ${m.business_name}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-xs uppercase text-muted-foreground mb-1.5">Add members</div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vendors..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="mt-2 max-h-[200px] overflow-y-auto border rounded-md divide-y">
                {candidateVendors.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-3">No vendors found</div>
                ) : (
                  candidateVendors.map((v) => (
                    <div key={v.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                      {shortlistedVendorIds.has(v.id) && (
                        <Heart className="h-3 w-3 fill-red-500 text-red-500 shrink-0" />
                      )}
                      <span className="flex-1 truncate">{v.business_name}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddMember(v.id)}
                        disabled={savingMember === v.id}
                      >
                        {savingMember === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
