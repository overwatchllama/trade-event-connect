import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, Users, UserCheck, Ticket, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface AttendeeManagementProps {
  eventId: string;
}

interface AttendeeRow {
  id: string;
  ticket_code: string;
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
  const [attendees, setAttendees] = useState<AttendeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'checked_in' | 'not_checked_in'>('all');

  useEffect(() => {
    fetchAttendees();
  }, [eventId]);

  const fetchAttendees = async () => {
    setLoading(true);
    try {
      const { data: tickets, error } = await supabase
        .from('order_items')
        .select('id, ticket_code, ticket_type, quantity, unit_price, checked_in, checked_in_at, created_at, user_id, event_day_id')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!tickets || tickets.length === 0) {
        setAttendees([]);
        setLoading(false);
        return;
      }

      // Fetch profile info for all unique user_ids
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
    } catch (error) {
      console.error('Error fetching attendees:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAttendees = attendees.filter(a => {
    const matchesSearch = searchQuery === '' ||
      a.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.ticket_code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filter === 'all' ||
      (filter === 'checked_in' && a.checked_in) ||
      (filter === 'not_checked_in' && !a.checked_in);

    return matchesSearch && matchesFilter;
  });

  const totalTickets = attendees.reduce((sum, a) => sum + a.quantity, 0);
  const checkedInCount = attendees.filter(a => a.checked_in).length;
  const totalRevenue = attendees.reduce((sum, a) => sum + (a.quantity * a.unit_price), 0);

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
              {totalTickets > 0 ? `${Math.round((checkedInCount / attendees.length) * 100)}%` : '0%'} of ticket holders
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
          <CardDescription>View and search all ticket holders for this event.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or ticket code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
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

          {filteredAttendees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {attendees.length === 0 ? 'No tickets sold yet.' : 'No attendees match your search.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
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
                    <TableRow key={attendee.id}>
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
