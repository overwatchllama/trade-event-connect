import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEmployeeHours } from '@/hooks/useVendorEmployees';
import { Clock, Play, Square, Plus, Calendar, Check, X, CheckCircle, AlertCircle } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';

interface EmployeeHoursTrackerProps {
  employeeId: string;
  events?: { id: string; title: string }[];
  isManager?: boolean;
}

const EmployeeHoursTracker = ({ employeeId, events = [], isManager = false }: EmployeeHoursTrackerProps) => {
  const { hours, loading, activeClockIn, clockIn, clockOut, addManualHours, getTotalHours, approveHours, rejectHours } = useEmployeeHours(employeeId);
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
  const [manualHours, setManualHours] = useState('');
  const [manualEventId, setManualEventId] = useState<string>('');
  const [manualNotes, setManualNotes] = useState('');
  const [clockInEventId, setClockInEventId] = useState<string>('');

  const handleClockIn = async () => {
    await clockIn(clockInEventId || undefined);
    setClockInEventId('');
  };

  const handleAddManualHours = async () => {
    const hoursValue = parseFloat(manualHours);
    if (isNaN(hoursValue) || hoursValue <= 0) return;

    await addManualHours(hoursValue, manualEventId || undefined, manualNotes || undefined);
    setIsManualDialogOpen(false);
    setManualHours('');
    setManualEventId('');
    setManualNotes('');
  };

  const formatDuration = (clockInTime: string, clockOutTime?: string) => {
    const start = new Date(clockInTime);
    const end = clockOutTime ? new Date(clockOutTime) : new Date();
    const minutes = differenceInMinutes(end, start);
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  };

  const totalHours = getTotalHours();
  const approvedHours = getTotalHours(true);
  const pendingHours = totalHours - approvedHours;

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
              <Clock className="h-5 w-5" />
              Hours Tracker
            </CardTitle>
            <CardDescription className="space-y-1">
              <div>Total: {totalHours.toFixed(1)} hours</div>
              <div className="flex gap-3 text-xs">
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Approved: {approvedHours.toFixed(1)}h
                </span>
                {pendingHours > 0 && (
                  <span className="text-yellow-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Pending: {pendingHours.toFixed(1)}h
                  </span>
                )}
              </div>
            </CardDescription>
          </div>
          {!isManager && (
            <div className="flex items-center gap-2">
              {activeClockIn ? (
                <Button variant="destructive" onClick={clockOut}>
                  <Square className="h-4 w-4 mr-2" />
                  Clock Out
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  {events.length > 0 && (
                    <Select value={clockInEventId} onValueChange={setClockInEventId}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select event (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No event</SelectItem>
                        {events.map((event) => (
                          <SelectItem key={event.id} value={event.id}>{event.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button onClick={handleClockIn}>
                    <Play className="h-4 w-4 mr-2" />
                    Clock In
                  </Button>
                </div>
              )}
              <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Hours
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Manual Hours</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Hours Worked</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="e.g., 4.5"
                        value={manualHours}
                        onChange={(e) => setManualHours(e.target.value)}
                      />
                    </div>
                    {events.length > 0 && (
                      <div className="space-y-2">
                        <Label>Event (Optional)</Label>
                        <Select value={manualEventId} onValueChange={setManualEventId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select event" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No event</SelectItem>
                            {events.map((event) => (
                              <SelectItem key={event.id} value={event.id}>{event.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Notes (Optional)</Label>
                      <Textarea
                        placeholder="What did you work on?"
                        value={manualNotes}
                        onChange={(e) => setManualNotes(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsManualDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddManualHours} disabled={!manualHours || parseFloat(manualHours) <= 0}>
                      Add Hours
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!isManager && activeClockIn && (
          <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                <span className="font-medium text-green-600">Currently clocked in</span>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Started {format(new Date(activeClockIn.clock_in!), 'h:mm a')}</p>
                <p className="font-mono font-bold">{formatDuration(activeClockIn.clock_in!)}</p>
              </div>
            </div>
          </div>
        )}

        {hours.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No hours logged yet</p>
            {!isManager && <p className="text-sm">Clock in or add manual hours to get started</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {hours.slice(0, 20).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {entry.entry_type === 'clock' ? (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {entry.entry_type === 'clock' ? (
                        <span className="text-sm">
                          {format(new Date(entry.clock_in!), 'MMM d')} • {format(new Date(entry.clock_in!), 'h:mm a')}
                          {entry.clock_out && ` - ${format(new Date(entry.clock_out), 'h:mm a')}`}
                        </span>
                      ) : (
                        <span className="text-sm">
                          {format(new Date(entry.created_at), 'MMM d')} • Manual entry
                        </span>
                      )}
                      {entry.event && (
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="h-3 w-3 mr-1" />
                          {entry.event.title}
                        </Badge>
                      )}
                      {entry.approved_at ? (
                        <Badge variant="default" className="text-xs bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approved
                        </Badge>
                      ) : entry.clock_out || entry.entry_type === 'manual' ? (
                        <Badge variant="secondary" className="text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Pending Approval
                        </Badge>
                      ) : null}
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{entry.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    {entry.entry_type === 'clock' && entry.clock_in && entry.clock_out ? (
                      <span className="font-mono font-medium">{formatDuration(entry.clock_in, entry.clock_out)}</span>
                    ) : entry.entry_type === 'manual' && entry.manual_hours ? (
                      <span className="font-mono font-medium">{entry.manual_hours}h</span>
                    ) : entry.entry_type === 'clock' && !entry.clock_out ? (
                      <Badge variant="secondary">In progress</Badge>
                    ) : null}
                  </div>
                  {isManager && !entry.approved_at && (entry.clock_out || entry.entry_type === 'manual') && (
                    <div className="flex gap-1 ml-2">
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => approveHours(entry.id)}>
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => rejectHours(entry.id)}>
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmployeeHoursTracker;
