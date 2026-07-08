"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PayableState = { error?: string; success?: boolean };

function toNumber(value: FormDataEntryValue | null): number {
  if (value === null) return 0;
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : 0;
}

function toText(value: FormDataEntryValue | null): string | null {
  if (value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function statusFor(owed: number, paid: number): string {
  if (paid >= owed) return "Paid";
  if (paid > 0) return "Partial";
  return "Open";
}

async function businessId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You are not logged in." as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();
  if (!profile?.business_id) {
    return { error: "No business account was found for your login." as const };
  }
  return { id: profile.business_id as string };
}

// Saves a payable. If the form carries an "id" we UPDATE (edit / correct);
// otherwise we INSERT a new one. The status is always recalculated from the
// amounts so the "what I owe" totals stay correct.
export async function savePayable(
  _prevState: PayableState,
  formData: FormData,
): Promise<PayableState> {
  const supabase = await createClient();
  const biz = await businessId(supabase);
  if ("error" in biz) return { error: biz.error };

  const amountOwed = toNumber(formData.get("amount_owed"));
  if (amountOwed <= 0) return { error: "Please enter the amount you owe." };

  let amountPaid = toNumber(formData.get("amount_paid"));
  if (amountPaid < 0) amountPaid = 0;
  if (amountPaid > amountOwed) amountPaid = amountOwed;

  const date =
    toText(formData.get("date")) ?? new Date().toISOString().slice(0, 10);

  const fields = {
    date,
    supplier_payee: toText(formData.get("supplier_payee")),
    reference: toText(formData.get("reference")),
    type: toText(formData.get("type")),
    amount_owed: amountOwed,
    amount_paid: amountPaid,
    status: statusFor(amountOwed, amountPaid),
  };

  const id = toText(formData.get("id"));

  if (id) {
    const { error } = await supabase
      .from("payables")
      .update(fields)
      .eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("payables")
      .insert({ business_id: biz.id, ...fields });
    if (error) return { error: error.message };
  }

  revalidatePath("/payables");
  return { success: true };
}

export async function recordPayablePayment(
  _prevState: PayableState,
  formData: FormData,
): Promise<PayableState> {
  const supabase = await createClient();
  const biz = await businessId(supabase);
  if ("error" in biz) return { error: biz.error };

  const id = toText(formData.get("id"));
  if (!id) return { error: "Missing payable." };

  const payment = toNumber(formData.get("payment"));
  if (payment <= 0) return { error: "Please enter a payment amount." };

  const { data: row } = await supabase
    .from("payables")
    .select("amount_owed, amount_paid")
    .eq("id", id)
    .single();
  if (!row) return { error: "That payable could not be found." };

  const owed = Number(row.amount_owed) || 0;
  let paid = (Number(row.amount_paid) || 0) + payment;
  if (paid > owed) paid = owed;

  const { error } = await supabase
    .from("payables")
    .update({ amount_paid: paid, status: statusFor(owed, paid) })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/payables");
  return { success: true };
}
