import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, Loader2, PenTool, Upload, X, Image, LayoutDashboard, Users,
  CheckSquare, BarChart3, ImageIcon, Map, FileText, Store, Award, Gift,
  FolderOpen, UserCog, Wrench, ListChecks, Clock, Settings, ChevronRight,
  ClipboardCheck, ScanLine
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { LayoutDrawingTool } from '@/components/LayoutDrawingTool';
import { EventDashboard } from '@/components/EventDashboard';
import { EventFlyerManager } from '@/components/EventFlyerManager';
import { ManageEventSponsors } from '@/components/ManageEventSponsors';
import ManageVendorsDialog from '@/components/ManageVendorsDialog';
import ManageSponsorsDialog from '@/components/ManageSponsorsDialog';
import { EventFileManager } from '@/components/EventFileManager';
import { AttendeeManagement } from '@/components/AttendeeManagement';
import { DayOfChecklist } from '@/components/DayOfChecklist';
import { PostEventSummary } from '@/components/PostEventSummary';
import EventDayDialog from '@/components/EventDayDialog';
import { ManageRaffles } from '@/components/raffle/ManageRaffles';
import { EventStaffRoles } from '@/components/organize/EventStaffRoles';
import { StaffHoursSummary } from '@/components/organize/StaffHoursSummary';
import EventCheckInDialog from '@/components/organize/EventCheckInDialog';
import StaffCheckInDialog from '@/components/organize/StaffCheckInDialog';
import { Database } from '@/integrations/supabase/types';

type Event = Database['public']['Tables']['events']['Row'];

const ManageEvent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'status';
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [vendorsDialogOpen, setVendorsDialogOpen] = useState(false);
  const [sponsorsDialogOpen, setSponsorsDialogOpen] = useState(false);
  const [eventDayDialogOpen, setEventDayDialogOpen] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [staffCheckInOpen, setStaffCheckInOpen] = useState(false);

  // Manage sub-dialogs
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [flyerOpen, setFlyerOpen] = useState(false);
  const [floorPlanOpen, setFloorPlanOpen] = useState(false);
  const [vendorNotesOpen, setVendorNotesOpen] = useState(false);
  const [rafflesOpen, setRafflesOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);

  // Vendor notes
  const [vendorNotes, setVendorNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Floor plan
  const [savedLayoutJson, setSavedLayoutJson] = useState<any>(null);
  const [floorPlanEventData, setFloorPlanEventData] = useState<any>(null);

  useEffect(() => {
    if (user) fetchEvent();
  }, [id, user]);

  const fetchEvent = async () => {
    if (!id) return;
    try {
      const { data, error } = await (supabase as any)
        .from('public_events')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      if (data.organizer_id !== user?.id) {
        toast.error('You do not have permission to manage this event');
        navigate('/events');
        return;
      }
      const { data: priv } = await (supabase as any).rpc('get_event_private_details', { p_event_id: id });
      const privateDetails = Array.isArray(priv) ? priv[0] : priv;
      setEvent({ ...data, ...(privateDetails || {}) });
      setVendorNotes(privateDetails?.vendor_notes || '');
    } catch (error) {
      console.error('Error fetching event:', error);
      toast.error('Failed to load event');
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  const openVendorNotes = async () => {
    if (!event) return;
    setVendorNotesOpen(true);
    setLoadingNotes(true);
    try {
      const { data } = await supabase.from('events').select('vendor_notes').eq('id', event.id).single();
      setVendorNotes(data?.vendor_notes || '');
    } catch {
      setVendorNotes('');
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleSaveVendorNotes = async () => {
    if (!event) return;
    setSavingNotes(true);
    try {
      const { error } = await supabase.from('events').update({ vendor_notes: vendorNotes }).eq('id', event.id);
      if (error) throw error;
      toast.success('Vendor instructions saved!');
    } catch {
      toast.error('Failed to save vendor instructions');
    } finally {
      setSavingNotes(false);
    }
  };

  const openFloorPlan = async () => {
    if (!event) return;
    const { data } = await supabase.from('events').select('layout_json, address, zip_code, vendor_start_time').eq('id', event.id).single();
    setSavedLayoutJson(data?.layout_json || null);
    setFloorPlanEventData({
      title: event.title,
      date: event.date,
      venue: event.venue,
      city: event.city,
      state: event.state,
      total_tables: event.total_tables,
      vendor_table_price: event.vendor_table_price,
      address: data?.address,
      zip_code: data?.zip_code,
      vendor_start_time: data?.vendor_start_time,
    });
    setFloorPlanOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (!event) return null;

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <section className="py-8 bg-muted/30">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/event/${event.id}`)}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Event
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCheckInOpen(true)}>
                <ClipboardCheck className="h-4 w-4 mr-1" />
                Check-ins
              </Button>
              <Button variant="outline" size="sm" onClick={() => setStaffCheckInOpen(true)}>
                <UserCog className="h-4 w-4 mr-1" />
                Staff Check-in
              </Button>
            </div>
          </div>

          {/* Event Card with tabs - matching /organize style */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">{event.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage your event details, vendors, and more
              </p>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={defaultTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="status" className="text-xs sm:text-sm">
                    <BarChart3 className="h-4 w-4 mr-1 hidden sm:inline" />
                    Status
                  </TabsTrigger>
                  <TabsTrigger value="vendors" className="text-xs sm:text-sm">
                    <Store className="h-4 w-4 mr-1 hidden sm:inline" />
                    Vendors
                  </TabsTrigger>
                  <TabsTrigger value="staff" className="text-xs sm:text-sm">
                    <UserCog className="h-4 w-4 mr-1 hidden sm:inline" />
                    Staff
                  </TabsTrigger>
                  <TabsTrigger value="visitors" className="text-xs sm:text-sm">
                    <Users className="h-4 w-4 mr-1 hidden sm:inline" />
                    Visitors
                  </TabsTrigger>
                  <TabsTrigger value="manage" className="text-xs sm:text-sm">
                    <Wrench className="h-4 w-4 mr-1 hidden sm:inline" />
                    Manage
                  </TabsTrigger>
                </TabsList>

                {/* STATUS TAB */}
                <TabsContent value="status">
                  <EventDashboard
                    eventId={event.id}
                    eventTitle={event.title}
                    vendorTablePrice={event.vendor_table_price}
                    totalTables={event.total_tables}
                    maxAttendees={event.max_attendees}
                  />
                </TabsContent>

                {/* VENDORS TAB */}
                <TabsContent value="vendors">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold">Vendor Applications</h3>
                      <p className="text-sm text-muted-foreground">
                        Review and manage vendor applications for this event.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button onClick={() => setVendorsDialogOpen(true)}>
                        <Store className="h-4 w-4 mr-2" />
                        Manage Vendor Applications
                      </Button>
                      <Button variant="outline" onClick={() => setSponsorsDialogOpen(true)}>
                        <Award className="h-4 w-4 mr-2" />
                        Manage Sponsors
                      </Button>
                      <Button variant="outline" onClick={() => setEventDayDialogOpen(true)}>
                        <ScanLine className="h-4 w-4 mr-2" />
                        Event Day Check-in
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                      <div className="p-3 rounded-lg bg-muted/50 text-center">
                        <p className="text-2xl font-bold">{event.total_tables ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">Total Tables</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50 text-center">
                        <p className="text-2xl font-bold">{event.tables_available ?? event.total_tables ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">Tables Available</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50 text-center">
                        <p className="text-2xl font-bold">${event.vendor_table_price ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">Table Price</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* STAFF TAB */}
                <TabsContent value="staff">
                  <EventStaffRoles eventId={event.id} />
                  <div className="mt-6">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Staff Hours Summary
                    </h3>
                    <StaffHoursSummary eventId={event.id} />
                  </div>
                </TabsContent>

                {/* VISITORS TAB */}
                <TabsContent value="visitors">
                  <AttendeeManagement eventId={event.id} />
                </TabsContent>

                {/* MANAGE TAB */}
                <TabsContent value="manage">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setChecklistOpen(true)}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <ListChecks className="h-4 w-4" />
                            Day-of Checklist
                          </CardTitle>
                          <CardDescription>Track event day tasks</CardDescription>
                        </CardHeader>
                      </Card>
                      <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setSummaryOpen(true)}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Post-Event Summary
                          </CardTitle>
                          <CardDescription>Revenue and attendance reports</CardDescription>
                        </CardHeader>
                      </Card>
                      <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setFlyerOpen(true)}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" />
                            Event Flyer
                          </CardTitle>
                          <CardDescription>Upload or update flyer</CardDescription>
                        </CardHeader>
                      </Card>
                      <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={openFloorPlan}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Map className="h-4 w-4" />
                            Floor Plan
                          </CardTitle>
                          <CardDescription>Design your venue layout</CardDescription>
                        </CardHeader>
                      </Card>
                      <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={openVendorNotes}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Vendor Instructions
                          </CardTitle>
                          <CardDescription>Add notes for vendors</CardDescription>
                        </CardHeader>
                      </Card>
                      <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setRafflesOpen(true)}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Gift className="h-4 w-4" />
                            Raffles
                          </CardTitle>
                          <CardDescription>Manage event raffles</CardDescription>
                        </CardHeader>
                      </Card>
                      <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setFilesOpen(true)}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <FolderOpen className="h-4 w-4" />
                            Files
                          </CardTitle>
                          <CardDescription>Manage event documents</CardDescription>
                        </CardHeader>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* === Dialogs === */}

      <ManageVendorsDialog
        open={vendorsDialogOpen}
        onOpenChange={setVendorsDialogOpen}
        eventId={event.id}
        eventTitle={event.title}
      />
      <ManageSponsorsDialog
        open={sponsorsDialogOpen}
        onOpenChange={setSponsorsDialogOpen}
        eventId={event.id}
        eventTitle={event.title}
      />
      <EventDayDialog
        open={eventDayDialogOpen}
        onOpenChange={setEventDayDialogOpen}
        eventId={event.id}
        eventTitle={event.title}
      />
      <EventCheckInDialog
        open={checkInOpen}
        onOpenChange={setCheckInOpen}
        eventId={event.id}
        eventTitle={event.title}
      />
      <StaffCheckInDialog
        open={staffCheckInOpen}
        onOpenChange={setStaffCheckInOpen}
        eventId={event.id}
        eventTitle={event.title}
      />

      {/* Checklist Dialog */}
      <Dialog open={checklistOpen} onOpenChange={setChecklistOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Day-of Checklist</DialogTitle>
          </DialogHeader>
          <DayOfChecklist eventId={event.id} />
        </DialogContent>
      </Dialog>

      {/* Summary Dialog */}
      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post-Event Summary</DialogTitle>
          </DialogHeader>
          <PostEventSummary
            eventId={event.id}
            eventTitle={event.title}
            eventDate={event.date}
            vendorTablePrice={event.vendor_table_price}
            totalTables={event.total_tables}
            maxAttendees={event.max_attendees}
            entryFee={event.entry_fee}
          />
        </DialogContent>
      </Dialog>

      {/* Flyer Dialog */}
      <Dialog open={flyerOpen} onOpenChange={setFlyerOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Event Flyer</DialogTitle>
          </DialogHeader>
          <EventFlyerManager
            event={event}
            onEventUpdate={(updated) => setEvent(updated)}
          />
        </DialogContent>
      </Dialog>

      {/* Floor Plan Dialog */}
      <Dialog open={floorPlanOpen} onOpenChange={(open) => { if (!open) setFloorPlanOpen(false); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Floor Plan</DialogTitle>
          </DialogHeader>
          {floorPlanOpen && (
            <LayoutDrawingTool
              eventId={event.id}
              initialLayout={savedLayoutJson}
              eventData={floorPlanEventData}
              onSave={async (layoutJson) => {
                await supabase.from('events').update({ layout_json: layoutJson }).eq('id', event.id);
                setSavedLayoutJson(layoutJson);
                toast.success('Floor plan saved!');
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Vendor Instructions Dialog */}
      <Dialog open={vendorNotesOpen} onOpenChange={setVendorNotesOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Vendor Instructions</DialogTitle>
          </DialogHeader>
          {loadingNotes ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <Textarea
                placeholder="Enter instructions for vendors (e.g., load-in times, parking, setup rules)..."
                value={vendorNotes}
                onChange={(e) => setVendorNotes(e.target.value)}
                rows={6}
              />
              <Button onClick={handleSaveVendorNotes} disabled={savingNotes} className="w-full">
                {savingNotes ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {savingNotes ? 'Saving...' : 'Save Instructions'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Raffles Dialog */}
      <Dialog open={rafflesOpen} onOpenChange={setRafflesOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Raffles</DialogTitle>
          </DialogHeader>
          <ManageRaffles eventId={event.id} />
        </DialogContent>
      </Dialog>

      {/* Files Dialog */}
      <Dialog open={filesOpen} onOpenChange={setFilesOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Event Files</DialogTitle>
          </DialogHeader>
          <EventFileManager eventId={event.id} />
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default ManageEvent;
