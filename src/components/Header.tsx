import { Button } from "@/components/ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { User, LogOut, Settings, Store, Bell, Shield, PenTool, Award, Users, Ticket } from "lucide-react";
import logo from "@/assets/logo.jpg";
import { useAuth } from "@/hooks/useAuth";
import { useVendorProfile } from "@/hooks/useVendorProfile";
import { useAdmin } from "@/hooks/useAdmin";
import { useSubscription } from "@/hooks/useSubscription";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import CartIcon from "@/components/CartIcon";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();
  const { hasVendorRole } = useVendorProfile();
  const { isAdmin } = useAdmin();
  const { subscription_tier } = useSubscription();

  // Check if user is a vendor employee
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

  // Check if user has a sponsor profile
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="bg-background border-b border-border sticky top-0 z-50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <img src={logo} alt="Cardboard Curators" className="w-10 h-10 rounded-lg" />
            <span className="text-xl font-bold text-foreground">Cardboard Curators</span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              to="/events" 
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === '/events' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Events
            </Link>
            <Link 
              to="/vendors" 
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === '/vendors' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              Vendors
            </Link>
            <Link 
              to="/my-collection" 
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === '/my-collection' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              My Collection
            </Link>
          </nav>

          <div className="flex items-center space-x-4 min-h-[40px]">
            <ThemeToggle />
            <CartIcon />
            {loading ? (
              <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
            ) : user ? (
              <>
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.user_metadata?.avatar_url} />
                        <AvatarFallback>
                          {user.user_metadata?.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{user.user_metadata?.full_name || 'User'}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/profile?tab=tickets')}>
                    <Ticket className="mr-2 h-4 w-4" />
                    My Tickets
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/subscription')}>
                    <Settings className="mr-2 h-4 w-4" />
                    My Subscriptions
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/following')}>
                    <Bell className="mr-2 h-4 w-4" />
                    My Following
                  </DropdownMenuItem>
                  {hasVendorRole && (
                    <DropdownMenuItem onClick={() => navigate('/my-vendor-profile')}>
                      <Store className="mr-2 h-4 w-4" />
                      My Vendor Profile
                    </DropdownMenuItem>
                  )}
                  {hasSponsorProfile && (
                    <DropdownMenuItem onClick={() => navigate('/my-sponsor-profile')}>
                      <Award className="mr-2 h-4 w-4" />
                      My Sponsor Profile
                    </DropdownMenuItem>
                  )}
                  {isEmployee && (
                    <DropdownMenuItem onClick={() => navigate('/employee-dashboard')}>
                      <Users className="mr-2 h-4 w-4" />
                      Employee Dashboard
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <Shield className="mr-2 h-4 w-4" />
                      Admin Panel
                    </DropdownMenuItem>
                  )}
                  {subscription_tier === "vendor_pro" && (
                    <DropdownMenuItem onClick={() => navigate('/layout-tool')}>
                      <PenTool className="mr-2 h-4 w-4" />
                      Layout Tool
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
                  Sign In
                </Button>
                <Button variant="hero" size="sm" onClick={() => navigate('/auth')}>
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;