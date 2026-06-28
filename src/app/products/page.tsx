import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddProductForm from "@/components/AddProductForm";

const LOW_STOCK_THRESHOLD = 10;

function afn(n: number): string {
  return `${Math.round(n).toLocaleString("en-US")} AFN`;
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

type Product = {
  id: string;
  sku: string | null;
  name: string | null;
  category: string | null;
  type: string | null;
  landed_cost_afn: number | null;
  selling_price: number | null;
  current_stock: number | null;
};

export default async function ProductsPage() {
  let user = null;
  let products: Product[] = [];

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
          "id, sku, name, category, type, landed_cost_afn, selling_price, current_stock",
        )
        .order("created_at", { ascending: false });
      products = (data ?? []) as Product[];
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

        {/* Add product */}
        <div className="mt-6">
          <AddProductForm />
        </div>

        {/* Table */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {products.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-500">
              No products yet. Tap “Add Product” to create your first one.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-brand text-white">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">
                      SKU
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">
                      Name
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">
                      Category
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 font-semibold">
                      Type
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                      Landed cost
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                      Selling price
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                      Stock
                    </th>
                    <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                      Stock value
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((p) => {
                    const stock = num(p.current_stock);
                    const isLow = stock < LOW_STOCK_THRESHOLD;
                    const stockValue = stock * num(p.landed_cost_afn);
                    return (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                          {p.sku ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                          {p.name ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                          {p.category ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                          {p.type ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                          {afn(num(p.landed_cost_afn))}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                          {afn(num(p.selling_price))}
                        </td>
                        <td
                          className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${
                            isLow ? "text-red-600" : "text-gray-900"
                          }`}
                        >
                          {stock.toLocaleString("en-US")}
                          {isLow && (
                            <span className="ml-1 text-xs font-normal">
                              (low)
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                          {afn(stockValue)}
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
