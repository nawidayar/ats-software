import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";
import DashboardFilter from "@/components/DashboardFilter";

function afn(n: number): string {
  return `${Math.round(n).toLocaleString("en-US")} AFN`;
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

function monthsBetween(from: string, to: string): string[] {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  const out: string[] = [];
  let y = fy;
  let m = fm;
  // Guard against bad ranges and cap the list so the chart stays readable.
  while ((y < ty || (y === ty && m <= tm)) && out.length < 24) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

type SaleRow = {
  date: string | null;
  revenue_afn: number | null;
  cogs_afn: number | null;
  gross_profit_afn: number | null;
  balance_due_afn: number | null;
};
type ExpenseRow = { date: string | null; amount_afn: number | null };
type ProductRow = {
  id: string;
  name: string | null;
  sku: string | null;
  current_stock: number | null;
  landed_cost_afn: number | null;
};

function Kpi({
  label,
  value,
  hint,
  accent = "navy",
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "navy" | "green" | "red" | "amber";
}) {
  const valueColor =
    accent === "green"
      ? "text-green-600"
      : accent === "red"
        ? "text-red-600"
        : accent === "amber"
          ? "text-amber-600"
          : "text-brand";
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${valueColor}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;

  // Default range = this calendar month up to today.
  const now = new Date();
  const defaultFrom = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
  const defaultTo = ymd(now);
  const from = sp.from ?? defaultFrom;
  const to = sp.to ?? defaultTo;

  let user = null;
  let businessName = "your business";
  let sales: SaleRow[] = [];
  let expenses: ExpenseRow[] = [];
  let products: ProductRow[] = [];
  let receivablesTotal = 0;
  let payablesTotal = 0;
  let assetsCost = 0;
  let purchasesTotal = 0;
  let customerCount = 0;

  try {
    const supabase = await createClient();
    const {
      data: { user: signedInUser },
    } = await supabase.auth.getUser();
    user = signedInUser;

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", user.id)
        .single();

      const [
        businessRes,
        salesRes,
        expensesRes,
        productsRes,
        receivablesRes,
        payablesRes,
        assetsRes,
        purchasesRes,
        customersRes,
      ] = await Promise.all([
        profile?.business_id
          ? supabase
              .from("businesses")
              .select("name")
              .eq("id", profile.business_id)
              .single()
          : Promise.resolve({ data: null }),
        supabase
          .from("sales")
          .select("date, revenue_afn, cogs_afn, gross_profit_afn, balance_due_afn"),
        supabase.from("expenses").select("date, amount_afn"),
        supabase
          .from("products")
          .select("id, name, sku, current_stock, landed_cost_afn")
          .order("current_stock"),
        supabase.from("receivables").select("balance"),
        supabase.from("payables").select("balance"),
        supabase.from("assets").select("cost"),
        supabase.from("purchases").select("total_landed_cost_afn"),
        supabase
          .from("customers")
          .select("id", { count: "exact", head: true }),
      ]);

      const business = businessRes.data as { name?: string } | null;
      if (business?.name) businessName = business.name;

      sales = (salesRes.data ?? []) as SaleRow[];
      expenses = (expensesRes.data ?? []) as ExpenseRow[];
      products = (productsRes.data ?? []) as ProductRow[];
      receivablesTotal = (receivablesRes.data ?? []).reduce(
        (s, r) => s + num((r as { balance: unknown }).balance),
        0,
      );
      payablesTotal = (payablesRes.data ?? []).reduce(
        (s, r) => s + num((r as { balance: unknown }).balance),
        0,
      );
      assetsCost = (assetsRes.data ?? []).reduce(
        (s, r) => s + num((r as { cost: unknown }).cost),
        0,
      );
      purchasesTotal = (purchasesRes.data ?? []).reduce(
        (s, r) =>
          s + num((r as { total_landed_cost_afn: unknown }).total_landed_cost_afn),
        0,
      );
      customerCount = (customersRes as { count: number | null }).count ?? 0;
    }
  } catch {
    // If Supabase isn't configured, fall through to the login redirect below.
  }

  if (!user) redirect("/login");

  const inRange = (d: string | null) => !!d && d >= from && d <= to;

  // ---- Period figures (change with the date range) ----
  const periodSales = sales.filter((s) => inRange(s.date));
  const periodRevenue = periodSales.reduce((s, r) => s + num(r.revenue_afn), 0);
  const periodCogs = periodSales.reduce((s, r) => s + num(r.cogs_afn), 0);
  const periodGross = periodSales.reduce(
    (s, r) => s + num(r.gross_profit_afn),
    0,
  );
  const periodExpenses = expenses
    .filter((e) => inRange(e.date))
    .reduce((s, e) => s + num(e.amount_afn), 0);
  const periodNet = periodGross - periodExpenses;

  // ---- Current snapshot figures (always "now", not date-filtered) ----
  const inventoryValue = products.reduce(
    (s, p) => s + num(p.current_stock) * num(p.landed_cost_afn),
    0,
  );
  const allGross = sales.reduce((s, r) => s + num(r.gross_profit_afn), 0);
  const allExpenses = expenses.reduce((s, e) => s + num(e.amount_afn), 0);
  const accumulatedProfit = allGross - allExpenses;
  const businessInvestment = inventoryValue + assetsCost + accumulatedProfit;
  const collectedFromSales = sales.reduce(
    (s, r) => s + (num(r.revenue_afn) - num(r.balance_due_afn)),
    0,
  );
  const cashPosition =
    collectedFromSales - allExpenses - purchasesTotal - assetsCost;

  // ---- Low stock ----
  const lowStock = products.filter((p) => num(p.current_stock) < 5);

  // ---- Monthly chart (within range) ----
  const monthKeys = monthsBetween(from, to);
  const monthRevenue = new Map<string, number>();
  const monthGross = new Map<string, number>();
  const monthExpense = new Map<string, number>();
  for (const s of periodSales) {
    if (!s.date) continue;
    const k = s.date.slice(0, 7);
    monthRevenue.set(k, (monthRevenue.get(k) ?? 0) + num(s.revenue_afn));
    monthGross.set(k, (monthGross.get(k) ?? 0) + num(s.gross_profit_afn));
  }
  for (const e of expenses) {
    if (!inRange(e.date) || !e.date) continue;
    const k = e.date.slice(0, 7);
    monthExpense.set(k, (monthExpense.get(k) ?? 0) + num(e.amount_afn));
  }
  const chart = monthKeys.map((k) => {
    const revenue = monthRevenue.get(k) ?? 0;
    const profit = (monthGross.get(k) ?? 0) - (monthExpense.get(k) ?? 0);
    return { key: k, revenue, profit };
  });
  const chartMax = Math.max(
    1,
    ...chart.map((c) => Math.max(c.revenue, Math.abs(c.profit))),
  );

  const modules = [
    { name: "Products", href: "/products" },
    { name: "Sales", href: "/sales" },
    { name: "Customers", href: "/customers" },
    { name: "Expenses", href: "/expenses" },
    { name: "Purchases", href: "/purchases" },
    { name: "Receivables", href: "/receivables" },
    { name: "Payables", href: "/payables" },
    { name: "Assets", href: "/assets" },
  ];

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="flex items-center justify-between bg-brand px-5 py-4">
        <div>
          <p className="text-lg font-bold tracking-wide text-white">ATS</p>
          <p className="text-xs text-white/70">{businessName}</p>
        </div>
        <LogoutButton />
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-bold text-brand">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Showing {from} → {to}
          </p>
        </div>

        <div className="mt-4">
          <DashboardFilter from={from} to={to} />
        </div>

        {/* KPI cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Kpi
            label="Total Revenue"
            value={afn(periodRevenue)}
            hint="selected period"
          />
          <Kpi
            label="Gross Profit"
            value={afn(periodGross)}
            hint="selected period"
            accent={periodGross >= 0 ? "green" : "red"}
          />
          <Kpi
            label="Net Profit"
            value={afn(periodNet)}
            hint="selected period"
            accent={periodNet >= 0 ? "green" : "red"}
          />
          <Kpi
            label="Inventory Value"
            value={afn(inventoryValue)}
            hint="at cost · now"
          />
          <Kpi
            label="Business Investment"
            value={afn(businessInvestment)}
            hint="inventory + assets + profit"
          />
          <Kpi
            label="Receivables"
            value={afn(receivablesTotal)}
            hint="owed to you · now"
            accent="amber"
          />
          <Kpi
            label="Payables"
            value={afn(payablesTotal)}
            hint="you owe · now"
            accent={payablesTotal > 0 ? "red" : "navy"}
          />
          <Kpi
            label="Cash Position"
            value={afn(cashPosition)}
            hint="estimated · now"
            accent={cashPosition >= 0 ? "green" : "red"}
          />
          <Kpi label="Customers" value={String(customerCount)} hint="total" />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Low stock */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-brand">Low Stock Alert</h2>
            <p className="mb-3 text-xs text-gray-500">
              Products with fewer than 5 in stock.
            </p>
            {lowStock.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">
                All products are well stocked.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {lowStock.map((p) => {
                  const out = num(p.current_stock) <= 0;
                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {p.name ?? "Unnamed"}
                        </p>
                        {p.sku ? (
                          <p className="text-xs text-gray-400">{p.sku}</p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            out
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {out ? "Out of Stock" : "Low Stock"}
                        </span>
                        <p className="mt-1 text-xs text-gray-500">
                          {num(p.current_stock)} in stock
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Profit & Loss */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-brand">
              Profit &amp; Loss
            </h2>
            <p className="mb-3 text-xs text-gray-500">For the selected period.</p>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Revenue</dt>
                <dd className="font-medium text-gray-900">
                  {afn(periodRevenue)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Cost of goods sold</dt>
                <dd className="font-medium text-red-600">
                  −{afn(periodCogs)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2">
                <dt className="text-gray-600">Gross profit</dt>
                <dd
                  className={`font-semibold ${
                    periodGross >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {afn(periodGross)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Expenses</dt>
                <dd className="font-medium text-red-600">
                  −{afn(periodExpenses)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2">
                <dt className="font-semibold text-gray-800">Net profit</dt>
                <dd
                  className={`text-base font-bold ${
                    periodNet >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {afn(periodNet)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Revenue & profit by month */}
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-brand">
            Revenue &amp; Profit by Month
          </h2>
          <div className="mb-4 mt-1 flex gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-brand" />
              Revenue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-500" />
              Net profit
            </span>
          </div>
          {chart.every((c) => c.revenue === 0 && c.profit === 0) ? (
            <p className="py-6 text-center text-sm text-gray-500">
              No sales or expenses in this period yet.
            </p>
          ) : (
            <div className="space-y-4">
              {chart.map((c) => (
                <div key={c.key}>
                  <div className="mb-1 flex justify-between text-xs text-gray-500">
                    <span>{monthLabel(c.key)}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="h-3 flex-1 rounded-full bg-gray-100">
                        <div
                          className="h-3 rounded-full bg-brand"
                          style={{
                            width: `${(c.revenue / chartMax) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-28 text-right text-xs text-gray-600">
                        {afn(c.revenue)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 flex-1 rounded-full bg-gray-100">
                        <div
                          className={`h-3 rounded-full ${
                            c.profit >= 0 ? "bg-green-500" : "bg-red-500"
                          }`}
                          style={{
                            width: `${(Math.abs(c.profit) / chartMax) * 100}%`,
                          }}
                        />
                      </div>
                      <span
                        className={`w-28 text-right text-xs ${
                          c.profit >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {afn(c.profit)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick links to the modules */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {modules.map((m) => (
            <Link
              key={m.name}
              href={m.href}
              className="rounded-2xl border border-brand/20 bg-white p-4 text-center text-sm font-semibold text-brand shadow-sm transition-colors hover:bg-brand/5"
            >
              {m.name}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
