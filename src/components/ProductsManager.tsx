"use client";

import { useActionState, useEffect, useState } from "react";
import { saveProduct, type ProductState } from "@/app/products/actions";

export type ProductRow = {
  id: string;
  sku: string | null;
  name: string | null;
  category: string | null;
  supplier: string | null;
  type: string | null;
  landed_cost_afn: number | null;
  margin_percent: number | null;
  selling_price: number | null;
  opening_quantity: number | null;
  current_stock: number | null;
};

const LOW_STOCK_THRESHOLD = 10;

const initialState: ProductState = {};

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

export default function ProductsManager({
  products,
}: {
  products: ProductRow[];
}) {
  const [state, formAction, pending] = useActionState(saveProduct, initialState);
  // mode: null = no form, "add" = new product, otherwise a product id = edit
  const [mode, setMode] = useState<string | null>(null);

  useEffect(() => {
    if (state.success) setMode(null);
  }, [state]);

  const editing =
    mode && mode !== "add"
      ? (products.find((p) => p.id === mode) ?? null)
      : null;
  const showForm = mode !== null;

  return (
    <div>
      {!showForm && (
        <button
          onClick={() => setMode("add")}
          className="w-full rounded-xl bg-brand py-3.5 text-base font-semibold text-white transition-colors hover:bg-brand-dark sm:w-auto sm:px-6"
        >
          + Add Product
        </button>
      )}

      {showForm && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-brand">
              {editing ? "Edit Product" : "Add Product"}
            </h2>
            <button
              onClick={() => setMode(null)}
              className="text-sm font-medium text-gray-500 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>

          <form key={mode} action={formAction} className="space-y-4">
            {editing && (
              <input type="hidden" name="id" defaultValue={editing.id} />
            )}

            <div>
              <label className={labelClass}>Product name *</label>
              <input
                name="name"
                required
                defaultValue={editing?.name ?? ""}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>SKU</label>
                <input
                  name="sku"
                  defaultValue={editing?.sku ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Category</label>
                <input
                  name="category"
                  defaultValue={editing?.category ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Supplier</label>
                <input
                  name="supplier"
                  defaultValue={editing?.supplier ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Type</label>
                <select
                  name="type"
                  defaultValue={editing?.type ?? "Imported"}
                  className={inputClass}
                >
                  <option value="Imported">Imported</option>
                  <option value="Local">Local</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Landed cost (AFN)</label>
                <input
                  name="landed_cost_afn"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={editing?.landed_cost_afn ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Margin %</label>
                <input
                  name="margin_percent"
                  type="number"
                  step="0.01"
                  defaultValue={editing?.margin_percent ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Selling price (AFN)</label>
                <input
                  name="selling_price"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={editing?.selling_price ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Opening quantity</label>
                <input
                  name="opening_quantity"
                  type="number"
                  step="1"
                  min="0"
                  defaultValue={editing?.opening_quantity ?? 0}
                  className={inputClass}
                />
                {editing && (
                  <p className="mt-1 text-xs text-gray-400">
                    Changing this does not change current stock — stock is set by
                    your purchases and sales.
                  </p>
                )}
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
              {pending ? "Saving…" : "Save Product"}
            </button>
          </form>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {products.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-500">
            No products yet. Tap “Add Product” to create your first one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-brand text-white">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">
                    SKU
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">
                    Name
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">
                    Category
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">
                    Type
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                    Landed cost
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                    Selling price
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                    Stock
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                    Stock value
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                    Edit
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p) => {
                  const stock = num(p.current_stock);
                  const isLow = stock < LOW_STOCK_THRESHOLD;
                  const stockValue = stock * num(p.landed_cost_afn);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                        {p.sku ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                        {p.name ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                        {p.category ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                        {p.type ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                        {afn(num(p.landed_cost_afn))}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                        {afn(num(p.selling_price))}
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${
                          isLow ? "text-red-600" : "text-gray-900"
                        }`}
                      >
                        {stock.toLocaleString("en-US")}
                        {isLow && (
                          <span className="ml-1 text-xs font-normal">(low)</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                        {afn(stockValue)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button
                          onClick={() => setMode(p.id)}
                          className="rounded-lg border border-brand/30 px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand/5"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
