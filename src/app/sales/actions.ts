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

  // Pull the product's cost and current stock from its own record (so the
  // cost is always trustworthy and not something typed in the browser).
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

  const date = toText(formData.get("date")) ?? new Date().toISOString().slice(0, 10);
  const invoiceNumber = toText(formData.get("invoice_number"));
  const customerId = toText(formData.get("customer_id"));

  // 1. Record the sale. revenue / cogs / gross_profit / balance_due are
  //    auto-calculated by the database from these values.
  const { error: saleError } = await supabase.from("sales").insert({
    business_id: profile.business_id,
    date,
    invoice_number: invoiceNumber,
    customer_id: customerId,
    product_id: productId,
    quantity,
    unit_price: unitPrice,
    unit_cost: unitCost,
    payment_status: paymentStatus,
    amount_paid: amountPaid,
  });
  if (saleError) return { error: saleError.message };

  // 2. Reduce the product's stock by the quantity sold.
  const newStock = (Number(product.current_stock) || 0) - quantity;
  await supabase
    .from("products")
    .update({ current_stock: newStock })
    .eq("id", productId);

  // 3. For Credit or Partial sales, create a receivable so the unpaid
  //    balance can be tracked under "who owes me".
  if (paymentStatus === "Credit" || paymentStatus === "Partial") {
    await supabase.from("receivables").insert({
      business_id: profile.business_id,
      date,
      customer_id: customerId,
      invoice: invoiceNumber,
      type: "Credit Sale",
      amount_due: revenue,
      amount_received: amountPaid,
      status: amountPaid > 0 ? "Partial" : "Open",
    });
  }

  revalidatePath("/sales");
  revalidatePath("/products");
  return { success: true };
}
