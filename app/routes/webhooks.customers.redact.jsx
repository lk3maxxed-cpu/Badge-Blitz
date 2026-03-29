// webhooks.customers.redact.jsx
// GDPR: A customer has requested deletion of their data.
// Badge Blitz stores no customer PII — only shop-level badge configuration.
// We acknowledge the request and respond 200.
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop} — no customer data stored`);
  return new Response();
};
