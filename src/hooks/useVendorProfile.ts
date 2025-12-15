import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Database } from '@/integrations/supabase/types';

type VendorProfile = Database['public']['Tables']['vendors']['Row'];

export const useVendorProfile = () => {
  const { user } = useAuth();
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasVendorRole, setHasVendorRole] = useState(false);

  useEffect(() => {
    if (user) {
      checkVendorStatus();
    } else {
      setLoading(false);
    }
  }, [user]);

  const checkVendorStatus = async () => {
    if (!user) return;

    try {
      // Check if user has vendor role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      const isVendor = profile?.role === 'vendor';
      setHasVendorRole(isVendor);

      if (isVendor) {
        // Fetch or create vendor profile
        const { data: vendor, error: vendorError } = await supabase
          .from('vendors')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (vendorError) throw vendorError;

        if (vendor) {
          setVendorProfile({
            ...vendor,
            social_links: Array.isArray(vendor.social_links) ? vendor.social_links : []
          });
        } else {
          // Create vendor profile if it doesn't exist
          await createVendorProfile();
        }
      }
    } catch (error) {
      console.error('Error checking vendor status:', error);
    } finally {
      setLoading(false);
    }
  };

  const createVendorProfile = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      const { data: vendor, error } = await supabase
        .from('vendors')
        .insert({
          user_id: user.id,
          business_name: profile?.full_name || 'My Business',
          business_email: profile?.email,
        })
        .select()
        .single();

      if (error) throw error;
      setVendorProfile({
        ...vendor,
        social_links: Array.isArray(vendor.social_links) ? vendor.social_links : []
      });
    } catch (error) {
      console.error('Error creating vendor profile:', error);
    }
  };

  const updateVendorProfile = (updatedProfile: VendorProfile) => {
    setVendorProfile(updatedProfile);
  };

  return {
    vendorProfile,
    hasVendorRole,
    loading,
    updateVendorProfile,
    refetch: checkVendorStatus,
  };
};