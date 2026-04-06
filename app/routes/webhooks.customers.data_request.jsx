// webhooks.customers.data_request.jsx
// GDPR: A customer has requested a copy of their data.
// Badge Blitz stores no customer PII — only shop-level badge configuration.
// We acknowledge the request and respond 200.
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  await authenticate.webhook(request);
  return new Response();
};
