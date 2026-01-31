import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, MessageSquare, Link2, Copy, Check, Loader2 } from "lucide-react";

interface ShareTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketCode: string;
  eventTitle: string;
  eventDate: string;
}

const ShareTicketDialog = ({
  open,
  onOpenChange,
  ticketCode,
  eventTitle,
  eventDate,
}: ShareTicketDialogProps) => {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/ticket/${ticketCode}`;
  const shareMessage = `Check out my ticket for ${eventTitle} on ${eventDate}! View it here: ${shareUrl}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleShareSMS = () => {
    const smsUrl = `sms:?body=${encodeURIComponent(shareMessage)}`;
    window.open(smsUrl, '_blank');
  };

  const handleShareEmail = async () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('share-ticket-email', {
        body: {
          recipientEmail: email,
          ticketCode,
          eventTitle,
          eventDate,
          shareUrl,
        }
      });

      if (error) throw error;

      toast.success("Ticket shared successfully!");
      setEmail("");
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error sharing ticket:", err);
      toast.error(err.message || "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ticket for ${eventTitle}`,
          text: shareMessage,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or error
        console.log("Share cancelled or failed:", err);
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Ticket</DialogTitle>
          <DialogDescription>
            Share your ticket for {eventTitle} with someone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Copy Link Section */}
          <div className="space-y-2">
            <Label>Share Link</Label>
            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="flex-1 text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Quick Share Buttons */}
          <div className="flex gap-2">
            {navigator.share && (
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleNativeShare}
              >
                <Link2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            )}
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleShareSMS}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Text
            </Button>
          </div>

          <Separator />

          {/* Email Share Section */}
          <div className="space-y-3">
            <Label>Send via Email</Label>
            <Input
              type="email"
              placeholder="recipient@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={sending}
            />
            <Button
              className="w-full"
              onClick={handleShareEmail}
              disabled={sending || !email}
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareTicketDialog;
