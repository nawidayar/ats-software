"use client";

import { useActionState, useEffect, useState } from "react";
import {
  saveReceivable,
  recordReceivablePayment,
  type ReceivableState,
} from "@/app/receivables/actions";

export type CustomerOption = { id: string; name: string | null };

export type ReceivableRow = {
  id: string;
  date: string | null;
  customer_id: string | null;
  invoice: string | null;
  type: string | null;
  amount_due: number | null;
  amount_received: number | null;
  balance: number | null;
  status: string | null;
  customer_name: string | null;
};

const initialState: ReceivableState = {};

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

function RowPayment({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    recordReceivablePayment,
    initialState,
  );

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-brand/30 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/5"
      >
        Record payment
      </button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input
        name="payment"
        type="number"
        step="0.01"
        min="0"
        required
        autoFocus
        placeholder="Amount"
        className="w-28 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "…" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-gray-500 hover:text-gray-800"
      >
        Cancel
      </button>
    </form>
  );
}

export default function ReceivablesManager({
  receivables,
  customers,
}: {
  receivables: ReceivableRow[];
  customers: CustomerOption[];
}) {
  const [state, formAction, pending] = useActionState(
    saveReceivable,
    initialState,
  );
  // mode: null = no form, "add" = new, otherwise a receivable id = edit
  const [mode, setMode] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (state.success) setMode(null);
  }, [state]);

  const editing =
    mode && mode !== "add"
      ? (receivables.find((r) => r.id === mode) ?? null)
      : null;
  const showForm = mode !== null;

  return (
    <div>
      {!showForm ? (
        <button
          onClick={() => setMode("add")}
          className="w-full rounded-xl bg-brand py-3.5 text-base font-semibold text-white transition-colors hover:bg-brand-dark sm:w-auto sm:px-6"
        >
          + Add Receivable
        </button>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-brand">
              {editing ? "Edit Receivable" : "Add Receivable"}
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
                <label className={labelClass}>Customer</label>
                <select
                  name="customer_id"
                  className={inputClass}
                  defaultValue={editing?.customer_id ?? ""}
                >
                  <option value="">— None —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name ?? "Unnamed"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Date</label>
                <input
                  name="date"
                  type="date"
                  defaultValue={editing?.date ?? today}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Reference / invoice</label>
                <input
                  name="invoice"
                  defaultValue={editing?.invoice ?? ""}
                  className={inputClass}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className={labelClass}>Type</label>
                <select
                  name="type"
                  className={inputClass}
                  defaultValue={editing?.type ?? "Credit Sale"}
                >
                  <option value="Credit Sale">Credit Sale</option>
                  <option value="Refund">Refund</option>
                  <option value="Exchange">Exchange</option>
                  <option value="Replacement">Replacement</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Amount owed to you (AFN)</label>
                <input
                  name="amount_due"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  defaultValue={editing?.amount_due ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Already received (AFN)</label>
                <input
                  name="amount_received"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={editing?.amount_received ?? 0}
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
              {pending ? "Saving…" : "Save Receivable"}
            </button>
          </form>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {receivables.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-500">
            No receivables yet. Credit and partial sales appear here
            automatically.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-brand text-white">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Date</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Customer</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Owed</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Received</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Balance</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {receivables.map((r) => {
                  const balance = num(r.balance);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                        {r.date ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {r.customer_name ?? "—"}
                        {r.invoice ? (
                          <span className="block text-xs text-gray-400">
                            {r.invoice}
                          </span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                        {afn(num(r.amount_due))}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                        {afn(num(r.amount_received))}
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${
                          balance > 0 ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {afn(balance)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-2">
                          {balance > 0 ? (
                            <RowPayment id={r.id} />
                          ) : (
                            <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                              Paid
                            </span>
                          )}
                          <button
                            onClick={() => setMode(r.id)}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                          >
                            Edit
                          </button>
                        </div>
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
