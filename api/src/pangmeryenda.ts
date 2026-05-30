import crypto from "node:crypto";

export interface PangMeryendaConfig {
  apiBaseUrl: string;
  apiKey: string;
  apiSecret: string;
  webhookSecret: string;
  merchantId: string;
}

export class PangMeryendaService {
  private config: PangMeryendaConfig;

  constructor(config: PangMeryendaConfig) {
    this.config = config;
  }

  private signPayload(payload: string): string {
    return crypto.createHmac("sha256", this.config.apiSecret).update(payload).digest("hex");
  }

  async createPayment(params: {
    amount: number;
    currency: string;
    description: string;
    metadata: Record<string, string>;
    successUrl: string;
    failureUrl: string;
    cancelUrl: string;
  }): Promise<{
    transactionId: string;
    paymentUrl: string;
    expiresAt: Date;
  }> {
    const body = {
      merchantId: this.config.merchantId,
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      metadata: params.metadata,
      successUrl: params.successUrl,
      failureUrl: params.failureUrl,
      cancelUrl: params.cancelUrl,
    };
    const serialized = JSON.stringify(body);
    const response = await fetch(`${this.config.apiBaseUrl.replace(/\/$/, "")}/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PangMeryenda-Key": this.config.apiKey,
        "X-PangMeryenda-Signature": this.signPayload(serialized),
      },
      body: serialized,
    });

    if (!response.ok) {
      throw new Error(`PangMeryenda createPayment failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      transactionId: string;
      paymentUrl: string;
      expiresAt?: string;
    };

    return {
      transactionId: data.transactionId,
      paymentUrl: data.paymentUrl,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : new Date(Date.now() + 30 * 60_000),
    };
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const expected = crypto
      .createHmac("sha256", this.config.webhookSecret)
      .update(payload)
      .digest("hex");
    const sigBuf = Buffer.from(String(signature || ""), "utf8");
    const expectedBuf = Buffer.from(expected, "utf8");
    if (sigBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expectedBuf);
  }

  async getPaymentStatus(transactionId: string): Promise<{
    status: string;
    paidAt: Date | null;
    amount: number;
  }> {
    const response = await fetch(
      `${this.config.apiBaseUrl.replace(/\/$/, "")}/v1/payments/${encodeURIComponent(transactionId)}`,
    {
      method: "GET",
      headers: {
        "X-PangMeryenda-Key": this.config.apiKey,
      },
    },
    );
    if (!response.ok) {
      throw new Error(`PangMeryenda getPaymentStatus failed: ${response.status}`);
    }
    const data = (await response.json()) as {
      status: string; paidAt?: string; amount: number;
    };
    return {
      status: data.status,
      paidAt: data.paidAt ? new Date(data.paidAt) : null,
    };
  }
}
async refundPayment(transactionId: string, reason: string): Promise<boolean> {
  const body = JSON.stringify({reason});
  const response = await fetch(
    `${this.config.apiBaseUrl.replace(/\/$/, "")}/v1/payments/${encodeURIComponent(transactionId)}/refund`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-PangMeryenda-Key": this.config.apiKey,
      "X-PangMeryenda-Signature": this.signPayload(body),
    },
    body,
  },
  return response.ok;
}