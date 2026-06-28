import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PayablesManager, {
  type PayableRow,
} from "@/components/PayablesManager";

function afn(n: number): string {
  return `${Math.round(n).toLocaleString("en-US")} AFN`;
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default async function PayablesPage() {
  let user = null;
  let payables: PayableRow[] = [];

  try {
    const supabase = await createClient();
    const {
      data: { user: signedInUser },
    } = await supabase.auth.getUser();
    user = signedInUser;

    if (user) {
      const { data } = await supabase
        .from("payables")
        .select(
          "id, date, supplier_payee, reference, type, amount_owed, amount_paid, balance, status",
        )
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      payables = (data ?? []) as PayableRow[];
    }
  } catch {
    // If Supabase isn't configured, fall through to the login redirect below.
  }

  if (!user) redirect("/login");

  const totalOutstanding = payables.reduce((s, p) => s + num(p.balance), 0);

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="flex items-center justify-between bg-brand px-5 py-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-white/80 hover:text-white">
            ← Home
          </Link>
          <span className="text-lg font-bold text-white">Payables</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        <div className="rounded-2xl bg-brand p-5 text-white shadow-sm">
          <p className="text-xs uppercase tracking-wide text-white/70">
            Total you owe (outstanding)
          </p>
          <p className="mt-1 text-2xl font-bold">{afn(totalOutstanding)}</p>
        </div>

        <div className="mt-6">
          <PayablesManager payables={payables} />
        </div>
      </main>
    </div>
  );
}
