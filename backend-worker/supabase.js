import { createClient } from '@supabase/supabase-js'

// In Cloudflare Workers with Hono, environment variables are passed via context (c.env)
// We create a function to get the Supabase client with the environment variables
export function getSupabaseClient(env) {
    const supabaseUrl = env.SUPABASE_URL
    const supabaseAnonKey = env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase credentials not found in environment variables');
    }

    return createClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            auth: {
                persistSession: false
            }
        }
    );
}

export default getSupabaseClient;
