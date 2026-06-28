import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SalesForm from "@/components/SalesForm";

function afn(n: number): string {
  return `${Math.round(n).toLocaleString("en-US")} AFN`;
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

type SaleRow = {
  id: string;
  date: string | null;
  invoice_number: string | null;
  quantity: number | null;
  unit_price: number | null;
  payment_status: string | null;
  revenue: number | null;
  gross_profit: number | null;
  balance_due: number | null;
  customers: { name: string | null } | null;
  products: { sku: string | null; name: string | null } | null;
};

export default async function SalesPage() {
  let user = null;
  let customers: { id: string; name: string | null }[] = [];
  let products: {
    id: string;
    sku: string | null;
    name: string | null;
    landed_cost_afn: number | null;
    current_stock: number | null;
  }[] = [];
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
            "id, date, invoice_number, quantity, unit_price, payment_status, revenue, gross_profit, balance_due, customers(name), products(sku, name)",
          )
          .order("date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      customers = customersRes.data ?? [];
      products = productsRes.data ?? [];
      sales = (salesRes.data ?? []) as unknown as SaleRow[];
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
        <SalesForm customers={customers} products={products} />

        <h2 className="mt-8 mb-3 text-base font-semibold text-brand">
          Recent sales
        </h2>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {sales.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-500">
              No sales yet. Tap “Record Sale” to add your first one.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-brand text-white">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">
                      Date
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">
                      Invoice
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">
                      Customer
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">
                      Product
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                      Qty
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                      Revenue
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                      Profit
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">
                      Status
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sales.map((s) => {
                    const balance = num(s.balance_due);
                    return (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                          {s.date ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                          {s.invoice_number ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                          {s.customers?.name ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                          {s.products
                            ? (s.products.sku ? `${s.products.sku} — ` : "") +
                              (s.products.name ?? "—")
                            : "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                          {num(s.quantity).toLocaleString("en-US")}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                          {afn(num(s.revenue))}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-green-700">
                          {afn(num(s.gross_profit))}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                          {s.payment_status ?? "—"}
                        </td>
                        <td
                          className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${
                            balance > 0 ? "text-red-600" : "text-gray-900"
                          }`}
                        >
                          {afn(balance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
