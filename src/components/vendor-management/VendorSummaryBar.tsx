import { CheckCircle, Clock, DollarSign, XCircle, Users } from "lucide-react";

interface VendorSummaryBarProps {
  total: number;
  pending: number;
  waitlist: number;
  approved: number;
  paid: number;
  unpaid: number;
  rejected: number;
}

export const VendorSummaryBar = ({
  total,
  pending,
  waitlist,
  approved,
  paid,
  unpaid,
  rejected,
}: VendorSummaryBarProps) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 p-3 bg-muted/30 rounded-lg border">
      <div className="flex items-center gap-2 p-2 rounded-md bg-background">
        <Users className="w-4 h-4 text-muted-foreground" />
        <div className="flex flex-col">
          <span className="text-lg font-bold">{total}</span>
          <span className="text-xs text-muted-foreground">Total</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 p-2 rounded-md bg-yellow-50 dark:bg-yellow-950/30">
        <Clock className="w-4 h-4 text-yellow-600" />
        <div className="flex flex-col">
          <span className="text-lg font-bold text-yellow-700 dark:text-yellow-400">{pending}</span>
          <span className="text-xs text-yellow-600 dark:text-yellow-500">Pending</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 p-2 rounded-md bg-blue-50 dark:bg-blue-950/30">
        <Clock className="w-4 h-4 text-blue-600" />
        <div className="flex flex-col">
          <span className="text-lg font-bold text-blue-700 dark:text-blue-400">{waitlist}</span>
          <span className="text-xs text-blue-600 dark:text-blue-500">Waitlist</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 p-2 rounded-md bg-green-50 dark:bg-green-950/30">
        <CheckCircle className="w-4 h-4 text-green-600" />
        <div className="flex flex-col">
          <span className="text-lg font-bold text-green-700 dark:text-green-400">{approved}</span>
          <span className="text-xs text-green-600 dark:text-green-500">Approved</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 p-2 rounded-md bg-emerald-50 dark:bg-emerald-950/30">
        <DollarSign className="w-4 h-4 text-emerald-600" />
        <div className="flex flex-col">
          <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{paid}</span>
          <span className="text-xs text-emerald-600 dark:text-emerald-500">Paid</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 p-2 rounded-md bg-orange-50 dark:bg-orange-950/30">
        <XCircle className="w-4 h-4 text-orange-600" />
        <div className="flex flex-col">
          <span className="text-lg font-bold text-orange-700 dark:text-orange-400">{unpaid}</span>
          <span className="text-xs text-orange-600 dark:text-orange-500">Unpaid</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 p-2 rounded-md bg-red-50 dark:bg-red-950/30">
        <XCircle className="w-4 h-4 text-red-600" />
        <div className="flex flex-col">
          <span className="text-lg font-bold text-red-700 dark:text-red-400">{rejected}</span>
          <span className="text-xs text-red-600 dark:text-red-500">Rejected</span>
        </div>
      </div>
    </div>
  );
};
