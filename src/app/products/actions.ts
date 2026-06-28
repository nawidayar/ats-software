"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AddProductState = { error?: string; success?: boolean };

// Turns a form text value into a number, or null when left blank.
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

export async function addProduct(
  _prevState: AddProductState,
  formData: FormData,
): Promise<AddProductState> {
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
  if (!name) return { error: "Product name is required." };

  const type = toText(formData.get("type"));
  if (type && type !== "Imported" && type !== "Local") {
    return { error: "Type must be Imported or Local." };
  }

  const openingQuantity = toNumber(formData.get("opening_quantity")) ?? 0;

  const { error } = await supabase.from("products").insert({
    business_id: profile.business_id,
    name,
    sku: toText(formData.get("sku")),
    category: toText(formData.get("category")),
    supplier: toText(formData.get("supplier")),
    type,
    landed_cost_afn: toNumber(formData.get("landed_cost_afn")),
    margin_percent: toNumber(formData.get("margin_percent")),
    selling_price: toNumber(formData.get("selling_price")),
    opening_quantity: openingQuantity,
    // A new product's current stock starts equal to its opening quantity.
    current_stock: openingQuantity,
  });

  if (error) {
    // A duplicate SKU within the same business is the most common cause.
    return { error: error.message };
  }

  revalidatePath("/products");
  return { success: true };
}
