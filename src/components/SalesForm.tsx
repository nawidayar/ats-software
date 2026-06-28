"use client";

import { useActionState, useEffect, useState } from "react";
import { recordSale, type RecordSaleState } from "@/app/sales/actions";

type Customer = { id: string; name: string | null };
type Product = {
  id: string;
  sku: string | null;
  name: string | null;
  landed_cost_afn: number | null;
  current_stock: number | null;
};

const initialState: RecordSaleState = {};

const inputClass =
  "w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";
const labelClass = "mb-1 block text-sm font-medium text-brand";

function afn(n: number): string {
  return `${Math.round(n).toLocaleString("en-US")} AFN`;
}

export default function SalesForm({
  customers,
  products,
}: {
  customers: Customer[];
  products: Product[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(recordSale, initialState);

  const today = new Date().toISOString().slice(0, 10);
  const [productId, setProductId] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("Paid");
  const [amountPaid, setAmountPaid] = useState("");

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      setProductId("");
      setUnitCost("");
      setUnitPrice("");
      setQuantity("");
      setPaymentStatus("Paid");
      setAmountPaid("");
    }
  }, [state]);

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

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl bg-brand py-3.5 text-base font-semibold text-white transition-colors hover:bg-brand-dark sm:w-auto sm:px-6"
      >
        + Record Sale
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand">Record Sale</h2>
        <button
          onClick={() => setOpen(false)}
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
            <label className={labelClass}>Invoice number</label>
            <input name="invoice_number" className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Customer</label>
          <select name="customer_id" className={inputClass} defaultValue="">
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
          {pending ? "Saving…" : "Save Sale"}
        </button>
      </form>
    </div>
  );
}
