import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2, ListChecks, Sparkles, UserCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface DayOfChecklistProps {
  eventId: string;
}

interface ChecklistItem {
  id: string;
  title: string;
  is_completed: boolean;
  completed_at: string | null;
  sort_order: number;
  assigned_to: string | null;
}

interface StaffMember {
  id: string;
  name: string;
}

const DEFAULT_CHECKLIST_ITEMS = [
  'Venue walkthrough & safety check',
  'Vendor load-in begins',
  'Confirm vendor table assignments',
  'Sound / AV equipment check',
  'Signage & banners placed',
  'Registration / check-in table set up',
  'Staff briefing complete',
  'Doors open to attendees',
  'Mid-event walkthrough',
  'Last call / closing announcements',
  'Vendor load-out begins',
  'Venue cleanup & walkthrough',
];

export const DayOfChecklist = ({ eventId }: DayOfChecklistProps) => {
  const { user } = useAuth();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemAssignee, setNewItemAssignee] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);

  useEffect(() => {
    fetchItems();
    fetchStaff();
  }, [eventId]);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('event_checklist_items')
        .select('id, title, is_completed, completed_at, sort_order, assigned_to')
        .eq('event_id', eventId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching checklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      // Get the event's organizer to find their vendor, then employees
      const { data: event } = await supabase
        .from('events')
        .select('organizer_id')
        .eq('id', eventId)
        .single();

      if (!event) return;

      // Get vendor employees assigned to this event
      const { data: assignments } = await supabase
        .from('vendor_employee_events')
        .select('employee_id')
        .eq('event_id', eventId);

      if (!assignments?.length) {
        // Fallback: get the organizer as the only staff member
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', event.organizer_id)
          .single();

        if (profile) {
          setStaffMembers([{ id: profile.id, name: profile.full_name || profile.email }]);
        }
        return;
      }

      const employeeIds = assignments.map(a => a.employee_id);
      const { data: employees } = await supabase
        .from('vendor_employees')
        .select('user_id')
        .in('id', employeeIds)
        .not('user_id', 'is', null);

      if (!employees?.length) return;

      const userIds = employees.map(e => e.user_id).filter(Boolean) as string[];
      
      // Include organizer
      const allIds = [...new Set([event.organizer_id, ...userIds])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', allIds);

      if (profiles) {
        setStaffMembers(profiles.map(p => ({ id: p.id, name: p.full_name || p.email })));
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const addItem = async () => {
    if (!newItemTitle.trim()) return;
    setAdding(true);
    try {
      const { data, error } = await supabase
        .from('event_checklist_items')
        .insert({
          event_id: eventId,
          title: newItemTitle.trim(),
          sort_order: items.length,
          assigned_to: newItemAssignee,
        })
        .select('id, title, is_completed, completed_at, sort_order, assigned_to')
        .single();

      if (error) throw error;
      setItems([...items, data]);
      setNewItemTitle('');
      setNewItemAssignee(null);
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
    } finally {
      setAdding(false);
    }
  };

  const toggleItem = async (item: ChecklistItem) => {
    const newCompleted = !item.is_completed;
    setItems(prev => prev.map(i =>
      i.id === item.id
        ? { ...i, is_completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null }
        : i
    ));

    const { error } = await supabase
      .from('event_checklist_items')
      .update({
        is_completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
        completed_by: newCompleted ? user?.id : null,
      })
      .eq('id', item.id);

    if (error) {
      setItems(prev => prev.map(i => i.id === item.id ? item : i));
      toast.error('Failed to update item');
    }
  };

  const assignItem = async (itemId: string, userId: string | null) => {
    setItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, assigned_to: userId } : i
    ));

    const { error } = await supabase
      .from('event_checklist_items')
      .update({ assigned_to: userId })
      .eq('id', itemId);

    if (error) {
      fetchItems();
      toast.error('Failed to assign item');
    }
  };

  const deleteItem = async (id: string) => {
    const prev = items;
    setItems(items.filter(i => i.id !== id));

    const { error } = await supabase
      .from('event_checklist_items')
      .delete()
      .eq('id', id);

    if (error) {
      setItems(prev);
      toast.error('Failed to delete item');
    }
  };

  const loadDefaults = async () => {
    try {
      const inserts = DEFAULT_CHECKLIST_ITEMS.map((title, index) => ({
        event_id: eventId,
        title,
        sort_order: items.length + index,
      }));

      const { data, error } = await supabase
        .from('event_checklist_items')
        .insert(inserts)
        .select('id, title, is_completed, completed_at, sort_order, assigned_to');

      if (error) throw error;
      setItems([...items, ...(data || [])]);
      toast.success('Default checklist loaded!');
    } catch (error) {
      console.error('Error loading defaults:', error);
      toast.error('Failed to load defaults');
    }
  };

  const staffMap = useMemo(() => {
    const map: Record<string, string> = {};
    staffMembers.forEach(s => { map[s.id] = s.name; });
    return map;
  }, [staffMembers]);

  const completedCount = items.filter(i => i.is_completed).length;
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Day-of Progress
            </CardTitle>
            <CardDescription>{completedCount} of {items.length} tasks complete</CardDescription>
          </div>
          <Badge variant={progress === 100 ? 'default' : 'secondary'} className="text-lg px-3">
            {progress}%
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-muted rounded-full h-3">
            <div
              className="bg-primary h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Checklist Items</CardTitle>
          <CardDescription>
            Track your event day tasks. Check items off and assign them to staff.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 && (
            <div className="text-center py-6 space-y-3">
              <p className="text-muted-foreground">No checklist items yet.</p>
              <Button variant="outline" onClick={loadDefaults}>
                <Sparkles className="h-4 w-4 mr-2" />
                Load Default Checklist
              </Button>
            </div>
          )}

          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
              >
                <Checkbox
                  checked={item.is_completed}
                  onCheckedChange={() => toggleItem(item)}
                />
                <span className={`flex-1 text-sm ${item.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                  {item.title}
                </span>

                {/* Staff assignment */}
                <Select
                  value={item.assigned_to || 'unassigned'}
                  onValueChange={(val) => assignItem(item.id, val === 'unassigned' ? null : val)}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <div className="flex items-center gap-1 truncate">
                      <UserCircle className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {item.assigned_to ? (staffMap[item.assigned_to] || 'Assigned') : 'Unassigned'}
                      </span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {staffMembers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                  onClick={() => deleteItem(item.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          {/* Add new item */}
          <div className="flex flex-col gap-2 pt-2">
            <div className="flex gap-2">
              <Input
                placeholder="Add a new checklist item..."
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addItem()}
                className="flex-1"
              />
              <Select
                value={newItemAssignee || 'unassigned'}
                onValueChange={(val) => setNewItemAssignee(val === 'unassigned' ? null : val)}
              >
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <div className="flex items-center gap-1 truncate">
                    <UserCircle className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {newItemAssignee ? (staffMap[newItemAssignee] || 'Assigned') : 'Assign to...'}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {staffMembers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addItem} disabled={!newItemTitle.trim() || adding} size="sm">
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {items.length > 0 && (
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={loadDefaults}>
                <Sparkles className="h-4 w-4 mr-2" />
                Add Default Items
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
