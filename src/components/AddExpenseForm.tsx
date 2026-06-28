"use client";

import { useActionState, useEffect, useState } from "react";
import { addExpense, type AddExpenseState } from "@/app/expenses/actions";

const initialState: AddExpenseState = {};

const inputClass =
  "w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";
const labelClass = "mb-1 block text-sm font-medium text-brand";

export default function AddExpenseForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addExpense, initialState);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl bg-brand py-3.5 text-base font-semibold text-white transition-colors hover:bg-brand-dark sm:w-auto sm:px-6"
      >
        + Add Expense
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand">Add Expense</h2>
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
            <label className={labelClass}>Date</label>
            <input
              name="date"
              type="date"
              defaultValue={today}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <input
              name="category"
              list="expense-categories"
              className={inputClass}
              placeholder="e.g. Rent"
            />
            <datalist id="expense-categories">
              <option value="Rent" />
              <option value="Salaries" />
              <option value="Utilities" />
              <option value="Transport" />
              <option value="Marketing" />
              <option value="Supplies" />
              <option value="Other" />
            </datalist>
          </div>
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <input name="description" className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Amount (AFN)</label>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
            className={inputClass}
          />
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
          {pending ? "Saving…" : "Save Expense"}
        </button>
      </form>
    </div>
  );
}
