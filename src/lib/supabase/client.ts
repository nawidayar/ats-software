import { createBrowserClient } from "@supabase/ssr";

// Creates a Supabase connection for use in the browser (the part the user
// sees and clicks on). Use this in client-side code.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
