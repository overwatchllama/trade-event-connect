import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, MessageSquare, Link2, Copy, Check, Loader2, Ticket, Minus, Plus } from "lucide-react";

interface TicketInfo {
  ticket_code: string;
  event_day?: {
    day_number: number;
    day_date: string;
  } | null;
}

interface BulkShareTicketsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tickets: TicketInfo[];
  eventTitle: string;
  eventDate: string;
}

const BulkShareTicketsDialog = ({
  open,
  onOpenChange,
  tickets,
  eventTitle,
  eventDate,
}: BulkShareTicketsDialogProps) => {
  const [quantity, setQuantity] = useState(1);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const maxTickets = tickets.length;

  const selectedTickets = tickets.slice(0, quantity);

  const shareUrls = selectedTickets.map(t => `${window.location.origin}/ticket/${t.ticket_code}`);
  const shareMessage = `I'm sending you ${quantity} ticket${quantity !== 1 ? 's' : ''} for ${eventTitle} on ${eventDate}!\n\n${shareUrls.map((url, i) => `Ticket ${i + 1}: ${url}`).join('\n')}`;

  const handleCopyLinks = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      toast.success(`${quantity} ticket link${quantity !== 1 ? 's' : ''} copied!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy links");
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSending(true);
    try {
      // Send each ticket via the existing edge function
      const results = await Promise.all(
        selectedTickets.map(ticket =>
          supabase.functions.invoke('share-ticket-email', {
            body: {
              recipientEmail: email,
              ticketCode: ticket.ticket_code,
              eventTitle,
              eventDate,
              shareUrl: `${window.location.origin}/ticket/${ticket.ticket_code}`,
            }
          })
        )
      );

      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error(`Failed to send ${errors.length} ticket(s)`);
      }

      toast.success(`${quantity} ticket${quantity !== 1 ? 's' : ''} sent to ${email}!`);
      setEmail("");
      setQuantity(1);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error sharing tickets:", err);
      toast.error(err.message || "Failed to send emails");
    } finally {
      setSending(false);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${quantity} Ticket${quantity !== 1 ? 's' : ''} for ${eventTitle}`,
          text: shareMessage,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopyLinks();
    }
  };

  const adjustQuantity = (delta: number) => {
    setQuantity(prev => Math.max(1, Math.min(maxTickets, prev + delta)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Tickets</DialogTitle>
          <DialogDescription>
            Send tickets for {eventTitle} to someone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quantity Selector */}
          <div className="space-y-3">
            <Label>How many tickets to send?</Label>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => adjustQuantity(-1)}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="flex-1 text-center">
                <div className="text-3xl font-bold text-primary">{quantity}</div>
                <div className="text-xs text-muted-foreground">
                  of {maxTickets} ticket{maxTickets !== 1 ? 's' : ''}
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => adjustQuantity(1)}
                disabled={quantity >= maxTickets}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {maxTickets > 2 && (
              <Slider
                value={[quantity]}
                onValueChange={([val]) => setQuantity(val)}
                min={1}
                max={maxTickets}
                step={1}
                className="mt-2"
              />
            )}
          </div>

          <Separator />

          {/* Copy Links */}
          <div className="space-y-2">
            <Label>Share Links</Label>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleCopyLinks}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  Copied {quantity} ticket link{quantity !== 1 ? 's' : ''}!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy {quantity} ticket link{quantity !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>

          {/* Quick Share Buttons */}
          <div className="flex gap-2">
            {typeof navigator !== 'undefined' && navigator.share && (
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

          {/* Email Share */}
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
                  Sending {quantity} ticket{quantity !== 1 ? 's' : ''}...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Email {quantity} ticket{quantity !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkShareTicketsDialog;
