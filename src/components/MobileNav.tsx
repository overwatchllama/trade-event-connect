import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, User, LogOut, Settings, Store, Bell, Shield, PenTool, Award, Users, Ticket, Megaphone, Library, Home, Calendar, ShoppingBag, ScanLine } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useVendorProfile } from "@/hooks/useVendorProfile";
import { useAdmin } from "@/hooks/useAdmin";
import { useSubscription } from "@/hooks/useSubscription";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

const MobileNav = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { hasVendorRole } = useVendorProfile();
  const { isAdmin } = useAdmin();
  const { subscription_tier } = useSubscription();
  const { isOrganizer, isVendor, isVenue } = useUserRoles();

  const { data: isEmployee } = useQuery({
    queryKey: ['is-employee', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from('vendor_employees')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      return !!data;
    },
    enabled: !!user?.id,
  });

  const { data: hasSponsorProfile } = useQuery({
    queryKey: ['has-sponsor', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from('sponsors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user?.id,
  });

  const handleNavigate = (path: string, opts?: { withReferrer?: boolean }) => {
    if (opts?.withReferrer) {
      navigate(path, { state: { from: location.pathname + location.search } });
    } else {
      navigate(path);
    }
    setOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinkClass = (path: string) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
      isActive(path)
        ? 'bg-primary/10 text-primary'
        : 'text-foreground hover:bg-muted'
    }`;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden h-9 w-9">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0 overflow-y-auto">
        <SheetHeader className="p-4 pb-2">
          <SheetTitle className="text-left text-lg">Menu</SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col px-2 pb-4">
          {/* Main Navigation */}
          <div className="space-y-1">
            <button onClick={() => handleNavigate('/')} className={navLinkClass('/')}>
              <Home className="h-4 w-4" />
              Home
            </button>
            {isOrganizer && (
              <button onClick={() => handleNavigate('/organize')} className={navLinkClass('/organize')}>
                <Megaphone className="h-4 w-4" />
                My Events
              </button>
            )}
            <button onClick={() => handleNavigate('/events')} className={navLinkClass('/events')}>
              <Calendar className="h-4 w-4" />
              Events
            </button>
            <button onClick={() => handleNavigate('/vendors')} className={navLinkClass('/vendors')}>
              <ShoppingBag className="h-4 w-4" />
              Vendors
            </button>
            {isVendor && (
              <>
                <button onClick={() => handleNavigate('/vending')} className={navLinkClass('/vending')}>
                  <Store className="h-4 w-4" />
                  Vending
                </button>
                <button onClick={() => handleNavigate('/deal-list', { withReferrer: true })} className={navLinkClass('/deal-list')}>
                  <ShoppingBag className="h-4 w-4" />
                  Pipeline
                </button>
                <button onClick={() => handleNavigate('/inventory', { withReferrer: true })} className={navLinkClass('/inventory')}>
                  <Store className="h-4 w-4" />
                  Inventory
                </button>
                <button onClick={() => handleNavigate('/inventory/pnl', { withReferrer: true })} className={navLinkClass('/inventory/pnl')}>
                  <Store className="h-4 w-4" />
                  P&amp;L Report
                </button>
              </>
            )}
            {isVenue && (
              <button onClick={() => handleNavigate('/organize-venue')} className={navLinkClass('/organize-venue')}>
                <Megaphone className="h-4 w-4" />
                Organize Venue
              </button>
            )}
            <button onClick={() => handleNavigate('/my-collection')} className={navLinkClass('/my-collection')}>
              <Library className="h-4 w-4" />
              My Collection
            </button>
            <button onClick={() => handleNavigate('/scanner')} className={navLinkClass('/scanner')}>
              <ScanLine className="h-4 w-4" />
              Pricing
            </button>
          </div>

          {user && (
            <>
              <Separator className="my-3" />
              <p className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account</p>
              <div className="space-y-1">
                <button onClick={() => handleNavigate('/profile')} className={navLinkClass('/profile')}>
                  <User className="h-4 w-4" />
                  Profile
                </button>
                <button onClick={() => handleNavigate('/profile?tab=tickets')} className={navLinkClass('/profile?tab=tickets')}>
                  <Ticket className="h-4 w-4" />
                  My Tickets
                </button>
                <button onClick={() => handleNavigate('/following')} className={navLinkClass('/following')}>
                  <Bell className="h-4 w-4" />
                  My Following
                </button>
                <button onClick={() => handleNavigate('/settings')} className={navLinkClass('/settings')}>
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
              </div>

              {/* Role-specific links */}
              {(hasVendorRole || hasSponsorProfile || isEmployee || isAdmin) && (
                <>
                  <Separator className="my-3" />
                  <p className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Roles</p>
                  <div className="space-y-1">
                    {hasVendorRole && (
                      <button onClick={() => handleNavigate('/my-vendor-profile')} className={navLinkClass('/my-vendor-profile')}>
                        <Store className="h-4 w-4" />
                        My Vendor Profile
                      </button>
                    )}
                    {hasSponsorProfile && (
                      <button onClick={() => handleNavigate('/my-sponsor-profile')} className={navLinkClass('/my-sponsor-profile')}>
                        <Award className="h-4 w-4" />
                        My Sponsor Profile
                      </button>
                    )}
                    {isEmployee && (
                      <button onClick={() => handleNavigate('/employee-dashboard')} className={navLinkClass('/employee-dashboard')}>
                        <Users className="h-4 w-4" />
                        Employee Dashboard
                      </button>
                    )}
                    {isAdmin && (
                      <button onClick={() => handleNavigate('/admin')} className={navLinkClass('/admin')}>
                        <Shield className="h-4 w-4" />
                        Admin Panel
                      </button>
                    )}
                    {subscription_tier === "vendor_pro" && (
                      <button onClick={() => handleNavigate('/layout-tool')} className={navLinkClass('/layout-tool')}>
                        <PenTool className="h-4 w-4" />
                        Layout Tool
                      </button>
                    )}
                  </div>
                </>
              )}

              <Separator className="my-3" />
              <button onClick={handleSignOut} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </>
          )}

          {!user && (
            <>
              <Separator className="my-3" />
              <div className="px-2 space-y-2">
                <Button variant="outline" className="w-full" onClick={() => handleNavigate('/auth')}>
                  Sign In
                </Button>
                <Button variant="hero" className="w-full" onClick={() => handleNavigate('/auth')}>
                  Get Started
                </Button>
              </div>
            </>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;
