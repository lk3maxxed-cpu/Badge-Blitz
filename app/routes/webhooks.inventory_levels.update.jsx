// app/routes/webhooks.inventory_levels.update.jsx
// Fires whenever inventory changes in the store.
// Triggers a full LOW_STOCK badge re-sync for the affected shop.

import { authenticate } from "../shopify.server";
import db from "../db.server";
import { syncLowStockBadges } from "../lib/inventory.server";

export const action = async ({ request }) => {
  const { shop, admin } = await authenticate.webhook(request);

  if (!admin) {
    // No admin client available — can't query inventory
    return new Response();
  }

  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
  if (!shopRecord) return new Response();

  try {
    await syncLowStockBadges(admin, shopRecord);
  } catch {
    // Sync failure is non-fatal — badge data remains from last successful sync
  }

  return new Response();
};
