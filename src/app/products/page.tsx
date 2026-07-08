import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProductsManager, { type ProductRow } from "@/components/ProductsManager";

function afn(n: number): string {
  return `${Math.round(n).toLocaleString("en-US")} AFN`;
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default async function ProductsPage() {
  let user = null;
  let products: ProductRow[] = [];

  try {
    const supabase = await createClient();
    const {
      data: { user: signedInUser },
    } = await supabase.auth.getUser();
    user = signedInUser;

    if (user) {
      const { data } = await supabase
        .from("products")
        .select(
          "id, sku, name, category, supplier, type, landed_cost_afn, margin_percent, selling_price, opening_quantity, current_stock",
        )
        .order("created_at", { ascending: false });
      products = (data ?? []) as ProductRow[];
    }
  } catch {
    // If Supabase isn't configured, fall through to the login redirect below.
  }

  if (!user) redirect("/login");

  const totalAtCost = products.reduce(
    (sum, p) => sum + num(p.current_stock) * num(p.landed_cost_afn),
    0,
  );
  const totalAtSelling = products.reduce(
    (sum, p) => sum + num(p.current_stock) * num(p.selling_price),
    0,
  );

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="flex items-center justify-between bg-brand px-5 py-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-white/80 hover:text-white">
            ← Home
          </Link>
          <span className="text-lg font-bold text-white">Products</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        {/* Totals */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-brand p-5 text-white shadow-sm">
            <p className="text-xs uppercase tracking-wide text-white/70">
              Inventory value (at cost)
            </p>
            <p className="mt-1 text-2xl font-bold">{afn(totalAtCost)}</p>
          </div>
          <div className="rounded-2xl border border-brand/20 bg-white p-5 text-brand shadow-sm">
            <p className="text-xs uppercase tracking-wide text-brand/60">
              Inventory value (at selling price)
            </p>
            <p className="mt-1 text-2xl font-bold">{afn(totalAtSelling)}</p>
          </div>
        </div>

        {/* Add / edit products + list */}
        <div className="mt-6">
          <ProductsManager products={products} />
        </div>
      </main>
    </div>
  );
}
