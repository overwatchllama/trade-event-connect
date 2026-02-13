import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import Header from '@/components/Header';
import { VendorGridCard } from '@/components/VendorGridCard';
import EditVendorProfile from '@/components/EditVendorProfile';
import { InviteVendorToEventDialog } from '@/components/InviteVendorToEventDialog';
import { OrganizerVendorNotes } from '@/components/OrganizerVendorNotes';
import { EventVendorsOverview } from '@/components/vendor-management/EventVendorsOverview';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useVendorProfile } from '@/hooks/useVendorProfile';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { Search, Store, Mail, MapPin, Star, Users, Edit, Heart, Send, X, Calendar, Ban, CheckCircle, Clock, Settings2, List } from 'lucide-react';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type VendorRow = Database['public']['Tables']['vendors']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

interface VendorProfile extends VendorRow {
  profiles: Pick<ProfileRow, 'id' | 'full_name' | 'email' | 'avatar_url' | 'role' | 'location_state'>;
}

const Vendors = () => {
  const { user } = useAuth();
  const { hasVendorRole } = useVendorProfile();
  const { isVendor, isOrganizer } = useUserRoles();
  const { isSubscribed, subscribe, unsubscribe, getFavoriteVendorIds, refetch: refetchSubscriptions, loading: subscriptionsLoading } = useSubscriptions();
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [myVendorProfile, setMyVendorProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedVendorType, setSelectedVendorType] = useState<string>('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addingRole, setAddingRole] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedVendorForInvite, setSelectedVendorForInvite] = useState<VendorProfile | null>(null);
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [eventVendors, setEventVendors] = useState<{
    approved: { vendor: VendorProfile; eventTitle: string; status: string }[];
    pending: { vendor: VendorProfile; eventTitle: string }[];
    rejected: { vendor: VendorProfile; eventTitle: string }[];
  }>({ approved: [], pending: [], rejected: [] });
  const [vendorNotesDialogOpen, setVendorNotesDialogOpen] = useState(false);
  const [selectedVendorForNotes, setSelectedVendorForNotes] = useState<{ id: string; name: string } | null>(null);
  const [organizerNotes, setOrganizerNotes] = useState<Map<string, {
    is_favorite: boolean;
    is_blacklisted: boolean;
    private_rating: number | null;
    custom_list: string | null;
  }>>(new Map());
  // Get favorite vendor IDs directly from subscriptions
  const favoriteVendorIds = getFavoriteVendorIds();

  // US States list
  const usStates = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
    'Wisconsin', 'Wyoming'
  ];

  useEffect(() => {
    fetchVendors();
    if (isOrganizer && user) {
      fetchEventVendors();
      fetchOrganizerNotes();
    }
  }, [user, isVendor, isOrganizer]);

  const fetchOrganizerNotes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('organizer_vendor_notes')
        .select('vendor_id, is_favorite, is_blacklisted, private_rating, custom_list')
        .eq('organizer_id', user.id);

      if (error) throw error;

      const notesMap = new Map<string, {
        is_favorite: boolean;
        is_blacklisted: boolean;
        private_rating: number | null;
        custom_list: string | null;
      }>();

      data?.forEach((note) => {
        notesMap.set(note.vendor_id, {
          is_favorite: note.is_favorite || false,
          is_blacklisted: note.is_blacklisted || false,
          private_rating: note.private_rating,
          custom_list: note.custom_list,
        });
      });

      setOrganizerNotes(notesMap);
    } catch (error) {
      console.error('Error fetching organizer notes:', error);
    }
  };

  const handleOpenVendorNotes = (vendorId: string, vendorName: string) => {
    setSelectedVendorForNotes({ id: vendorId, name: vendorName });
    setVendorNotesDialogOpen(true);
  };

  const getVendorNotesBadges = (vendorId: string) => {
    const notes = organizerNotes.get(vendorId);
    if (!notes) return null;

    return (
      <div className="flex gap-1 flex-wrap mt-1">
        {notes.is_favorite && (
          <Badge className="bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200 text-xs py-0">
            <Heart className="w-2 h-2 mr-0.5 fill-current" />
            Fav
          </Badge>
        )}
        {notes.is_blacklisted && (
          <Badge variant="destructive" className="text-xs py-0">
            <Ban className="w-2 h-2 mr-0.5" />
            Blocked
          </Badge>
        )}
        {notes.private_rating && (
          <Badge variant="secondary" className="text-xs py-0">
            <Star className="w-2 h-2 mr-0.5 fill-yellow-400 text-yellow-400" />
            {notes.private_rating}
          </Badge>
        )}
        {notes.custom_list && (
          <Badge variant="outline" className="text-xs py-0">
            {notes.custom_list}
          </Badge>
        )}
      </div>
    );
  };

  const fetchVendors = async () => {
    try {
      // First get vendors
      const { data: vendorsData, error: vendorsError } = await supabase
        .from('vendors')
        .select('*')
        .order('created_at', { ascending: false });

      if (vendorsError) throw vendorsError;

      // Then get profiles for the vendor users
      const userIds = vendorsData?.map(v => v.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role, location_state')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combine the data
      const transformedData = vendorsData?.map(vendor => {
        const profile = profilesData?.find(p => p.id === vendor.user_id);
        return {
          ...vendor,
          profiles: profile
        };
      }).filter(vendor => vendor.profiles) || [];
      
      // Transform the data to ensure social_links is an array
      const transformedVendorsWithSocialLinks = transformedData.map(vendor => ({
        ...vendor,
        social_links: Array.isArray(vendor.social_links) ? vendor.social_links : []
      }));
      
      // Always include all vendors in the list; also surface "my" vendor profile if present
      const currentUserProfile = user?.id 
        ? transformedVendorsWithSocialLinks.find(vendor => vendor.user_id === user.id)
        : null;

      setMyVendorProfile(currentUserProfile || null);
      setVendors(transformedVendorsWithSocialLinks);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast.error('Failed to load vendors. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchEventVendors = async () => {
    if (!user) return;

    try {
      // Get all events organized by this user
      const { data: myEvents, error: eventsError } = await supabase
        .from('events')
        .select('id, title')
        .eq('organizer_id', user.id);

      if (eventsError) throw eventsError;
      if (!myEvents || myEvents.length === 0) {
        setEventVendors({ approved: [], pending: [], rejected: [] });
        return;
      }

      const eventIds = myEvents.map(e => e.id);

      // Get all vendor applications for these events
      const { data: applications, error: appsError } = await supabase
        .from('vendor_applications')
        .select(`
          id,
          event_id,
          vendor_id,
          application_status,
          payment_status
        `)
        .in('event_id', eventIds);

      if (appsError) throw appsError;

      // Get vendor IDs from applications
      const vendorIds = [...new Set(applications?.map(a => a.vendor_id) || [])];
      
      if (vendorIds.length === 0) {
        setEventVendors({ approved: [], pending: [], rejected: [] });
        return;
      }

      // Fetch vendor details
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .in('id', vendorIds);

      if (vendorError) throw vendorError;

      // Fetch profiles for vendors
      const userIds = vendorData?.map(v => v.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role, location_state')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Create vendor profile map
      const vendorProfileMap = new Map<string, VendorProfile>();
      vendorData?.forEach(vendor => {
        const profile = profilesData?.find(p => p.id === vendor.user_id);
        if (profile) {
          vendorProfileMap.set(vendor.id, {
            ...vendor,
            social_links: Array.isArray(vendor.social_links) ? vendor.social_links : [],
            profiles: profile
          });
        }
      });

      // Create event title map
      const eventTitleMap = new Map<string, string>();
      myEvents.forEach(e => eventTitleMap.set(e.id, e.title));

      // Categorize applications
      const approved: { vendor: VendorProfile; eventTitle: string; status: string }[] = [];
      const pending: { vendor: VendorProfile; eventTitle: string }[] = [];
      const rejected: { vendor: VendorProfile; eventTitle: string }[] = [];

      applications?.forEach(app => {
        const vendor = vendorProfileMap.get(app.vendor_id);
        const eventTitle = eventTitleMap.get(app.event_id) || 'Unknown Event';
        
        if (!vendor) return;

        if (app.application_status === 'approved') {
          approved.push({ 
            vendor, 
            eventTitle, 
            status: app.payment_status === 'paid' ? 'Paid' : 'Unpaid' 
          });
        } else if (app.application_status === 'pending' || app.application_status === 'waitlist') {
          pending.push({ vendor, eventTitle });
        } else if (app.application_status === 'rejected') {
          rejected.push({ vendor, eventTitle });
        }
      });

      setEventVendors({ approved, pending, rejected });
    } catch (error) {
      console.error('Error fetching event vendors:', error);
    }
  };

  const handleToggleFavorite = async (vendorId: string) => {
    if (!user) {
      toast.error('Please sign in to favorite vendors');
      return;
    }

    const isFav = favoriteVendorIds.includes(vendorId);
    
    try {
      if (isFav) {
        await unsubscribe('favorite_vendor', vendorId);
      } else {
        await subscribe('favorite_vendor', vendorId);
      }
      // Subscriptions will auto-refresh via useSubscriptions hook
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleInviteVendor = (vendor: VendorProfile) => {
    setSelectedVendorForInvite(vendor);
    setInviteDialogOpen(true);
  };

  const handleBulkInvite = () => {
    setSelectedVendorForInvite(null);
    setInviteDialogOpen(true);
  };

  const handleSelectVendor = (vendorId: string, selected: boolean) => {
    if (selected) {
      setSelectedVendorIds(prev => [...prev, vendorId]);
    } else {
      setSelectedVendorIds(prev => prev.filter(id => id !== vendorId));
    }
  };

  const handleSelectAll = () => {
    if (selectedVendorIds.length === filteredVendors.length) {
      setSelectedVendorIds([]);
    } else {
      setSelectedVendorIds(filteredVendors.map(v => v.id));
    }
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedVendorIds([]);
    }
  };

  const handleProfileUpdate = async (updatedProfile: VendorProfile) => {
    setMyVendorProfile(updatedProfile);
    await fetchVendors(); // Refetch to update the list
    toast.success('Profile updated successfully!');
  };

  const handleBecomeVendor = async () => {
    if (!user) return;

    if (isVendor) {
      // If already a vendor, check if profile exists
      if (myVendorProfile) {
        setEditDialogOpen(true);
      } else {
        // Check if vendor profile exists in database
        setAddingRole(true);
        try {
          const { data: existingVendor, error: fetchError } = await supabase
            .from('vendors')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (fetchError) throw fetchError;

          if (existingVendor) {
            // Profile exists, just fetch the full data and open dialog
            await fetchVendors();
            setEditDialogOpen(true);
          } else {
            // Create new vendor profile
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', user.id)
              .single();

            const { error: insertError } = await supabase
              .from('vendors')
              .insert({
                user_id: user.id,
                business_name: profileData?.full_name || 'My Business',
                business_email: profileData?.email || user.email
              });

            if (insertError) throw insertError;

            toast.success('Vendor profile created!');
            await fetchVendors();
            setEditDialogOpen(true);
          }
        } catch (error) {
          console.error('Error with vendor profile:', error);
          toast.error('Failed to open vendor profile. Please try again.');
        } finally {
          setAddingRole(false);
        }
      }
      return;
    }

    // Add vendor role
    setAddingRole(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: user.id, role: 'vendor' });

      if (error) throw error;

      toast.success('Vendor role added! Refreshing...');
      window.location.reload();
    } catch (error) {
      console.error('Error adding vendor role:', error);
      toast.error('Failed to add vendor role. Please try again.');
    } finally {
      setAddingRole(false);
    }
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.profiles?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.profiles?.location_state?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.business_address?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesState = !selectedState || selectedState === 'all' || vendor.profiles?.location_state === selectedState;
    
    const normalizedVendorTypes = vendor.vendor_types?.map(t => t.toLowerCase().replace(/\s+/g, '_')) || [];
    const matchesVendorType = !selectedVendorType || selectedVendorType === 'all' || 
      normalizedVendorTypes.includes(selectedVendorType);
    
    return matchesSearch && matchesState && matchesVendorType;
  });

  // Get favorite vendors
  const favoriteVendors = vendors.filter(vendor => favoriteVendorIds.includes(vendor.id));

  // Get selected vendors for bulk invite
  const selectedVendorsForInvite = selectedVendorForInvite 
    ? [{ id: selectedVendorForInvite.id, business_name: selectedVendorForInvite.business_name, user_id: selectedVendorForInvite.user_id }]
    : vendors.filter(v => selectedVendorIds.includes(v.id)).map(v => ({ id: v.id, business_name: v.business_name, user_id: v.user_id }));

  // Get unique vendor types for filter - normalize to avoid duplicates
  const availableVendorTypes = Array.from(new Set(
    vendors
      .flatMap(v => v.vendor_types || [])
      .filter(Boolean)
      .map(type => type.toLowerCase().replace(/\s+/g, '_')) // Normalize to snake_case
  )).sort();

  const formatVendorType = (type: string) => {
    // Skip "show_vendor" as it's redundant with "show" event type
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'V';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Trading Card Vendors
              </h1>
              <p className="text-lg text-muted-foreground">
                Connect with verified vendors offering trading cards, collectibles, and more.
              </p>
            </div>
            
            {/* Become/Edit Vendor Button */}
            {user && (
              <Button 
                variant="hero" 
                size="lg"
                onClick={handleBecomeVendor}
                disabled={addingRole}
              >
                {isVendor ? 'Edit Vendor Profile' : '+ Become a Vendor'}
              </Button>
            )}
          </div>

        {/* Conditional tabs based on user type */}
        {user ? (
          <Tabs defaultValue={hasVendorRole ? "others" : (isOrganizer ? "event-vendors" : "all")} className="w-full">
            <TabsList className={`grid w-full ${
              isOrganizer ? (hasVendorRole ? 'grid-cols-5' : 'grid-cols-4') :
              hasVendorRole ? 'grid-cols-3' : 
              'grid-cols-2'
            }`}>
              {hasVendorRole && (
                <TabsTrigger value="profile">My Vendor Profile</TabsTrigger>
              )}
              <TabsTrigger value={hasVendorRole ? "others" : "all"}>
                {hasVendorRole ? "Other Vendors" : "All Vendors"}
              </TabsTrigger>
              {isOrganizer ? (
                <>
                  <TabsTrigger value="event-vendors" className="gap-2">
                    <Calendar className="w-4 h-4" />
                    Manage Vendors
                  </TabsTrigger>
                  <TabsTrigger value="manage-sponsors" className="gap-2">
                    Manage Sponsors
                  </TabsTrigger>
                  <TabsTrigger value="manage-staff" className="gap-2">
                    Manage Staff
                  </TabsTrigger>
                </>
              ) : (
                <TabsTrigger value="favorites" className="gap-2">
                  <Heart className="w-4 h-4" />
                  Favorites ({favoriteVendors.length})
                </TabsTrigger>
              )}
            </TabsList>
            
            {hasVendorRole && (
              <TabsContent value="profile">
                {/* My Vendor Profile Tab */}
                {loading ? (
                  <Card>
                    <CardHeader className="pb-4">
                      <div className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[150px]" />
                          <Skeleton className="h-3 w-[100px]" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-10 w-full" />
                    </CardContent>
                  </Card>
                ) : myVendorProfile ? (
                  <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={myVendorProfile.avatar_url || myVendorProfile.profiles?.avatar_url || ''} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                              {getInitials(myVendorProfile.profiles?.full_name || myVendorProfile.business_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-2xl">
                              {myVendorProfile.business_name}
                            </CardTitle>
                            <div className="flex items-center text-sm text-muted-foreground mb-2">
                              <Mail className="h-3 w-3 mr-1" />
                              {myVendorProfile.profiles?.email}
                            </div>
                            {myVendorProfile.verified && (
                              <Badge variant="default" className="bg-primary text-primary-foreground">
                                ✓ Verified Vendor
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Profile
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {myVendorProfile.business_description && (
                        <p className="text-muted-foreground">{myVendorProfile.business_description}</p>
                      )}
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mr-2" />
                        {myVendorProfile.business_address || 'Available nationwide'}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Star className="w-4 h-4 text-muted-foreground mr-1" />
                          {myVendorProfile.rating && myVendorProfile.total_reviews ? (
                            <>Rating: {myVendorProfile.rating}/5 ({myVendorProfile.total_reviews} reviews)</>
                          ) : (
                            'Not yet reviewed'
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Member since {new Date(myVendorProfile.created_at).getFullYear()}
                        </div>
                      </div>
                      {myVendorProfile.specialties && myVendorProfile.specialties.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-foreground">Specialties</h4>
                          <div className="flex flex-wrap gap-2">
                            {myVendorProfile.specialties.map((specialty, index) => (
                              <Badge key={index} variant="outline">
                                {specialty}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {myVendorProfile.vendor_types && myVendorProfile.vendor_types.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-foreground">Vendor Types</h4>
                          <div className="flex flex-wrap gap-2">
                            {myVendorProfile.vendor_types.map((type, index) => (
                              <Badge key={index} variant="default" className="text-xs">
                                {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-12">
                    <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Vendor Profile Not Found
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      There seems to be an issue with your vendor profile. Please contact support.
                    </p>
                  </div>
                )}
              </TabsContent>
            )}
            
            <TabsContent value={hasVendorRole ? "others" : "all"}>
              {/* Search and Filter Bar */}
              <div className="mb-6 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search vendors by name, email, state, or zip..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedVendorType} onValueChange={setSelectedVendorType}>
                  <SelectTrigger className="w-full md:w-[200px] bg-background">
                    <SelectValue placeholder="Vendor Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="all">All Types</SelectItem>
                    {availableVendorTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {formatVendorType(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger className="w-full md:w-[200px] bg-background">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="all">All States</SelectItem>
                    {usStates.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Organizer Actions */}
              {isOrganizer && (
                <div className="mb-4 flex items-center gap-4 flex-wrap">
                  <Button
                    variant={selectionMode ? "default" : "outline"}
                    size="sm"
                    onClick={toggleSelectionMode}
                  >
                    {selectionMode ? <X className="w-4 h-4 mr-2" /> : <Users className="w-4 h-4 mr-2" />}
                    {selectionMode ? 'Cancel Selection' : 'Select Multiple'}
                  </Button>
                  {selectionMode && (
                    <>
                      <Button variant="outline" size="sm" onClick={handleSelectAll}>
                        {selectedVendorIds.length === filteredVendors.length ? 'Deselect All' : 'Select All'}
                      </Button>
                      <Button
                        size="sm"
                        disabled={selectedVendorIds.length === 0}
                        onClick={handleBulkInvite}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Invite Selected ({selectedVendorIds.length})
                      </Button>
                    </>
                  )}
                </div>
              )}
              
              {/* Vendors Grid */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-4">
                        <div className="flex items-center space-x-4">
                          <Skeleton className="h-12 w-12 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-[150px]" />
                            <Skeleton className="h-3 w-[100px]" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-10 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredVendors.length === 0 ? (
                <div className="text-center py-12">
                  <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {searchTerm ? 'No vendors found' : 'No vendors yet'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm 
                      ? 'Try adjusting your search terms.'
                      : hasVendorRole 
                        ? 'You are currently the only vendor in our marketplace!'
                        : 'Be the first vendor to join our marketplace!'
                    }
                  </p>
                  {searchTerm && (
                    <Button variant="outline" onClick={() => setSearchTerm('')}>
                      Clear Search
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredVendors.map((vendor) => (
                    <VendorGridCard 
                      key={vendor.id} 
                      vendor={vendor} 
                      getInitials={getInitials}
                      currentUserId={user?.id}
                      onEditClick={() => setEditDialogOpen(true)}
                      isFavorite={favoriteVendorIds.includes(vendor.id)}
                      onToggleFavorite={handleToggleFavorite}
                      isOrganizer={isOrganizer}
                      isVendor={isVendor}
                      onInviteClick={handleInviteVendor}
                      selectable={selectionMode}
                      isSelected={selectedVendorIds.includes(vendor.id)}
                      onSelectChange={handleSelectVendor}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            
            {/* Favorites Tab - Non-organizers only */}
            {!isOrganizer && (
              <TabsContent value="favorites">
                {favoriteVendors.length === 0 ? (
                  <div className="text-center py-12">
                    <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">No Favorite Vendors</h3>
                    <p className="text-muted-foreground">Click the heart icon on vendor cards to add them to your favorites.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favoriteVendors.map((vendor) => (
                      <VendorGridCard 
                        key={vendor.id} 
                        vendor={vendor} 
                        getInitials={getInitials}
                        currentUserId={user?.id}
                        isFavorite={true}
                        onToggleFavorite={handleToggleFavorite}
                        isOrganizer={isOrganizer}
                        isVendor={isVendor}
                        onInviteClick={handleInviteVendor}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            )}

            {/* Event Vendors Tab - Organizers Only */}
            {isOrganizer && (
              <TabsContent value="event-vendors">
                <EventVendorsOverview 
                  eventVendors={eventVendors}
                  organizerNotes={organizerNotes}
                  getVendorNotesBadges={getVendorNotesBadges}
                  getInitials={getInitials}
                  onOpenVendorNotes={handleOpenVendorNotes}
                />
              </TabsContent>
            )}

            {/* Manage Sponsors Tab - Organizers Only */}
            {isOrganizer && (
              <TabsContent value="manage-sponsors">
                <div className="text-center py-12">
                  <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">Manage Sponsors</h3>
                  <p className="text-muted-foreground">View and manage sponsor applications across your events.</p>
                </div>
              </TabsContent>
            )}

            {/* Manage Staff Tab - Organizers Only */}
            {isOrganizer && (
              <TabsContent value="manage-staff">
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">Manage Staff</h3>
                  <p className="text-muted-foreground">View and manage staff assignments across your events.</p>
                </div>
              </TabsContent>
            )}
          </Tabs>
        ) : (
          /* Search and Filters for non-logged-in users */
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search vendors by name, email, state, or zip..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedVendorType} onValueChange={setSelectedVendorType}>
              <SelectTrigger className="w-full md:w-[200px] bg-background">
                <SelectValue placeholder="Vendor Type" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">All Types</SelectItem>
                {availableVendorTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {formatVendorType(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="w-full md:w-[200px] bg-background">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">All States</SelectItem>
                {usStates.map(state => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        </div>

        {/* Vendors Grid - Only show for non-logged-in users (logged-in users have tabs) */}
        {!user && (
          loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[150px]" />
                        <Skeleton className="h-3 w-[100px]" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="text-center py-12">
              <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {searchTerm ? 'No vendors found' : 'No vendors yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? 'Try adjusting your search terms or browse all vendors.'
                  : 'Be the first vendor to join our marketplace!'
                }
              </p>
              {searchTerm && (
                <Button variant="outline" onClick={() => setSearchTerm('')}>
                  Clear Search
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVendors.map((vendor) => (
                <VendorGridCard 
                  key={vendor.id} 
                  vendor={vendor} 
                  getInitials={getInitials}
                  currentUserId={user?.id}
                  onEditClick={() => setEditDialogOpen(true)}
                  isFavorite={favoriteVendorIds.includes(vendor.id)}
                  onToggleFavorite={handleToggleFavorite}
                  isOrganizer={isOrganizer}
                  isVendor={isVendor}
                  onInviteClick={handleInviteVendor}
                />
              ))}
            </div>
          )
        )}

      </main>

      {/* Edit Profile Dialog */}
      {myVendorProfile && (
        <EditVendorProfile
          vendor={myVendorProfile as any}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onUpdate={(vendor) => handleProfileUpdate(vendor as any)}
        />
      )}

      {/* Invite Vendor Dialog */}
      <InviteVendorToEventDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        vendors={selectedVendorsForInvite}
        preSelectedVendor={selectedVendorForInvite}
      />

      {/* Organizer Vendor Notes Dialog */}
      {selectedVendorForNotes && (
        <OrganizerVendorNotes
          open={vendorNotesDialogOpen}
          onOpenChange={setVendorNotesDialogOpen}
          vendorId={selectedVendorForNotes.id}
          vendorName={selectedVendorForNotes.name}
          onUpdate={fetchOrganizerNotes}
        />
      )}
    </div>
  );
};

export default Vendors;