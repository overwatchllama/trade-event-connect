import { QRCodeSVG } from "qrcode.react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock, Ticket } from "lucide-react";

interface TicketQRCodeProps {
  ticketCode: string;
  qrData: string;
  eventTitle: string;
  eventDate: string;
  eventTime?: string;
  eventVenue: string;
  eventCity: string;
  eventState: string;
  ticketType?: string;
  ticketHolder?: string;
  checkedIn?: boolean;
}

const TicketQRCode = ({
  ticketCode,
  qrData,
  eventTitle,
  eventDate,
  eventTime,
  eventVenue,
  eventCity,
  eventState,
  ticketType = "General Admission",
  ticketHolder,
  checkedIn = false,
}: TicketQRCodeProps) => {
  return (
    <Card className="overflow-hidden max-w-sm mx-auto" id={`ticket-${ticketCode}`}>
      {/* Header */}
      <div className="bg-gradient-primary p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Ticket className="h-5 w-5 text-primary-foreground" />
          <span className="text-sm font-medium text-primary-foreground uppercase tracking-wider">
            Event Ticket
          </span>
        </div>
        <h3 className="text-xl font-bold text-primary-foreground">{eventTitle}</h3>
      </div>

      {/* QR Code Section */}
      <div className="p-6 flex flex-col items-center bg-background">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <QRCodeSVG
            value={qrData}
            size={180}
            level="H"
            includeMargin={true}
          />
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Ticket Code</p>
          <p className="font-mono font-bold text-lg">{ticketCode}</p>
        </div>

        {checkedIn && (
          <Badge variant="default" className="mt-2 bg-green-500">
            ✓ Checked In
          </Badge>
        )}
      </div>

      {/* Details Section */}
      <div className="border-t border-dashed p-4 space-y-3 bg-muted/30">
        <div className="flex items-center gap-3 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{eventDate}{eventTime && ` at ${eventTime}`}</span>
        </div>
        
        <div className="flex items-center gap-3 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>{eventVenue}, {eventCity}, {eventState}</span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Ticket Type</p>
            <p className="font-medium">{ticketType}</p>
          </div>
          {ticketHolder && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Ticket Holder</p>
              <p className="font-medium">{ticketHolder}</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-muted/50 px-4 py-2 text-center">
        <p className="text-xs text-muted-foreground">
          Present this QR code at the entrance for scanning
        </p>
      </div>
    </Card>
  );
};

export default TicketQRCode;
