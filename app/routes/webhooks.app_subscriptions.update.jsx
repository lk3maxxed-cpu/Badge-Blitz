// webhooks.app_subscriptions.update.jsx
// Fires when a Shopify billing subscription is created, activated, cancelled, or expired.
// Keeps the shop's plan field in sync with the actual subscription status.
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  const status = payload?.app_subscription?.status;

  // ACTIVE → PRO, anything else (CANCELLED, EXPIRED, DECLINED, PENDING) → FREE
  const plan = status === "ACTIVE" ? "PRO" : "FREE";

  await db.shop.upsert({
    where: { shopDomain: shop },
    update: { plan },
    create: { shopDomain: shop, plan },
  });

  return new Response();
};
