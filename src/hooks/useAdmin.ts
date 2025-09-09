import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';

export const useAdmin = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !profile) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setIsAdmin(profile.role === 'admin');
    setLoading(false);
  }, [user, profile]);

  const promoteUser = async (userId: string, newRole: 'user' | 'vendor' | 'organizer' | 'venue' | 'admin') => {
    if (!isAdmin) throw new Error('Unauthorized');

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (!error) {
      // Log the admin action
      await supabase
        .from('admin_actions')
        .insert({
          admin_id: user!.id,
          target_user_id: userId,
          action: 'role_change',
          details: { new_role: newRole }
        });
    }

    return { error };
  };

  const blockUser = async (userId: string, reason: string) => {
    if (!isAdmin) throw new Error('Unauthorized');

    const { error } = await supabase
      .from('profiles')
      .update({
        status: 'blocked',
        blocked_at: new Date().toISOString(),
        blocked_by: user!.id,
        block_reason: reason
      })
      .eq('id', userId);

    if (!error) {
      // Log the admin action
      await supabase
        .from('admin_actions')
        .insert({
          admin_id: user!.id,
          target_user_id: userId,
          action: 'user_blocked',
          details: { reason }
        });
    }

    return { error };
  };

  const unblockUser = async (userId: string) => {
    if (!isAdmin) throw new Error('Unauthorized');

    const { error } = await supabase
      .from('profiles')
      .update({
        status: 'active',
        blocked_at: null,
        blocked_by: null,
        block_reason: null
      })
      .eq('id', userId);

    if (!error) {
      // Log the admin action
      await supabase
        .from('admin_actions')
        .insert({
          admin_id: user!.id,
          target_user_id: userId,
          action: 'user_unblocked',
          details: {}
        });
    }

    return { error };
  };

  const approveRoleRequest = async (requestId: string, approved: boolean, adminNotes?: string) => {
    if (!isAdmin) throw new Error('Unauthorized');

    const { error } = await supabase
      .from('role_requests')
      .update({
        status: approved ? 'approved' : 'rejected',
        admin_notes: adminNotes || null
      })
      .eq('id', requestId);

    return { error };
  };

  return {
    isAdmin,
    loading,
    promoteUser,
    blockUser,
    unblockUser,
    approveRoleRequest
  };
};