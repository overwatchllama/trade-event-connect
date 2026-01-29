import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, CheckCircle, XCircle, Search, User, Calendar, Ticket } from "lucide-react";
import { toast } from "sonner";

interface ScannedTicket {
  id: string;
  ticket_code: string;
  ticket_type: string;
  checked_in: boolean;
  checked_in_at: string | null;
  user_id: string;
  event: {
    id: string;
    title: string;
    date: string;
  };
  profile?: {
    full_name: string | null;
    email: string;
  };
}

interface TicketScannerProps {
  eventId: string;
  eventTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TicketScanner = ({ eventId, eventTitle, open, onOpenChange }: TicketScannerProps) => {
  const { user } = useAuth();
  const [manualCode, setManualCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scannedTicket, setScannedTicket] = useState<ScannedTicket | null>(null);
  const [scanResult, setScanResult] = useState<"success" | "error" | "already" | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Clean up camera on unmount or close
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (!open) {
      stopCamera();
      resetState();
    }
  }, [open]);

  const resetState = () => {
    setScannedTicket(null);
    setScanResult(null);
    setManualCode("");
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        setScanning(true);
        // Start scanning loop
        scanQRCode();
      }
    } catch (error) {
      console.error("Camera access error:", error);
      toast.error("Could not access camera. Please use manual entry.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setScanning(false);
  };

  const scanQRCode = async () => {
    // Note: For full QR scanning, you'd use a library like @zxing/browser
    // For now, we'll use manual entry as the primary method
    // This is a placeholder for future QR scanning implementation
  };

  const lookupTicket = async (code: string) => {
    if (!code.trim()) {
      toast.error("Please enter a ticket code");
      return;
    }

    setScanning(true);
    try {
      // Parse QR data - it's JSON with ticketCode and eventId
      let ticketCode = code;
      try {
        const parsed = JSON.parse(code);
        ticketCode = parsed.ticketCode || code;
      } catch {
        // If it's not JSON, use the code directly
      }

      const { data: ticket, error } = await supabase
        .from("order_items")
        .select(`
          id,
          ticket_code,
          ticket_type,
          checked_in,
          checked_in_at,
          user_id,
          event:events(id, title, date)
        `)
        .eq("ticket_code", ticketCode)
        .eq("event_id", eventId)
        .single();

      if (error || !ticket) {
        setScanResult("error");
        setScannedTicket(null);
        toast.error("Ticket not found for this event");
        return;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", ticket.user_id)
        .single();

      const ticketData = {
        ...ticket,
        event: Array.isArray(ticket.event) ? ticket.event[0] : ticket.event,
        profile: profile || undefined
      } as ScannedTicket;

      setScannedTicket(ticketData);

      if (ticket.checked_in) {
        setScanResult("already");
      } else {
        setScanResult("success");
      }
    } catch (error) {
      console.error("Lookup error:", error);
      setScanResult("error");
      toast.error("Failed to lookup ticket");
    } finally {
      setScanning(false);
    }
  };

  const checkInTicket = async () => {
    if (!scannedTicket || !user) return;

    setCheckingIn(true);
    try {
      const { error } = await supabase
        .from("order_items")
        .update({
          checked_in: true,
          checked_in_at: new Date().toISOString(),
          checked_in_by: user.id,
        })
        .eq("id", scannedTicket.id);

      if (error) throw error;

      toast.success("Guest checked in successfully!");
      setScannedTicket({
        ...scannedTicket,
        checked_in: true,
        checked_in_at: new Date().toISOString(),
      });
      setScanResult("already");
    } catch (error) {
      console.error("Check-in error:", error);
      toast.error("Failed to check in guest");
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Ticket Scanner - {eventTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera Section */}
          {cameraActive && (
            <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-white/50 rounded-lg" />
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2"
                onClick={stopCamera}
              >
                Close Camera
              </Button>
            </div>
          )}

          {/* Manual Entry */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Enter ticket code manually"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && lookupTicket(manualCode)}
              />
              <Button onClick={() => lookupTicket(manualCode)} disabled={scanning}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            
            {!cameraActive && (
              <Button
                variant="outline"
                className="w-full"
                onClick={startCamera}
              >
                <Camera className="h-4 w-4 mr-2" />
                Open Camera Scanner
              </Button>
            )}
          </div>

          {/* Scan Result */}
          {scannedTicket && (
            <Card className={`p-4 ${
              scanResult === "success" ? "border-green-500 bg-green-50 dark:bg-green-950" :
              scanResult === "already" ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950" :
              "border-red-500 bg-red-50 dark:bg-red-950"
            }`}>
              <div className="flex items-start gap-3">
                {scanResult === "success" ? (
                  <CheckCircle className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
                ) : scanResult === "already" ? (
                  <CheckCircle className="h-6 w-6 text-yellow-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
                )}
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {scanResult === "success" ? "Valid Ticket" :
                       scanResult === "already" ? "Already Checked In" :
                       "Invalid Ticket"}
                    </span>
                    <Badge variant="outline">{scannedTicket.ticket_type}</Badge>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{scannedTicket.profile?.full_name || scannedTicket.profile?.email || "Guest"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{scannedTicket.event?.date}</span>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">
                      Code: {scannedTicket.ticket_code}
                    </p>
                  </div>

                  {scanResult === "success" && (
                    <Button
                      className="w-full mt-2"
                      onClick={checkInTicket}
                      disabled={checkingIn}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {checkingIn ? "Checking in..." : "Check In Guest"}
                    </Button>
                  )}

                  {scanResult === "already" && scannedTicket.checked_in_at && (
                    <p className="text-xs text-muted-foreground">
                      Checked in at: {new Date(scannedTicket.checked_in_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {scanResult === "error" && !scannedTicket && (
            <Card className="p-4 border-red-500 bg-red-50 dark:bg-red-950">
              <div className="flex items-center gap-3">
                <XCircle className="h-6 w-6 text-red-600" />
                <div>
                  <p className="font-semibold">Ticket Not Found</p>
                  <p className="text-sm text-muted-foreground">
                    This ticket code is not valid for this event.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Scan Another */}
          {scannedTicket && (
            <Button
              variant="outline"
              className="w-full"
              onClick={resetState}
            >
              Scan Another Ticket
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TicketScanner;
