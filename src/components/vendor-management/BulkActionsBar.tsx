import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, XCircle, Clock, Bell, Mail, X } from "lucide-react";

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: (checked: boolean) => void;
  allSelected: boolean;
  onBulkApprove: () => void;
  onBulkReject: () => void;
  onBulkWaitlist: () => void;
  onBulkSendInvoice: () => void;
  onBulkEmailInvoice: () => void;
  onClearSelection: () => void;
  canApprove: boolean;
  canSendInvoice: boolean;
  isProcessing: boolean;
}

export const BulkActionsBar = ({
  selectedCount,
  totalCount,
  onSelectAll,
  allSelected,
  onBulkApprove,
  onBulkReject,
  onBulkWaitlist,
  onBulkSendInvoice,
  onBulkEmailInvoice,
  onClearSelection,
  canApprove,
  canSendInvoice,
  isProcessing,
}: BulkActionsBarProps) => {
  if (totalCount === 0) return null;

  return (
    <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg mb-4 flex-wrap">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={allSelected}
          onCheckedChange={onSelectAll}
          aria-label="Select all"
        />
        <span className="text-sm font-medium">
          {selectedCount > 0 ? `${selectedCount} selected` : "Select all"}
        </span>
      </div>

      {selectedCount > 0 && (
        <>
          <div className="h-4 w-px bg-border" />
          
          <div className="flex items-center gap-2 flex-wrap">
            {canApprove && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={onBulkApprove}
                  disabled={isProcessing}
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Approve ({selectedCount})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onBulkWaitlist}
                  disabled={isProcessing}
                >
                  <Clock className="w-3 h-3 mr-1" />
                  Waitlist
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={onBulkReject}
                  disabled={isProcessing}
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  Reject
                </Button>
              </>
            )}
            
            {canSendInvoice && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={onBulkSendInvoice}
                  disabled={isProcessing}
                >
                  <Bell className="w-3 h-3 mr-1" />
                  Send Invoice ({selectedCount})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onBulkEmailInvoice}
                  disabled={isProcessing}
                >
                  <Mail className="w-3 h-3 mr-1" />
                  Email Invoice
                </Button>
              </>
            )}
            
            <Button
              size="sm"
              variant="ghost"
              onClick={onClearSelection}
              disabled={isProcessing}
            >
              <X className="w-3 h-3 mr-1" />
              Clear
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
