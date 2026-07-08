import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PurchasesManager, {
  type ProductOption,
  type PurchaseRow,
} from "@/components/PurchasesManager";

export default async function PurchasesPage() {
  let user = null;
  let products: ProductOption[] = [];
  let purchases: PurchaseRow[] = [];

  try {
    const supabase = await createClient();
    const {
      data: { user: signedInUser },
    } = await supabase.auth.getUser();
    user = signedInUser;

    if (user) {
      const [productsRes, purchasesRes] = await Promise.all([
        supabase
          .from("products")
          .select("id, sku, name, current_stock")
          .order("name"),
        supabase
          .from("purchases")
          .select(
            "id, date, kind, shipment_number, supplier, product_id, quantity, product_cost_usd, china_inland_usd, freight_usd, usd_afn_rate, total_landed_cost_afn, landed_cost_per_unit_afn, products(name, sku)",
          )
          .order("date", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

      products = (productsRes.data ?? []) as ProductOption[];
      purchases = ((purchasesRes.data ?? []) as Record<string, unknown>[]).map(
        (row) => {
          const product = row.products as
            | { name: string | null; sku: string | null }
            | null;
          return {
            ...row,
            product_name: product?.name ?? null,
            product_sku: product?.sku ?? null,
          };
        },
      ) as PurchaseRow[];
    }
  } catch {
    // If Supabase isn't configured, fall through to the login redirect below.
  }

  if (!user) redirect("/login");

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="flex items-center justify-between bg-brand px-5 py-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-white/80 hover:text-white">
            ← Home
          </Link>
          <span className="text-lg font-bold text-white">Purchases</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        <PurchasesManager products={products} purchases={purchases} />
      </main>
    </div>
  );
}
