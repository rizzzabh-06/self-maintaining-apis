import axios, { AxiosInstance } from "axios";
import { config } from "./config";
import { CreatePaymentRequest, Payment } from "./types";

/**
 * HTTP client for the FakePay v1 API.
 *
 * Endpoints consumed:
 *   POST /payment       → createPayment
 *   GET  /payment/:id   → getPayment
 */
export class FakePayClient {
  private http: AxiosInstance;

  constructor(apiKey?: string) {
    this.http = axios.create({
      baseURL: config.fakepay.baseUrl,
      headers: {
        Authorization: `Bearer ${apiKey ?? config.fakepay.apiKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  /** Create a payment.  `currency` is optional in v1 (server defaults to USD). */
  async createPayment(req: CreatePaymentRequest): Promise<Payment> {
    const { data } = await this.http.post<Payment>("/payment", req);
    return data;
  }

  /** Retrieve a payment by ID. */
  async getPayment(id: string): Promise<Payment> {
    const { data } = await this.http.get<Payment>(`/payment/${id}`);
    return data;
  }
}
