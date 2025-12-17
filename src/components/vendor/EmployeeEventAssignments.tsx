import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, Plus, Trash2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface EventAssignment {
  id: string;
  employee_id: string;
  event_id: string;
  notes: string | null;
  created_at: string;
  event: {
    title: string;
    date: string;
    city: string;
    state: string;
  };
}

interface AvailableEvent {
  id: string;
  title: string;
  date: string;
  city: string;
  state: string;
}

interface EmployeeEventAssignmentsProps {
  employeeId: string;
  vendorId: string;
  isManager?: boolean;
}

const EmployeeEventAssignments = ({ employeeId, vendorId, isManager = false }: EmployeeEventAssignmentsProps) => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<EventAssignment[]>([]);
  const [availableEvents, setAvailableEvents] = useState<AvailableEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchAssignments();
    if (isManager) {
      fetchAvailableEvents();
    }
  }, [employeeId, vendorId]);

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_employee_events')
        .select('*, events(title, date, city, state)')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAssignments((data || []).map(a => ({
        ...a,
        event: a.events as any
      })) as EventAssignment[]);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableEvents = async () => {
    try {
      // Get events where this vendor is approved
      const { data: applications } = await supabase
        .from('vendor_applications')
        .select('event_id')
        .eq('vendor_id', vendorId)
        .eq('application_status', 'approved');

      if (!applications?.length) {
        setAvailableEvents([]);
        return;
      }

      const eventIds = applications.map(a => a.event_id);

      const { data: events } = await supabase
        .from('events')
        .select('id, title, date, city, state')
        .in('id', eventIds);

      setAvailableEvents(events || []);
    } catch (error) {
      console.error('Error fetching available events:', error);
    }
  };

  const handleAddAssignment = async () => {
    if (!selectedEventId || !user) return;

    try {
      const { error } = await supabase
        .from('vendor_employee_events')
        .insert({
          employee_id: employeeId,
          event_id: selectedEventId,
          assigned_by: user.id,
          notes: notes || null
        });

      if (error) throw error;

      await fetchAssignments();
      setIsAddDialogOpen(false);
      setSelectedEventId('');
      setNotes('');
      toast.success('Employee assigned to event');
    } catch (error: any) {
      console.error('Error adding assignment:', error);
      if (error.code === '23505') {
        toast.error('Employee is already assigned to this event');
      } else {
        toast.error('Failed to assign employee');
      }
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('vendor_employee_events')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      await fetchAssignments();
      toast.success('Assignment removed');
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast.error('Failed to remove assignment');
    }
  };

  // Filter out events already assigned
  const unassignedEvents = availableEvents.filter(
    e => !assignments.some(a => a.event_id === e.id)
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Event Assignments
            </CardTitle>
            <CardDescription>
              {assignments.length} event{assignments.length !== 1 ? 's' : ''} assigned
            </CardDescription>
          </div>
          {isManager && unassignedEvents.length > 0 && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Event
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign to Event</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Event</Label>
                    <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an event" />
                      </SelectTrigger>
                      <SelectContent>
                        {unassignedEvents.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.title} - {event.city}, {event.state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      placeholder="Any special instructions..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddAssignment} disabled={!selectedEventId}>
                    Assign
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {assignments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No event assignments yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{assignment.event.title}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{assignment.event.city}, {assignment.event.state}</span>
                  </div>
                  {assignment.notes && (
                    <p className="text-sm text-muted-foreground mt-1">{assignment.notes}</p>
                  )}
                </div>
                {isManager && (
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveAssignment(assignment.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmployeeEventAssignments;
