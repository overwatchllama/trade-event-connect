import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type EmployeeRole = 
  | 'event_manager'
  | 'warehouse_manager'
  | 'retail_manager'
  | 'orders_manager'
  | 'warehouse_staff'
  | 'retail_staff'
  | 'event_staff';

export interface VendorEmployee {
  id: string;
  vendor_id: string;
  user_id: string | null;
  role: EmployeeRole;
  invite_code: string | null;
  invite_expires_at: string | null;
  status: 'pending' | 'active' | 'inactive';
  hired_at: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export interface EmployeeEventAssignment {
  id: string;
  employee_id: string;
  event_id: string;
  assigned_by: string;
  notes: string | null;
  created_at: string;
  event?: {
    title: string;
    date: string;
    city: string;
    state: string;
  };
}

export interface EmployeeHours {
  id: string;
  employee_id: string;
  event_id: string | null;
  clock_in: string | null;
  clock_out: string | null;
  manual_hours: number | null;
  entry_type: 'clock' | 'manual';
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  event?: {
    title: string;
  };
}

export const useVendorEmployees = (vendorId: string | null) => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<VendorEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = async () => {
    if (!vendorId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('vendor_employees')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for employees with user_id
      const employeesWithProfiles = await Promise.all(
        (data || []).map(async (emp) => {
          if (emp.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email, avatar_url')
              .eq('id', emp.user_id)
              .single();
            return { ...emp, profile } as VendorEmployee;
          }
          return emp as VendorEmployee;
        })
      );

      setEmployees(employeesWithProfiles);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [vendorId]);

  const generateInviteCode = () => {
    // Cryptographically secure, ~124 bits of entropy (24 chars, 32-symbol alphabet).
    // Excludes visually ambiguous characters (0/O, 1/I, L).
    const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    let out = "";
    for (let i = 0; i < bytes.length; i++) {
      out += alphabet[bytes[i] % alphabet.length];
    }
    return out;
  };

  const createInvite = async (role: EmployeeRole, expiresInDays: number = 7) => {
    if (!vendorId || !user) return null;

    const inviteCode = generateInviteCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    try {
      const { data, error } = await supabase
        .from('vendor_employees')
        .insert({
          vendor_id: vendorId,
          role,
          invite_code: inviteCode,
          invite_expires_at: expiresAt.toISOString(),
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      await fetchEmployees();
      toast.success('Invite code created');
      return inviteCode;
    } catch (error) {
      console.error('Error creating invite:', error);
      toast.error('Failed to create invite');
      return null;
    }
  };

  const updateEmployeeRole = async (employeeId: string, role: EmployeeRole) => {
    try {
      const { error } = await supabase
        .from('vendor_employees')
        .update({ role })
        .eq('id', employeeId);

      if (error) throw error;

      await fetchEmployees();
      toast.success('Role updated');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const updateEmployeeStatus = async (employeeId: string, status: 'active' | 'inactive') => {
    try {
      const { error } = await supabase
        .from('vendor_employees')
        .update({ status })
        .eq('id', employeeId);

      if (error) throw error;

      await fetchEmployees();
      toast.success('Status updated');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const removeEmployee = async (employeeId: string) => {
    try {
      const { error } = await supabase
        .from('vendor_employees')
        .delete()
        .eq('id', employeeId);

      if (error) throw error;

      await fetchEmployees();
      toast.success('Employee removed');
    } catch (error) {
      console.error('Error removing employee:', error);
      toast.error('Failed to remove employee');
    }
  };

  const deleteInvite = async (employeeId: string) => {
    try {
      const { error } = await supabase
        .from('vendor_employees')
        .delete()
        .eq('id', employeeId)
        .is('user_id', null);

      if (error) throw error;

      await fetchEmployees();
      toast.success('Invite deleted');
    } catch (error) {
      console.error('Error deleting invite:', error);
      toast.error('Failed to delete invite');
    }
  };

  return {
    employees,
    loading,
    fetchEmployees,
    createInvite,
    updateEmployeeRole,
    updateEmployeeStatus,
    removeEmployee,
    deleteInvite
  };
};

export const useJoinVendor = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const joinWithCode = async (inviteCode: string) => {
    if (!user) {
      toast.error('You must be logged in to join a team');
      return false;
    }

    setLoading(true);
    try {
      // Server-side validation + claim via SECURITY DEFINER RPC.
      // The RPC verifies the submitted invite_code matches a real, unclaimed,
      // unexpired row before assigning it to the caller.
      const { data: claimed, error: claimError } = await (supabase as any)
        .rpc('claim_vendor_invite', { _invite_code: inviteCode.toUpperCase() });

      if (claimError || !claimed) {
        toast.error('Invalid or expired invite code');
        return false;
      }

      const claimedRow: any = Array.isArray(claimed) ? claimed[0] : claimed;
      let vendorName = 'the vendor';
      if (claimedRow?.vendor_id) {
        const { data: vendor } = await supabase
          .from('vendors')
          .select('business_name')
          .eq('id', claimedRow.vendor_id)
          .maybeSingle();
        if (vendor?.business_name) vendorName = vendor.business_name;
      }

      toast.success(`Successfully joined ${vendorName}!`);
      return true;
    } catch (error) {
      console.error('Error joining vendor:', error);
      toast.error('Failed to join team');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { joinWithCode, loading };
};

export const useEmployeeHours = (employeeId: string | null) => {
  const { user } = useAuth();
  const [hours, setHours] = useState<EmployeeHours[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeClockIn, setActiveClockIn] = useState<EmployeeHours | null>(null);

  const fetchHours = async () => {
    if (!employeeId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('vendor_employee_hours')
        .select('*, events(title)')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedHours = (data || []).map(h => ({
        ...h,
        event: h.events as any
      })) as EmployeeHours[];

      setHours(formattedHours);

      // Find active clock-in
      const active = formattedHours.find(h => h.entry_type === 'clock' && h.clock_in && !h.clock_out);
      setActiveClockIn(active || null);
    } catch (error) {
      console.error('Error fetching hours:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHours();
  }, [employeeId]);

  const clockIn = async (eventId?: string) => {
    if (!employeeId) return;

    try {
      const { error } = await supabase
        .from('vendor_employee_hours')
        .insert({
          employee_id: employeeId,
          event_id: eventId || null,
          clock_in: new Date().toISOString(),
          entry_type: 'clock'
        });

      if (error) throw error;

      await fetchHours();
      toast.success('Clocked in');
    } catch (error) {
      console.error('Error clocking in:', error);
      toast.error('Failed to clock in');
    }
  };

  const clockOut = async () => {
    if (!activeClockIn) return;

    try {
      const { error } = await supabase
        .from('vendor_employee_hours')
        .update({ clock_out: new Date().toISOString() })
        .eq('id', activeClockIn.id);

      if (error) throw error;

      await fetchHours();
      toast.success('Clocked out');
    } catch (error) {
      console.error('Error clocking out:', error);
      toast.error('Failed to clock out');
    }
  };

  const addManualHours = async (hoursWorked: number, eventId?: string, notes?: string) => {
    if (!employeeId) return;

    try {
      const { error } = await supabase
        .from('vendor_employee_hours')
        .insert({
          employee_id: employeeId,
          event_id: eventId || null,
          manual_hours: hoursWorked,
          entry_type: 'manual',
          notes
        });

      if (error) throw error;

      await fetchHours();
      toast.success('Hours added');
    } catch (error) {
      console.error('Error adding hours:', error);
      toast.error('Failed to add hours');
    }
  };

  const getTotalHours = (approvedOnly: boolean = false) => {
    return hours.reduce((total, h) => {
      // Skip unapproved hours if approvedOnly is true
      if (approvedOnly && !h.approved_at) return total;
      
      if (h.entry_type === 'manual' && h.manual_hours) {
        return total + h.manual_hours;
      }
      if (h.entry_type === 'clock' && h.clock_in && h.clock_out) {
        const diff = new Date(h.clock_out).getTime() - new Date(h.clock_in).getTime();
        return total + diff / (1000 * 60 * 60);
      }
      return total;
    }, 0);
  };

  const approveHours = async (hoursId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('vendor_employee_hours')
        .update({ 
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', hoursId);

      if (error) throw error;

      await fetchHours();
      toast.success('Hours approved');
    } catch (error) {
      console.error('Error approving hours:', error);
      toast.error('Failed to approve hours');
    }
  };

  const rejectHours = async (hoursId: string) => {
    try {
      const { error } = await supabase
        .from('vendor_employee_hours')
        .delete()
        .eq('id', hoursId);

      if (error) throw error;

      await fetchHours();
      toast.success('Hours entry rejected and removed');
    } catch (error) {
      console.error('Error rejecting hours:', error);
      toast.error('Failed to reject hours');
    }
  };

  const bulkApproveHours = async (hoursIds: string[]) => {
    if (!user || hoursIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('vendor_employee_hours')
        .update({ 
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .in('id', hoursIds);

      if (error) throw error;

      await fetchHours();
      toast.success(`${hoursIds.length} hours entries approved`);
    } catch (error) {
      console.error('Error bulk approving hours:', error);
      toast.error('Failed to approve hours');
    }
  };

  const bulkRejectHours = async (hoursIds: string[]) => {
    if (hoursIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('vendor_employee_hours')
        .delete()
        .in('id', hoursIds);

      if (error) throw error;

      await fetchHours();
      toast.success(`${hoursIds.length} hours entries rejected`);
    } catch (error) {
      console.error('Error bulk rejecting hours:', error);
      toast.error('Failed to reject hours');
    }
  };

  return {
    hours,
    loading,
    activeClockIn,
    clockIn,
    clockOut,
    addManualHours,
    getTotalHours,
    fetchHours,
    approveHours,
    rejectHours,
    bulkApproveHours,
    bulkRejectHours
  };
};
