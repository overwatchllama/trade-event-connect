import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Clock, Crown, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SponsorApplication {
  id: string;
  event_id: string;
  sponsor_id: string;
  user_id: string;
  application_status: 'pending' | 'approved' | 'rejected' | 'waitlist';
  sponsorship_level: string;
  amount?: number;
  benefits?: string;
  application_date: string;
  approved_date?: string;
  notes?: string;
  sponsors: {
    company_name: string;
    company_description?: string;
    logo_url?: string;
    website_url?: string;
    contact_email?: string;
    contact_phone?: string;
  };
}

interface ManageSponsorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
}

const ManageSponsorsDialog = ({ open, onOpenChange, eventId, eventTitle }: ManageSponsorsDialogProps) => {
  const [applications, setApplications] = useState<SponsorApplication[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sponsor_applications')
        .select(`
          *,
          sponsors:sponsor_id (
            company_name,
            company_description,
            logo_url,
            website_url,
            contact_email,
            contact_phone
          )
        `)
        .eq('event_id', eventId);

      if (error) throw error;
      setApplications(data as SponsorApplication[] || []);
    } catch (error) {
      console.error('Error fetching sponsor applications:', error);
      toast.error('Failed to load sponsor applications');
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (applicationId: string, status: 'approved' | 'rejected' | 'waitlist') => {
    try {
      const { error } = await supabase
        .from('sponsor_applications')
        .update({
          application_status: status,
          approved_date: status === 'approved' ? new Date().toISOString() : null
        })
        .eq('id', applicationId);

      if (error) throw error;
      
      toast.success(`Application ${status === 'waitlist' ? 'added to waitlist' : status} successfully`);
      fetchApplications();
    } catch (error) {
      console.error('Error updating application status:', error);
      toast.error('Failed to update application status');
    }
  };

  useEffect(() => {
    if (open) {
      fetchApplications();
    }
  }, [open, eventId]);

  const getStatusBadge = (status: string) => {
    const baseClasses = "font-medium";
    
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className={`${baseClasses} bg-yellow-100 text-yellow-800`}>
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>;
      case 'approved':
        return <Badge variant="secondary" className={`${baseClasses} bg-green-100 text-green-800`}>
          <CheckCircle className="w-3 h-3 mr-1" />
          Approved
        </Badge>;
      case 'rejected':
        return <Badge variant="secondary" className={`${baseClasses} bg-red-100 text-red-800`}>
          <XCircle className="w-3 h-3 mr-1" />
          Rejected
        </Badge>;
      case 'waitlist':
        return <Badge variant="secondary" className={`${baseClasses} bg-blue-100 text-blue-800`}>
          <Clock className="w-3 h-3 mr-1" />
          Waitlist
        </Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getLevelBadge = (level: string) => {
    const colors: Record<string, string> = {
      platinum: "bg-slate-200 text-slate-900",
      gold: "bg-yellow-100 text-yellow-900",
      silver: "bg-gray-100 text-gray-900",
      bronze: "bg-orange-100 text-orange-900",
      standard: "bg-blue-100 text-blue-900"
    };
    
    return <Badge variant="secondary" className={colors[level] || colors.standard}>
      <Crown className="w-3 h-3 mr-1" />
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </Badge>;
  };

  const filterApplications = (status: string) => {
    if (status === 'all') return applications;
    return applications.filter(app => app.application_status === status);
  };

  const SponsorApplicationCard = ({ application }: { application: SponsorApplication }) => (
    <Card className="p-4 space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3">
            {application.sponsors.logo_url && (
              <img
                src={application.sponsors.logo_url}
                alt={application.sponsors.company_name}
                className="h-12 w-12 rounded object-cover"
              />
            )}
            <div>
              <h4 className="font-semibold text-lg">{application.sponsors.company_name}</h4>
              {application.sponsors.website_url && (
                <a
                  href={application.sponsors.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
                >
                  Visit website
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
          {application.sponsors.company_description && (
            <p className="text-sm text-muted-foreground">{application.sponsors.company_description}</p>
          )}
          {application.sponsors.contact_email && (
            <p className="text-sm text-muted-foreground">{application.sponsors.contact_email}</p>
          )}
          {application.sponsors.contact_phone && (
            <p className="text-sm text-muted-foreground">{application.sponsors.contact_phone}</p>
          )}
        </div>
        <div className="text-right space-y-2">
          {getStatusBadge(application.application_status)}
          {getLevelBadge(application.sponsorship_level)}
        </div>
      </div>

      {application.amount && (
        <div className="text-sm">
          <strong>Sponsorship Amount:</strong> ${application.amount.toFixed(2)}
        </div>
      )}

      {application.benefits && (
        <div className="text-sm">
          <strong>Benefits:</strong> {application.benefits}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {application.application_status === 'pending' && (
          <>
            <Button
              size="sm"
              variant="default"
              onClick={() => updateApplicationStatus(application.id, 'approved')}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateApplicationStatus(application.id, 'waitlist')}
            >
              <Clock className="w-3 h-3 mr-1" />
              Waitlist
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => updateApplicationStatus(application.id, 'rejected')}
            >
              <XCircle className="w-3 h-3 mr-1" />
              Reject
            </Button>
          </>
        )}
        
        {application.application_status === 'waitlist' && (
          <>
            <Button
              size="sm"
              variant="default"
              onClick={() => updateApplicationStatus(application.id, 'approved')}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => updateApplicationStatus(application.id, 'rejected')}
            >
              <XCircle className="w-3 h-3 mr-1" />
              Reject
            </Button>
          </>
        )}
      </div>

      {application.notes && (
        <div className="text-sm text-muted-foreground">
          <strong>Notes:</strong> {application.notes}
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Applied: {new Date(application.application_date).toLocaleDateString()}
        {application.approved_date && (
          <span> • Approved: {new Date(application.approved_date).toLocaleDateString()}</span>
        )}
      </div>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Sponsors - {eventTitle}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All ({applications.length})</TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({filterApplications('pending').length})
            </TabsTrigger>
            <TabsTrigger value="waitlist">
              Waitlist ({filterApplications('waitlist').length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved ({filterApplications('approved').length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({filterApplications('rejected').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {loading ? (
              <div className="text-center py-8">Loading sponsor applications...</div>
            ) : applications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No sponsor applications yet
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((application) => (
                  <SponsorApplicationCard key={application.id} application={application} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {filterApplications('pending').length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending applications
              </div>
            ) : (
              <div className="space-y-4">
                {filterApplications('pending').map((application) => (
                  <SponsorApplicationCard key={application.id} application={application} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {filterApplications('approved').length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No approved applications
              </div>
            ) : (
              <div className="space-y-4">
                {filterApplications('approved').map((application) => (
                  <SponsorApplicationCard key={application.id} application={application} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="waitlist" className="space-y-4">
            {filterApplications('waitlist').length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No waitlisted applications
              </div>
            ) : (
              <div className="space-y-4">
                {filterApplications('waitlist').map((application) => (
                  <SponsorApplicationCard key={application.id} application={application} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {filterApplications('rejected').length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No rejected applications
              </div>
            ) : (
              <div className="space-y-4">
                {filterApplications('rejected').map((application) => (
                  <SponsorApplicationCard key={application.id} application={application} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ManageSponsorsDialog;
