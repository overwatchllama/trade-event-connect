import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle, Clock, Ban, DollarSign, ChevronDown, ChevronRight, Calendar, Settings2, Users, Send, Heart, MessageSquare } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { VendorSummaryBar } from './VendorSummaryBar';
import { VendorMessageDialog } from './VendorMessageDialog';
import { toast } from 'sonner';

type VendorRow = Database['public']['Tables']['vendors']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

interface VendorProfile extends VendorRow {
  profiles: Pick<ProfileRow, 'id' | 'full_name' | 'email' | 'avatar_url' | 'role' | 'location_state'>;
}

interface EventWithVendors {
  id: string;
  title: string;
  date: string;
  total_tables: number | null;
  vendors: {
    vendor: VendorProfile;
    applicationStatus: string;
    paymentStatus: string;
    approvedTables: number | null;
  }[];
}

interface EventVendorsOverviewProps {
  eventVendors: {
    approved: { vendor: VendorProfile; eventTitle: string; status: string }[];
    pending: { vendor: VendorProfile; eventTitle: string }[];
    rejected: { vendor: VendorProfile; eventTitle: string }[];
  };
  organizerNotes: Map<string, any>;
  getVendorNotesBadges: (vendorId: string) => React.ReactNode;
  getInitials: (name: string | null) => string;
  onOpenVendorNotes: (vendorId: string, vendorName: string) => void;
}

export const EventVendorsOverview = ({
  organizerNotes,
  getVendorNotesBadges,
  getInitials,
  onOpenVendorNotes,
}: EventVendorsOverviewProps) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventWithVendors[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageRecipients, setMessageRecipients] = useState<{ userId: string; businessName: string }[]>([]);
  const [messageEventId, setMessageEventId] = useState('');
  const [messageEventTitle, setMessageEventTitle] = useState('');
  const [messageGroupLabel, setMessageGroupLabel] = useState('');
  const [invitingFavorites, setInvitingFavorites] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchEventData();
  }, [user]);

  const fetchEventData = async () => {
    if (!user) return;
    try {
      const { data: myEvents } = await supabase
        .from('events')
        .select('id, title, date, total_tables')
        .eq('organizer_id', user.id)
        .order('date', { ascending: false });

      if (!myEvents?.length) {
        setEvents([]);
        setLoading(false);
        return;
      }

      const eventIds = myEvents.map(e => e.id);

      const { data: applications } = await supabase
        .from('vendor_applications')
        .select('event_id, vendor_id, application_status, payment_status, approved_tables')
        .in('event_id', eventIds);

      const vendorIds = [...new Set(applications?.map(a => a.vendor_id) || [])];

      let vendorMap = new Map<string, VendorProfile>();
      if (vendorIds.length > 0) {
        const { data: vendorData } = await supabase
          .from('vendors')
          .select('*')
          .in('id', vendorIds);

        const userIds = vendorData?.map(v => v.user_id) || [];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url, role, location_state')
          .in('id', userIds);

        vendorData?.forEach(vendor => {
          const profile = profilesData?.find(p => p.id === vendor.user_id);
          if (profile) {
            vendorMap.set(vendor.id, {
              ...vendor,
              social_links: Array.isArray(vendor.social_links) ? vendor.social_links : [],
              profiles: profile,
            });
          }
        });
      }

      const eventsWithVendors: EventWithVendors[] = myEvents.map(event => {
        const eventApps = applications?.filter(a => a.event_id === event.id) || [];
        return {
          ...event,
          vendors: eventApps
            .map(app => {
              const vendor = vendorMap.get(app.vendor_id);
              if (!vendor) return null;
              return {
                vendor,
                applicationStatus: app.application_status,
                paymentStatus: app.payment_status,
                approvedTables: app.approved_tables,
              };
            })
            .filter(Boolean) as EventWithVendors['vendors'],
        };
      });

      setEvents(eventsWithVendors);
    } catch (error) {
      console.error('Error fetching event vendor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEvent = (eventId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  const getStatusCounts = (vendors: EventWithVendors['vendors']) => {
    const counts = { total: vendors.length, pending: 0, waitlist: 0, approved: 0, paid: 0, unpaid: 0, rejected: 0 };
    vendors.forEach(v => {
      if (v.applicationStatus === 'pending') counts.pending++;
      else if (v.applicationStatus === 'waitlist') counts.waitlist++;
      else if (v.applicationStatus === 'approved') {
        counts.approved++;
        if (v.paymentStatus === 'paid') counts.paid++;
        else counts.unpaid++;
      } else if (v.applicationStatus === 'rejected') counts.rejected++;
    });
    return counts;
  };

  const getStatusBadge = (status: string, paymentStatus: string) => {
    if (status === 'approved' && paymentStatus === 'paid') {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Paid</Badge>;
    }
    if (status === 'approved') {
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Approved - Unpaid</Badge>;
    }
    if (status === 'pending') {
      return <Badge variant="secondary">Pending</Badge>;
    }
    if (status === 'waitlist') {
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Waitlist</Badge>;
    }
    if (status === 'rejected') {
      return <Badge variant="destructive">Rejected</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const getVendorsByGroup = (event: EventWithVendors, group: string) => {
    return event.vendors.filter(v => {
      if (group === 'unpaid') return v.applicationStatus === 'approved' && v.paymentStatus !== 'paid';
      if (group === 'waitlist') return v.applicationStatus === 'waitlist';
      if (group === 'paid') return v.applicationStatus === 'approved' && v.paymentStatus === 'paid';
      return false;
    });
  };

  const openGroupMessage = (event: EventWithVendors, group: string, label: string) => {
    const vendors = getVendorsByGroup(event, group);
    if (vendors.length === 0) {
      toast.info(`No ${label.toLowerCase()} to message`);
      return;
    }
    setMessageRecipients(vendors.map(v => ({
      userId: v.vendor.profiles?.id || v.vendor.user_id,
      businessName: v.vendor.business_name,
    })));
    setMessageEventId(event.id);
    setMessageEventTitle(event.title);
    setMessageGroupLabel(label);
    setMessageDialogOpen(true);
  };

  const openSingleMessage = (event: EventWithVendors, vendor: VendorProfile) => {
    setMessageRecipients([{
      userId: vendor.profiles?.id || vendor.user_id,
      businessName: vendor.business_name,
    }]);
    setMessageEventId(event.id);
    setMessageEventTitle(event.title);
    setMessageGroupLabel(vendor.business_name);
    setMessageDialogOpen(true);
  };

  const inviteFavorites = async (event: EventWithVendors) => {
    setInvitingFavorites(event.id);
    try {
      // Get organizer's favorited vendors
      const { data: favorites } = await supabase
        .from('organizer_vendor_notes')
        .select('vendor_id')
        .eq('organizer_id', user!.id)
        .eq('is_favorite', true);

      if (!favorites || favorites.length === 0) {
        toast.info('You have no favorited vendors to invite');
        return;
      }

      // Filter out vendors already applied to this event
      const existingVendorIds = new Set(event.vendors.map(v => v.vendor.id));
      const newFavIds = favorites.filter(f => !existingVendorIds.has(f.vendor_id)).map(f => f.vendor_id);

      if (newFavIds.length === 0) {
        toast.info('All your favorited vendors have already applied');
        return;
      }

      // Get vendor user_ids and names
      const { data: vendorData } = await supabase
        .from('vendors')
        .select('id, user_id, business_name')
        .in('id', newFavIds);

      if (!vendorData || vendorData.length === 0) {
        toast.info('No vendors found to invite');
        return;
      }

      const notifications = vendorData.map(v => ({
        user_id: v.user_id,
        title: 'Event Invitation',
        message: `You've been invited to participate as a vendor at "${event.title}" on ${event.date}. Check out the event and apply if interested!`,
        type: 'event_invitation',
        reference_id: event.id,
        reference_type: 'event',
      }));

      const { error } = await supabase.from('notifications').insert(notifications);
      if (error) throw error;

      toast.success(`Invited ${vendorData.length} favorited vendor${vendorData.length !== 1 ? 's' : ''}!`);
    } catch (error) {
      console.error('Error inviting favorites:', error);
      toast.error('Failed to send invitations');
    } finally {
      setInvitingFavorites(null);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading events...</div>;
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">No Events Yet</h3>
        <p className="text-muted-foreground">Create an event to start managing vendors.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map(event => {
        const isExpanded = expandedEvents.has(event.id);
        const counts = getStatusCounts(event.vendors);
        const tablesPurchased = event.vendors
          .filter(v => v.applicationStatus === 'approved' && v.paymentStatus === 'paid')
          .reduce((sum, v) => sum + (v.approvedTables || 0), 0);
        return (
          <Collapsible key={event.id} open={isExpanded} onOpenChange={() => toggleEvent(event.id)}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                      <div>
                        <CardTitle className="text-lg">{event.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">{event.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {event.total_tables != null && (
                        <Badge variant="outline" className="gap-1">
                          {tablesPurchased}/{event.total_tables} tables
                        </Badge>
                      )}
                      <Badge variant="outline" className="gap-1">
                        <Users className="w-3 h-3" />
                        {counts.total} vendor{counts.total !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {counts.total > 0 && (
                    <div className="mb-4 ml-8">
                      <VendorSummaryBar {...counts} />
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MessageSquare className="w-4 h-4 mr-1.5" />
                          Message Vendors
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {counts.unpaid > 0 && (
                          <DropdownMenuItem onClick={() => openGroupMessage(event, 'unpaid', 'Unpaid Vendors')}>
                            <DollarSign className="w-4 h-4 mr-2 text-amber-600" />
                            Unpaid Vendors ({counts.unpaid})
                          </DropdownMenuItem>
                        )}
                        {counts.waitlist > 0 && (
                          <DropdownMenuItem onClick={() => openGroupMessage(event, 'waitlist', 'Waitlisted Vendors')}>
                            <Clock className="w-4 h-4 mr-2 text-blue-600" />
                            Waitlisted Vendors ({counts.waitlist})
                          </DropdownMenuItem>
                        )}
                        {counts.paid > 0 && (
                          <DropdownMenuItem onClick={() => openGroupMessage(event, 'paid', 'Paid Vendors')}>
                            <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                            Paid Vendors ({counts.paid})
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Invite favorites - only show if tables not full */}
                    {(event.total_tables == null || tablesPurchased < event.total_tables) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => inviteFavorites(event)}
                        disabled={invitingFavorites === event.id}
                      >
                        <Heart className="w-4 h-4 mr-1.5 text-destructive" />
                        {invitingFavorites === event.id ? 'Inviting...' : 'Invite Favorites'}
                      </Button>
                    )}
                  </div>

                  {event.vendors.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">No vendor applications for this event.</p>
                  ) : (
                    <div className="divide-y">
                      {event.vendors.map((v, idx) => (
                        <div key={`${v.vendor.id}-${idx}`} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={v.vendor.avatar_url || v.vendor.profiles?.avatar_url || ''} />
                              <AvatarFallback>{getInitials(v.vendor.business_name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <Link to={`/vendor/${v.vendor.id}`} className="font-medium text-sm hover:underline">
                                {v.vendor.business_name}
                              </Link>
                              {getVendorNotesBadges(v.vendor.id)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(v.applicationStatus, v.paymentStatus)}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openSingleMessage(event, v.vendor)}
                              title="Message vendor"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => onOpenVendorNotes(v.vendor.id, v.vendor.business_name)}
                              title="Vendor notes"
                            >
                              <Settings2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}

      <VendorMessageDialog
        open={messageDialogOpen}
        onOpenChange={setMessageDialogOpen}
        recipients={messageRecipients}
        eventId={messageEventId}
        eventTitle={messageEventTitle}
        groupLabel={messageGroupLabel}
      />
    </div>
  );
};
