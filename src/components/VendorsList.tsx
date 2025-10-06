import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { Mail, Star, StickyNote, Filter } from "lucide-react";
import { toast } from "sonner";

interface VendorData {
  id: string;
  business_name: string;
  business_email: string;
  user_id: string;
  status: 'pending' | 'approved' | 'previous';
  event_title?: string;
  event_id?: string;
  application_id?: string;
  private_notes?: string;
  private_rating?: number;
}

export const VendorsList = () => {
  const [vendors, setVendors] = useState<VendorData[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<VendorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<VendorData | null>(null);
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState<number>(0);
  const { user } = useAuth();

  useEffect(() => {
    fetchVendors();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [filter, searchQuery, vendors]);

  const fetchVendors = async () => {
    if (!user) return;

    try {
      const { data: myEvents } = await supabase
        .from('events')
        .select('id')
        .eq('organizer_id', user.id);

      const myEventIds = myEvents?.map(event => event.id) || [];

      if (myEventIds.length === 0) {
        setLoading(false);
        return;
      }

      // Get all vendor applications for organizer's events
      const { data: applications } = await supabase
        .from('vendor_applications')
        .select('id, user_id, event_id, application_status')
        .in('event_id', myEventIds);

      // Get event details separately
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, title')
        .in('id', myEventIds);

      const eventsMap = new Map(eventsData?.map(e => [e.id, e.title]) || []);

      // Get vendor details
      const vendorUserIds = [...new Set(applications?.map(app => app.user_id) || [])];
      const { data: vendorsData } = await supabase
        .from('vendors')
        .select('id, business_name, business_email, user_id')
        .in('user_id', vendorUserIds);

      // Get organizer's private notes
      const { data: notesData } = await supabase
        .from('organizer_vendor_notes')
        .select('*')
        .eq('organizer_id', user.id);

      const notesMap = new Map(notesData?.map(n => [n.vendor_id, n]) || []);

      // Build vendor list with status
      const vendorsList: VendorData[] = [];
      const processedVendors = new Set<string>();

      applications?.forEach(app => {
        const vendor = vendorsData?.find(v => v.user_id === app.user_id);
        if (!vendor) return;

        const vendorKey = `${vendor.id}-${app.event_id}`;
        if (processedVendors.has(vendorKey)) return;
        processedVendors.add(vendorKey);

        const noteData = notesMap.get(vendor.id);
        const status = app.application_status === 'approved' ? 'approved' : 'pending';

        vendorsList.push({
          id: vendor.id,
          business_name: vendor.business_name,
          business_email: vendor.business_email || '',
          user_id: vendor.user_id,
          status,
          event_title: eventsMap.get(app.event_id) || 'Unknown Event',
          event_id: app.event_id,
          application_id: app.id,
          private_notes: noteData?.private_notes || '',
          private_rating: noteData?.private_rating || 0
        });
      });

      // Add vendors worked with before (approved in past events)
      const previousVendors = vendorsList.filter(v => v.status === 'approved');
      const uniquePreviousVendors = new Map<string, VendorData>();
      
      previousVendors.forEach(v => {
        if (!uniquePreviousVendors.has(v.user_id)) {
          uniquePreviousVendors.set(v.user_id, { ...v, status: 'previous' });
        }
      });

      setVendors(vendorsList);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...vendors];

    // Apply status filter
    if (filter !== "all") {
      filtered = filtered.filter(v => v.status === filter);
    }

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(v =>
        v.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.business_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.event_title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredVendors(filtered);
  };

  const handleSaveNotes = async () => {
    if (!selectedVendor || !user) return;

    try {
      const { error } = await supabase
        .from('organizer_vendor_notes')
        .upsert({
          organizer_id: user.id,
          vendor_id: selectedVendor.id,
          private_notes: notes,
          private_rating: rating > 0 ? rating : null
        });

      if (error) throw error;

      toast.success('Notes saved successfully');
      setSelectedVendor(null);
      fetchVendors();
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes');
    }
  };

  const handleEmailAll = () => {
    const emails = filteredVendors
      .filter(v => v.business_email)
      .map(v => v.business_email)
      .join(',');
    
    if (emails) {
      window.location.href = `mailto:${emails}`;
    } else {
      toast.error('No vendor emails available');
    }
  };

  const openNotesDialog = (vendor: VendorData) => {
    setSelectedVendor(vendor);
    setNotes(vendor.private_notes || '');
    setRating(vendor.private_rating || 0);
  };

  if (loading) {
    return <div className="text-center py-8">Loading vendors...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Vendor Management</h2>
          <p className="text-sm text-muted-foreground">Manage and track vendors across your events</p>
        </div>
        <Button onClick={handleEmailAll} className="gap-2" disabled={filteredVendors.length === 0}>
          <Mail className="h-4 w-4" />
          Email All ({filteredVendors.length})
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <Input
          placeholder="Search vendors, events..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="md:max-w-xs"
        />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="md:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem>
            <SelectItem value="pending">Pending Applications</SelectItem>
            <SelectItem value="approved">Accepted Vendors</SelectItem>
            <SelectItem value="previous">Previous Partners</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Vendor Table */}
      {filteredVendors.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No vendors found. {filter !== "all" && "Try changing your filter."}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business Name</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendors.map((vendor) => (
                <TableRow key={`${vendor.id}-${vendor.event_id}`}>
                  <TableCell className="font-medium">{vendor.business_name}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{vendor.event_title || 'N/A'}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      vendor.status === 'approved' ? 'default' :
                      vendor.status === 'pending' ? 'secondary' : 'outline'
                    }>
                      {vendor.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {vendor.private_rating ? (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm">{vendor.private_rating}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not rated</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {vendor.business_email && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.location.href = `mailto:${vendor.business_email}`}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openNotesDialog(vendor)}
                          >
                            <StickyNote className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Private Notes - {vendor.business_name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium mb-2 block">Private Rating</label>
                              <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    className="hover:scale-110 transition-transform"
                                  >
                                    <Star
                                      className={`h-6 w-6 ${
                                        star <= rating
                                          ? 'fill-yellow-400 text-yellow-400'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-2 block">Private Notes</label>
                              <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add your private notes about this vendor..."
                                rows={5}
                              />
                            </div>
                            <Button onClick={handleSaveNotes} className="w-full">
                              Save Notes
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
