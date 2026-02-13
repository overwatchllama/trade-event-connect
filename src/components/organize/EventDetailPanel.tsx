import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format, parseISO } from "date-fns";
import {
  ChevronRight,
  Settings,
  BarChart3,
  Store,
  Users,
  UserCog,
  Wrench,
  ListChecks,
  ClipboardCheck,
  Upload,
  Loader2,
  Image,
  Map,
  FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EventDashboard } from "@/components/EventDashboard";
import { AttendeeManagement } from "@/components/AttendeeManagement";
import ManageVendorsDialog from "@/components/ManageVendorsDialog";
import ManageSponsorsDialog from "@/components/ManageSponsorsDialog";
import { DayOfChecklist } from "@/components/DayOfChecklist";
import { LayoutDrawingTool } from "@/components/LayoutDrawingTool";
import EventCheckInDialog from "@/components/organize/EventCheckInDialog";

interface EventDetailPanelProps {
  event: {
    id: string;
    title: string;
    date: string;
    venue: string;
    city: string;
    state: string;
    event_type: string;
    card_types: string[];
    max_attendees: number | null;
    total_tables: number | null;
    tables_available: number | null;
    flyer_url: string | null;
    vendor_count?: number;
    ticket_count?: number;
    description?: string | null;
    entry_fee?: number | null;
    vendor_table_price?: number | null;
  };
}

const EventDetailPanel = ({ event }: EventDetailPanelProps) => {
  const navigate = useNavigate();
  const [vendorsDialogOpen, setVendorsDialogOpen] = useState(false);
  const [sponsorsDialogOpen, setSponsorsDialogOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [flyerDialogOpen, setFlyerDialogOpen] = useState(false);
  const [floorPlanDialogOpen, setFloorPlanDialogOpen] = useState(false);
  const [vendorNotesDialogOpen, setVendorNotesDialogOpen] = useState(false);
  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [currentFlyerUrl, setCurrentFlyerUrl] = useState(event.flyer_url);
  const [vendorNotes, setVendorNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  const handleFlyerUpload = async () => {
    if (!flyerFile) return;
    setUploading(true);
    try {
      const fileExt = flyerFile.name.split('.').pop();
      const fileName = `${event.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('event-flyers').upload(fileName, flyerFile);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('event-flyers').getPublicUrl(fileName);
      const { error: updateError } = await supabase.from('events').update({ flyer_url: publicUrl }).eq('id', event.id);
      if (updateError) throw updateError;
      setCurrentFlyerUrl(publicUrl);
      setFlyerFile(null);
      toast.success('Flyer uploaded!');
    } catch {
      toast.error('Failed to upload flyer');
    } finally {
      setUploading(false);
    }
  };

  const openVendorNotes = async () => {
    setVendorNotesDialogOpen(true);
    setLoadingNotes(true);
    try {
      const { data } = await supabase.from('events').select('vendor_notes').eq('id', event.id).single();
      setVendorNotes(data?.vendor_notes || "");
    } catch {
      setVendorNotes("");
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleSaveVendorNotes = async () => {
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

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{event.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {format(parseISO(event.date), "EEEE, MMMM d, yyyy")} ·{" "}
              {event.venue}, {event.city}, {event.state}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCheckInOpen(true)}
            >
              <ClipboardCheck className="h-4 w-4 mr-1" />
              Check-ins
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/event/${event.id}`)}
            >
              View Page
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="status" className="space-y-4">
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
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Vendor Applications</h3>
                  <p className="text-sm text-muted-foreground">
                    Review and manage vendor applications for this event.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setVendorsDialogOpen(true)}>
                  <Store className="h-4 w-4 mr-2" />
                  Manage Vendor Applications
                </Button>
                <Button variant="outline" onClick={() => setSponsorsDialogOpen(true)}>
                  Manage Sponsors
                </Button>
              </div>

              {/* Quick vendor stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{event.vendor_count || 0}</p>
                  <p className="text-xs text-muted-foreground">Confirmed Vendors</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{event.total_tables ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">Total Tables</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{event.tables_available ?? event.total_tables ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">Tables Available</p>
                </div>
              </div>
            </div>

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
          </TabsContent>

          {/* STAFF TAB */}
          <TabsContent value="staff">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Event Staff</h3>
                <p className="text-sm text-muted-foreground">
                  Manage staff assignments and roles for this event.
                </p>
              </div>
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <UserCog className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <h4 className="font-medium text-muted-foreground mb-1">
                    Staff Management Coming Soon
                  </h4>
                  <p className="text-sm text-muted-foreground max-w-md">
                    You'll be able to assign staff members, define roles, and manage event-day responsibilities here.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* VISITORS TAB */}
          <TabsContent value="visitors">
            <AttendeeManagement eventId={event.id} />
          </TabsContent>

          {/* MANAGE TAB */}
          <TabsContent value="manage">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setChecklistOpen(true)}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ListChecks className="h-4 w-4" />
                      Day-of Checklist
                    </CardTitle>
                    <CardDescription>Track event day tasks</CardDescription>
                  </CardHeader>
                </Card>
                <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setFlyerDialogOpen(true)}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Event Flyer
                    </CardTitle>
                    <CardDescription>Upload or update flyer</CardDescription>
                  </CardHeader>
                </Card>
                <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setFloorPlanDialogOpen(true)}>
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
              </div>

              {/* Day-of Checklist Dialog */}
              <Dialog open={checklistOpen} onOpenChange={setChecklistOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Day-of Checklist</DialogTitle>
                  </DialogHeader>
                  <DayOfChecklist eventId={event.id} />
                </DialogContent>
              </Dialog>

              {/* Flyer Dialog */}
              <Dialog open={flyerDialogOpen} onOpenChange={setFlyerDialogOpen}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Event Flyer</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {currentFlyerUrl && (
                      <div className="rounded-lg overflow-hidden border">
                        <img src={currentFlyerUrl} alt="Event flyer" className="w-full object-contain max-h-64" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Upload new flyer</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFlyerFile(e.target.files?.[0] || null)}
                      />
                    </div>
                    <Button onClick={handleFlyerUpload} disabled={!flyerFile || uploading} className="w-full">
                      {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                      {uploading ? "Uploading..." : "Upload Flyer"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Floor Plan Dialog */}
              <Dialog open={floorPlanDialogOpen} onOpenChange={setFloorPlanDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Floor Plan</DialogTitle>
                  </DialogHeader>
                  <LayoutDrawingTool
                    eventId={event.id}
                    initialLayout={null}
                    onSave={async (layoutJson) => {
                      await supabase.from('events').update({ layout_json: layoutJson }).eq('id', event.id);
                      toast.success('Floor plan saved!');
                    }}
                  />
                </DialogContent>
              </Dialog>

              {/* Vendor Instructions Dialog */}
              <Dialog open={vendorNotesDialogOpen} onOpenChange={setVendorNotesDialogOpen}>
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
                        {savingNotes ? "Saving..." : "Save Instructions"}
                      </Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              <div className="pt-2">
                <Button onClick={() => navigate(`/manage-event/${event.id}`)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Open Full Event Management
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Event meta badges */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t">
          <Badge variant="outline">{event.event_type}</Badge>
          {event.card_types?.map((ct) => (
            <Badge key={ct} variant="secondary" className="text-xs">
              {ct}
            </Badge>
          ))}
        </div>
      </CardContent>

      <EventCheckInDialog
        open={checkInOpen}
        onOpenChange={setCheckInOpen}
        eventId={event.id}
        eventTitle={event.title}
      />
    </Card>
  );
};

export default EventDetailPanel;
