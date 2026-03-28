// app/routes/webhooks.inventory_levels.update.jsx
// Fires whenever inventory changes in the store.
// Triggers a full LOW_STOCK badge re-sync for the affected shop.

import { authenticate } from "../shopify.server";
import db from "../db.server";
import { syncLowStockBadges } from "../lib/inventory.server";

export const action = async ({ request }) => {
  const { shop, payload, admin, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  if (!admin) {
    // No admin client available — can't query inventory
    return new Response();
  }

  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
  if (!shopRecord) return new Response();

  try {
    const { synced } = await syncLowStockBadges(admin, shopRecord);
    console.log(`[Badge Blitz] Synced ${synced} LOW_STOCK badges for ${shop}`);
  } catch (err) {
    console.error(`[Badge Blitz] Inventory sync failed for ${shop}:`, err);
  }

  return new Response();
};
