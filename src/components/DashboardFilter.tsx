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

  const seg = "rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors";
  const segOn = "bg-brand text-white shadow-sm";
  const segOff = "text-gray-500 hover:text-brand";
  const dateBox =
    "rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm";
  const dateInput =
    "block text-sm font-medium text-gray-800 outline-none [color-scheme:light]";

  return (
    <div className="flex flex-wrap items-stretch gap-3">
      <div className={dateBox}>
        <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          From
        </label>
        <input
          type="date"
          value={from}
          onChange={(e) => go(e.target.value, to)}
          className={dateInput}
        />
      </div>
      <div className={dateBox}>
        <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          To
        </label>
        <input
          type="date"
          value={to}
          onChange={(e) => go(from, e.target.value)}
          className={dateInput}
        />
      </div>
      <div className="flex items-center gap-1 rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
        <button
          onClick={() => go(p.thisMonth.from, p.thisMonth.to)}
          className={`${seg} ${active(p.thisMonth) ? segOn : segOff}`}
        >
          This Month
        </button>
        <button
          onClick={() => go(p.lastMonth.from, p.lastMonth.to)}
          className={`${seg} ${active(p.lastMonth) ? segOn : segOff}`}
        >
          Last Month
        </button>
        <button
          onClick={() => go(p.thisYear.from, p.thisYear.to)}
          className={`${seg} ${active(p.thisYear) ? segOn : segOff}`}
        >
          This Year
        </button>
      </div>
    </div>
  );
}
