import { prisma } from "./prisma";
import crypto from "crypto";

export interface WebhookEvent {
  id: string;
  event: string;
  data: any;
  timestamp: string;
}

export interface WebhookConfig {
  id: string;
  url: string;
  secret: string;
  events: string[];
  enabled: boolean;
}

// Event types
export const WEBHOOK_EVENTS = {
  TASK_STARTED: "task.started",
  TASK_PROGRESS: "task.progress",
  TASK_COMPLETED: "task.completed",
  TASK_FAILED: "task.failed",
  FILE_UPLOADED: "file.uploaded",
  FILE_DELETED: "file.deleted",
  USER_REGISTERED: "user.registered",
  BATCH_COMPLETED: "batch.completed",
} as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[keyof typeof WEBHOOK_EVENTS];

// Generate webhook signature
function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}

// Send webhook
export async function sendWebhook(
  userId: string,
  event: WebhookEventType,
  data: any
): Promise<void> {
  try {
    // Get user's webhooks
    const webhooks = await prisma.webhook.findMany({
      where: {
        userId,
        enabled: true,
        events: {
          has: event,
        },
      },
    });

    if (webhooks.length === 0) return;

    const payload: WebhookEvent = {
      id: crypto.randomUUID(),
      event,
      data,
      timestamp: new Date().toISOString(),
    };

    const payloadString = JSON.stringify(payload);

    // Send to all matching webhooks
    await Promise.allSettled(
      webhooks.map(async (webhook) => {
        const signature = generateSignature(payloadString, webhook.secret);

        const response = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
            "X-Webhook-Event": event,
            "X-Webhook-Id": payload.id,
          },
          body: payloadString,
        });

        // Log webhook delivery
        await prisma.webhookLog.create({
          data: {
            webhookId: webhook.id,
            event,
            payload: payloadString,
            statusCode: response.status,
            response: await response.text().catch(() => ""),
            success: response.ok,
          },
        });

        if (!response.ok) {
          console.error(`Webhook failed: ${webhook.url} - ${response.status}`);
        }
      })
    );
  } catch (error) {
    console.error("Webhook send error:", error);
  }
}

// Verify webhook signature (for receiving webhooks)
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Create webhook
export async function createWebhook(
  userId: string,
  url: string,
  events: WebhookEventType[]
): Promise<WebhookConfig> {
  const secret = crypto.randomBytes(32).toString("hex");

  const webhook = await prisma.webhook.create({
    data: {
      url,
      secret,
      events,
      enabled: true,
      userId,
    },
  });

  return {
    id: webhook.id,
    url: webhook.url,
    secret: webhook.secret,
    events: webhook.events,
    enabled: webhook.enabled,
  };
}

// Test webhook
export async function testWebhook(webhookId: string): Promise<boolean> {
  const webhook = await prisma.webhook.findUnique({
    where: { id: webhookId },
  });

  if (!webhook) return false;

  const testPayload: WebhookEvent = {
    id: crypto.randomUUID(),
    event: "webhook.test",
    data: { message: "This is a test webhook" },
    timestamp: new Date().toISOString(),
  };

  const payloadString = JSON.stringify(testPayload);
  const signature = generateSignature(payloadString, webhook.secret);

  try {
    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Event": "webhook.test",
        "X-Webhook-Id": testPayload.id,
      },
      body: payloadString,
    });

    return response.ok;
  } catch {
    return false;
  }
}
