import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CustomersManager, {
  type CustomerWithStats,
} from "@/components/CustomersManager";

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

type CustomerRow = {
  id: string;
  name: string | null;
  phone: string | null;
  city: string | null;
  notes: string | null;
  follow_up_date: string | null;
};

export default async function CustomersPage() {
  let user = null;
  let customers: CustomerWithStats[] = [];

  try {
    const supabase = await createClient();
    const {
      data: { user: signedInUser },
    } = await supabase.auth.getUser();
    user = signedInUser;

    if (user) {
      const [customersRes, salesRes] = await Promise.all([
        supabase
          .from("customers")
          .select("id, name, phone, city, notes, follow_up_date")
          .order("name"),
        supabase.from("sales").select("customer_id, revenue, balance_due"),
      ]);

      const rows = (customersRes.data ?? []) as CustomerRow[];
      const sales = salesRes.data ?? [];

      // Add up each customer's orders, total value, and unpaid balance.
      const stats = new Map<
        string,
        { orders: number; value: number; outstanding: number }
      >();
      for (const s of sales) {
        const cid = (s as { customer_id: string | null }).customer_id;
        if (!cid) continue;
        const cur = stats.get(cid) ?? { orders: 0, value: 0, outstanding: 0 };
        cur.orders += 1;
        cur.value += num((s as { revenue: unknown }).revenue);
        cur.outstanding += num((s as { balance_due: unknown }).balance_due);
        stats.set(cid, cur);
      }

      customers = rows.map((c) => {
        const st = stats.get(c.id);
        return {
          ...c,
          totalOrders: st?.orders ?? 0,
          lifetimeValue: st?.value ?? 0,
          outstanding: st?.outstanding ?? 0,
        };
      });
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
          <span className="text-lg font-bold text-white">Customers</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        <CustomersManager customers={customers} />
      </main>
    </div>
  );
}
