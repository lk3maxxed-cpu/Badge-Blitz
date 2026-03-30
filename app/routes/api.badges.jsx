// app/routes/api.badges.jsx
// Public endpoint — called by the storefront theme extension (no auth required)
import { data } from "react-router";
import db from "../db.server";

// Rate limiting: 60 req/min per IP (in-memory, resets on restart)
const rateLimitMap = new Map();
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

// Only allow requests from *.myshopify.com origins
function getAllowedOrigin(request) {
  const origin = request.headers.get("Origin") || "";
  if (/^https?:\/\/[a-z0-9-]+\.myshopify\.com$/i.test(origin)) {
    return origin;
  }
  return null;
}

function getCorsHeaders(request) {
  const origin = getAllowedOrigin(request);
  return {
    "Access-Control-Allow-Origin": origin || "null",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

export async function loader({ request }) {
  const corsHeaders = getCorsHeaders(request);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Rate limit by CF-Connecting-IP, X-Forwarded-For, or fallback
  const ip =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown";

  if (isRateLimited(ip)) {
    return data(
      { error: "Too many requests" },
      { status: 429, headers: { ...corsHeaders, "Retry-After": "60" } }
    );
  }

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  if (!shop) {
    return data(
      { error: "Missing shop parameter" },
      { status: 400, headers: corsHeaders }
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
    return data([], { headers: corsHeaders });
  }

  // Filter out badges outside their scheduled window
  const now = new Date();
  const activeBadges = shopRecord.badges.filter((b) => {
    if (b.startsAt && new Date(b.startsAt) > now) return false;
    if (b.endsAt && new Date(b.endsAt) < now) return false;
    return true;
  });

  const badges = activeBadges.map((b) => {
    // Collection badges use syncedTargetIds as their effective product list
    const isCollection = b.targetType === "COLLECTION";
    const isLowStock = b.type === "LOW_STOCK";
    return {
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
      slideIn: b.slideIn,
      slideFrom: b.slideFrom,
      scrollingEnabled: b.scrollingEnabled,
      scrollSpeed: b.scrollSpeed,
      stockThreshold: b.stockThreshold,
      iconDataUrl: b.iconDataUrl ?? null,
      targetType: (isLowStock && b.syncedTargetIds) || isCollection ? "SPECIFIC" : b.targetType,
      targetIds: isLowStock
        ? (b.syncedTargetIds ?? b.targetIds)
        : isCollection
        ? (b.syncedTargetIds ?? null)
        : b.targetIds,
      priority: b.priority,
    };
  });

  return data(badges, {
    headers: {
      ...corsHeaders,
      "Cache-Control": "public, max-age=60",
    },
  });
}
