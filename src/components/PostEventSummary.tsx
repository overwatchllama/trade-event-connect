import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Users, Store, Award, Ticket, CheckCircle2, XCircle, Clock, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface PostEventSummaryProps {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  vendorTablePrice?: number | null;
  totalTables?: number | null;
  maxAttendees?: number | null;
  entryFee?: number | null;
}

interface SummaryData {
  // Tickets
  totalTicketsSold: number;
  ticketRevenue: number;
  checkedInAttendees: number;
  uncheckedAttendees: number;
  // Vendors
  totalApplications: number;
  approvedVendors: number;
  paidVendors: number;
  rejectedVendors: number;
  waitlistedVendors: number;
  checkedInVendors: number;
  vendorRevenue: number;
  // Sponsors
  sponsorCount: number;
  sponsorRevenue: number;
  // Checklist
  checklistTotal: number;
  checklistCompleted: number;
  // Totals
  totalRevenue: number;
}

export const PostEventSummary = ({
  eventId,
  eventTitle,
  eventDate,
  vendorTablePrice,
  totalTables,
  maxAttendees,
  entryFee,
}: PostEventSummaryProps) => {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, [eventId]);

  const fetchSummary = async () => {
    try {
      const [ticketsRes, vendorsRes, sponsorsRes, checklistRes] = await Promise.all([
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
        supabase
          .from('event_checklist_items')
          .select('is_completed')
          .eq('event_id', eventId),
      ]);

      const tickets = ticketsRes.data || [];
      const vendors = vendorsRes.data || [];
      const sponsors = sponsorsRes.data || [];
      const checklist = checklistRes.data || [];

      const totalTicketsSold = tickets.reduce((sum, t) => sum + t.quantity, 0);
      const ticketRevenue = tickets.reduce((sum, t) => sum + (t.quantity * t.unit_price), 0);
      const checkedInAttendees = tickets.filter(t => t.checked_in).length;

      const approvedVendors = vendors.filter(v => v.application_status === 'approved').length;
      const paidVendors = vendors.filter(v => v.application_status === 'approved' && v.payment_status === 'paid').length;
      const rejectedVendors = vendors.filter(v => v.application_status === 'rejected').length;
      const waitlistedVendors = vendors.filter(v => v.application_status === 'waitlist').length;
      const checkedInVendors = vendors.filter(v => v.checked_in).length;

      const vendorRevenue = vendors
        .filter(v => v.payment_status === 'paid')
        .reduce((sum, v) => {
          const tables = v.approved_tables || v.requested_tables || 1;
          return sum + (tables * (vendorTablePrice || 0));
        }, 0);

      const sponsorCount = sponsors.length;
      const sponsorRevenue = sponsors.reduce((sum, s) => sum + (s.amount || 0), 0);

      setData({
        totalTicketsSold,
        ticketRevenue,
        checkedInAttendees,
        uncheckedAttendees: tickets.filter(t => !t.checked_in).length,
        totalApplications: vendors.length,
        approvedVendors,
        paidVendors,
        rejectedVendors,
        waitlistedVendors,
        checkedInVendors,
        vendorRevenue,
        sponsorCount,
        sponsorRevenue,
        checklistTotal: checklist.length,
        checklistCompleted: checklist.filter(c => c.is_completed).length,
        totalRevenue: ticketRevenue + vendorRevenue + sponsorRevenue,
      });
    } catch (error) {
      console.error('Error fetching summary:', error);
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

  if (!data) return null;

  const attendeeShowRate = data.totalTicketsSold > 0
    ? Math.round((data.checkedInAttendees / (data.checkedInAttendees + data.uncheckedAttendees)) * 100)
    : 0;

  const vendorShowRate = data.paidVendors > 0
    ? Math.round((data.checkedInVendors / data.paidVendors) * 100)
    : 0;

  const capacityFilled = maxAttendees && maxAttendees > 0
    ? Math.round((data.totalTicketsSold / maxAttendees) * 100)
    : null;

  const tablesFilled = totalTables && totalTables > 0
    ? Math.round((data.paidVendors / totalTables) * 100)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Post-Event Summary</CardTitle>
          <CardDescription>
            {eventTitle} — {eventDate}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Revenue Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Revenue Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-3xl font-bold">${data.totalRevenue.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground mt-1">Total Revenue</p>
            </div>
            <div className="text-center p-4 rounded-lg border border-border">
              <div className="text-2xl font-bold">${data.ticketRevenue.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground mt-1">Ticket Sales</p>
            </div>
            <div className="text-center p-4 rounded-lg border border-border">
              <div className="text-2xl font-bold">${data.vendorRevenue.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground mt-1">Vendor Tables</p>
            </div>
            <div className="text-center p-4 rounded-lg border border-border">
              <div className="text-2xl font-bold">${data.sponsorRevenue.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground mt-1">Sponsorships</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance & Vendors Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Attendance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Attendance Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-semibold">{data.totalTicketsSold}</div>
                  <p className="text-xs text-muted-foreground">Tickets Sold</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-semibold">{data.checkedInAttendees}</div>
                  <p className="text-xs text-muted-foreground">Checked In</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-semibold">{data.uncheckedAttendees}</div>
                  <p className="text-xs text-muted-foreground">No-Shows</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-semibold">{attendeeShowRate}%</div>
                  <p className="text-xs text-muted-foreground">Show Rate</p>
                </div>
              </div>
            </div>
            {capacityFilled !== null && (
              <div className="pt-2">
                <div className="flex justify-between text-sm mb-1">
                  <span>Capacity Filled</span>
                  <span className="font-medium">{capacityFilled}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(capacityFilled, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vendors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Vendor Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="font-semibold">{data.totalApplications}</div>
                <p className="text-xs text-muted-foreground">Total Applications</p>
              </div>
              <div>
                <div className="font-semibold">{data.paidVendors}</div>
                <p className="text-xs text-muted-foreground">Paid & Confirmed</p>
              </div>
              <div>
                <div className="font-semibold">{data.checkedInVendors}</div>
                <p className="text-xs text-muted-foreground">Checked In</p>
              </div>
              <div>
                <div className="font-semibold">{vendorShowRate}%</div>
                <p className="text-xs text-muted-foreground">Show Rate</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Badge variant="default">{data.approvedVendors} Approved</Badge>
              {data.waitlistedVendors > 0 && <Badge variant="secondary">{data.waitlistedVendors} Waitlisted</Badge>}
              {data.rejectedVendors > 0 && <Badge variant="destructive">{data.rejectedVendors} Rejected</Badge>}
            </div>
            {tablesFilled !== null && (
              <div className="pt-2">
                <div className="flex justify-between text-sm mb-1">
                  <span>Tables Filled</span>
                  <span className="font-medium">{data.paidVendors} / {totalTables}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(tablesFilled, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sponsors & Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Sponsorship Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold">{data.sponsorCount}</div>
                <p className="text-sm text-muted-foreground">Sponsors</p>
              </div>
              <div>
                <div className="text-2xl font-bold">${data.sponsorRevenue.toFixed(2)}</div>
                <p className="text-sm text-muted-foreground">Total Raised</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Day-of Checklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.checklistTotal > 0 ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Tasks Completed</span>
                  <span className="font-semibold">{data.checklistCompleted} / {data.checklistTotal}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${Math.round((data.checklistCompleted / data.checklistTotal) * 100)}%` }}
                  />
                </div>
                <Badge variant={data.checklistCompleted === data.checklistTotal ? 'default' : 'secondary'}>
                  {data.checklistCompleted === data.checklistTotal ? 'All Complete ✓' : `${Math.round((data.checklistCompleted / data.checklistTotal) * 100)}% Complete`}
                </Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No checklist items were created for this event.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
