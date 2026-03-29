// app/lib/inventory.server.js
// Syncs LOW_STOCK badge visibility based on live Shopify inventory data.
// Populates badge.syncedTargetIds with product GIDs that are at or below
// the badge's stockThreshold. The public API and storefront JS use this
// to show badges only on genuinely low-stock products.

import db from "../db.server";

const GET_PRODUCTS_INVENTORY_PAGE = `#graphql
  query GetProductsInventoryPage($cursor: String) {
    products(first: 50, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        variants(first: 100) {
          nodes {
            inventoryQuantity
          }
        }
      }
    }
  }
`;

const GET_PRODUCT_INVENTORY = `#graphql
  query GetProductInventory($id: ID!) {
    product(id: $id) {
      id
      variants(first: 100) {
        nodes {
          inventoryQuantity
        }
      }
    }
  }
`;

const GET_INVENTORY_ITEM_PRODUCT = `#graphql
  query GetInventoryItemProduct($id: ID!) {
    inventoryItem(id: $id) {
      variant {
        product {
          id
        }
      }
    }
  }
`;

// Total inventory across all variants for a product node
function totalInventory(productNode) {
  return productNode.variants.nodes.reduce(
    (sum, v) => sum + (v.inventoryQuantity ?? 0),
    0
  );
}

// Process all products page by page without accumulating into memory.
// Calls onPage(nodes) for each page — stops early if onPage returns false.
async function forEachProductPage(admin, onPage) {
  let cursor = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await admin.graphql(GET_PRODUCTS_INVENTORY_PAGE, {
      variables: { cursor },
    });
    const json = await response.json();
    const { nodes, pageInfo } = json.data.products;

    const keepGoing = onPage(nodes);
    if (keepGoing === false) break;

    hasNextPage = pageInfo.hasNextPage;
    cursor = pageInfo.endCursor;
  }
}

// Given a raw inventory_item_id integer from a webhook payload,
// returns the product GID or null
export async function getProductGidFromInventoryItem(admin, inventoryItemId) {
  const gid = `gid://shopify/InventoryItem/${inventoryItemId}`;
  try {
    const response = await admin.graphql(GET_INVENTORY_ITEM_PRODUCT, {
      variables: { id: gid },
    });
    const json = await response.json();
    return json.data?.inventoryItem?.variant?.product?.id ?? null;
  } catch {
    return null;
  }
}

// Full sync for a shop: updates syncedTargetIds on all LOW_STOCK badges
export async function syncLowStockBadges(admin, shopRecord) {
  const badges = await db.badge.findMany({
    where: { shopId: shopRecord.id, type: "LOW_STOCK" },
  });

  if (!badges.length) return { synced: 0 };

  const allBadges = badges.filter((b) => b.targetType === "ALL");
  const specificBadges = badges.filter((b) => b.targetType === "SPECIFIC");

  let synced = 0;

  // ALL-targeting badges: stream pages and collect matching IDs without loading
  // the entire product catalog into memory at once.
  for (const badge of allBadges) {
    const threshold = badge.stockThreshold ?? 5;
    const lowStockIds = [];

    await forEachProductPage(admin, (nodes) => {
      for (const p of nodes) {
        if (totalInventory(p) <= threshold) lowStockIds.push(p.id);
      }
    });

    await db.badge.update({
      where: { id: badge.id },
      data: { syncedTargetIds: lowStockIds.join(",") || null },
    });
    synced++;
  }

  // SPECIFIC-targeting badges: only query the exact product IDs listed
  for (const badge of specificBadges) {
    if (!badge.targetIds) continue;

    const threshold = badge.stockThreshold ?? 5;
    const rawIds = badge.targetIds.split(",").map((s) => s.trim()).filter(Boolean);
    const lowStockIds = [];

    for (const rawId of rawIds) {
      const gid = rawId.startsWith("gid://")
        ? rawId
        : `gid://shopify/Product/${rawId}`;

      try {
        const response = await admin.graphql(GET_PRODUCT_INVENTORY, {
          variables: { id: gid },
        });
        const json = await response.json();
        const product = json.data?.product;
        if (!product) continue;
        if (totalInventory(product) <= threshold) lowStockIds.push(gid);
      } catch {
        // product not found or API error — skip
      }
    }

    await db.badge.update({
      where: { id: badge.id },
      data: { syncedTargetIds: lowStockIds.join(",") || null },
    });
    synced++;
  }

  return { synced };
}
