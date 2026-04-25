import { useAuth } from "@/hooks/useAuth";

/**
 * A user is considered to be in "demo mode" when they're signed in
 * with a @test.com account. We rely on the email convention rather than a
 * separate flag so it works automatically for all existing seeded users.
 */
export const useDemoSession = () => {
  const { user, loading } = useAuth();
  const email = user?.email ?? null;
  const isDemo = !!email && email.toLowerCase().endsWith("@test.com");

  return {
    isDemo,
    email,
    loading,
  };
};
