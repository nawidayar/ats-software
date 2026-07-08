"use client";

import { useActionState, useEffect, useState } from "react";
import { recordSale, type RecordSaleState } from "@/app/sales/actions";

export type CustomerOption = { id: string; name: string | null };
export type ProductOption = {
  id: string;
  sku: string | null;
  name: string | null;
  landed_cost_afn: number | null;
  current_stock: number | null;
};

export type SaleRow = {
  id: string;
  date: string | null;
  invoice_number: string | null;
  customer_id: string | null;
  product_id: string | null;
  quantity: number | null;
  unit_price: number | null;
  payment_status: string | null;
  amount_paid: number | null;
  revenue: number | null;
  gross_profit: number | null;
  balance_due: number | null;
  customer_name: string | null;
  product_name: string | null;
  product_sku: string | null;
};

const initialState: RecordSaleState = {};

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

function str(value: unknown): string {
  return value == null ? "" : String(value);
}

// The form itself. Kept as an inner component keyed by `mode` on the parent so
// that when the user switches between "add" and editing a specific row, the
// controlled inputs re-initialise from the sale being edited.
function SaleForm({
  customers,
  products,
  editing,
  onDone,
  onCancel,
}: {
  customers: CustomerOption[];
  products: ProductOption[];
  editing: SaleRow | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(recordSale, initialState);

  const today = new Date().toISOString().slice(0, 10);
  const [productId, setProductId] = useState(str(editing?.product_id));
  const [unitCost, setUnitCost] = useState(() => {
    const p = products.find((x) => x.id === editing?.product_id);
    return p?.landed_cost_afn != null ? String(p.landed_cost_afn) : "";
  });
  const [unitPrice, setUnitPrice] = useState(str(editing?.unit_price));
  const [quantity, setQuantity] = useState(str(editing?.quantity));
  const [paymentStatus, setPaymentStatus] = useState(
    editing?.payment_status ?? "Paid",
  );
  const [amountPaid, setAmountPaid] = useState(str(editing?.amount_paid));

  useEffect(() => {
    if (state.success) onDone();
  }, [state, onDone]);

  function handleProductChange(id: string) {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    setUnitCost(p?.landed_cost_afn != null ? String(p.landed_cost_afn) : "");
  }

  const q = Number(quantity) || 0;
  const price = Number(unitPrice) || 0;
  const cost = Number(unitCost) || 0;
  const revenue = q * price;
  const cogs = q * cost;
  const grossProfit = revenue - cogs;
  const paid =
    paymentStatus === "Paid"
      ? revenue
      : paymentStatus === "Credit"
        ? 0
        : Number(amountPaid) || 0;
  const balanceDue = revenue - paid;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand">
          {editing ? "Edit Sale" : "Record Sale"}
        </h2>
        <button
          onClick={onCancel}
          className="text-sm font-medium text-gray-500 hover:text-gray-800"
        >
          Cancel
        </button>
      </div>

      {products.length === 0 && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          You have no products yet. Add one on the Products page first.
        </p>
      )}

      <form action={formAction} className="space-y-4">
        {editing && <input type="hidden" name="id" value={editing.id} />}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Date</label>
            <input
              name="date"
              type="date"
              defaultValue={editing?.date ?? today}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Invoice number</label>
            <input
              name="invoice_number"
              defaultValue={editing?.invoice_number ?? ""}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Customer</label>
          <select
            name="customer_id"
            className={inputClass}
            defaultValue={str(editing?.customer_id)}
          >
            <option value="">— No customer —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name ?? "Unnamed"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Product (by SKU)</label>
          <select
            name="product_id"
            required
            value={productId}
            onChange={(e) => handleProductChange(e.target.value)}
            className={inputClass}
          >
            <option value="">— Choose a product —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {(p.sku ? `${p.sku} — ` : "") + (p.name ?? "Unnamed")} (stock:{" "}
                {Number(p.current_stock) || 0})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Cost price (auto)</label>
            <input
              name="unit_cost"
              type="number"
              value={unitCost}
              readOnly
              className={`${inputClass} bg-gray-100 text-gray-600`}
              placeholder="Pick a product"
            />
          </div>
          <div>
            <label className={labelClass}>Selling price (AFN)</label>
            <input
              name="unit_price"
              type="number"
              step="0.01"
              min="0"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Quantity</label>
            <input
              name="quantity"
              type="number"
              step="1"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Payment status</label>
          <select
            name="payment_status"
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className={inputClass}
          >
            <option value="Paid">Paid</option>
            <option value="Credit">Credit</option>
            <option value="Partial">Partial</option>
          </select>
        </div>

        {paymentStatus === "Partial" && (
          <div>
            <label className={labelClass}>Amount paid now (AFN)</label>
            <input
              name="amount_paid"
              type="number"
              step="0.01"
              min="0"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              className={inputClass}
            />
          </div>
        )}

        {/* Live summary */}
        <div className="rounded-xl bg-gray-50 p-4 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Revenue</span>
            <span className="font-semibold text-gray-900">{afn(revenue)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Cost of goods sold</span>
            <span className="font-semibold text-gray-900">{afn(cogs)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Gross profit</span>
            <span className="font-semibold text-green-700">
              {afn(grossProfit)}
            </span>
          </div>
          <div className="flex justify-between border-t border-gray-200 py-1 pt-2">
            <span className="text-gray-600">Balance due</span>
            <span
              className={`font-semibold ${
                balanceDue > 0 ? "text-red-600" : "text-gray-900"
              }`}
            >
              {afn(balanceDue)}
            </span>
          </div>
        </div>

        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || products.length === 0}
          className="w-full rounded-xl bg-brand py-3.5 text-base font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Saving…" : editing ? "Save Changes" : "Save Sale"}
        </button>
      </form>
    </div>
  );
}

export default function SalesManager({
  customers,
  products,
  sales,
}: {
  customers: CustomerOption[];
  products: ProductOption[];
  sales: SaleRow[];
}) {
  // mode: null = no form, "add" = new, otherwise a sale id = edit
  const [mode, setMode] = useState<string | null>(null);

  const editing =
    mode && mode !== "add" ? (sales.find((s) => s.id === mode) ?? null) : null;
  const showForm = mode !== null;

  return (
    <div>
      {!showForm ? (
        <button
          onClick={() => setMode("add")}
          className="w-full rounded-xl bg-brand py-3.5 text-base font-semibold text-white transition-colors hover:bg-brand-dark sm:w-auto sm:px-6"
        >
          + Record Sale
        </button>
      ) : (
        <SaleForm
          key={mode}
          customers={customers}
          products={products}
          editing={editing}
          onDone={() => setMode(null)}
          onCancel={() => setMode(null)}
        />
      )}

      <h2 className="mt-8 mb-3 text-base font-semibold text-brand">
        Recent sales
      </h2>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {sales.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-500">
            No sales yet. Tap “Record Sale” to add your first one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-brand text-white">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Date</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Invoice</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Customer</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Product</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Qty</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Revenue</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Profit</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Status</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Balance</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sales.map((s) => {
                  const balance = num(s.balance_due);
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                        {s.date ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                        {s.invoice_number ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                        {s.customer_name ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                        {s.product_name
                          ? (s.product_sku ? `${s.product_sku} — ` : "") +
                            s.product_name
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                        {num(s.quantity).toLocaleString("en-US")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                        {afn(num(s.revenue))}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-green-700">
                        {afn(num(s.gross_profit))}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                        {s.payment_status ?? "—"}
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${
                          balance > 0 ? "text-red-600" : "text-gray-900"
                        }`}
                      >
                        {afn(balance)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <button
                          onClick={() => setMode(s.id)}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
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
