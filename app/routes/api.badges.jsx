// app/routes/api.badges.jsx
// Public endpoint — called by the storefront theme extension (no auth required)
import { data } from "react-router";
import db from "../db.server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function loader({ request }) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return data(
      { error: "Missing shop parameter" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const shopRecord = await db.shop.findUnique({
    where: { shopDomain: shop },
    include: {
      badges: {
        where: { active: true },
        orderBy: { priority: "desc" },
      },
    },
  });

  if (!shopRecord) {
    return data([], { headers: CORS_HEADERS });
  }

  const badges = shopRecord.badges.map((b) => ({
    id: b.id,
    type: b.type,
    label: b.label,
    color: b.color,
    textColor: b.textColor,
    shape: b.shape,
    size: b.size,
    edgeStyle: b.edgeStyle,
    positionX: b.positionX,
    positionY: b.positionY,
    position: b.position,
    gradientEnabled: b.gradientEnabled,
    gradientColorEnd: b.gradientColorEnd,
    gradientDirection: b.gradientDirection,
    hoverOnly: b.hoverOnly,
    hoverDuration: b.hoverDuration,
    scrollingEnabled: b.scrollingEnabled,
    scrollSpeed: b.scrollSpeed,
    autoDiscount: b.autoDiscount,
    stockThreshold: b.stockThreshold,
    targetType: b.type === "LOW_STOCK" && b.syncedTargetIds ? "SPECIFIC" : b.targetType,
    targetIds: b.type === "LOW_STOCK" ? (b.syncedTargetIds ?? b.targetIds) : b.targetIds,
    priority: b.priority,
  }));

  return data(badges, {
    headers: {
      ...CORS_HEADERS,
      "Cache-Control": "public, max-age=60",
    },
  });
}
