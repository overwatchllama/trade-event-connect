import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2, PenTool, Upload, X, Image } from 'lucide-react';
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
import { Database } from '@/integrations/supabase/types';

type Event = Database['public']['Tables']['events']['Row'];

const ManageEvent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'dashboard';
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [vendorNotes, setVendorNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [vendorsDialogOpen, setVendorsDialogOpen] = useState(false);
  const [sponsorsDialogOpen, setSponsorsDialogOpen] = useState(false);
  const [eventDayDialogOpen, setEventDayDialogOpen] = useState(false);
  const [floorPlanMode, setFloorPlanMode] = useState<'choose' | 'design' | 'upload'>('choose');
  const [uploadingFloorPlan, setUploadingFloorPlan] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchEvent();
    }
  }, [id, user]);

  const fetchEvent = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Check if user is the organizer
      if (data.organizer_id !== user?.id) {
        toast.error('You do not have permission to manage this event');
        navigate('/events');
        return;
      }

      setEvent(data);
      setVendorNotes(data.vendor_notes || '');
    } catch (error) {
      console.error('Error fetching event:', error);
      toast.error('Failed to load event');
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLayout = async (layoutJson: Database['public']['Tables']['events']['Row']['layout_json']) => {
    if (!event) return;

    const { error } = await supabase
      .from('events')
      .update({ layout_json: layoutJson })
      .eq('id', event.id);

    if (error) throw error;

    setEvent({ ...event, layout_json: layoutJson });
  };

  const handleSaveVendorNotes = async () => {
    if (!event) return;

    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({ vendor_notes: vendorNotes })
        .eq('id', event.id);

      if (error) throw error;

      setEvent({ ...event, vendor_notes: vendorNotes });
      toast.success('Vendor notes saved successfully!');
    } catch (error) {
      console.error('Error saving vendor notes:', error);
      toast.error('Failed to save vendor notes');
    } finally {
      setSavingNotes(false);
    }
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

  if (!event) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate(`/event/${event.id}`)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Event
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold">{event.title}</h1>
          <p className="text-muted-foreground">Manage your event details</p>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="attendees">Attendees</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="flyer">Event Flyer</TabsTrigger>
            <TabsTrigger value="layout">Floor Plan</TabsTrigger>
            <TabsTrigger value="vendor-notes">Vendor Notes</TabsTrigger>
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
            <TabsTrigger value="sponsors">Sponsors</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <EventDashboard
              eventId={event.id}
              eventTitle={event.title}
              vendorTablePrice={event.vendor_table_price}
              totalTables={event.total_tables}
              maxAttendees={event.max_attendees}
            />
          </TabsContent>

          <TabsContent value="attendees" className="space-y-6">
            <AttendeeManagement eventId={event.id} />
          </TabsContent>

          <TabsContent value="checklist" className="space-y-6">
            <DayOfChecklist eventId={event.id} />
          </TabsContent>

          <TabsContent value="summary" className="space-y-6">
            <PostEventSummary
              eventId={event.id}
              eventTitle={event.title}
              eventDate={event.date}
              vendorTablePrice={event.vendor_table_price}
              totalTables={event.total_tables}
              maxAttendees={event.max_attendees}
              entryFee={event.entry_fee}
            />
          </TabsContent>

          <TabsContent value="flyer" className="space-y-6">
            <EventFlyerManager
              event={event}
              onEventUpdate={(updated) => setEvent(updated)}
            />
          </TabsContent>

          <TabsContent value="layout" className="space-y-6">
            {floorPlanMode === 'choose' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setFloorPlanMode('design')}>
                  <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
                    <PenTool className="h-12 w-12 text-primary" />
                    <h3 className="text-xl font-semibold">Design My Own</h3>
                    <p className="text-muted-foreground text-center text-sm">Use the built-in drawing tool to create your floor plan layout</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => fileInputRef.current?.click()}>
                  <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
                    <Upload className="h-12 w-12 text-primary" />
                    <h3 className="text-xl font-semibold">Upload a File</h3>
                    <p className="text-muted-foreground text-center text-sm">Upload an image of your existing floor plan (PNG, JPG, PDF)</p>
                  </CardContent>
                </Card>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !event) return;
                    setUploadingFloorPlan(true);
                    try {
                      const fileExt = file.name.split('.').pop();
                      const filePath = `${event.id}/floor-plan.${fileExt}`;
                      const { error: uploadError } = await supabase.storage
                        .from('event-files')
                        .upload(filePath, file, { upsert: true });
                      if (uploadError) throw uploadError;
                      const { data: { publicUrl } } = supabase.storage
                        .from('event-files')
                        .getPublicUrl(filePath);
                      const { error: updateError } = await supabase
                        .from('events')
                        .update({ floor_plan_url: publicUrl })
                        .eq('id', event.id);
                      if (updateError) throw updateError;
                      setEvent({ ...event, floor_plan_url: publicUrl });
                      setFloorPlanMode('upload');
                      toast.success('Floor plan uploaded successfully!');
                    } catch (error) {
                      console.error('Error uploading floor plan:', error);
                      toast.error('Failed to upload floor plan');
                    } finally {
                      setUploadingFloorPlan(false);
                      e.target.value = '';
                    }
                  }}
                />
                {uploadingFloorPlan && (
                  <div className="col-span-full flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                )}
                {event.floor_plan_url && (
                  <Card className="col-span-full">
                    <CardHeader>
                      <CardTitle className="text-base">Current Uploaded Floor Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <img src={event.floor_plan_url} alt="Floor plan" className="max-w-full max-h-96 object-contain rounded-md border" />
                      <div className="flex gap-2 mt-4">
                        <Button variant="outline" size="sm" onClick={() => setFloorPlanMode('upload')}>
                          <Image className="h-4 w-4 mr-2" />View Full
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {event.layout_json && (
                  <Card className="col-span-full">
                    <CardContent className="pt-6">
                      <Button variant="outline" onClick={() => setFloorPlanMode('design')}>
                        Continue editing existing design
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {floorPlanMode === 'design' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Floor Plan Layout</CardTitle>
                    <CardDescription>Design the floor plan layout for your event.</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setFloorPlanMode('choose')}>
                    <X className="h-4 w-4 mr-2" />Back
                  </Button>
                </CardHeader>
                <CardContent>
                  <LayoutDrawingTool
                    eventId={event.id}
                    initialLayout={event.layout_json}
                    onSave={handleSaveLayout}
                  />
                </CardContent>
              </Card>
            )}

            {floorPlanMode === 'upload' && event.floor_plan_url && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Uploaded Floor Plan</CardTitle>
                    <CardDescription>Your uploaded floor plan image.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" />Replace
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setFloorPlanMode('choose')}>
                      <X className="h-4 w-4 mr-2" />Back
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <img src={event.floor_plan_url} alt="Floor plan" className="w-full object-contain rounded-md border" />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="vendor-notes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Event-Wide Vendor Instructions</CardTitle>
                <CardDescription>
                  Add important notes that all vendors will see when viewing this event. Include details like start times, loading bay information, setup instructions, etc.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="vendorNotes">Vendor Instructions</Label>
                  <Textarea
                    id="vendorNotes"
                    placeholder="Example: Vendor load-in begins at 7:00 AM via the west entrance. All vendors must be set up by 9:00 AM. Loading bay is located at the rear of the building."
                    value={vendorNotes}
                    onChange={(e) => setVendorNotes(e.target.value)}
                    rows={8}
                    className="min-h-[200px]"
                  />
                </div>
                <Button
                  onClick={handleSaveVendorNotes}
                  disabled={savingNotes}
                >
                  {savingNotes ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Vendor Instructions'
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vendors" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Vendor Applications</CardTitle>
                <CardDescription>
                  Review and manage vendor applications for your event.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-3">
                <Button onClick={() => setVendorsDialogOpen(true)}>
                  Manage Vendor Applications
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEventDayDialogOpen(true)}
                >
                  Event Day Check-in
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sponsors" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sponsor Applications</CardTitle>
                <CardDescription>
                  Review and manage sponsor applications for your event.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setSponsorsDialogOpen(true)}>
                  Manage Sponsor Applications
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files" className="space-y-6">
            <EventFileManager eventId={event.id} />
          </TabsContent>
        </Tabs>

        {/* Vendor Applications Dialog */}
        <ManageVendorsDialog
          open={vendorsDialogOpen}
          onOpenChange={setVendorsDialogOpen}
          eventId={event.id}
          eventTitle={event.title}
        />

        {/* Sponsor Applications Dialog */}
        <ManageSponsorsDialog
          open={sponsorsDialogOpen}
          onOpenChange={setSponsorsDialogOpen}
          eventId={event.id}
          eventTitle={event.title}
        />

        {/* Event Day Dialog */}
        <EventDayDialog
          open={eventDayDialogOpen}
          onOpenChange={setEventDayDialogOpen}
          eventId={event.id}
          eventTitle={event.title}
        />
      </div>
    </div>
  );
};

export default ManageEvent;
