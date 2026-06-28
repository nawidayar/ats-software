"use client";

import { useActionState, useEffect, useState } from "react";
import {
  recordPurchase,
  type RecordPurchaseState,
} from "@/app/purchases/actions";

export type ProductOption = {
  id: string;
  sku: string | null;
  name: string | null;
  current_stock: number | null;
};

export type PurchaseRow = {
  id: string;
  date: string | null;
  kind: string | null;
  shipment_number: string | null;
  supplier: string | null;
  quantity: number | null;
  usd_afn_rate: number | null;
  total_landed_cost_afn: number | null;
  landed_cost_per_unit_afn: number | null;
  product_name: string | null;
  product_sku: string | null;
};

const initialState: RecordPurchaseState = {};

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

export default function PurchasesManager({
  products,
  purchases,
}: {
  products: ProductOption[];
  purchases: PurchaseRow[];
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"Import" | "Local">("Import");
  const [state, formAction, pending] = useActionState(
    recordPurchase,
    initialState,
  );

  // Controlled numbers so we can show a live cost preview as the user types.
  const [quantity, setQuantity] = useState("");
  const [productCostUsd, setProductCostUsd] = useState("");
  const [chinaInlandUsd, setChinaInlandUsd] = useState("");
  const [freightUsd, setFreightUsd] = useState("");
  const [usdAfnRate, setUsdAfnRate] = useState("");
  const [totalAfn, setTotalAfn] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      setQuantity("");
      setProductCostUsd("");
      setChinaInlandUsd("");
      setFreightUsd("");
      setUsdAfnRate("");
      setTotalAfn("");
    }
  }, [state]);

  const qty = num(quantity);
  const importTotalAfn =
    (num(productCostUsd) + num(chinaInlandUsd) + num(freightUsd)) *
    num(usdAfnRate);
  const localTotalAfn = num(totalAfn);
  const previewTotal = kind === "Import" ? importTotalAfn : localTotalAfn;
  const previewPerUnit = qty > 0 ? previewTotal / qty : 0;

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full rounded-xl bg-brand py-3.5 text-base font-semibold text-white transition-colors hover:bg-brand-dark sm:w-auto sm:px-6"
        >
          + Record Purchase
        </button>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-brand">Record Purchase</h2>
            <button
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-gray-500 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>

          {/* Switch between a China import and a simple local purchase. */}
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setKind("Import")}
              className={`rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                kind === "Import"
                  ? "bg-brand text-white"
                  : "text-brand hover:bg-white"
              }`}
            >
              China import
            </button>
            <button
              type="button"
              onClick={() => setKind("Local")}
              className={`rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                kind === "Local"
                  ? "bg-brand text-white"
                  : "text-brand hover:bg-white"
              }`}
            >
              Local purchase
            </button>
          </div>

          {products.length === 0 ? (
            <p className="rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-800">
              You have no products yet. Add a product first, then record a
              purchase to stock it.
            </p>
          ) : (
            <form
              key={kind}
              action={formAction}
              className="space-y-4"
            >
              <input type="hidden" name="kind" value={kind} />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Date</label>
                  <input
                    name="date"
                    type="date"
                    defaultValue={today}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Supplier</label>
                  <input
                    name="supplier"
                    className={inputClass}
                    placeholder={
                      kind === "Import" ? "e.g. Guangzhou supplier" : "e.g. Kabul market"
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Product</label>
                  <select name="product_id" className={inputClass} defaultValue="">
                    <option value="" disabled>
                      Choose a product…
                    </option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name ?? "Unnamed"}
                        {p.sku ? ` (${p.sku})` : ""} — stock {num(p.current_stock)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Quantity</label>
                  <input
                    name="quantity"
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className={inputClass}
                    placeholder="How many units"
                  />
                </div>
              </div>

              {kind === "Import" ? (
                <>
                  <div>
                    <label className={labelClass}>Shipment number</label>
                    <input
                      name="shipment_number"
                      className={inputClass}
                      placeholder="Optional reference"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Product cost (USD, total)</label>
                      <input
                        name="product_cost_usd"
                        type="number"
                        step="0.01"
                        min="0"
                        value={productCostUsd}
                        onChange={(e) => setProductCostUsd(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>China inland cost (USD)</label>
                      <input
                        name="china_inland_usd"
                        type="number"
                        step="0.01"
                        min="0"
                        value={chinaInlandUsd}
                        onChange={(e) => setChinaInlandUsd(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Cargo / freight (USD)</label>
                      <input
                        name="freight_usd"
                        type="number"
                        step="0.01"
                        min="0"
                        value={freightUsd}
                        onChange={(e) => setFreightUsd(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>USD → AFN rate</label>
                      <input
                        name="usd_afn_rate"
                        type="number"
                        step="0.0001"
                        min="0"
                        value={usdAfnRate}
                        onChange={(e) => setUsdAfnRate(e.target.value)}
                        className={inputClass}
                        placeholder="e.g. 70"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className={labelClass}>Total cost (AFN)</label>
                  <input
                    name="total_afn"
                    type="number"
                    step="0.01"
                    min="0"
                    value={totalAfn}
                    onChange={(e) => setTotalAfn(e.target.value)}
                    className={inputClass}
                    placeholder="What you paid in total"
                  />
                </div>
              )}

              {/* Live landed-cost preview */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-brand/20 bg-brand/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-brand/60">
                    Total landed cost
                  </p>
                  <p className="mt-1 text-xl font-bold text-brand">
                    {afn(previewTotal)}
                  </p>
                </div>
                <div className="rounded-xl border border-brand/20 bg-brand/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-brand/60">
                    Landed cost per unit
                  </p>
                  <p className="mt-1 text-xl font-bold text-brand">
                    {afn(previewPerUnit)}
                  </p>
                </div>
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
                {pending ? "Saving…" : "Save Purchase"}
              </button>
            </form>
          )}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {purchases.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-500">
            No purchases yet. Record one to add stock to a product.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-brand text-white">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Date</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Type</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Product</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                    Qty
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                    Per unit
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {p.date ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          p.kind === "Local"
                            ? "bg-gray-100 text-gray-700"
                            : "bg-brand/10 text-brand"
                        }`}
                      >
                        {p.kind === "Local" ? "Local" : "Import"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {p.product_name ?? "—"}
                      {p.product_sku ? (
                        <span className="text-gray-400"> ({p.product_sku})</span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                      {num(p.quantity)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                      {afn(num(p.landed_cost_per_unit_afn))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-900">
                      {afn(num(p.total_landed_cost_afn))}
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
