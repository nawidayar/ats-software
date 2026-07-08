"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type RecordPurchaseState = { error?: string; success?: boolean };

function toNumber(value: FormDataEntryValue | null): number {
  if (value === null) return 0;
  const text = String(value).trim();
  if (text === "") return 0;
  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}

function toText(value: FormDataEntryValue | null): string | null {
  if (value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

// Reads the live stock for one product (0 if it can't be read).
async function stockOf(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string,
): Promise<number> {
  const { data } = await supabase
    .from("products")
    .select("current_stock")
    .eq("id", productId)
    .single();
  return Number(data?.current_stock ?? 0);
}

// Saves a purchase. If the form carries an "id" we UPDATE an existing purchase
// (editing / correcting it) and carefully adjust product stock so the count
// stays right; otherwise we INSERT a new purchase and add its quantity to
// stock. Kept as recordPurchase so existing imports keep working.
export async function recordPurchase(
  _prevState: RecordPurchaseState,
  formData: FormData,
): Promise<RecordPurchaseState> {
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

  const kind = formData.get("kind") === "Local" ? "Local" : "Import";

  const productId = toText(formData.get("product_id"));
  if (!productId) return { error: "Please choose a product." };

  const quantity = toNumber(formData.get("quantity"));
  if (quantity <= 0) {
    return { error: "Please enter a quantity greater than zero." };
  }

  const date =
    toText(formData.get("date")) ?? new Date().toISOString().slice(0, 10);
  const supplier = toText(formData.get("supplier"));

  let productCostUsd = 0;
  let chinaInlandUsd = 0;
  let freightUsd = 0;
  let usdAfnRate = 0;
  let shipmentNumber: string | null = null;

  if (kind === "Import") {
    productCostUsd = toNumber(formData.get("product_cost_usd"));
    chinaInlandUsd = toNumber(formData.get("china_inland_usd"));
    freightUsd = toNumber(formData.get("freight_usd"));
    usdAfnRate = toNumber(formData.get("usd_afn_rate"));
    shipmentNumber = toText(formData.get("shipment_number"));
    if (productCostUsd <= 0) {
      return { error: "Please enter the product cost in USD." };
    }
    if (usdAfnRate <= 0) {
      return { error: "Please enter the USD → AFN exchange rate." };
    }
  } else {
    // Local purchase: the cost is already in AFN. We reuse the import money
    // columns by storing the whole AFN total in product_cost_usd with a rate
    // of 1, so the database's generated landed-cost columns still produce the
    // correct AFN total and per-unit cost without a separate code path.
    const totalAfn = toNumber(formData.get("total_afn"));
    if (totalAfn <= 0) {
      return { error: "Please enter the total cost in AFN." };
    }
    productCostUsd = totalAfn;
    usdAfnRate = 1;
  }

  // The per-unit landed cost this purchase implies (used to refresh the
  // product's cost so future sales use the latest cost).
  const totalLandedAfn =
    (productCostUsd + chinaInlandUsd + freightUsd) * usdAfnRate;
  const perUnitAfn = quantity > 0 ? totalLandedAfn / quantity : 0;

  const purchaseFields = {
    date,
    kind,
    shipment_number: shipmentNumber,
    supplier,
    product_id: productId,
    quantity,
    product_cost_usd: productCostUsd,
    china_inland_usd: chinaInlandUsd,
    freight_usd: freightUsd,
    usd_afn_rate: usdAfnRate,
  };

  const id = toText(formData.get("id"));

  if (id) {
    // ----- EDITING an existing purchase -----
    // First read what the purchase looked like BEFORE the edit so we can undo
    // its old effect on stock, then apply the new one.
    const { data: old } = await supabase
      .from("purchases")
      .select("product_id, quantity")
      .eq("id", id)
      .single();
    if (!old) return { error: "That purchase could not be found." };

    const oldProductId = String(old.product_id);
    const oldQty = Number(old.quantity) || 0;

    const { error: updateError } = await supabase
      .from("purchases")
      .update(purchaseFields)
      .eq("id", id);
    if (updateError) return { error: updateError.message };

    if (oldProductId === productId) {
      // Same product: adjust stock by the difference in quantity.
      const current = await stockOf(supabase, productId);
      const newStock = current - oldQty + quantity;
      const { error: e } = await supabase
        .from("products")
        .update({ current_stock: newStock, landed_cost_afn: perUnitAfn })
        .eq("id", productId);
      if (e) return { error: e.message };
    } else {
      // Product changed: remove the old quantity from the old product, and add
      // the new quantity to the new product.
      const oldCurrent = await stockOf(supabase, oldProductId);
      await supabase
        .from("products")
        .update({ current_stock: oldCurrent - oldQty })
        .eq("id", oldProductId);

      const newCurrent = await stockOf(supabase, productId);
      const { error: e } = await supabase
        .from("products")
        .update({
          current_stock: newCurrent + quantity,
          landed_cost_afn: perUnitAfn,
        })
        .eq("id", productId);
      if (e) return { error: e.message };
    }
  } else {
    // ----- ADDING a new purchase -----
    const { error: insertError } = await supabase
      .from("purchases")
      .insert({ business_id: profile.business_id, ...purchaseFields });
    if (insertError) return { error: insertError.message };

    // Grow the product's stock by what we just bought, and refresh its landed
    // cost so future sales use the latest per-unit cost from this purchase.
    const current = await stockOf(supabase, productId);
    const { error: updateError } = await supabase
      .from("products")
      .update({ current_stock: current + quantity, landed_cost_afn: perUnitAfn })
      .eq("id", productId);
    if (updateError) return { error: updateError.message };
  }

  revalidatePath("/purchases");
  revalidatePath("/products");
  return { success: true };
}
