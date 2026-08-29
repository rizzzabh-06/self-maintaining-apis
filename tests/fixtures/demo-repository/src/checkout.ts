import { FakePayClient } from "./fakepay-client";
import { Payment } from "./types";

const fakepay = new FakePayClient();

export interface CheckoutResult {
  orderId: string;
  payment: Payment;
}

/**
 * Process a checkout by creating a FakePay payment.
 *
 * Note: does NOT pass `currency` — relies on FakePay v1 defaulting to USD.
 * This will break when FakePay v2 makes `currency` required.
 */
export async function processCheckout(
  orderId: string,
  amountCents: number,
  paymentToken: string
): Promise<CheckoutResult> {
  const payment = await fakepay.createPayment({
    amount: amountCents,
    source: paymentToken,
    description: `Order ${orderId}`,
    // currency intentionally omitted — v1 defaults to "usd"
  });

  return { orderId, payment };
}

/**
 * Look up a previously created payment.
 */
export async function getPaymentStatus(paymentId: string): Promise<Payment> {
  return fakepay.getPayment(paymentId);
}
