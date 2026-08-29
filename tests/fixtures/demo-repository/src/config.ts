export const config = {
  fakepay: {
    baseUrl: process.env.FAKEPAY_API_URL || "https://api.fakepay.dev/v1",
    apiKey: process.env.FAKEPAY_API_KEY || "",
  },
};
