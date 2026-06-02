import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, DollarSign, Send, Store, Trash2, Search, Heart, FileText, X, CalendarIcon, MapPin, Users, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { TrustedGroupsDialog } from './TrustedGroupsDialog';


interface VendingEvent {
  id: string; // application id
  event_id: string;
  title: string;
  date: string;
  approved_tables: number | null;
  requested_tables: number;
  application_status: string;
  payment_status: string;
}

interface TableListing {
  id: string;
  vendor_application_id: string;
  event_id: string;
  tables_offered: number;
  price_per_table: number | null;
  listing_type: string;
  target_vendor_id: string | null;
  status: string;
  buyer_vendor_id: string | null;
  notes: string | null;
  target_group_id: string | null;
  created_at: string;
  event_title?: string;
  buyer_name?: string;
  target_name?: string;
  target_group_name?: string;
}


interface AvailableListing {
  id: string;
  tables_offered: number;
  price_per_table: number | null;
  notes: string | null;
  event_id: string;
  seller_vendor_id: string;
  listing_type: string;
  target_group_id: string | null;
  event_title?: string;
  event_date?: string;
  event_state?: string;
  seller_name?: string;
  target_group_name?: string;
}


interface VendorTableListingsProps {
  vendorId: string;
}

const VendorTableListings = ({ vendorId }: VendorTableListingsProps) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<VendingEvent[]>([]);
  const [myListings, setMyListings] = useState<TableListing[]>([]);
  const [availableListings, setAvailableListings] = useState<AvailableListing[]>([]);
  const [vendors, setVendors] = useState<{ id: string; business_name: string }[]>([]);
  const [shortlistedVendorIds, setShortlistedVendorIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [tablesOffered, setTablesOffered] = useState(1);
  const [pricePerTable, setPricePerTable] = useState('');
  const [listingType, setListingType] = useState('public');
  const [targetVendorId, setTargetVendorId] = useState('');
  const [targetGroupId, setTargetGroupId] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');
  const [listingNotes, setListingNotes] = useState('');
  const [activeView, setActiveView] = useState<'sell' | 'buy'>('sell');
  const [buySearchEvent, setBuySearchEvent] = useState('');
  const [buySearchState, setBuySearchState] = useState('');
  const [buySearchDate, setBuySearchDate] = useState('');
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [invoiceListing, setInvoiceListing] = useState<TableListing | null>(null);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [myGroups, setMyGroups] = useState<{ id: string; name: string }[]>([]);
  const [showGroupsManager, setShowGroupsManager] = useState(false);


  useEffect(() => {
    if (!user || !vendorId) return;
    fetchData();
  }, [user, vendorId]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch confirmed vending events
      const { data: apps } = await supabase
        .from('vendor_applications')
        .select('id, event_id, approved_tables, requested_tables, application_status, payment_status')
        .eq('vendor_id', vendorId)
        .eq('application_status', 'approved')
        .eq('payment_status', 'paid');

      if (apps && apps.length > 0) {
        const eventIds = apps.map(a => a.event_id);
        const { data: eventsData } = await supabase
          .from('events')
          .select('id, title, date')
          .in('id', eventIds);

        const eventsMap = new Map(eventsData?.map(e => [e.id, e]) || []);
        setEvents(apps.map(app => {
          const event = eventsMap.get(app.event_id);
          return {
            ...app,
            title: event?.title || 'Unknown',
            date: event?.date || '',
          };
        }));
      }

      // Fetch my listings
      const { data: listings } = await supabase
        .from('vendor_table_listings')
        .select('*')
        .eq('seller_user_id', user.id);

      if (listings && listings.length > 0) {
        const eventIds = [...new Set(listings.map(l => l.event_id))];
        const { data: eventsData } = await supabase
          .from('events')
          .select('id, title')
          .in('id', eventIds);
        const eventsMap = new Map(eventsData?.map(e => [e.id, e]) || []);

        setMyListings(listings.map(l => ({
          ...l,
          event_title: eventsMap.get(l.event_id)?.title || 'Unknown',
        })));
      } else {
        setMyListings([]);
      }

      // Fetch available listings from other vendors. RLS already restricts which
      // group listings the current user can see, so we just request both types.
      const { data: available } = await supabase
        .from('vendor_table_listings')
        .select('id, tables_offered, price_per_table, notes, event_id, seller_vendor_id, listing_type, target_group_id')
        .eq('status', 'available')
        .in('listing_type', ['public', 'group'])
        .neq('seller_vendor_id', vendorId);

      if (available && available.length > 0) {
        const eventIds = [...new Set(available.map(a => a.event_id))];
        const vendorIds = [...new Set(available.map(a => a.seller_vendor_id))];
        const groupIds = [...new Set(available.map((a: any) => a.target_group_id).filter(Boolean))] as string[];

        const [eventsRes, vendorsRes, groupsRes] = await Promise.all([
          supabase.from('events').select('id, title, date, state').in('id', eventIds),
          supabase.from('vendors').select('id, business_name').in('id', vendorIds),
          groupIds.length > 0
            ? supabase.from('vendor_trusted_groups' as any).select('id, name').in('id', groupIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);

        const eventsMap = new Map(eventsRes.data?.map(e => [e.id, e]) || []);
        const vendorsMap = new Map(vendorsRes.data?.map(v => [v.id, v]) || []);
        const groupsMap = new Map(((groupsRes as any).data ?? []).map((g: any) => [g.id, g.name]));

        setAvailableListings(available.map((a: any) => ({
          ...a,
          event_title: eventsMap.get(a.event_id)?.title,
          event_date: eventsMap.get(a.event_id)?.date,
          event_state: eventsMap.get(a.event_id)?.state,
          seller_name: vendorsMap.get(a.seller_vendor_id)?.business_name,
          target_group_name: a.target_group_id ? (groupsMap.get(a.target_group_id) as string | undefined) : undefined,
        })));
      } else {
        setAvailableListings([]);
      }

      // Load my trusted groups (for the create listing dialog)
      const { data: groupsOwned } = await supabase
        .from('vendor_trusted_groups' as any)
        .select('id, name')
        .eq('owner_user_id', user.id)
        .order('name');
      setMyGroups(((groupsOwned ?? []) as any[]).map((g) => ({ id: g.id, name: g.name })));


      // Fetch all vendors for direct transfer
      const [vendorsRes, notesRes] = await Promise.all([
        supabase
          .from('vendors')
          .select('id, business_name')
          .neq('id', vendorId)
          .order('business_name'),
        supabase
          .from('vendor_vendor_notes')
          .select('target_vendor_id')
          .eq('vendor_id', vendorId)
          .eq('is_favorite', true),
      ]);
      setVendors(vendorsRes.data || []);
      setShortlistedVendorIds(new Set((notesRes.data || []).map(n => n.target_vendor_id)));

    } catch (error) {
      console.error('Error fetching table listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateListing = async () => {
    if (!user || !selectedAppId) return;
    if (listingType === 'direct' && !targetVendorId) {
      toast.error('Select a vendor to transfer to');
      return;
    }
    if (listingType === 'group' && !targetGroupId) {
      toast.error('Select a trusted group');
      return;
    }
    try {
      const { error } = await supabase
        .from('vendor_table_listings')
        .insert({
          vendor_application_id: selectedAppId,
          seller_vendor_id: vendorId,
          seller_user_id: user.id,
          event_id: selectedEventId,
          tables_offered: tablesOffered,
          price_per_table: pricePerTable ? parseFloat(pricePerTable) : null,
          listing_type: listingType,
          target_vendor_id: listingType === 'direct' ? targetVendorId || null : null,
          target_group_id: listingType === 'group' ? targetGroupId || null : null,
          notes: listingNotes || null,
        } as any);

      if (error) throw error;
      toast.success('Table listing created!');
      setShowCreateDialog(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create listing');
    }
  };


  const handleCancelListing = async (id: string) => {
    try {
      const { error } = await supabase
        .from('vendor_table_listings')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
      toast.success('Listing cancelled');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel listing');
    }
  };

  const handleBuyTable = async (listing: AvailableListing) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('vendor_table_listings')
        .update({
          status: 'sold',
          buyer_vendor_id: vendorId,
          buyer_user_id: user.id,
        })
        .eq('id', listing.id);
      if (error) throw error;
      toast.success('Table claimed! Contact the seller to finalize.');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to claim table');
    }
  };

  const resetForm = () => {
    setSelectedAppId('');
    setSelectedEventId('');
    setTablesOffered(1);
    setPricePerTable('');
    setListingType('public');
    setTargetVendorId('');
    setTargetGroupId('');
    setVendorSearch('');
    setListingNotes('');
  };


  // Filtered vendors for search
  const filteredVendors = useMemo(() => {
    const q = vendorSearch.toLowerCase().trim();
    if (!q) {
      return [...vendors].sort((a, b) => {
        const aFav = shortlistedVendorIds.has(a.id);
        const bFav = shortlistedVendorIds.has(b.id);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return a.business_name.localeCompare(b.business_name);
      });
    }
    return vendors
      .filter(v => v.business_name.toLowerCase().includes(q))
      .sort((a, b) => {
        const aFav = shortlistedVendorIds.has(a.id);
        const bFav = shortlistedVendorIds.has(b.id);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return a.business_name.localeCompare(b.business_name);
      });
  }, [vendors, vendorSearch, shortlistedVendorIds]);

  // Filtered available listings for buy view
  const filteredAvailableListings = useMemo(() => {
    return availableListings.filter(listing => {
      if (buySearchEvent && !listing.event_title?.toLowerCase().includes(buySearchEvent.toLowerCase())) return false;
      if (buySearchState && listing.event_state?.toLowerCase() !== buySearchState.toLowerCase()) return false;
      if (buySearchDate && listing.event_date !== buySearchDate) return false;
      return true;
    });
  }, [availableListings, buySearchEvent, buySearchState, buySearchDate]);

  const availableStates = useMemo(() => {
    const states = new Set(availableListings.map(l => l.event_state).filter(Boolean) as string[]);
    return [...states].sort();
  }, [availableListings]);

  const hasActiveFilters = buySearchEvent || buySearchState || buySearchDate;

  const handleSendInvoice = async () => {
    if (!user || !invoiceListing || !invoiceListing.buyer_vendor_id) return;
    try {
      // Find the buyer's user_id
      const { data: buyerVendor } = await supabase
        .from('vendors')
        .select('user_id, business_name')
        .eq('id', invoiceListing.buyer_vendor_id)
        .single();

      if (!buyerVendor) {
        toast.error('Could not find buyer vendor');
        return;
      }

      // Send in-app notification as invoice
      const amount = invoiceAmount ? `$${invoiceAmount}` : (invoiceListing.price_per_table ? `$${invoiceListing.price_per_table * invoiceListing.tables_offered}` : 'Free');
      
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: buyerVendor.user_id,
          title: 'Table Transfer Invoice',
          message: `Invoice for ${invoiceListing.tables_offered} table(s) at ${invoiceListing.event_title || 'event'}: ${amount}${invoiceNotes ? '. Notes: ' + invoiceNotes : ''}`,
          type: 'vendor_invoice',
          reference_id: invoiceListing.id,
          reference_type: 'table_listing',
        });

      if (error) throw error;
      toast.success('Invoice sent!');
      setShowInvoiceDialog(false);
      setInvoiceListing(null);
      setInvoiceAmount('');
      setInvoiceNotes('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invoice');
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'available': return <Badge className="bg-green-600 text-white text-xs">Available</Badge>;
      case 'pending': return <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">Pending</Badge>;
      case 'sold': return <Badge className="bg-blue-600 text-white text-xs">Sold</Badge>;
      case 'cancelled': return <Badge variant="secondary" className="text-xs">Cancelled</Badge>;
      default: return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
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
              <Store className="h-5 w-5" />
              Table Marketplace
            </CardTitle>
            <CardDescription>Sell your tables or buy from other vendors</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowGroupsManager(true)}>
              <Users className="h-4 w-4 mr-2" />
              Groups
            </Button>
            <Button onClick={() => setShowCreateDialog(true)} disabled={events.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              List Tables
            </Button>
          </div>

        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle between sell and buy views */}
        <div className="flex gap-2">
          <Button
            variant={activeView === 'sell' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('sell')}
          >
            <DollarSign className="h-4 w-4 mr-1" />
            My Listings ({myListings.filter(l => l.status !== 'cancelled').length})
          </Button>
          <Button
            variant={activeView === 'buy' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('buy')}
          >
            <Store className="h-4 w-4 mr-1" />
            Available Tables ({availableListings.length})
          </Button>
        </div>

        {activeView === 'sell' ? (
          myListings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Store className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No table listings yet</p>
              <p className="text-sm">List tables from your confirmed events to sell or transfer</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Tables</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myListings.map(listing => (
                  <TableRow key={listing.id}>
                    <TableCell className="font-medium">{listing.event_title}</TableCell>
                    <TableCell>{listing.tables_offered}</TableCell>
                    <TableCell>{listing.price_per_table ? `$${listing.price_per_table}` : 'Free'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {listing.listing_type === 'direct'
                          ? 'Direct Transfer'
                          : listing.listing_type === 'group'
                          ? `Group${myGroups.find((g) => g.id === listing.target_group_id) ? `: ${myGroups.find((g) => g.id === listing.target_group_id)!.name}` : ''}`
                          : 'Public'}
                      </Badge>
                    </TableCell>

                    <TableCell>{statusBadge(listing.status)}</TableCell>
                    <TableCell className="flex gap-1">
                      {listing.status === 'available' && (
                        <Button variant="ghost" size="icon" onClick={() => handleCancelListing(listing.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                      {listing.status === 'sold' && listing.buyer_vendor_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setInvoiceListing(listing);
                            setInvoiceAmount(listing.price_per_table ? String(listing.price_per_table * listing.tables_offered) : '');
                            setShowInvoiceDialog(true);
                          }}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Invoice
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        ) : (
          <div className="space-y-4">
            {/* Search Filters */}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1 flex-1 min-w-[150px]">
                <Label className="text-xs">Event Name</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search events..."
                    value={buySearchEvent}
                    onChange={e => setBuySearchEvent(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              </div>
              <div className="space-y-1 min-w-[120px]">
                <Label className="text-xs">State</Label>
                <Select value={buySearchState || 'all'} onValueChange={v => setBuySearchState(v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All states" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {availableStates.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 min-w-[140px]">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={buySearchDate}
                  onChange={e => setBuySearchDate(e.target.value)}
                  className="h-9"
                />
              </div>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9"
                  onClick={() => {
                    setBuySearchEvent('');
                    setBuySearchState('');
                    setBuySearchDate('');
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {filteredAvailableListings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Store className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No tables match your search</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredAvailableListings.map(listing => (
                  <Card key={listing.id} className="border">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{listing.event_title}</h4>
                          <p className="text-sm text-muted-foreground">by {listing.seller_name}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            {listing.event_date && (
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3" />
                                {format(parseISO(listing.event_date), 'MMM d, yyyy')}
                              </span>
                            )}
                            {listing.event_state && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {listing.event_state}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className="bg-green-600 text-white">
                            {listing.tables_offered} table{listing.tables_offered !== 1 ? 's' : ''}
                          </Badge>
                          {listing.listing_type === 'group' && (
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <Lock className="h-2.5 w-2.5" />
                              {listing.target_group_name ?? 'Group only'}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {listing.price_per_table && (
                        <p className="text-lg font-bold">${listing.price_per_table}/table</p>
                      )}
                      {listing.notes && (
                        <p className="text-sm text-muted-foreground">{listing.notes}</p>
                      )}
                      <Button className="w-full" onClick={() => handleBuyTable(listing)}>
                        <Send className="h-4 w-4 mr-2" />
                        Claim Table{listing.tables_offered !== 1 ? 's' : ''}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Create Listing Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>List Tables for Sale</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Event</Label>
              <Select
                value={selectedAppId}
                onValueChange={(v) => {
                  setSelectedAppId(v);
                  const event = events.find(e => e.id === v);
                  setSelectedEventId(event?.event_id || '');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  {events.map(event => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title} ({event.approved_tables || event.requested_tables} tables)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tables to Offer</Label>
              <Input
                type="number"
                min={1}
                value={tablesOffered}
                onChange={(e) => setTablesOffered(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label>Price Per Table (optional)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="Leave blank for free"
                value={pricePerTable}
                onChange={(e) => setPricePerTable(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Listing Type</Label>
              <Select value={listingType} onValueChange={setListingType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public - Any vendor can see</SelectItem>
                  <SelectItem value="direct">Direct Transfer - Specific vendor</SelectItem>
                  <SelectItem value="group" disabled={myGroups.length === 0}>
                    Trusted Group - Only group members{myGroups.length === 0 ? ' (create one first)' : ''}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {listingType === 'group' && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Lock className="h-3.5 w-3.5" /> Trusted Group</Label>
                <Select value={targetGroupId} onValueChange={setTargetGroupId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                  <SelectContent>
                    {myGroups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Only vendors in this group will see and be able to claim this listing.
                </p>
              </div>
            )}

            {listingType === 'direct' && (
              <div className="space-y-2">
                <Label>Transfer To</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search vendors..."
                    value={vendorSearch}
                    onChange={e => {
                      setVendorSearch(e.target.value);
                      setTargetVendorId('');
                    }}
                    className="pl-9"
                  />
                </div>
                {targetVendorId && (
                  <p className="text-sm text-primary font-medium">
                    Selected: {vendors.find(v => v.id === targetVendorId)?.business_name}
                  </p>
                )}
                <div className="max-h-[160px] overflow-y-auto border rounded-md divide-y">
                  {filteredVendors.slice(0, 50).map(v => (
                    <div
                      key={v.id}
                      className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-sm transition-colors ${
                        targetVendorId === v.id ? 'bg-primary/10' : 'hover:bg-accent/50'
                      }`}
                      onClick={() => {
                        setTargetVendorId(v.id);
                        setVendorSearch(v.business_name);
                      }}
                    >
                      {shortlistedVendorIds.has(v.id) && (
                        <Heart className="h-3 w-3 fill-red-500 text-red-500 shrink-0" />
                      )}
                      <span className="truncate">{v.business_name}</span>
                    </div>
                  ))}
                  {filteredVendors.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-3">No vendors found</p>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Any additional details..."
                value={listingNotes}
                onChange={(e) => setListingNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleCreateListing} disabled={!selectedAppId}>Create Listing</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Send Invoice
            </DialogTitle>
          </DialogHeader>
          {invoiceListing && (
            <div className="space-y-4 py-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium">{invoiceListing.event_title}</p>
                <p className="text-sm text-muted-foreground">
                  {invoiceListing.tables_offered} table{invoiceListing.tables_offered !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Invoice Amount ($)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={invoiceAmount}
                  onChange={e => setInvoiceAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="Payment instructions, Venmo/Zelle info, etc."
                  value={invoiceNotes}
                  onChange={e => setInvoiceNotes(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvoiceDialog(false)}>Cancel</Button>
            <Button onClick={handleSendInvoice}>
              <Send className="h-4 w-4 mr-2" />
              Send Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TrustedGroupsDialog
        open={showGroupsManager}
        onOpenChange={setShowGroupsManager}
        vendorId={vendorId}
        vendors={vendors}
        shortlistedVendorIds={shortlistedVendorIds}
        onChanged={fetchData}
      />
    </Card>

  );
};

export default VendorTableListings;
