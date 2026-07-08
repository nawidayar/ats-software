"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type RecordSaleState = { error?: string; success?: boolean };

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

// Saves a sale. If the form carries an "id" we UPDATE an existing sale
// (editing / correcting it) and carefully re-sync product stock plus the
// linked "who owes me" receivable; otherwise we INSERT a new sale. Kept as
// recordSale so existing imports keep working.
export async function recordSale(
  _prevState: RecordSaleState,
  formData: FormData,
): Promise<RecordSaleState> {
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

  const productId = toText(formData.get("product_id"));
  if (!productId) return { error: "Please choose a product." };

  const quantity = toNumber(formData.get("quantity"));
  if (quantity <= 0) return { error: "Quantity must be greater than zero." };

  const unitPrice = toNumber(formData.get("unit_price"));
  if (unitPrice <= 0) return { error: "Please enter a selling price." };

  const paymentStatus = toText(formData.get("payment_status"));
  if (
    paymentStatus !== "Paid" &&
    paymentStatus !== "Credit" &&
    paymentStatus !== "Partial"
  ) {
    return { error: "Please choose a payment status." };
  }

  // Pull the product's cost from its own record (so the cost is always
  // trustworthy and not something typed in the browser).
  const { data: product } = await supabase
    .from("products")
    .select("current_stock, landed_cost_afn")
    .eq("id", productId)
    .single();
  if (!product) return { error: "The selected product could not be found." };

  const unitCost = Number(product.landed_cost_afn) || 0;
  const revenue = quantity * unitPrice;

  // Work out how much was actually paid based on the payment status.
  let amountPaid = 0;
  if (paymentStatus === "Paid") amountPaid = revenue;
  else if (paymentStatus === "Partial") {
    amountPaid = toNumber(formData.get("amount_paid"));
    if (amountPaid < 0) amountPaid = 0;
    if (amountPaid > revenue) amountPaid = revenue;
  }

  const date =
    toText(formData.get("date")) ?? new Date().toISOString().slice(0, 10);
  const invoiceNumber = toText(formData.get("invoice_number"));
  const customerId = toText(formData.get("customer_id"));

  const saleFields = {
    date,
    invoice_number: invoiceNumber,
    customer_id: customerId,
    product_id: productId,
    quantity,
    unit_price: unitPrice,
    unit_cost: unitCost,
    payment_status: paymentStatus,
    amount_paid: amountPaid,
  };

  const id = toText(formData.get("id"));

  if (id) {
    // ----- EDITING an existing sale -----
    // First read what the sale looked like BEFORE the edit so we can undo its
    // old effect on stock, then apply the new one.
    const { data: old } = await supabase
      .from("sales")
      .select("product_id, quantity")
      .eq("id", id)
      .single();
    if (!old) return { error: "That sale could not be found." };

    const oldProductId = String(old.product_id);
    const oldQty = Number(old.quantity) || 0;

    const { error: updateError } = await supabase
      .from("sales")
      .update(saleFields)
      .eq("id", id);
    if (updateError) return { error: updateError.message };

    // Re-sync stock. Selling REDUCES stock, so undoing a sale ADDS its
    // quantity back, and applying the new sale SUBTRACTS the new quantity.
    if (oldProductId === productId) {
      const current = await stockOf(supabase, productId);
      const newStock = current + oldQty - quantity;
      const { error: e } = await supabase
        .from("products")
        .update({ current_stock: newStock })
        .eq("id", productId);
      if (e) return { error: e.message };
    } else {
      // Product changed: give the old quantity back to the old product, and
      // take the new quantity from the new product.
      const oldCurrent = await stockOf(supabase, oldProductId);
      await supabase
        .from("products")
        .update({ current_stock: oldCurrent + oldQty })
        .eq("id", oldProductId);

      const newCurrent = await stockOf(supabase, productId);
      const { error: e } = await supabase
        .from("products")
        .update({ current_stock: newCurrent - quantity })
        .eq("id", productId);
      if (e) return { error: e.message };
    }

    // Re-sync the linked "who owes me" receivable.
    const { data: existing } = await supabase
      .from("receivables")
      .select("id")
      .eq("sale_id", id)
      .maybeSingle();

    if (paymentStatus === "Credit" || paymentStatus === "Partial") {
      const receivableFields = {
        date,
        customer_id: customerId,
        invoice: invoiceNumber,
        type: "Credit Sale",
        amount_due: revenue,
        amount_received: amountPaid,
        status: amountPaid > 0 ? "Partial" : "Open",
      };
      if (existing) {
        await supabase
          .from("receivables")
          .update(receivableFields)
          .eq("id", existing.id);
      } else {
        await supabase.from("receivables").insert({
          business_id: profile.business_id,
          sale_id: id,
          ...receivableFields,
        });
      }
    } else if (existing) {
      // Now fully Paid: the old unpaid entry no longer applies, remove it.
      await supabase.from("receivables").delete().eq("id", existing.id);
    }
  } else {
    // ----- ADDING a new sale -----
    // Record the sale and grab its new id so we can link a receivable to it.
    const { data: inserted, error: saleError } = await supabase
      .from("sales")
      .insert({ business_id: profile.business_id, ...saleFields })
      .select("id")
      .single();
    if (saleError) return { error: saleError.message };

    // Reduce the product's stock by the quantity sold.
    const newStock = (Number(product.current_stock) || 0) - quantity;
    await supabase
      .from("products")
      .update({ current_stock: newStock })
      .eq("id", productId);

    // For Credit or Partial sales, create a receivable so the unpaid balance
    // can be tracked under "who owes me".
    if (paymentStatus === "Credit" || paymentStatus === "Partial") {
      await supabase.from("receivables").insert({
        business_id: profile.business_id,
        sale_id: inserted?.id ?? null,
        date,
        customer_id: customerId,
        invoice: invoiceNumber,
        type: "Credit Sale",
        amount_due: revenue,
        amount_received: amountPaid,
        status: amountPaid > 0 ? "Partial" : "Open",
      });
    }
  }

  revalidatePath("/sales");
  revalidatePath("/products");
  revalidatePath("/receivables");
  return { success: true };
}
