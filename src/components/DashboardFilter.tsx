"use client";

import { useRouter } from "next/navigation";

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function presets() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return {
    thisMonth: { from: ymd(new Date(y, m, 1)), to: ymd(now) },
    lastMonth: {
      from: ymd(new Date(y, m - 1, 1)),
      to: ymd(new Date(y, m, 0)), // day 0 of this month = last day of previous month
    },
    thisYear: { from: ymd(new Date(y, 0, 1)), to: ymd(now) },
  };
}

export default function DashboardFilter({
  from,
  to,
}: {
  from: string;
  to: string;
}) {
  const router = useRouter();
  const p = presets();

  function go(nextFrom: string, nextTo: string) {
    router.push(`/?from=${nextFrom}&to=${nextTo}`);
  }

  const active = (r: { from: string; to: string }) =>
    r.from === from && r.to === to;

  const quick = "rounded-lg px-3 py-2 text-sm font-medium transition-colors";
  const quickOn = "bg-brand text-white";
  const quickOff =
    "bg-white text-brand border border-brand/20 hover:bg-brand/5";
  const dateInput =
    "rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-brand/60">
            From
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => go(e.target.value, to)}
            className={dateInput}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-brand/60">
            To
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => go(from, e.target.value)}
            className={dateInput}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => go(p.thisMonth.from, p.thisMonth.to)}
            className={`${quick} ${active(p.thisMonth) ? quickOn : quickOff}`}
          >
            This Month
          </button>
          <button
            onClick={() => go(p.lastMonth.from, p.lastMonth.to)}
            className={`${quick} ${active(p.lastMonth) ? quickOn : quickOff}`}
          >
            Last Month
          </button>
          <button
            onClick={() => go(p.thisYear.from, p.thisYear.to)}
            className={`${quick} ${active(p.thisYear) ? quickOn : quickOff}`}
          >
            This Year
          </button>
        </div>
      </div>
    </div>
  );
}
