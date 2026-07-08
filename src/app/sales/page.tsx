import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SalesManager, {
  type CustomerOption,
  type ProductOption,
  type SaleRow,
} from "@/components/SalesManager";

export default async function SalesPage() {
  let user = null;
  let customers: CustomerOption[] = [];
  let products: ProductOption[] = [];
  let sales: SaleRow[] = [];

  try {
    const supabase = await createClient();
    const {
      data: { user: signedInUser },
    } = await supabase.auth.getUser();
    user = signedInUser;

    if (user) {
      const [customersRes, productsRes, salesRes] = await Promise.all([
        supabase.from("customers").select("id, name").order("name"),
        supabase
          .from("products")
          .select("id, sku, name, landed_cost_afn, current_stock")
          .order("name"),
        supabase
          .from("sales")
          .select(
            "id, date, invoice_number, customer_id, product_id, quantity, unit_price, payment_status, amount_paid, revenue, gross_profit, balance_due, customers(name), products(sku, name)",
          )
          .order("date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      customers = (customersRes.data ?? []) as CustomerOption[];
      products = (productsRes.data ?? []) as ProductOption[];
      sales = ((salesRes.data ?? []) as Record<string, unknown>[]).map(
        (row) => {
          const customer = row.customers as { name: string | null } | null;
          const product = row.products as
            | { sku: string | null; name: string | null }
            | null;
          return {
            ...row,
            customer_name: customer?.name ?? null,
            product_name: product?.name ?? null,
            product_sku: product?.sku ?? null,
          };
        },
      ) as SaleRow[];
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
          <span className="text-lg font-bold text-white">Sales</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <SalesManager customers={customers} products={products} sales={sales} />
      </main>
    </div>
  );
}
