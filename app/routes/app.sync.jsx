// app/routes/app.sync.jsx
// POST-only route — triggers a manual LOW_STOCK inventory sync.
// Called by the dashboard "Sync Inventory" button.

import { authenticate } from "../shopify.server";
import db from "../db.server";
import { syncLowStockBadges, syncCollectionBadges } from "../lib/inventory.server";
import { data, redirect } from "react-router";

export async function loader({ request }) {
  await authenticate.admin(request);
  return redirect("/app");
}

export async function action({ request }) {
  const { session, admin } = await authenticate.admin(request);
  const { shop } = session;

  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
  if (!shopRecord) {
    return data({ error: "Shop not found." }, { status: 400 });
  }

  try {
    const [{ synced: lowStockSynced }, { synced: collectionSynced }] = await Promise.all([
      syncLowStockBadges(admin, shopRecord),
      syncCollectionBadges(admin, shopRecord),
    ]);
    return data({ success: true, synced: lowStockSynced + collectionSynced });
  } catch (err) {
    console.error("[Badge Blitz] Manual sync error:", err);
    return data({ error: "Sync failed. Check server logs." }, { status: 500 });
  }
}
