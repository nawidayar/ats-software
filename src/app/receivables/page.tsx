import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReceivablesManager, {
  type CustomerOption,
  type ReceivableRow,
} from "@/components/ReceivablesManager";

function afn(n: number): string {
  return `${Math.round(n).toLocaleString("en-US")} AFN`;
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default async function ReceivablesPage() {
  let user = null;
  let receivables: ReceivableRow[] = [];
  let customers: CustomerOption[] = [];

  try {
    const supabase = await createClient();
    const {
      data: { user: signedInUser },
    } = await supabase.auth.getUser();
    user = signedInUser;

    if (user) {
      const [receivablesRes, customersRes] = await Promise.all([
        supabase
          .from("receivables")
          .select(
            "id, date, invoice, type, amount_due, amount_received, balance, status, customers(name)",
          )
          .order("date", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase.from("customers").select("id, name").order("name"),
      ]);

      receivables = ((receivablesRes.data ?? []) as Record<string, unknown>[]).map(
        (row) => {
          const customer = row.customers as { name: string | null } | null;
          return { ...row, customer_name: customer?.name ?? null };
        },
      ) as ReceivableRow[];
      customers = (customersRes.data ?? []) as CustomerOption[];
    }
  } catch {
    // If Supabase isn't configured, fall through to the login redirect below.
  }

  if (!user) redirect("/login");

  const totalOutstanding = receivables.reduce(
    (s, r) => s + num(r.balance),
    0,
  );

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="flex items-center justify-between bg-brand px-5 py-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-white/80 hover:text-white">
            ← Home
          </Link>
          <span className="text-lg font-bold text-white">Receivables</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        <div className="rounded-2xl bg-brand p-5 text-white shadow-sm">
          <p className="text-xs uppercase tracking-wide text-white/70">
            Total owed to you (outstanding)
          </p>
          <p className="mt-1 text-2xl font-bold">{afn(totalOutstanding)}</p>
        </div>

        <div className="mt-6">
          <ReceivablesManager receivables={receivables} customers={customers} />
        </div>
      </main>
    </div>
  );
}
