import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Creates a Supabase connection for use on the server (code that runs on
// the computer hosting the app, before the page reaches the user). This is
// the safer place to read/write data and check who is logged in.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Safe to ignore when called from a Server Component.
          }
        },
      },
    },
  );
}
