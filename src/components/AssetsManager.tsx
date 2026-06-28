"use client";

import { useActionState, useEffect, useState } from "react";
import { addAsset, type AssetState } from "@/app/assets/actions";

export type AssetRow = {
  id: string;
  asset_name: string | null;
  category: string | null;
  purchase_date: string | null;
  cost: number | null;
  useful_life_years: number | null;
  annual_depreciation: number | null;
  net_book_value: number | null;
};

const initialState: AssetState = {};

const inputClass =
  "w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";
const labelClass = "mb-1 block text-sm font-medium text-brand";

function afn(n: number): string {
  return `${Math.round(n).toLocaleString("en-US")} AFN`;
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function AssetsManager({ assets }: { assets: AssetRow[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addAsset, initialState);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state]);

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full rounded-xl bg-brand py-3.5 text-base font-semibold text-white transition-colors hover:bg-brand-dark sm:w-auto sm:px-6"
        >
          + Add Asset
        </button>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-brand">Add Asset</h2>
            <button
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-gray-500 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>

          <form key={open ? "open" : "closed"} action={formAction} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Asset name</label>
                <input
                  name="asset_name"
                  required
                  className={inputClass}
                  placeholder="e.g. Delivery motorbike"
                />
              </div>
              <div>
                <label className={labelClass}>Category</label>
                <input
                  name="category"
                  list="asset-categories"
                  className={inputClass}
                  placeholder="e.g. Vehicle"
                />
                <datalist id="asset-categories">
                  <option value="Vehicle" />
                  <option value="Equipment" />
                  <option value="Furniture" />
                  <option value="Electronics" />
                  <option value="Building" />
                  <option value="Other" />
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Purchase date</label>
                <input
                  name="purchase_date"
                  type="date"
                  defaultValue={today}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Cost (AFN)</label>
                <input
                  name="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Useful life (years)</label>
              <input
                name="useful_life_years"
                type="number"
                step="0.5"
                min="0"
                className={inputClass}
                placeholder="e.g. 5"
              />
              <p className="mt-1 text-xs text-gray-400">
                How many years you expect to use it. Used to spread the cost
                over time (depreciation).
              </p>
            </div>

            {state.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-brand py-3.5 text-base font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save Asset"}
            </button>
          </form>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {assets.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-500">
            No assets yet. Add equipment, vehicles, or furniture your business
            owns.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-brand text-white">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Asset</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Bought</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Cost</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Yearly depreciation</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Current value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assets.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">
                      {a.asset_name ?? "—"}
                      {a.category ? (
                        <span className="block text-xs text-gray-400">
                          {a.category}
                        </span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {a.purchase_date ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                      {afn(num(a.cost))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                      {a.useful_life_years
                        ? afn(num(a.annual_depreciation))
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-900">
                      {afn(num(a.net_book_value))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
