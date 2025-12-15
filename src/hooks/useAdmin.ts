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
          console.debug('is_admin RPC result', { data });
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

  const addUserRole = async (userId: string, role: 'user' | 'vendor' | 'organizer' | 'venue' | 'admin') => {
    if (!isAdmin) throw new Error('Unauthorized');

    const { data, error } = await supabase.rpc('admin_add_user_role', {
      target_user_id: userId,
      user_role: role
    });

    return { error };
  };

  const removeUserRole = async (userId: string, role: 'user' | 'vendor' | 'organizer' | 'venue' | 'admin') => {
    if (!isAdmin) throw new Error('Unauthorized');

    const { data, error } = await supabase.rpc('admin_remove_user_role', {
      target_user_id: userId,
      user_role: role
    });

    return { error };
  };

  const blockUser = async (userId: string, reason: string) => {
    if (!isAdmin) throw new Error('Unauthorized');

    const { data, error } = await supabase.rpc('admin_block_user', {
      target_user_id: userId,
      block_reason: reason
    });

    return { error };
  };

  const unblockUser = async (userId: string) => {
    if (!isAdmin) throw new Error('Unauthorized');

    const { data, error } = await supabase.rpc('admin_unblock_user', {
      target_user_id: userId
    });

    return { error };
  };

  const approveRoleRequest = async (requestId: string, approved: boolean, adminNotes?: string) => {
    if (!isAdmin) throw new Error('Unauthorized');

    const { data, error } = await supabase.rpc('admin_approve_role_request', {
      request_id: requestId,
      is_approved: approved,
      admin_notes: adminNotes || null
    });

    return { error };
  };

  return {
    isAdmin,
    loading,
    addUserRole,
    removeUserRole,
    blockUser,
    unblockUser,
    approveRoleRequest
  };
};