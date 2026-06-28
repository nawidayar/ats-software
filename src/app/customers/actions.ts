"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SaveCustomerState = { error?: string; success?: boolean };

function toText(value: FormDataEntryValue | null): string | null {
  if (value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

export async function saveCustomer(
  _prevState: SaveCustomerState,
  formData: FormData,
): Promise<SaveCustomerState> {
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

  const name = toText(formData.get("name"));
  if (!name) return { error: "Customer name is required." };

  const fields = {
    name,
    phone: toText(formData.get("phone")),
    city: toText(formData.get("city")),
    follow_up_date: toText(formData.get("follow_up_date")),
    notes: toText(formData.get("notes")),
  };

  const id = toText(formData.get("id"));

  if (id) {
    // Editing an existing customer. RLS ensures it's one of ours.
    const { error } = await supabase
      .from("customers")
      .update(fields)
      .eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("customers")
      .insert({ business_id: profile.business_id, ...fields });
    if (error) return { error: error.message };
  }

  revalidatePath("/customers");
  return { success: true };
}
