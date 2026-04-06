// webhooks.shop.redact.jsx
// GDPR: Shopify sends this 48 hours after app uninstall requesting full data deletion.
// The app/uninstalled webhook already deletes all Shop + Badge rows immediately on
// uninstall, so this is a no-op. We acknowledge and respond 200.
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { shop } = await authenticate.webhook(request);

  // Belt-and-suspenders: delete any remaining data in case uninstall webhook was missed.
  const shopRecord = await db.shop.findUnique({ where: { shopDomain: shop } });
  if (shopRecord) {
    await db.badge.deleteMany({ where: { shopId: shopRecord.id } });
    await db.shop.delete({ where: { shopDomain: shop } });
  }
  await db.session.deleteMany({ where: { shop } });

  return new Response();
};
