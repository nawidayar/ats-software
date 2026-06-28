"use client";

import { useActionState, useEffect, useState } from "react";
import { saveCustomer, type SaveCustomerState } from "@/app/customers/actions";

export type CustomerWithStats = {
  id: string;
  name: string | null;
  phone: string | null;
  city: string | null;
  notes: string | null;
  follow_up_date: string | null;
  totalOrders: number;
  lifetimeValue: number;
  outstanding: number;
};

const initialState: SaveCustomerState = {};

const inputClass =
  "w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";
const labelClass = "mb-1 block text-sm font-medium text-brand";

function afn(n: number): string {
  return `${Math.round(n).toLocaleString("en-US")} AFN`;
}

export default function CustomersManager({
  customers,
}: {
  customers: CustomerWithStats[];
}) {
  const [state, formAction, pending] = useActionState(
    saveCustomer,
    initialState,
  );
  // mode: null = no form, "add" = new customer, otherwise a customer id = edit
  const [mode, setMode] = useState<string | null>(null);

  useEffect(() => {
    if (state.success) setMode(null);
  }, [state]);

  const editing =
    mode && mode !== "add"
      ? (customers.find((c) => c.id === mode) ?? null)
      : null;
  const showForm = mode !== null;

  return (
    <div>
      {!showForm && (
        <button
          onClick={() => setMode("add")}
          className="w-full rounded-xl bg-brand py-3.5 text-base font-semibold text-white transition-colors hover:bg-brand-dark sm:w-auto sm:px-6"
        >
          + Add Customer
        </button>
      )}

      {showForm && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-brand">
              {editing ? "Edit Customer" : "Add Customer"}
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
              <label className={labelClass}>Name *</label>
              <input
                name="name"
                required
                defaultValue={editing?.name ?? ""}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Phone / WhatsApp</label>
                <input
                  name="phone"
                  defaultValue={editing?.phone ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>City</label>
                <input
                  name="city"
                  defaultValue={editing?.city ?? ""}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Follow-up date</label>
              <input
                name="follow_up_date"
                type="date"
                defaultValue={editing?.follow_up_date ?? ""}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Notes</label>
              <textarea
                name="notes"
                rows={3}
                defaultValue={editing?.notes ?? ""}
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
              {pending ? "Saving…" : "Save Customer"}
            </button>
          </form>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {customers.length === 0 ? (
          <p className="rounded-2xl border border-gray-200 bg-white px-5 py-10 text-center text-sm text-gray-500">
            No customers yet. Tap “Add Customer” to create your first one.
          </p>
        ) : (
          customers.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-gray-900">
                    {c.name ?? "Unnamed"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {[c.city, c.phone].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <button
                  onClick={() => setMode(c.id)}
                  className="rounded-lg border border-brand/30 px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand/5"
                >
                  Edit
                </button>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-gray-50 p-2">
                  <p className="text-xs text-gray-500">Orders</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {c.totalOrders}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-2">
                  <p className="text-xs text-gray-500">Lifetime</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {afn(c.lifetimeValue)}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-2">
                  <p className="text-xs text-gray-500">Owes</p>
                  <p
                    className={`text-sm font-semibold ${
                      c.outstanding > 0 ? "text-red-600" : "text-gray-900"
                    }`}
                  >
                    {afn(c.outstanding)}
                  </p>
                </div>
              </div>

              {c.follow_up_date && (
                <p className="mt-3 text-sm text-gray-600">
                  <span className="font-medium text-brand">Follow up:</span>{" "}
                  {c.follow_up_date}
                </p>
              )}
              {c.notes && (
                <p className="mt-1 text-sm text-gray-600">
                  <span className="font-medium text-brand">Notes:</span>{" "}
                  {c.notes}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
