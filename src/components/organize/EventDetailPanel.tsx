import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import {
  MapPin,
  ChevronRight,
  Settings,
  BarChart3,
  Store,
  Users,
  UserCog,
  Wrench,
  ListChecks,
  ClipboardCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EventDashboard } from "@/components/EventDashboard";
import { AttendeeManagement } from "@/components/AttendeeManagement";
import ManageVendorsDialog from "@/components/ManageVendorsDialog";
import ManageSponsorsDialog from "@/components/ManageSponsorsDialog";
import { EventFileManager } from "@/components/EventFileManager";
import { DayOfChecklist } from "@/components/DayOfChecklist";
import { PostEventSummary } from "@/components/PostEventSummary";
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
                <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate(`/manage-event/${event.id}?tab=summary`)}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Post-Event Summary</CardTitle>
                    <CardDescription>Review event performance</CardDescription>
                  </CardHeader>
                </Card>
                <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate(`/manage-event/${event.id}?tab=flyer`)}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Event Flyer</CardTitle>
                    <CardDescription>Upload or update flyer</CardDescription>
                  </CardHeader>
                </Card>
                <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate(`/manage-event/${event.id}?tab=layout`)}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Floor Plan</CardTitle>
                    <CardDescription>Design your venue layout</CardDescription>
                  </CardHeader>
                </Card>
                <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate(`/manage-event/${event.id}?tab=vendor-notes`)}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Vendor Notes</CardTitle>
                    <CardDescription>Instructions for vendors</CardDescription>
                  </CardHeader>
                </Card>
                <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate(`/manage-event/${event.id}?tab=files`)}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Files & Documents</CardTitle>
                    <CardDescription>Manage event files</CardDescription>
                  </CardHeader>
                </Card>
              </div>

              <Dialog open={checklistOpen} onOpenChange={setChecklistOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Day-of Checklist</DialogTitle>
                  </DialogHeader>
                  <DayOfChecklist eventId={event.id} />
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
