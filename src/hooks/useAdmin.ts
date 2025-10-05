import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';

export const useAdmin = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // Prefer server-side check to avoid stale client cache
        const { data, error } = await supabase.rpc('is_admin', { user_id: user.id });
        if (!error) {
          setIsAdmin(!!data);
          setLoading(false);
          return;
        }
        console.error('is_admin RPC error:', error);
      } catch (e) {
        console.error('is_admin RPC exception:', e);
      }

      // Fallback to profile role if RPC fails; wait until profile is loaded
      if (profileLoading) return;
      setIsAdmin(profile?.role === 'admin');
      setLoading(false);
    };

    checkAdmin();
  }, [user, profile?.role, profileLoading]);

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