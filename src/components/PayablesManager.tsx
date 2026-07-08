"use client";

import { useActionState, useEffect, useState } from "react";
import {
  savePayable,
  recordPayablePayment,
  type PayableState,
} from "@/app/payables/actions";

export type PayableRow = {
  id: string;
  date: string | null;
  supplier_payee: string | null;
  reference: string | null;
  type: string | null;
  amount_owed: number | null;
  amount_paid: number | null;
  balance: number | null;
  status: string | null;
};

const initialState: PayableState = {};

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
    recordPayablePayment,
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

export default function PayablesManager({
  payables,
}: {
  payables: PayableRow[];
}) {
  const [state, formAction, pending] = useActionState(savePayable, initialState);
  // mode: null = no form, "add" = new, otherwise a payable id = edit
  const [mode, setMode] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (state.success) setMode(null);
  }, [state]);

  const editing =
    mode && mode !== "add"
      ? (payables.find((p) => p.id === mode) ?? null)
      : null;
  const showForm = mode !== null;

  return (
    <div>
      {!showForm ? (
        <button
          onClick={() => setMode("add")}
          className="w-full rounded-xl bg-brand py-3.5 text-base font-semibold text-white transition-colors hover:bg-brand-dark sm:w-auto sm:px-6"
        >
          + Add Payable
        </button>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-brand">
              {editing ? "Edit Payable" : "Add Payable"}
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
                <label className={labelClass}>Supplier / payee</label>
                <input
                  name="supplier_payee"
                  defaultValue={editing?.supplier_payee ?? ""}
                  className={inputClass}
                  placeholder="Who you owe"
                />
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
                <label className={labelClass}>Reference</label>
                <input
                  name="reference"
                  defaultValue={editing?.reference ?? ""}
                  className={inputClass}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className={labelClass}>Type</label>
                <input
                  name="type"
                  list="payable-types"
                  defaultValue={editing?.type ?? ""}
                  className={inputClass}
                  placeholder="e.g. Supplier"
                />
                <datalist id="payable-types">
                  <option value="Supplier" />
                  <option value="Loan" />
                  <option value="Rent" />
                  <option value="Salary" />
                  <option value="Other" />
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Amount you owe (AFN)</label>
                <input
                  name="amount_owed"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  defaultValue={editing?.amount_owed ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Already paid (AFN)</label>
                <input
                  name="amount_paid"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={editing?.amount_paid ?? 0}
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
              {pending ? "Saving…" : "Save Payable"}
            </button>
          </form>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {payables.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-500">
            No payables yet. Add what your business owes to track it here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-brand text-white">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Date</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Payee</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Owed</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Paid</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Balance</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payables.map((p) => {
                  const balance = num(p.balance);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                        {p.date ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {p.supplier_payee ?? "—"}
                        {p.reference ? (
                          <span className="block text-xs text-gray-400">
                            {p.reference}
                          </span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                        {afn(num(p.amount_owed))}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                        {afn(num(p.amount_paid))}
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
                            <RowPayment id={p.id} />
                          ) : (
                            <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                              Paid
                            </span>
                          )}
                          <button
                            onClick={() => setMode(p.id)}
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
