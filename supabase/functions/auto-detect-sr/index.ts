import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔍 Starting S/R auto-detection...');

    // Call the database function
    const { error: srError } = await supabase.rpc('auto_detect_support_resistance');

    if (srError) {
      console.error('❌ S/R detection failed:', srError);
      throw srError;
    }

    console.log('✅ S/R levels updated successfully');

    // Log to system health
    const executionTime = Date.now() - startTime;
    await supabase.from('system_health').insert({
      function_name: 'auto-detect-sr',
      execution_time_ms: executionTime,
      status: 'success',
      processed_items: 1
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'S/R levels auto-detected and updated',
        executionTimeMs: executionTime
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('❌ Critical error in auto-detect-sr:', error);

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message,
        executionTimeMs: executionTime
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
