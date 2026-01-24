import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestUser {
  email: string;
  password: string;
  fullName: string;
  roles: string[];
}

const testUsers: TestUser[] = [
  {
    email: "admin@test.com",
    password: "test12",
    fullName: "Admin User",
    roles: ["admin", "user"],
  },
  {
    email: "event@test.com",
    password: "test12",
    fullName: "Event Organizer",
    roles: ["organizer", "venue", "user"],
  },
  {
    email: "vendor@test.com",
    password: "test12",
    fullName: "Test Vendor",
    roles: ["vendor", "user"],
  },
  {
    email: "user@test.com",
    password: "test12",
    fullName: "Regular User",
    roles: ["user"],
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const user of testUsers) {
      try {
        // Create the user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            full_name: user.fullName,
          },
        });

        if (authError) {
          results.push({ email: user.email, success: false, error: authError.message });
          continue;
        }

        const userId = authData.user.id;

        // Add roles for the user
        for (const role of user.roles) {
          const { error: roleError } = await supabaseAdmin
            .from("user_roles")
            .insert({
              user_id: userId,
              role: role,
            });

          if (roleError) {
            console.error(`Error adding role ${role} for ${user.email}:`, roleError);
          }
        }

        // If vendor role, create vendor profile
        if (user.roles.includes("vendor")) {
          const { error: vendorError } = await supabaseAdmin
            .from("vendors")
            .insert({
              user_id: userId,
              business_name: "Test Vendor Shop",
              business_description: "A test vendor for demo purposes",
              specialties: ["pokemon", "mtg"],
              verified: true,
            });

          if (vendorError) {
            console.error(`Error creating vendor profile for ${user.email}:`, vendorError);
          }
        }

        results.push({ email: user.email, success: true });
      } catch (err) {
        results.push({ email: user.email, success: false, error: String(err) });
      }
    }

    return new Response(
      JSON.stringify({
        message: "Test users seeded",
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error seeding test users:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
