import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AssetsManager, { type AssetRow } from "@/components/AssetsManager";

function afn(n: number): string {
  return `${Math.round(n).toLocaleString("en-US")} AFN`;
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default async function AssetsPage() {
  let user = null;
  let assets: AssetRow[] = [];

  try {
    const supabase = await createClient();
    const {
      data: { user: signedInUser },
    } = await supabase.auth.getUser();
    user = signedInUser;

    if (user) {
      // Read from the view so each asset includes its live "net book value"
      // (current worth after depreciation).
      const { data } = await supabase
        .from("assets_with_values")
        .select(
          "id, asset_name, category, purchase_date, cost, useful_life_years, annual_depreciation, net_book_value",
        )
        .order("purchase_date", { ascending: false });
      assets = (data ?? []) as AssetRow[];
    }
  } catch {
    // If Supabase isn't configured, fall through to the login redirect below.
  }

  if (!user) redirect("/login");

  const totalCost = assets.reduce((s, a) => s + num(a.cost), 0);
  const totalValue = assets.reduce((s, a) => s + num(a.net_book_value), 0);

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="flex items-center justify-between bg-brand px-5 py-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-white/80 hover:text-white">
            ← Home
          </Link>
          <span className="text-lg font-bold text-white">Assets</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-brand p-5 text-white shadow-sm">
            <p className="text-xs uppercase tracking-wide text-white/70">
              Total cost (what you paid)
            </p>
            <p className="mt-1 text-2xl font-bold">{afn(totalCost)}</p>
          </div>
          <div className="rounded-2xl border border-brand/20 bg-white p-5 text-brand shadow-sm">
            <p className="text-xs uppercase tracking-wide text-brand/60">
              Current value (after depreciation)
            </p>
            <p className="mt-1 text-2xl font-bold">{afn(totalValue)}</p>
          </div>
        </div>

        <div className="mt-6">
          <AssetsManager assets={assets} />
        </div>
      </main>
    </div>
  );
}
