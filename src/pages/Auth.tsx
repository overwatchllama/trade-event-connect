import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { RoleSelector } from '@/components/RoleSelector';
import { toast } from '@/components/ui/use-toast';
import { LogIn, UserPlus, Mail, Apple, Facebook, MessageCircle } from 'lucide-react';

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
});

type SignInForm = z.infer<typeof signInSchema>;
type SignUpForm = z.infer<typeof signUpSchema>;

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, signUp, signIn, signInWithGoogle, signInWithApple, signInWithFacebook, signInWithDiscord, requestRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || '/';

  const signInForm = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const signUpForm = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', fullName: '' },
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
      toast({
        title: 'Account Created!',
        description: 'Please check your email to verify your account.',
      });
      setShowRoleSelector(true);
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            {isSignUp ? <UserPlus className="h-6 w-6" /> : <LogIn className="h-6 w-6" />}
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </CardTitle>
          <CardDescription>
            {isSignUp 
              ? 'Join the CardboardCurators marketplace' 
              : 'Sign in to your account'
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
  );
};

export default Auth;