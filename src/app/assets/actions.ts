"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AssetState = { error?: string; success?: boolean };

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

// Saves an asset. If the form carries an "id" we UPDATE (edit / correct);
// otherwise we INSERT a new one. The current value (net book value) is
// recalculated automatically by the database view from these fields.
export async function saveAsset(
  _prevState: AssetState,
  formData: FormData,
): Promise<AssetState> {
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

  const name = toText(formData.get("asset_name"));
  if (!name) return { error: "Please enter the asset name." };

  const cost = toNumber(formData.get("cost"));
  if (cost === null || cost < 0) {
    return { error: "Please enter a valid cost." };
  }

  const usefulLife = toNumber(formData.get("useful_life_years"));
  if (usefulLife !== null && usefulLife <= 0) {
    return { error: "Useful life must be greater than zero." };
  }

  const fields = {
    asset_name: name,
    category: toText(formData.get("category")),
    purchase_date:
      toText(formData.get("purchase_date")) ??
      new Date().toISOString().slice(0, 10),
    cost,
    useful_life_years: usefulLife,
  };

  const id = toText(formData.get("id"));

  if (id) {
    const { error } = await supabase.from("assets").update(fields).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("assets")
      .insert({ business_id: profile.business_id, ...fields });
    if (error) return { error: error.message };
  }

  revalidatePath("/assets");
  return { success: true };
}
