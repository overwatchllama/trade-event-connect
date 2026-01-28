export interface VendorApplication {
  id: string;
  event_id: string;
  vendor_id: string;
  user_id: string;
  application_status: 'pending' | 'approved' | 'rejected' | 'waitlist';
  payment_status: 'unpaid' | 'paid' | 'refunded';
  application_date: string;
  approved_date?: string;
  payment_date?: string;
  table_number?: string;
  requested_tables: number;
  approved_tables?: number;
  notes?: string;
  file_url?: string;
  vendor: {
    id: string;
    business_name: string;
    business_email: string;
    business_phone?: string;
    rating: number;
    total_reviews: number;
  };
  total_shows?: number;
  previous_shows_with_organizer?: number;
  event_table_price?: number;
}

export interface ManageVendorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
}
