/** FakePay request and response types (v1). */

export interface CreatePaymentRequest {
  amount: number;
  source: string;
  /** Optional in v1 — defaults to USD on the server. */
  currency?: string;
  description?: string;
}

export interface Payment {
  id: string;
  status: "pending" | "succeeded" | "failed";
  amount: number;
  currency: string;
  source: string;
  description?: string;
  created_at: string;
}

export interface FakePayError {
  code: string;
  message: string;
}
