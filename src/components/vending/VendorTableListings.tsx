import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, DollarSign, Send, Store, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

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
  created_at: string;
  event_title?: string;
  buyer_name?: string;
  target_name?: string;
}

interface AvailableListing {
  id: string;
  tables_offered: number;
  price_per_table: number | null;
  notes: string | null;
  event_id: string;
  seller_vendor_id: string;
  event_title?: string;
  seller_name?: string;
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
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [tablesOffered, setTablesOffered] = useState(1);
  const [pricePerTable, setPricePerTable] = useState('');
  const [listingType, setListingType] = useState('public');
  const [targetVendorId, setTargetVendorId] = useState('');
  const [listingNotes, setListingNotes] = useState('');
  const [activeView, setActiveView] = useState<'sell' | 'buy'>('sell');

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

      // Fetch available listings from other vendors
      const { data: available } = await supabase
        .from('vendor_table_listings')
        .select('id, tables_offered, price_per_table, notes, event_id, seller_vendor_id')
        .eq('status', 'available')
        .eq('listing_type', 'public')
        .neq('seller_vendor_id', vendorId);

      if (available && available.length > 0) {
        const eventIds = [...new Set(available.map(a => a.event_id))];
        const vendorIds = [...new Set(available.map(a => a.seller_vendor_id))];
        
        const [eventsRes, vendorsRes] = await Promise.all([
          supabase.from('events').select('id, title').in('id', eventIds),
          supabase.from('vendors').select('id, business_name').in('id', vendorIds),
        ]);
        
        const eventsMap = new Map(eventsRes.data?.map(e => [e.id, e]) || []);
        const vendorsMap = new Map(vendorsRes.data?.map(v => [v.id, v]) || []);

        setAvailableListings(available.map(a => ({
          ...a,
          event_title: eventsMap.get(a.event_id)?.title,
          seller_name: vendorsMap.get(a.seller_vendor_id)?.business_name,
        })));
      } else {
        setAvailableListings([]);
      }

      // Fetch all vendors for direct transfer
      const { data: allVendors } = await supabase
        .from('vendors')
        .select('id, business_name')
        .neq('id', vendorId)
        .order('business_name');
      setVendors(allVendors || []);

    } catch (error) {
      console.error('Error fetching table listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateListing = async () => {
    if (!user || !selectedAppId) return;
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
          notes: listingNotes || null,
        });

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
    setListingNotes('');
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
          <Button onClick={() => setShowCreateDialog(true)} disabled={events.length === 0}>
            <Plus className="h-4 w-4 mr-2" />
            List Tables
          </Button>
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
                        {listing.listing_type === 'direct' ? 'Direct Transfer' : 'Public'}
                      </Badge>
                    </TableCell>
                    <TableCell>{statusBadge(listing.status)}</TableCell>
                    <TableCell>
                      {listing.status === 'available' && (
                        <Button variant="ghost" size="icon" onClick={() => handleCancelListing(listing.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        ) : (
          availableListings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Store className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No tables available for purchase</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {availableListings.map(listing => (
                <Card key={listing.id} className="border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{listing.event_title}</h4>
                        <p className="text-sm text-muted-foreground">by {listing.seller_name}</p>
                      </div>
                      <Badge className="bg-green-600 text-white">
                        {listing.tables_offered} table{listing.tables_offered !== 1 ? 's' : ''}
                      </Badge>
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
          )
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
                </SelectContent>
              </Select>
            </div>
            {listingType === 'direct' && (
              <div className="space-y-2">
                <Label>Transfer To</Label>
                <Select value={targetVendorId} onValueChange={setTargetVendorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.business_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
    </Card>
  );
};

export default VendorTableListings;
