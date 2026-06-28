"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AddExpenseState = { error?: string; success?: boolean };

function toNumber(value: FormDataEntryValue | null): number | null {
  if (value === null) return null;
  const text = String(value).trim();
  if (text === "") return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function toText(value: FormDataEntryValue | null): string | null {
  if (value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

export async function addExpense(
  _prevState: AddExpenseState,
  formData: FormData,
): Promise<AddExpenseState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You are not logged in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();
  if (!profile?.business_id) {
    return { error: "No business account was found for your login." };
  }

  const amount = toNumber(formData.get("amount"));
  if (amount === null || amount < 0) {
    return { error: "Please enter a valid amount." };
  }

  const date =
    toText(formData.get("date")) ?? new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("expenses").insert({
    business_id: profile.business_id,
    date,
    category: toText(formData.get("category")),
    description: toText(formData.get("description")),
    amount,
  });
  if (error) return { error: error.message };

  revalidatePath("/expenses");
  return { success: true };
}
