import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Upload, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { LayoutDrawingTool } from '@/components/LayoutDrawingTool';
import { EventDashboard } from '@/components/EventDashboard';
import { ManageEventSponsors } from '@/components/ManageEventSponsors';
import ManageVendorsDialog from '@/components/ManageVendorsDialog';
import ManageSponsorsDialog from '@/components/ManageSponsorsDialog';
import { EventFileManager } from '@/components/EventFileManager';
import { AttendeeManagement } from '@/components/AttendeeManagement';
import EventDayDialog from '@/components/EventDayDialog';
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
  const [uploading, setUploading] = useState(false);
  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [vendorNotes, setVendorNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [vendorsDialogOpen, setVendorsDialogOpen] = useState(false);
  const [sponsorsDialogOpen, setSponsorsDialogOpen] = useState(false);
  const [eventDayDialogOpen, setEventDayDialogOpen] = useState(false);

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

  const handleFlyerUpload = async () => {
    if (!flyerFile || !event) return;

    setUploading(true);

    try {
      const fileExt = flyerFile.name.split('.').pop();
      const fileName = `${event.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('event-flyers')
        .upload(filePath, flyerFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('event-flyers')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('events')
        .update({ flyer_url: publicUrl })
        .eq('id', event.id);

      if (updateError) throw updateError;

      setEvent({ ...event, flyer_url: publicUrl });
      setFlyerFile(null);
      toast.success('Flyer uploaded successfully!');
    } catch (error) {
      console.error('Error uploading flyer:', error);
      toast.error('Failed to upload flyer');
    } finally {
      setUploading(false);
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
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="attendees">Attendees</TabsTrigger>
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

          <TabsContent value="flyer" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Event Flyer</CardTitle>
                <CardDescription>
                  Upload a promotional flyer for your event. This will be displayed on the event details page.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {event.flyer_url && (
                  <div className="aspect-[9/16] rounded-lg overflow-hidden border border-border max-w-md mx-auto bg-muted">
                    <img
                      src={event.flyer_url}
                      alt="Current flyer"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="flyer">Choose Flyer Image</Label>
                  <Input
                    id="flyer"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFlyerFile(e.target.files?.[0] || null)}
                  />
                </div>

                <Button
                  onClick={handleFlyerUpload}
                  disabled={!flyerFile || uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Flyer
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="layout" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Floor Plan Layout</CardTitle>
                <CardDescription>
                  Design the floor plan layout for your event. This will be visible to attendees and vendors.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LayoutDrawingTool
                  eventId={event.id}
                  initialLayout={event.layout_json}
                  onSave={handleSaveLayout}
                />
              </CardContent>
            </Card>
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
