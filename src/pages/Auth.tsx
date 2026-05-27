import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { RoleSelector } from '@/components/RoleSelector';
import { toast } from '@/components/ui/use-toast';
import { LogIn, UserPlus, Mail, Apple, Facebook, MessageCircle, Store, Calendar, MapPin, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  roles: z.array(z.enum(['vendor', 'organizer', 'venue', 'sponsor'])).optional(),
});

type SignInForm = z.infer<typeof signInSchema>;
type SignUpForm = z.infer<typeof signUpSchema>;

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const { user, signUp, signIn, signInWithGoogle, signInWithApple, signInWithFacebook, signInWithDiscord, requestRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const fromQuery = params.get('from');
  const from = fromQuery || (location.state as any)?.from || '/';

  const signInForm = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const signUpForm = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', fullName: '', roles: [] },
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !showRoleSelector) {
      navigate(from, { replace: true });
    }
  }, [user, showRoleSelector, navigate, from]);


  const onSignIn = async (data: SignInForm) => {
    setLoading(true);
    const { error } = await signIn(data.email, data.password);
    
    if (error) {
      toast({
        title: 'Sign In Failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      console.debug('Auth: redirecting after sign-in to', from);
      toast({
        title: 'Welcome back!',
        description: 'You have successfully signed in.',
      });
      // Immediately redirect to intended page
      navigate(from, { replace: true });
    }
    setLoading(false);
  };

  const onSignUp = async (data: SignUpForm) => {
    setLoading(true);
    const { error } = await signUp(data.email, data.password, data.fullName);
    
    if (error) {
      toast({
        title: 'Sign Up Failed',
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
    } else {
      // If roles are selected, add them directly
      if (data.roles && data.roles.length > 0) {
        try {
          // Wait a moment for the user to be created
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Get the newly created user
          const { data: { user: newUser } } = await supabase.auth.getUser();
          
          if (newUser) {
            // Insert all selected roles
            const roleInserts = data.roles.map(role => ({
              user_id: newUser.id,
              role: role
            }));
            
            const { error: roleError } = await supabase
              .from('user_roles')
              .insert(roleInserts);
            
            if (roleError) {
              console.error('Error adding roles:', roleError);
              toast({
                title: 'Account Created',
                description: 'Account created successfully! Your selected roles will be activated shortly.',
                variant: 'default',
              });
            } else {
              toast({
                title: 'Account Created!',
                description: `Welcome to CardboardCurators! Your ${data.roles.join(', ')} role${data.roles.length > 1 ? 's have' : ' has'} been activated.`,
              });
            }
          }
        } catch (roleError) {
          console.error('Error adding roles:', roleError);
          toast({
            title: 'Account Created',
            description: 'Account created successfully! You can set up your roles in your profile.',
            variant: 'default',
          });
        }
      } else {
        toast({
          title: 'Account Created!',
          description: 'Welcome to CardboardCurators!',
        });
      }
      
      // Redirect to home
      navigate(from, { replace: true });
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    
    if (error) {
      toast({
        title: 'Google Sign In Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithApple();
    
    if (error) {
      toast({
        title: 'Apple Sign In Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleFacebookSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithFacebook();
    
    if (error) {
      toast({
        title: 'Facebook Sign In Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleDiscordSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithDiscord();
    
    if (error) {
      toast({
        title: 'Discord Sign In Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleRoleSelect = async (role: 'vendor' | 'organizer' | 'venue', reason: string) => {
    const { error } = await requestRole(role, reason);
    
    if (error) {
      toast({
        title: 'Role Request Failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Role Request Submitted',
        description: `Your request for ${role} role has been submitted for review.`,
      });
      navigate('/');
    }
  };

  const handleSkipRole = () => {
    navigate('/');
  };

  if (showRoleSelector) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
        <RoleSelector
          onRoleSelect={handleRoleSelect}
          onSkip={handleSkipRole}
          loading={loading}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-gradient-primary text-primary-foreground">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--accent)/0.45),transparent_60%)]" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />
        <div className="absolute -top-24 -right-16 h-80 w-80 rounded-full bg-vendor/30 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <img src="/logo.jpg" alt="Collector Companion" className="h-10 w-10 rounded-lg shadow-lg" />
          <span className="text-lg font-semibold tracking-tight">Collector Companion</span>
        </div>

        <div className="relative space-y-6 max-w-md">
          <h2 className="text-4xl xl:text-5xl font-bold leading-tight">
            The Ultimate <span className="block">Collector Experience</span>
          </h2>
          <p className="text-base xl:text-lg text-primary-foreground/85">
            Discover events, connect with vendors, and track every card in your collection — all in one place.
          </p>
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { Icon: Calendar, label: 'Events' },
              { Icon: Store, label: 'Vendors' },
              { Icon: Award, label: 'Collection' },
            ].map(({ Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2 rounded-xl bg-white/10 backdrop-blur-sm p-4 border border-white/15">
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-primary-foreground/70">
          © {new Date().getFullYear()} Collector Companion
        </p>
      </div>

      {/* Auth panel */}
      <div className="flex items-center justify-center p-4 sm:p-8 bg-gradient-subtle">
      <Card className="w-full max-w-md border-border/60 shadow-lg">
        <CardHeader className="space-y-2">
          <div className="lg:hidden flex items-center gap-2 mb-2">
            <img src="/logo.jpg" alt="Collector Companion" className="h-8 w-8 rounded-md" />
            <span className="font-semibold">Collector Companion</span>
          </div>
          <CardTitle className="flex items-center gap-2 text-2xl">
            {isSignUp ? <UserPlus className="h-6 w-6 text-primary" /> : <LogIn className="h-6 w-6 text-primary" />}
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </CardTitle>
          <CardDescription>
            {isSignUp 
              ? 'Join Collector Companion and start tracking your collection.' 
              : 'Sign in to continue to Collector Companion.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Social Login Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full"
            >
              <Mail className="h-4 w-4 mr-2" />
              Google
            </Button>
            <Button
              variant="outline"
              onClick={handleAppleSignIn}
              disabled={loading}
              className="w-full"
            >
              <Apple className="h-4 w-4 mr-2" />
              Apple
            </Button>
            <Button
              variant="outline"
              onClick={handleFacebookSignIn}
              disabled={loading}
              className="w-full"
            >
              <Facebook className="h-4 w-4 mr-2" />
              Facebook
            </Button>
            <Button
              variant="outline"
              onClick={handleDiscordSignIn}
              disabled={loading}
              className="w-full"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Discord
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
            </div>
          </div>

          {/* Email/Password Form */}
          {isSignUp ? (
            <Form {...signUpForm}>
              <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-4">
                <FormField
                  control={signUpForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your full name" 
                          autoComplete="given-name"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signUpForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="Enter your email" 
                          autoComplete="email"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signUpForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Create a password" 
                          autoComplete="new-password"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Role Selection Checkboxes */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Select Your Roles (Optional)</Label>
                  <p className="text-xs text-muted-foreground">Choose roles that apply to you. You can always update these later.</p>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
                      <Checkbox
                        id="role-vendor"
                        checked={selectedRoles.includes('vendor')}
                        onCheckedChange={(checked) => {
                          const newRoles = checked 
                            ? [...selectedRoles, 'vendor']
                            : selectedRoles.filter(r => r !== 'vendor');
                          setSelectedRoles(newRoles);
                          signUpForm.setValue('roles', newRoles as any);
                        }}
                      />
                      <div className="flex-1">
                        <Label htmlFor="role-vendor" className="flex items-center gap-2 cursor-pointer font-medium">
                          <Store className="h-4 w-4 text-vendor" />
                          Vendor
                        </Label>
                        <p className="text-xs text-muted-foreground">I sell trading cards and collectibles</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
                      <Checkbox
                        id="role-organizer"
                        checked={selectedRoles.includes('organizer')}
                        onCheckedChange={(checked) => {
                          const newRoles = checked 
                            ? [...selectedRoles, 'organizer']
                            : selectedRoles.filter(r => r !== 'organizer');
                          setSelectedRoles(newRoles);
                          signUpForm.setValue('roles', newRoles as any);
                        }}
                      />
                      <div className="flex-1">
                        <Label htmlFor="role-organizer" className="flex items-center gap-2 cursor-pointer font-medium">
                          <Calendar className="h-4 w-4 text-accent" />
                          Event Organizer
                        </Label>
                        <p className="text-xs text-muted-foreground">I organize trading card events</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
                      <Checkbox
                        id="role-venue"
                        checked={selectedRoles.includes('venue')}
                        onCheckedChange={(checked) => {
                          const newRoles = checked 
                            ? [...selectedRoles, 'venue']
                            : selectedRoles.filter(r => r !== 'venue');
                          setSelectedRoles(newRoles);
                          signUpForm.setValue('roles', newRoles as any);
                        }}
                      />
                      <div className="flex-1">
                        <Label htmlFor="role-venue" className="flex items-center gap-2 cursor-pointer font-medium">
                          <MapPin className="h-4 w-4 text-primary" />
                          Venue Owner
                        </Label>
                        <p className="text-xs text-muted-foreground">I host events at my location</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
                      <Checkbox
                        id="role-sponsor"
                        checked={selectedRoles.includes('sponsor')}
                        onCheckedChange={(checked) => {
                          const newRoles = checked 
                            ? [...selectedRoles, 'sponsor']
                            : selectedRoles.filter(r => r !== 'sponsor');
                          setSelectedRoles(newRoles);
                          signUpForm.setValue('roles', newRoles as any);
                        }}
                      />
                      <div className="flex-1">
                        <Label htmlFor="role-sponsor" className="flex items-center gap-2 cursor-pointer font-medium">
                          <Award className="h-4 w-4 text-secondary" />
                          Sponsor
                        </Label>
                        <p className="text-xs text-muted-foreground">I sponsor trading card events</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...signInForm}>
              <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-4">
                <FormField
                  control={signInForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter your email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signInForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter your password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
            </Form>
          )}

          {/* Toggle between Sign In/Sign Up */}
          <div className="text-center">
            <Button
              variant="link"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm"
            >
              {isSignUp 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Create one"
              }
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default Auth;