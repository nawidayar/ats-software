"use client";

import { useActionState, useEffect, useState } from "react";
import { saveExpense, type ExpenseState } from "@/app/expenses/actions";

export type ExpenseRow = {
  id: string;
  date: string | null;
  category: string | null;
  description: string | null;
  amount: number | null;
};

const initialState: ExpenseState = {};

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

export default function ExpensesManager({
  expenses,
}: {
  expenses: ExpenseRow[];
}) {
  const [state, formAction, pending] = useActionState(saveExpense, initialState);
  // mode: null = no form, "add" = new expense, otherwise an expense id = edit
  const [mode, setMode] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (state.success) setMode(null);
  }, [state]);

  const editing =
    mode && mode !== "add"
      ? (expenses.find((e) => e.id === mode) ?? null)
      : null;
  const showForm = mode !== null;

  return (
    <div>
      {!showForm && (
        <button
          onClick={() => setMode("add")}
          className="w-full rounded-xl bg-brand py-3.5 text-base font-semibold text-white transition-colors hover:bg-brand-dark sm:w-auto sm:px-6"
        >
          + Add Expense
        </button>
      )}

      {showForm && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-brand">
              {editing ? "Edit Expense" : "Add Expense"}
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
                <label className={labelClass}>Category</label>
                <input
                  name="category"
                  list="expense-categories"
                  defaultValue={editing?.category ?? ""}
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
              <input
                name="description"
                defaultValue={editing?.description ?? ""}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Amount (AFN)</label>
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={editing?.amount ?? ""}
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
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {expenses.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-500">
            No expenses yet. Tap “Add Expense” to record your first one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-brand text-white">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">
                    Date
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">
                    Category
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">
                    Description
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                    Amount
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                    Edit
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {e.date ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {e.category ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {e.description ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-900">
                      {afn(num(e.amount))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        onClick={() => setMode(e.id)}
                        className="rounded-lg border border-brand/30 px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand/5"
                      >
                        Edit
                      </button>
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
