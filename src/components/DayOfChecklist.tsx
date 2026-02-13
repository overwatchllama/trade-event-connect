import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, ListChecks, Sparkles } from 'lucide-react';
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
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchItems();
  }, [eventId]);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('event_checklist_items')
        .select('id, title, is_completed, completed_at, sort_order')
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
        })
        .select('id, title, is_completed, completed_at, sort_order')
        .single();

      if (error) throw error;
      setItems([...items, data]);
      setNewItemTitle('');
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
    } finally {
      setAdding(false);
    }
  };

  const toggleItem = async (item: ChecklistItem) => {
    const newCompleted = !item.is_completed;
    // Optimistic update
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
      // Revert
      setItems(prev => prev.map(i => i.id === item.id ? item : i));
      toast.error('Failed to update item');
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
        .select('id, title, is_completed, completed_at, sort_order');

      if (error) throw error;
      setItems([...items, ...(data || [])]);
      toast.success('Default checklist loaded!');
    } catch (error) {
      console.error('Error loading defaults:', error);
      toast.error('Failed to load defaults');
    }
  };

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
            Track your event day tasks. Check items off as you complete them.
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
          <div className="flex gap-2 pt-2">
            <Input
              placeholder="Add a new checklist item..."
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem()}
            />
            <Button onClick={addItem} disabled={!newItemTitle.trim() || adding} size="sm">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
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
