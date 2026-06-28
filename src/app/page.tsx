import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Bell,
  DollarSign,
  FileText,
  Handshake,
  Landmark,
  Package,
  TrendingDown,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";
import DashboardFilter from "@/components/DashboardFilter";
import {
  RevenueProfitChart,
  CategoryDonut,
  type CategorySlice,
  type TrendPoint,
} from "@/components/DashboardCharts";

function money(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

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

function prettyDate(s: string): string {
  const [y, m, d] = s.split("-").map(Number);
  return `${d} ${MONTH_NAMES[m - 1]} ${y}`;
}

function parseYmd(s: string): Date {
  return new Date(`${s}T00:00:00`);
}

function addDaysStr(s: string, n: number): string {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

function diffDays(a: string, b: string): number {
  return Math.round((parseYmd(b).getTime() - parseYmd(a).getTime()) / 86400000);
}

function monthsBetween(from: string, to: string): string[] {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  const out: string[] = [];
  let y = fy;
  let m = fm;
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

type Trend = { dir: "up" | "down"; pct: number };

function trendFor(cur: number, prev: number): Trend | null {
  if (prev === 0) return null;
  return {
    dir: cur >= prev ? "up" : "down",
    pct: Math.abs(((cur - prev) / Math.abs(prev)) * 100),
  };
}

type SaleRow = {
  date: string | null;
  invoice_number: string | null;
  payment_status: string | null;
  created_at: string | null;
  revenue_afn: number | null;
  cogs_afn: number | null;
  gross_profit_afn: number | null;
  customer_name: string | null;
  product_category: string | null;
};
type ExpenseRow = { date: string | null; amount_afn: number | null };
type ProductRow = {
  id: string;
  name: string | null;
  sku: string | null;
  current_stock: number | null;
  landed_cost_afn: number | null;
};

const GRADIENTS = {
  navy: "linear-gradient(135deg, #20356b 0%, #14264D 100%)",
  green: "linear-gradient(135deg, #1fa85a 0%, #157a43 100%)",
  red: "linear-gradient(135deg, #f0584f 0%, #d12f2f 100%)",
  blue: "linear-gradient(135deg, #4a90f0 0%, #2563EB 100%)",
  gold: "linear-gradient(135deg, #d9a957 0%, #c0852f 100%)",
  teal: "linear-gradient(135deg, #19c2ad 0%, #0f9488 100%)",
  slate: "linear-gradient(135deg, #5b6b82 0%, #3c4659 100%)",
  purple: "linear-gradient(135deg, #9a6bf2 0%, #6d28d9 100%)",
};

function KpiCard({
  label,
  value,
  caption,
  icon: Icon,
  gradient,
  trend,
}: {
  label: string;
  value: string;
  caption: string;
  icon: LucideIcon;
  gradient: string;
  trend?: Trend | null;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg"
      style={{ background: gradient }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-white/80">{label}</p>
        {trend ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
            {trend.dir === "up" ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )}
            {trend.pct.toFixed(1)}%
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs italic text-white/70">{caption}</p>
      <Icon className="pointer-events-none absolute -bottom-4 -right-3 h-24 w-24 text-white/10" />
    </div>
  );
}

function StatusPill({ status }: { status: string | null }) {
  const styles: Record<string, string> = {
    Paid: "bg-green-100 text-green-700",
    Credit: "bg-red-100 text-red-700",
    Partial: "bg-amber-100 text-amber-700",
  };
  const cls = styles[status ?? ""] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>
      {status ?? "—"}
    </span>
  );
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;

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
          .select(
            "date, invoice_number, payment_status, created_at, revenue_afn, cogs_afn, gross_profit_afn, customers(name), products(category)",
          ),
        supabase.from("expenses").select("date, amount_afn"),
        supabase
          .from("products")
          .select("id, name, sku, current_stock, landed_cost_afn")
          .order("current_stock"),
        supabase.from("receivables").select("balance"),
        supabase.from("payables").select("balance"),
        supabase.from("assets").select("cost"),
        supabase
          .from("customers")
          .select("id", { count: "exact", head: true }),
      ]);

      const business = businessRes.data as { name?: string } | null;
      if (business?.name) businessName = business.name;

      sales = ((salesRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
        date: (r.date as string | null) ?? null,
        invoice_number: (r.invoice_number as string | null) ?? null,
        payment_status: (r.payment_status as string | null) ?? null,
        created_at: (r.created_at as string | null) ?? null,
        revenue_afn: (r.revenue_afn as number | null) ?? null,
        cogs_afn: (r.cogs_afn as number | null) ?? null,
        gross_profit_afn: (r.gross_profit_afn as number | null) ?? null,
        customer_name:
          (r.customers as { name: string | null } | null)?.name ?? null,
        product_category:
          (r.products as { category: string | null } | null)?.category ?? null,
      }));
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

  // ---- Previous period (for the trend badges) ----
  const len = diffDays(from, to); // inclusive day count - 1
  const prevTo = addDaysStr(from, -1);
  const prevFrom = addDaysStr(from, -(len + 1));
  const inPrev = (d: string | null) => !!d && d >= prevFrom && d <= prevTo;
  const prevSales = sales.filter((s) => inPrev(s.date));
  const prevRevenue = prevSales.reduce((s, r) => s + num(r.revenue_afn), 0);
  const prevGross = prevSales.reduce((s, r) => s + num(r.gross_profit_afn), 0);
  const prevExpenses = expenses
    .filter((e) => inPrev(e.date))
    .reduce((s, e) => s + num(e.amount_afn), 0);
  const prevNet = prevGross - prevExpenses;

  // ---- Current snapshot figures ----
  const inventoryValue = products.reduce(
    (s, p) => s + num(p.current_stock) * num(p.landed_cost_afn),
    0,
  );
  const allGross = sales.reduce((s, r) => s + num(r.gross_profit_afn), 0);
  const allExpenses = expenses.reduce((s, e) => s + num(e.amount_afn), 0);
  const accumulatedProfit = allGross - allExpenses;
  const businessInvestment = inventoryValue + assetsCost + accumulatedProfit;

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
  const trendData: TrendPoint[] = monthKeys.map((k) => ({
    month: MONTH_NAMES[Number(k.split("-")[1]) - 1],
    revenue: monthRevenue.get(k) ?? 0,
    profit: (monthGross.get(k) ?? 0) - (monthExpense.get(k) ?? 0),
  }));

  // ---- Sales by category (within range) ----
  const catMap = new Map<string, number>();
  for (const s of periodSales) {
    const cat = s.product_category ?? "Uncategorized";
    catMap.set(cat, (catMap.get(cat) ?? 0) + num(s.revenue_afn));
  }
  const catTotal = [...catMap.values()].reduce((s, v) => s + v, 0);
  const sortedCats = [...catMap.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const topCats = sortedCats.slice(0, 5);
  const restTotal = sortedCats.slice(5).reduce((s, [, v]) => s + v, 0);
  const categoryData: CategorySlice[] = [
    ...topCats.map(([name, value]) => ({
      name,
      value,
      percent: catTotal > 0 ? Math.round((value / catTotal) * 100) : 0,
    })),
    ...(restTotal > 0
      ? [
          {
            name: "Other",
            value: restTotal,
            percent: Math.round((restTotal / catTotal) * 100),
          },
        ]
      : []),
  ];

  // ---- Recent sales (latest overall) ----
  const recentSales = [...sales]
    .sort((a, b) =>
      (b.created_at ?? b.date ?? "").localeCompare(a.created_at ?? a.date ?? ""),
    )
    .slice(0, 5);

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

  const cardWrap =
    "rounded-2xl border border-gray-100 bg-white p-6 shadow-sm";

  return (
    <div className="min-h-dvh bg-[#F4F6FA]">
      <header
        className="flex items-center justify-between px-5 py-4 sm:px-8"
        style={{ background: GRADIENTS.navy }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-sm font-bold text-brand shadow">
            ATS
          </div>
          <div>
            <p className="text-lg font-bold text-white">Arvin Tech Solution</p>
            <p className="text-xs text-white/70">
              {businessName} · Business Management
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Bell className="h-5 w-5 text-amber-300" />
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-3xl font-bold text-brand">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Showing {prettyDate(from)} → {prettyDate(to)}
          </p>
        </div>

        <div className="mt-4">
          <DashboardFilter from={from} to={to} />
        </div>

        {/* KPI cards */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Total Revenue"
            value={money(periodRevenue)}
            caption="AFN · selected period"
            icon={DollarSign}
            gradient={GRADIENTS.navy}
            trend={trendFor(periodRevenue, prevRevenue)}
          />
          <KpiCard
            label="Gross Profit"
            value={money(periodGross)}
            caption="AFN · selected period"
            icon={TrendingUp}
            gradient={GRADIENTS.green}
            trend={trendFor(periodGross, prevGross)}
          />
          <KpiCard
            label="Net Profit"
            value={money(periodNet)}
            caption="AFN · selected period"
            icon={periodNet >= 0 ? TrendingUp : TrendingDown}
            gradient={periodNet >= 0 ? GRADIENTS.green : GRADIENTS.red}
            trend={trendFor(periodNet, prevNet)}
          />
          <KpiCard
            label="Inventory Value"
            value={money(inventoryValue)}
            caption="AFN · at cost"
            icon={Package}
            gradient={GRADIENTS.blue}
          />
          <KpiCard
            label="Business Investment"
            value={money(businessInvestment)}
            caption="inventory + assets + profit"
            icon={Landmark}
            gradient={GRADIENTS.gold}
          />
          <KpiCard
            label="Receivables"
            value={money(receivablesTotal)}
            caption="AFN · owed to you"
            icon={Handshake}
            gradient={GRADIENTS.teal}
          />
          <KpiCard
            label="Payables"
            value={money(payablesTotal)}
            caption="AFN · you owe"
            icon={FileText}
            gradient={GRADIENTS.slate}
          />
          <KpiCard
            label="Customers"
            value={money(customerCount)}
            caption="total active"
            icon={Users}
            gradient={GRADIENTS.purple}
          />
        </div>

        {/* Charts */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className={`${cardWrap} lg:col-span-2`}>
            <h2 className="text-lg font-bold text-brand">
              Revenue &amp; Profit Trend
            </h2>
            <p className="text-sm text-gray-400">
              Monthly performance across the business
            </p>
            <div className="mt-3 mb-2 flex gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#2563EB]" />
                Revenue
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#16A34A]" />
                Net Profit
              </span>
            </div>
            <RevenueProfitChart data={trendData} />
          </div>
          <div className={cardWrap}>
            <h2 className="text-lg font-bold text-brand">Sales by Category</h2>
            <p className="mb-4 text-sm text-gray-400">Share of revenue</p>
            <CategoryDonut data={categoryData} />
          </div>
        </div>

        {/* Tables */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent sales */}
          <div className={cardWrap}>
            <h2 className="text-lg font-bold text-brand">Recent Sales</h2>
            <p className="mb-4 text-sm text-gray-400">Latest transactions</p>
            {recentSales.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
                No sales recorded yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-gray-400">
                      <th className="px-2 py-2 font-semibold">Invoice</th>
                      <th className="px-2 py-2 font-semibold">Customer</th>
                      <th className="px-2 py-2 text-right font-semibold">
                        Amount
                      </th>
                      <th className="px-2 py-2 text-right font-semibold">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentSales.map((s, i) => (
                      <tr key={`${s.invoice_number ?? "sale"}-${i}`}>
                        <td className="px-2 py-3 font-medium text-gray-700">
                          {s.invoice_number ?? "—"}
                        </td>
                        <td className="px-2 py-3 text-gray-700">
                          {s.customer_name ?? "—"}
                        </td>
                        <td className="px-2 py-3 text-right font-semibold text-gray-900">
                          {money(num(s.revenue_afn))}
                        </td>
                        <td className="px-2 py-3 text-right">
                          <StatusPill status={s.payment_status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Profit & Loss */}
          <div className={cardWrap}>
            <h2 className="text-lg font-bold text-brand">Profit &amp; Loss</h2>
            <p className="mb-4 text-sm text-gray-400">For the selected period</p>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Revenue</dt>
                <dd className="font-medium text-gray-900">
                  {afn(periodRevenue)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Cost of goods sold</dt>
                <dd className="font-medium text-red-600">−{afn(periodCogs)}</dd>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-3">
                <dt className="font-semibold text-gray-700">Gross profit</dt>
                <dd
                  className={`font-bold ${
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
              <div className="flex justify-between border-t-2 border-gray-200 pt-3">
                <dt className="text-base font-bold text-gray-800">Net profit</dt>
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

        {/* Low stock */}
        <div className={`${cardWrap} mt-6`}>
          <h2 className="text-lg font-bold text-brand">Low Stock Alert</h2>
          <p className="mb-4 text-sm text-gray-400">
            Products with fewer than 5 in stock
          </p>
          {lowStock.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              All products are well stocked.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {lowStock.map((p) => {
                const out = num(p.current_stock) <= 0;
                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
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

        {/* Quick links */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {modules.map((m) => (
            <Link
              key={m.name}
              href={m.href}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-3 text-center text-sm font-semibold text-brand shadow-sm transition-colors hover:bg-brand/5"
            >
              {m.name}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
