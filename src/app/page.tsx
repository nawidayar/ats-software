import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";

const MODULES: { name: string; href: string | null }[] = [
  { name: "Dashboard", href: null },
  { name: "Products", href: "/products" },
  { name: "Sales", href: "/sales" },
  { name: "Customers", href: "/customers" },
  { name: "Purchases", href: "/purchases" },
  { name: "Expenses", href: "/expenses" },
];

export default async function Home() {
  let user = null;
  let businessName = "your business";

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", user.id)
        .single();

      if (profile?.business_id) {
        const { data: business } = await supabase
          .from("businesses")
          .select("name")
          .eq("id", profile.business_id)
          .single();
        if (business?.name) businessName = business.name;
      }
    }
  } catch {
    // If Supabase isn't configured, fall through to the login redirect below.
  }

  if (!user) redirect("/login");

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="flex items-center justify-between bg-brand px-5 py-4">
        <div>
          <p className="text-lg font-bold tracking-wide text-white">ATS</p>
          <p className="text-xs text-white/70">Arvin Tech Solution</p>
        </div>
        <LogoutButton />
      </header>

      <main className="mx-auto w-full max-w-2xl px-5 py-8">
        <h1 className="text-2xl font-bold text-brand">
          Welcome, {businessName}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          You are logged in as {user.email}. Your data is private to this
          business only.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4">
          {MODULES.map((mod) =>
            mod.href ? (
              <Link
                key={mod.name}
                href={mod.href}
                className="rounded-2xl border border-brand/20 bg-white p-5 shadow-sm transition-colors hover:bg-brand/5"
              >
                <p className="text-base font-semibold text-brand">{mod.name}</p>
                <p className="mt-1 text-xs text-gray-500">Open →</p>
              </Link>
            ) : (
              <div
                key={mod.name}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <p className="text-base font-semibold text-brand">{mod.name}</p>
                <p className="mt-1 text-xs text-gray-400">Coming soon</p>
              </div>
            ),
          )}
        </div>
      </main>
    </div>
  );
}
