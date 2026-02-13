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
  vendorData?: {
    business_name: string;
    business_description: string;
    specialties: string[];
    business_email?: string;
    business_phone?: string;
    website_url?: string;
  };
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
    vendorData: {
      business_name: "Card Kingdom",
      business_description: "Premier trading card retailer specializing in Pokemon, Magic, and Yu-Gi-Oh cards.",
      specialties: ["pokemon", "mtg", "yugioh"],
      business_email: "vendor@test.com",
      business_phone: "555-0101",
      website_url: "https://cardkingdom.example.com",
    },
  },
  {
    email: "user@test.com",
    password: "test12",
    fullName: "Regular User",
    roles: ["user"],
  },
  // Additional vendor users
  {
    email: "vendor2@test.com",
    password: "test12",
    fullName: "Pokemon Paradise Owner",
    roles: ["vendor", "user"],
    vendorData: {
      business_name: "Pokemon Paradise",
      business_description: "Your one-stop shop for all Pokemon TCG needs. Specializing in rare Japanese imports and sealed products.",
      specialties: ["pokemon"],
      business_email: "vendor2@test.com",
      business_phone: "555-0102",
    },
  },
  {
    email: "vendor3@test.com",
    password: "test12",
    fullName: "Magic Masters Owner",
    roles: ["vendor", "user"],
    vendorData: {
      business_name: "Magic Masters",
      business_description: "Expert MTG dealers with 15+ years experience. Competitive pricing on singles and sealed product.",
      specialties: ["mtg"],
      business_email: "vendor3@test.com",
      business_phone: "555-0103",
      website_url: "https://magicmasters.example.com",
    },
  },
  {
    email: "vendor4@test.com",
    password: "test12",
    fullName: "Collectible Corner Owner",
    roles: ["vendor", "user"],
    vendorData: {
      business_name: "Collectible Corner",
      business_description: "Sports cards, trading cards, and memorabilia. We buy, sell, and trade!",
      specialties: ["sports", "pokemon", "mtg"],
      business_email: "vendor4@test.com",
      business_phone: "555-0104",
    },
  },
  {
    email: "vendor5@test.com",
    password: "test12",
    fullName: "Retro Cards Plus Owner",
    roles: ["vendor", "user"],
    vendorData: {
      business_name: "Retro Cards Plus",
      business_description: "Vintage and retro trading cards from the 90s and 2000s. Nostalgia guaranteed!",
      specialties: ["pokemon", "yugioh", "sports"],
      business_email: "vendor5@test.com",
      business_phone: "555-0105",
    },
  },
  {
    email: "vendor6@test.com",
    password: "test12",
    fullName: "Dragon's Den Cards Owner",
    roles: ["vendor", "user"],
    vendorData: {
      business_name: "Dragon's Den Cards",
      business_description: "Yu-Gi-Oh and Dragon Ball specialists. Tournament-ready decks and rare singles.",
      specialties: ["yugioh", "dbz"],
      business_email: "vendor6@test.com",
      business_phone: "555-0106",
      website_url: "https://dragonsdencards.example.com",
    },
  },
];

interface TestEvent {
  title: string;
  description: string;
  date: string;
  venue: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  event_type: string;
  card_types: string[];
  organizer_name: string;
  max_attendees: number;
  entry_fee: number;
  vendor_table_price: number;
  total_tables: number;
  tables_available: number;
}

const testEvents: TestEvent[] = [
  {
    title: "Pokemon Championship Series",
    description: "Annual Pokemon TCG tournament with prizes and vendor hall. All skill levels welcome!",
    date: "2026-02-15",
    venue: "Convention Center Hall A",
    address: "123 Main Street",
    city: "Austin",
    state: "TX",
    zip_code: "78701",
    event_type: "tournament",
    card_types: ["pokemon"],
    organizer_name: "Event Organizer",
    max_attendees: 500,
    entry_fee: 25,
    vendor_table_price: 150,
    total_tables: 30,
    tables_available: 15,
  },
  {
    title: "Magic: The Gathering Grand Prix",
    description: "Competitive MTG event featuring Modern and Standard formats. Side events all weekend.",
    date: "2026-02-22",
    venue: "Downtown Arena",
    address: "456 Oak Avenue",
    city: "Dallas",
    state: "TX",
    zip_code: "75201",
    event_type: "tournament",
    card_types: ["mtg"],
    organizer_name: "Event Organizer",
    max_attendees: 800,
    entry_fee: 40,
    vendor_table_price: 200,
    total_tables: 50,
    tables_available: 25,
  },
  {
    title: "Card Collectors Expo",
    description: "The biggest card show in the region! Buy, sell, and trade Pokemon, MTG, sports cards, and more.",
    date: "2026-03-01",
    venue: "Expo Center",
    address: "789 Commerce Blvd",
    city: "Houston",
    state: "TX",
    zip_code: "77001",
    event_type: "show",
    card_types: ["pokemon", "mtg", "sports", "yugioh"],
    organizer_name: "Event Organizer",
    max_attendees: 2000,
    entry_fee: 10,
    vendor_table_price: 175,
    total_tables: 100,
    tables_available: 45,
  },
  {
    title: "Yu-Gi-Oh Regional Qualifier",
    description: "Official Yu-Gi-Oh regional tournament. Top finishers qualify for nationals!",
    date: "2026-03-08",
    venue: "Community Center",
    address: "321 Elm Street",
    city: "San Antonio",
    state: "TX",
    zip_code: "78201",
    event_type: "tournament",
    card_types: ["yugioh"],
    organizer_name: "Event Organizer",
    max_attendees: 300,
    entry_fee: 30,
    vendor_table_price: 125,
    total_tables: 20,
    tables_available: 8,
  },
  {
    title: "Sports Card Show",
    description: "Monthly sports card show featuring baseball, basketball, football, and hockey cards.",
    date: "2026-03-15",
    venue: "Hotel Ballroom",
    address: "555 Stadium Way",
    city: "Fort Worth",
    state: "TX",
    zip_code: "76102",
    event_type: "show",
    card_types: ["sports"],
    organizer_name: "Event Organizer",
    max_attendees: 400,
    entry_fee: 5,
    vendor_table_price: 100,
    total_tables: 40,
    tables_available: 20,
  },
  {
    title: "Multi-TCG Festival",
    description: "A celebration of all trading card games! Tournaments, vendors, artists, and cosplay.",
    date: "2026-03-22",
    venue: "Fairgrounds Exhibition Hall",
    address: "999 Festival Drive",
    city: "Austin",
    state: "TX",
    zip_code: "78702",
    event_type: "show",
    card_types: ["pokemon", "mtg", "yugioh", "sports", "other"],
    organizer_name: "Event Organizer",
    max_attendees: 3000,
    entry_fee: 15,
    vendor_table_price: 250,
    total_tables: 150,
    tables_available: 75,
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

    // Authentication: require admin user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const { data: isAdminResult } = await supabaseAdmin.rpc("is_admin", { user_id: userData.user.id });
    if (!isAdminResult) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const results: { email: string; success: boolean; error?: string }[] = [];
    let eventOrganizerId: string | null = null;

    // Create users and vendors
    for (const user of testUsers) {
      try {
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

        // Track the event organizer ID
        if (user.email === "event@test.com") {
          eventOrganizerId = userId;
        }

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

        // If vendor role and has vendor data, create vendor profile
        if (user.roles.includes("vendor") && user.vendorData) {
          const { error: vendorError } = await supabaseAdmin
            .from("vendors")
            .insert({
              user_id: userId,
              business_name: user.vendorData.business_name,
              business_description: user.vendorData.business_description,
              specialties: user.vendorData.specialties,
              business_email: user.vendorData.business_email,
              business_phone: user.vendorData.business_phone,
              website_url: user.vendorData.website_url,
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

    // Create events if we have an organizer
    const eventResults: { title: string; success: boolean; error?: string }[] = [];
    
    if (eventOrganizerId) {
      for (const event of testEvents) {
        try {
          const { error: eventError } = await supabaseAdmin
            .from("events")
            .insert({
              title: event.title,
              description: event.description,
              date: event.date,
              venue: event.venue,
              address: event.address,
              city: event.city,
              state: event.state,
              zip_code: event.zip_code,
              event_type: event.event_type,
              card_types: event.card_types,
              organizer_name: event.organizer_name,
              organizer_id: eventOrganizerId,
              max_attendees: event.max_attendees,
              entry_fee: event.entry_fee,
              vendor_table_price: event.vendor_table_price,
              total_tables: event.total_tables,
              tables_available: event.tables_available,
            });

          if (eventError) {
            eventResults.push({ title: event.title, success: false, error: eventError.message });
          } else {
            eventResults.push({ title: event.title, success: true });
          }
        } catch (err) {
          eventResults.push({ title: event.title, success: false, error: String(err) });
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: "Test data seeded",
        users: results,
        events: eventResults,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error seeding test data:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
