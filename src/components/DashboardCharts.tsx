"use client";

import {
  Area,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type TrendPoint = { month: string; revenue: number; profit: number };
export type CategorySlice = { name: string; value: number; percent: number };

const CATEGORY_COLORS = [
  "#14264D",
  "#2563EB",
  "#14B8A6",
  "#D4A24E",
  "#8B5CF6",
  "#64748B",
];

function afnShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(Math.round(n));
}

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-gray-700">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-gray-600">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: p.color }}
          />
          {p.name}: {Math.round(p.value).toLocaleString("en-US")} AFN
        </p>
      ))}
    </div>
  );
}

export function RevenueProfitChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#EEF1F6" vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#9AA4B2", fontSize: 12 }}
            dy={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#9AA4B2", fontSize: 12 }}
            tickFormatter={afnShort}
            width={48}
          />
          <Tooltip content={<TrendTooltip />} />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke="#2563EB"
            strokeWidth={3}
            fill="url(#revFill)"
            dot={false}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="profit"
            name="Net Profit"
            stroke="#16A34A"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryDonut({ data }: { data: CategorySlice[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-gray-500">
        No sales in this period yet.
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative h-52 w-52 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={88}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((entry, i) => (
                <Cell
                  key={entry.name}
                  fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) =>
                `${Math.round(Number(value)).toLocaleString("en-US")} AFN`
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-brand">100%</span>
          <span className="text-xs text-gray-400">revenue</span>
        </div>
      </div>
      <ul className="w-full space-y-3">
        {data.map((slice, i) => (
          <li
            key={slice.name}
            className="flex items-center justify-between text-sm"
          >
            <span className="flex items-center gap-2 text-gray-700">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{
                  background: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                }}
              />
              {slice.name}
            </span>
            <span className="font-semibold text-gray-500">
              {slice.percent}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
