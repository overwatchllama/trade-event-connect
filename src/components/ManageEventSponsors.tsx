import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink, Loader2 } from "lucide-react";

interface ManageEventSponsorsProps {
  eventId: string;
}

export const ManageEventSponsors = ({ eventId }: ManageEventSponsorsProps) => {
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [eventSponsors, setEventSponsors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedSponsorId, setSelectedSponsorId] = useState("");
  const [sponsorshipLevel, setSponsorshipLevel] = useState("standard");
  const [amount, setAmount] = useState("");
  const [benefits, setBenefits] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all available sponsors
      const { data: sponsorsData, error: sponsorsError } = await supabase
        .from("sponsors")
        .select("*")
        .order("company_name");

      if (sponsorsError) throw sponsorsError;

      // Fetch event sponsors with full sponsor details
      const { data: eventSponsorsData, error: eventSponsorsError } = await supabase
        .from("event_sponsors")
        .select(`
          *,
          sponsors:sponsor_id (*)
        `)
        .eq("event_id", eventId);

      if (eventSponsorsError) throw eventSponsorsError;

      setSponsors(sponsorsData || []);
      setEventSponsors(eventSponsorsData || []);
    } catch (error) {
      console.error("Error fetching sponsors:", error);
      toast.error("Failed to load sponsors");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSponsor = async () => {
    if (!selectedSponsorId) {
      toast.error("Please select a sponsor");
      return;
    }

    setAdding(true);
    try {
      const { error } = await supabase.from("event_sponsors").insert({
        event_id: eventId,
        sponsor_id: selectedSponsorId,
        sponsorship_level: sponsorshipLevel,
        amount: amount ? parseFloat(amount) : null,
        benefits: benefits || null,
      });

      if (error) throw error;

      toast.success("Sponsor added successfully!");
      setAddDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error("Error adding sponsor:", error);
      if (error.code === "23505") {
        toast.error("This sponsor is already added to the event");
      } else {
        toast.error("Failed to add sponsor");
      }
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveSponsor = async (eventSponsorId: string) => {
    if (!confirm("Are you sure you want to remove this sponsor?")) return;

    try {
      const { error } = await supabase
        .from("event_sponsors")
        .delete()
        .eq("id", eventSponsorId);

      if (error) throw error;

      toast.success("Sponsor removed successfully!");
      fetchData();
    } catch (error) {
      console.error("Error removing sponsor:", error);
      toast.error("Failed to remove sponsor");
    }
  };

  const resetForm = () => {
    setSelectedSponsorId("");
    setSponsorshipLevel("standard");
    setAmount("");
    setBenefits("");
  };

  const availableSponsors = sponsors.filter(
    (sponsor) => !eventSponsors.some((es) => es.sponsor_id === sponsor.id)
  );

  const getLevelColor = (level: string) => {
    switch (level) {
      case "platinum":
        return "default";
      case "gold":
        return "secondary";
      case "silver":
        return "outline";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Event Sponsors</CardTitle>
              <CardDescription>
                Manage sponsors for this event
              </CardDescription>
            </div>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Sponsor
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {eventSponsors.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No sponsors added yet. Add your first sponsor!
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Benefits</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventSponsors.map((eventSponsor) => (
                  <TableRow key={eventSponsor.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {eventSponsor.sponsors.logo_url && (
                          <img
                            src={eventSponsor.sponsors.logo_url}
                            alt={eventSponsor.sponsors.company_name}
                            className="h-8 w-8 rounded object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium">
                            {eventSponsor.sponsors.company_name}
                          </p>
                          {eventSponsor.sponsors.website_url && (
                            <a
                              href={eventSponsor.sponsors.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                            >
                              Visit website
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getLevelColor(eventSponsor.sponsorship_level)}>
                        {eventSponsor.sponsorship_level}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {eventSponsor.amount ? `$${eventSponsor.amount}` : "-"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {eventSponsor.benefits || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveSponsor(eventSponsor.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Event Sponsor</DialogTitle>
            <DialogDescription>
              Select a sponsor and configure the sponsorship details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sponsor</Label>
              <Select value={selectedSponsorId} onValueChange={setSelectedSponsorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a sponsor" />
                </SelectTrigger>
                <SelectContent>
                  {availableSponsors.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      No available sponsors
                    </div>
                  ) : (
                    availableSponsors.map((sponsor) => (
                      <SelectItem key={sponsor.id} value={sponsor.id}>
                        {sponsor.company_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sponsorship Level</Label>
              <Select value={sponsorshipLevel} onValueChange={setSponsorshipLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="platinum">Platinum</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="bronze">Bronze</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sponsorship Amount (Optional)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Benefits (Optional)</Label>
              <Textarea
                placeholder="List the benefits included in this sponsorship..."
                value={benefits}
                onChange={(e) => setBenefits(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSponsor} disabled={adding || !selectedSponsorId}>
              {adding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Sponsor"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
