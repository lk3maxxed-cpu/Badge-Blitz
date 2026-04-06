import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop, session } = await authenticate.webhook(request);


  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }

  // GDPR: delete all merchant data on uninstall.
  // Deleting the Shop cascades to all Badge records via the relation.
  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
  if (shopRecord) {
    await db.badge.deleteMany({ where: { shopId: shopRecord.id } });
    await db.shop.delete({ where: { shopDomain: shop } });
  }

  return new Response();
};
