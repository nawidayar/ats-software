"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ReceivableState = { error?: string; success?: boolean };

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

function statusFor(due: number, received: number): string {
  if (received >= due) return "Paid";
  if (received > 0) return "Partial";
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

// Saves a receivable. If the form carries an "id" we UPDATE (edit / correct);
// otherwise we INSERT a new one. The status (Open / Partial / Paid) is always
// recalculated from the amounts so the "who owes me" totals stay correct.
export async function saveReceivable(
  _prevState: ReceivableState,
  formData: FormData,
): Promise<ReceivableState> {
  const supabase = await createClient();
  const biz = await businessId(supabase);
  if ("error" in biz) return { error: biz.error };

  const amountDue = toNumber(formData.get("amount_due"));
  if (amountDue <= 0) return { error: "Please enter the amount owed to you." };

  let amountReceived = toNumber(formData.get("amount_received"));
  if (amountReceived < 0) amountReceived = 0;
  if (amountReceived > amountDue) amountReceived = amountDue;

  const date =
    toText(formData.get("date")) ?? new Date().toISOString().slice(0, 10);

  const fields = {
    date,
    customer_id: toText(formData.get("customer_id")),
    invoice: toText(formData.get("invoice")),
    type: toText(formData.get("type")) ?? "Credit Sale",
    amount_due: amountDue,
    amount_received: amountReceived,
    status: statusFor(amountDue, amountReceived),
  };

  const id = toText(formData.get("id"));

  if (id) {
    const { error } = await supabase
      .from("receivables")
      .update(fields)
      .eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("receivables")
      .insert({ business_id: biz.id, ...fields });
    if (error) return { error: error.message };
  }

  revalidatePath("/receivables");
  return { success: true };
}

export async function recordReceivablePayment(
  _prevState: ReceivableState,
  formData: FormData,
): Promise<ReceivableState> {
  const supabase = await createClient();
  const biz = await businessId(supabase);
  if ("error" in biz) return { error: biz.error };

  const id = toText(formData.get("id"));
  if (!id) return { error: "Missing receivable." };

  const payment = toNumber(formData.get("payment"));
  if (payment <= 0) return { error: "Please enter a payment amount." };

  const { data: row } = await supabase
    .from("receivables")
    .select("amount_due, amount_received")
    .eq("id", id)
    .single();
  if (!row) return { error: "That receivable could not be found." };

  const due = Number(row.amount_due) || 0;
  let received = (Number(row.amount_received) || 0) + payment;
  if (received > due) received = due;

  const { error } = await supabase
    .from("receivables")
    .update({ amount_received: received, status: statusFor(due, received) })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/receivables");
  return { success: true };
}
