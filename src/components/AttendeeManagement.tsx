import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, Users, UserCheck, Ticket, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface AttendeeManagementProps {
  eventId: string;
}

interface AttendeeRow {
  id: string;
  ticket_code: string;
  qr_data: string;
  ticket_type: string;
  quantity: number;
  unit_price: number;
  checked_in: boolean;
  checked_in_at: string | null;
  created_at: string;
  user_id: string;
  event_day_id: string | null;
  user_email: string | null;
  user_name: string | null;
}

export const AttendeeManagement = ({ eventId }: AttendeeManagementProps) => {
  const { user } = useAuth();
  const [attendees, setAttendees] = useState<AttendeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'checked_in' | 'not_checked_in'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  useEffect(() => {
    fetchAttendees();
  }, [eventId]);

  const fetchAttendees = async () => {
    setLoading(true);
    try {
      const { data: tickets, error } = await supabase
        .from('order_items')
        .select('id, ticket_code, qr_data, ticket_type, quantity, unit_price, checked_in, checked_in_at, created_at, user_id, event_day_id')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!tickets || tickets.length === 0) {
        setAttendees([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(tickets.map(t => t.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const rows: AttendeeRow[] = tickets.map(t => {
        const profile = profileMap.get(t.user_id);
        return {
          ...t,
          user_email: profile?.email || null,
          user_name: profile?.full_name || null,
        };
      });

      setAttendees(rows);
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Error fetching attendees:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAttendees = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return attendees.filter(a => {
      const matchesSearch = !q ||
        a.user_name?.toLowerCase().includes(q) ||
        a.user_email?.toLowerCase().includes(q) ||
        a.ticket_code.toLowerCase().includes(q) ||
        a.qr_data?.toLowerCase().includes(q);

      const matchesFilter =
        filter === 'all' ||
        (filter === 'checked_in' && a.checked_in) ||
        (filter === 'not_checked_in' && !a.checked_in);

      return matchesSearch && matchesFilter;
    });
  }, [attendees, searchQuery, filter]);

  const totalTickets = attendees.reduce((sum, a) => sum + a.quantity, 0);
  const checkedInCount = attendees.filter(a => a.checked_in).length;
  const totalRevenue = attendees.reduce((sum, a) => sum + (a.quantity * a.unit_price), 0);

  // Selection helpers
  const allFilteredSelected = filteredAttendees.length > 0 && filteredAttendees.every(a => selectedIds.has(a.id));

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredAttendees.forEach(a => next.delete(a.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredAttendees.forEach(a => next.add(a.id));
        return next;
      });
    }
  };

  const bulkCheckIn = async (checkIn: boolean) => {
    if (!user || selectedIds.size === 0) return;
    setBulkProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('order_items')
        .update({
          checked_in: checkIn,
          checked_in_at: checkIn ? new Date().toISOString() : null,
          checked_in_by: checkIn ? user.id : null,
        })
        .in('id', ids);

      if (error) throw error;

      setAttendees(prev =>
        prev.map(a =>
          selectedIds.has(a.id)
            ? { ...a, checked_in: checkIn, checked_in_at: checkIn ? new Date().toISOString() : null }
            : a
        )
      );
      setSelectedIds(new Set());
      toast.success(`${ids.length} ticket${ids.length !== 1 ? 's' : ''} ${checkIn ? 'checked in' : 'unchecked'}`);
    } catch {
      toast.error('Failed to update tickets');
    } finally {
      setBulkProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTickets}</div>
            <p className="text-xs text-muted-foreground">{attendees.length} orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Checked In</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{checkedInCount}</div>
            <p className="text-xs text-muted-foreground">
              {attendees.length > 0 ? `${Math.round((checkedInCount / attendees.length) * 100)}%` : '0%'} of ticket holders
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ticket Revenue</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Attendee List</CardTitle>
          <CardDescription>Search by name, email, ticket code, or QR data. Select multiple to bulk check in.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, ticket code, or QR code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'checked_in' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('checked_in')}
              >
                Checked In
              </Button>
              <Button
                variant={filter === 'not_checked_in' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('not_checked_in')}
              >
                Not Checked In
              </Button>
              <Button variant="ghost" size="sm" onClick={fetchAttendees}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted border">
              <span className="text-sm font-medium">
                {selectedIds.size} selected
              </span>
              <div className="flex gap-2 ml-auto">
                <Button
                  size="sm"
                  onClick={() => bulkCheckIn(true)}
                  disabled={bulkProcessing}
                  className="gap-1"
                >
                  <CheckCircle className="h-4 w-4" />
                  Check In
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => bulkCheckIn(false)}
                  disabled={bulkProcessing}
                  className="gap-1"
                >
                  <XCircle className="h-4 w-4" />
                  Uncheck
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          {filteredAttendees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {attendees.length === 0 ? 'No tickets sold yet.' : 'No attendees match your search.'}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allFilteredSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Attendee</TableHead>
                    <TableHead>Ticket Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Purchased</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendees.map((attendee) => (
                    <TableRow
                      key={attendee.id}
                      className={selectedIds.has(attendee.id) ? 'bg-muted/50' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(attendee.id)}
                          onCheckedChange={() => toggleSelect(attendee.id)}
                          aria-label={`Select ${attendee.user_name || attendee.ticket_code}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{attendee.user_name || 'Unknown'}</div>
                          <div className="text-xs text-muted-foreground">{attendee.user_email || '—'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{attendee.ticket_code}</code>
                      </TableCell>
                      <TableCell className="capitalize">{attendee.ticket_type}</TableCell>
                      <TableCell className="text-center">{attendee.quantity}</TableCell>
                      <TableCell className="text-right">${(attendee.quantity * attendee.unit_price).toFixed(2)}</TableCell>
                      <TableCell>
                        {attendee.checked_in ? (
                          <Badge variant="default">Checked In</Badge>
                        ) : (
                          <Badge variant="secondary">Not Checked In</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(attendee.created_at), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
