import { FakePayClient } from "../src/fakepay-client";
import { processCheckout, getPaymentStatus } from "../src/checkout";
import axios from "axios";

jest.mock("axios");

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("FakePayClient", () => {
  let client: FakePayClient;

  beforeEach(() => {
    const mockInstance = {
      post: jest.fn(),
      get: jest.fn(),
    };
    mockedAxios.create.mockReturnValue(mockInstance as any);
    client = new FakePayClient("test_key_123");
  });

  it("should POST to /payment with amount and source", async () => {
    const mockPayment = {
      id: "pay_abc123",
      status: "succeeded",
      amount: 5000,
      currency: "usd",
      source: "tok_visa_4242",
      description: "Order #1234",
      created_at: "2025-01-15T10:30:00Z",
    };

    const instance = mockedAxios.create.mock.results[0].value;
    instance.post.mockResolvedValue({ data: mockPayment });

    const result = await client.createPayment({
      amount: 5000,
      source: "tok_visa_4242",
      description: "Order #1234",
      // Note: currency NOT passed — relying on v1 default
    });

    expect(instance.post).toHaveBeenCalledWith("/payment", {
      amount: 5000,
      source: "tok_visa_4242",
      description: "Order #1234",
    });
    expect(result.id).toBe("pay_abc123");
    expect(result.currency).toBe("usd");
  });

  it("should GET /payment/:id", async () => {
    const mockPayment = {
      id: "pay_abc123",
      status: "succeeded",
      amount: 5000,
      currency: "usd",
      source: "tok_visa_4242",
      created_at: "2025-01-15T10:30:00Z",
    };

    const instance = mockedAxios.create.mock.results[0].value;
    instance.get.mockResolvedValue({ data: mockPayment });

    const result = await client.getPayment("pay_abc123");

    expect(instance.get).toHaveBeenCalledWith("/payment/pay_abc123");
    expect(result.status).toBe("succeeded");
  });
});

describe("processCheckout", () => {
  beforeEach(() => {
    const mockInstance = {
      post: jest.fn().mockResolvedValue({
        data: {
          id: "pay_xyz789",
          status: "succeeded",
          amount: 2500,
          currency: "usd",
          source: "tok_visa_4242",
          description: "Order order-001",
          created_at: "2025-01-15T10:30:00Z",
        },
      }),
      get: jest.fn(),
    };
    mockedAxios.create.mockReturnValue(mockInstance as any);
  });

  it("should create a payment without currency (v1 default)", async () => {
    const result = await processCheckout("order-001", 2500, "tok_visa_4242");

    expect(result.orderId).toBe("order-001");
    expect(result.payment.status).toBe("succeeded");
    expect(result.payment.amount).toBe(2500);
    // Currency comes back as "usd" from server default
    expect(result.payment.currency).toBe("usd");
  });
});
