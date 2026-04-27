import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { errorResponse, HttpError, newRequestId } from "../_shared/errors.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = newRequestId();
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new HttpError('MissingAuthHeader', 'No authorization header', 401);
    }

    // Create client with user's token to get their ID
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new HttpError('Unauthorized', 'Unauthorized', 401);
    }

    // Create admin client to delete user
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Delete user's profile first (cascade should handle related data)
    await supabaseAdmin.from('profiles').delete().eq('id', user.id);

    // Delete the user from auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error(`[delete-account][${requestId}] Error deleting user:`, deleteError);
      throw new HttpError('DatabaseError', 'Failed to delete account', 500);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(`[delete-account][${requestId}] Error:`, error);
    return errorResponse(error, {
      defaultType: 'DeleteAccountError',
      requestId,
      headers: corsHeaders,
    });
  }
});
