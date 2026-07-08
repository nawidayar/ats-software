import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ExpensesManager, { type ExpenseRow } from "@/components/ExpensesManager";

function afn(n: number): string {
  return `${Math.round(n).toLocaleString("en-US")} AFN`;
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default async function ExpensesPage() {
  let user = null;
  let expenses: ExpenseRow[] = [];

  try {
    const supabase = await createClient();
    const {
      data: { user: signedInUser },
    } = await supabase.auth.getUser();
    user = signedInUser;

    if (user) {
      const { data } = await supabase
        .from("expenses")
        .select("id, date, category, description, amount")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      expenses = (data ?? []) as ExpenseRow[];
    }
  } catch {
    // If Supabase isn't configured, fall through to the login redirect below.
  }

  if (!user) redirect("/login");

  const total = expenses.reduce((sum, e) => sum + num(e.amount), 0);
  const thisMonthPrefix = new Date().toISOString().slice(0, 7); // YYYY-MM
  const thisMonth = expenses.reduce(
    (sum, e) =>
      e.date && e.date.startsWith(thisMonthPrefix) ? sum + num(e.amount) : sum,
    0,
  );

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="flex items-center justify-between bg-brand px-5 py-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-white/80 hover:text-white">
            ← Home
          </Link>
          <span className="text-lg font-bold text-white">Expenses</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        {/* Totals */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-brand p-5 text-white shadow-sm">
            <p className="text-xs uppercase tracking-wide text-white/70">
              Total expenses (all time)
            </p>
            <p className="mt-1 text-2xl font-bold">{afn(total)}</p>
          </div>
          <div className="rounded-2xl border border-brand/20 bg-white p-5 text-brand shadow-sm">
            <p className="text-xs uppercase tracking-wide text-brand/60">
              This month
            </p>
            <p className="mt-1 text-2xl font-bold">{afn(thisMonth)}</p>
          </div>
        </div>

        <div className="mt-6">
          <ExpensesManager expenses={expenses} />
        </div>
      </main>
    </div>
  );
}
