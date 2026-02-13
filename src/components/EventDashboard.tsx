import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, DollarSign, Store, Award, Ticket, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EventDashboardProps {
  eventId: string;
  eventTitle: string;
  vendorTablePrice?: number | null;
  totalTables?: number | null;
  maxAttendees?: number | null;
}

interface DashboardStats {
  ticketsSold: number;
  ticketRevenue: number;
  vendorsPending: number;
  vendorsApproved: number;
  vendorsPaid: number;
  vendorsRejected: number;
  vendorsWaitlisted: number;
  vendorRevenue: number;
  sponsorCount: number;
  sponsorRevenue: number;
  totalRevenue: number;
  checkedInAttendees: number;
  checkedInVendors: number;
}

export const EventDashboard = ({ eventId, vendorTablePrice, totalTables, maxAttendees }: EventDashboardProps) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [eventId]);

  const fetchStats = async () => {
    try {
      const [ticketsRes, vendorsRes, sponsorsRes] = await Promise.all([
        supabase
          .from('order_items')
          .select('quantity, unit_price, checked_in')
          .eq('event_id', eventId),
        supabase
          .from('vendor_applications')
          .select('application_status, payment_status, approved_tables, requested_tables, checked_in')
          .eq('event_id', eventId),
        supabase
          .from('event_sponsors')
          .select('amount')
          .eq('event_id', eventId),
      ]);

      const tickets = ticketsRes.data || [];
      const vendors = vendorsRes.data || [];
      const sponsors = sponsorsRes.data || [];

      const ticketsSold = tickets.reduce((sum, t) => sum + t.quantity, 0);
      const ticketRevenue = tickets.reduce((sum, t) => sum + (t.quantity * t.unit_price), 0);
      const checkedInAttendees = tickets.filter(t => t.checked_in).length;

      const vendorsPending = vendors.filter(v => v.application_status === 'pending').length;
      const vendorsApproved = vendors.filter(v => v.application_status === 'approved').length;
      const vendorsPaid = vendors.filter(v => v.application_status === 'approved' && v.payment_status === 'paid').length;
      const vendorsRejected = vendors.filter(v => v.application_status === 'rejected').length;
      const vendorsWaitlisted = vendors.filter(v => v.application_status === 'waitlist').length;
      const checkedInVendors = vendors.filter(v => v.checked_in).length;

      const vendorRevenue = vendors
        .filter(v => v.payment_status === 'paid')
        .reduce((sum, v) => {
          const tables = v.approved_tables || v.requested_tables || 1;
          return sum + (tables * (vendorTablePrice || 0));
        }, 0);

      const sponsorCount = sponsors.length;
      const sponsorRevenue = sponsors.reduce((sum, s) => sum + (s.amount || 0), 0);

      setStats({
        ticketsSold,
        ticketRevenue,
        vendorsPending,
        vendorsApproved,
        vendorsPaid,
        vendorsRejected,
        vendorsWaitlisted,
        vendorRevenue,
        sponsorCount,
        sponsorRevenue,
        totalRevenue: ticketRevenue + vendorRevenue + sponsorRevenue,
        checkedInAttendees,
        checkedInVendors,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  const tablesUsed = stats.vendorsPaid;
  const tablesTotal = totalTables || 0;

  return (
    <div className="space-y-6">
      {/* Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tickets + Vendors + Sponsors
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ticket Revenue</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.ticketRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.ticketsSold} tickets sold
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vendor Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.vendorRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.vendorsPaid} paid vendors
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance & Vendors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Attendance
            </CardTitle>
            <CardDescription>Ticket sales and check-ins</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Tickets Sold</span>
              <span className="font-semibold">{stats.ticketsSold}{maxAttendees ? ` / ${maxAttendees}` : ''}</span>
            </div>
            {maxAttendees && (
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((stats.ticketsSold / maxAttendees) * 100, 100)}%` }}
                />
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm">Checked In</span>
              <span className="font-semibold">{stats.checkedInAttendees}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Vendors
            </CardTitle>
            <CardDescription>Application status breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {stats.vendorsPending > 0 && (
                <Badge variant="secondary">
                  {stats.vendorsPending} Pending
                </Badge>
              )}
              <Badge variant="default">
                {stats.vendorsApproved} Approved
              </Badge>
              <Badge variant="outline">
                {stats.vendorsPaid} Paid
              </Badge>
              {stats.vendorsWaitlisted > 0 && (
                <Badge variant="secondary">
                  {stats.vendorsWaitlisted} Waitlisted
                </Badge>
              )}
              {stats.vendorsRejected > 0 && (
                <Badge variant="destructive">
                  {stats.vendorsRejected} Rejected
                </Badge>
              )}
            </div>
            {tablesTotal > 0 && (
              <>
                <div className="flex justify-between items-center text-sm">
                  <span>Tables Filled</span>
                  <span className="font-semibold">{tablesUsed} / {tablesTotal}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${Math.min((tablesUsed / tablesTotal) * 100, 100)}%` }}
                  />
                </div>
              </>
            )}
            <div className="flex justify-between items-center text-sm">
              <span>Checked In</span>
              <span className="font-semibold">{stats.checkedInVendors}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sponsors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Sponsors
          </CardTitle>
          <CardDescription>Sponsorship overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            <div>
              <div className="text-2xl font-bold">{stats.sponsorCount}</div>
              <p className="text-xs text-muted-foreground">Total Sponsors</p>
            </div>
            <div>
              <div className="text-2xl font-bold">${stats.sponsorRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Sponsorship Revenue</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
