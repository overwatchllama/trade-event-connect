import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format, parseISO } from "date-fns";
import {
  ChevronRight,
  ChevronDown,
  Clock,
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
  Gift,
  FolderOpen,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EventDashboard } from "@/components/EventDashboard";
import { AttendeeManagement } from "@/components/AttendeeManagement";
import ManageVendorsDialog from "@/components/ManageVendorsDialog";
import ManageSponsorsDialog from "@/components/ManageSponsorsDialog";
import { DayOfChecklist } from "@/components/DayOfChecklist";
import { PostEventSummary } from "@/components/PostEventSummary";
import { ManageRaffles } from "@/components/raffle/ManageRaffles";
import { EventFileManager } from "@/components/EventFileManager";
import { LayoutDrawingTool } from "@/components/LayoutDrawingTool";
import EventCheckInDialog from "@/components/organize/EventCheckInDialog";
import { EventStaffRoles } from "@/components/organize/EventStaffRoles";
import StaffCheckInDialog from "@/components/organize/StaffCheckInDialog";
import { StaffHoursSummary } from "@/components/organize/StaffHoursSummary";

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
  const [isOpen, setIsOpen] = useState(true);
  const [vendorsDialogOpen, setVendorsDialogOpen] = useState(false);
  const [sponsorsDialogOpen, setSponsorsDialogOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [staffCheckInOpen, setStaffCheckInOpen] = useState(false);
  const [flyerDialogOpen, setFlyerDialogOpen] = useState(false);
  const [floorPlanDialogOpen, setFloorPlanDialogOpen] = useState(false);
  const [savedLayoutJson, setSavedLayoutJson] = useState<any>(null);
  const [floorPlanEventData, setFloorPlanEventData] = useState<any>(null);
  const [vendorNotesDialogOpen, setVendorNotesDialogOpen] = useState(false);
  const [flyerFrontFile, setFlyerFrontFile] = useState<File | null>(null);
  const [flyerBackFile, setFlyerBackFile] = useState<File | null>(null);
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [addingFloorPlan, setAddingFloorPlan] = useState(false);
  const [currentFlyerUrl, setCurrentFlyerUrl] = useState(event.flyer_url);
  const [currentFlyerBackUrl, setCurrentFlyerBackUrl] = useState<string | null>(null);
  const [flyerViewSide, setFlyerViewSide] = useState<'front' | 'back'>('front');
  const [vendorNotes, setVendorNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  useEffect(() => {
    const fetchBackUrl = async () => {
      const { data } = await supabase.from('events').select('flyer_back_url').eq('id', event.id).single();
      if (data) setCurrentFlyerBackUrl((data as any).flyer_back_url);
    };
    fetchBackUrl();
  }, [event.id]);

  const handleFlyerUpload = async (side: 'front' | 'back') => {
    const file = side === 'front' ? flyerFrontFile : flyerBackFile;
    if (!file) return;
    const setter = side === 'front' ? setUploadingFront : setUploadingBack;
    setter(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${event.id}-${side}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('event-flyers').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('event-flyers').getPublicUrl(fileName);
      const updateField = side === 'front' ? 'flyer_url' : 'flyer_back_url';
      const { error: updateError } = await supabase.from('events').update({ [updateField]: publicUrl }).eq('id', event.id);
      if (updateError) throw updateError;
      if (side === 'front') { setCurrentFlyerUrl(publicUrl); setFlyerFrontFile(null); }
      else { setCurrentFlyerBackUrl(publicUrl); setFlyerBackFile(null); }
      toast.success(`Flyer ${side} uploaded!`);
    } catch {
      toast.error(`Failed to upload flyer ${side}`);
    } finally {
      setter(false);
    }
  };

  const handleAddFloorPlanToFlyer = async () => {
    setAddingFloorPlan(true);
    try {
      const { data: eventData } = await supabase.from('events').select('layout_json').eq('id', event.id).single();
      if (!eventData?.layout_json) {
        toast.error('No floor plan exists yet. Create one in the Floor Plan tab first.');
        return;
      }
      const fabricModule = await import('fabric');
      const tempCanvas = new fabricModule.Canvas(null as any, { width: 800, height: 600 });
      await tempCanvas.loadFromJSON(eventData.layout_json as Record<string, any>);
      tempCanvas.renderAll();
      const dataUrl = tempCanvas.toDataURL({ format: 'png', multiplier: 2 });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `${event.id}-floorplan-${Date.now()}.png`, { type: 'image/png' });
      const fileName = `${event.id}-floorplan-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage.from('event-flyers').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('event-flyers').getPublicUrl(fileName);
      const { error: updateError } = await supabase.from('events').update({ flyer_back_url: publicUrl }).eq('id', event.id);
      if (updateError) throw updateError;
      setCurrentFlyerBackUrl(publicUrl);
      setFlyerViewSide('back');
      toast.success('Floor plan added as flyer back!');
      tempCanvas.dispose();
    } catch (error) {
      console.error('Error adding floor plan:', error);
      toast.error('Failed to add floor plan to flyer');
    } finally {
      setAddingFloorPlan(false);
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
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
    <Card className="mt-6">
      <CollapsibleTrigger asChild>
      <CardHeader className="pb-3 cursor-pointer hover:bg-accent/30 transition-colors">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? '' : '-rotate-90'}`} />
            <div>
              <CardTitle className="text-xl">{event.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {format(parseISO(event.date), "EEEE, MMMM d, yyyy")} ·{" "}
                {event.venue}, {event.city}, {event.state}
              </p>
            </div>
          </div>
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
              onClick={() => setStaffCheckInOpen(true)}
            >
              <UserCog className="h-4 w-4 mr-1" />
              Staff Check-in
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
      </CollapsibleTrigger>
      <CollapsibleContent>
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
                <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={async () => {
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
                  setFloorPlanDialogOpen(true);
                }}>
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
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Event Flyer</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {(currentFlyerUrl || currentFlyerBackUrl) && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2">
                          <Button variant={flyerViewSide === 'front' ? 'default' : 'outline'} size="sm" onClick={() => setFlyerViewSide('front')}>Front</Button>
                          <Button variant={flyerViewSide === 'back' ? 'default' : 'outline'} size="sm" onClick={() => setFlyerViewSide('back')}>Back</Button>
                        </div>
                        <div className="rounded-lg overflow-hidden border bg-muted flex items-center justify-center min-h-[200px]">
                          {(flyerViewSide === 'front' ? currentFlyerUrl : currentFlyerBackUrl) ? (
                            <img src={(flyerViewSide === 'front' ? currentFlyerUrl : currentFlyerBackUrl)!} alt={`Flyer ${flyerViewSide}`} className="w-full object-contain max-h-64" />
                          ) : (
                            <p className="text-muted-foreground text-sm">No {flyerViewSide} image uploaded</p>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label className="font-semibold">Front Image</Label>
                      <Input type="file" accept="image/*" onChange={(e) => setFlyerFrontFile(e.target.files?.[0] || null)} />
                      <Button onClick={() => handleFlyerUpload('front')} disabled={!flyerFrontFile || uploadingFront} className="w-full">
                        {uploadingFront ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</> : <><Upload className="h-4 w-4 mr-2" /> Upload Front</>}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold">Back Image</Label>
                      <Input type="file" accept="image/*" onChange={(e) => setFlyerBackFile(e.target.files?.[0] || null)} />
                      <Button onClick={() => handleFlyerUpload('back')} disabled={!flyerBackFile || uploadingBack} className="w-full">
                        {uploadingBack ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</> : <><Upload className="h-4 w-4 mr-2" /> Upload Back</>}
                      </Button>
                    </div>
                    <div className="border-t border-border pt-3">
                      <p className="text-sm text-muted-foreground mb-2">Use your floor plan as the back of the flyer.</p>
                      <Button variant="outline" onClick={handleAddFloorPlanToFlyer} disabled={addingFloorPlan} className="w-full">
                        {addingFloorPlan ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding...</> : <><Map className="h-4 w-4 mr-2" /> Add Floor Plan as Back</>}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Floor Plan Dialog */}
              <Dialog open={floorPlanDialogOpen} onOpenChange={(open) => {
                if (!open) setFloorPlanDialogOpen(false);
              }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Floor Plan</DialogTitle>
                  </DialogHeader>
                  {floorPlanDialogOpen && (
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
                <Button onClick={() => navigate(`/event/${event.id}/manage`)}>
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
      </CollapsibleContent>

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
    </Card>
    </Collapsible>
  );
};

export default EventDetailPanel;
