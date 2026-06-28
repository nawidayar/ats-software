"use client";

import { useActionState, useEffect, useState } from "react";
import { addProduct, type AddProductState } from "@/app/products/actions";

const initialState: AddProductState = {};

const inputClass =
  "w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";
const labelClass = "mb-1 block text-sm font-medium text-brand";

export default function AddProductForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addProduct, initialState);

  // Close the form automatically once a product saves successfully.
  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl bg-brand py-3.5 text-base font-semibold text-white transition-colors hover:bg-brand-dark sm:w-auto sm:px-6"
      >
        + Add Product
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand">Add Product</h2>
        <button
          onClick={() => setOpen(false)}
          className="text-sm font-medium text-gray-500 hover:text-gray-800"
        >
          Cancel
        </button>
      </div>

      <form action={formAction} className="space-y-4">
        <div>
          <label className={labelClass}>Product name *</label>
          <input name="name" required className={inputClass} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>SKU</label>
            <input name="sku" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <input name="category" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Supplier</label>
            <input name="supplier" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Type</label>
            <select name="type" defaultValue="Imported" className={inputClass}>
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
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Margin %</label>
            <input
              name="margin_percent"
              type="number"
              step="0.01"
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
              defaultValue="0"
              className={inputClass}
            />
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
  );
}
